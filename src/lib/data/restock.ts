import "server-only";
import type { RestockProposalStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { SITE } from "@/lib/site";
import { formatCmAsInches } from "@/lib/size-inches";
import { syncAggregateStock } from "@/lib/data/specimens";
import { sendNotification, notifyStaff } from "@/lib/notifications/service";

/**
 * Restock proposals — replacement inventory is NEVER sent automatically.
 *
 * Workflow: draft → sent (partner email) → confirmed/declined (partner link)
 *           → in_transit (specimens move to transit) → completed (delivered).
 */

function requireDb() {
  if (!prisma) throw new Error("Database not configured.");
  return prisma;
}

const proposalInclude = {
  location: true,
  items: { include: { specimen: { include: { product: { select: { scientific: true } } } } } },
} as const;

export interface ProposalItemView {
  specimenId: string;
  scientific: string;
  sizeLabel: string;
  sex: string;
  notes: string;
}

export interface ProposalView {
  id: string;
  locationId: string;
  locationName: string;
  status: RestockProposalStatus;
  reason: string;
  preferredDate: string | null;
  confirmToken: string;
  partnerNotes: string;
  createdAt: string;
  items: ProposalItemView[];
}

function mapProposal(p: {
  id: string;
  locationId: string;
  status: RestockProposalStatus;
  reason: string;
  preferredDate: Date | null;
  confirmToken: string;
  partnerNotes: string;
  createdAt: Date;
  location: { name: string };
  items: {
    specimenId: string;
    notes: string;
    specimen: { sizeCm: number; sex: string; product: { scientific: string } };
  }[];
}): ProposalView {
  return {
    id: p.id,
    locationId: p.locationId,
    locationName: p.location.name,
    status: p.status,
    reason: p.reason,
    preferredDate: p.preferredDate?.toISOString().slice(0, 10) ?? null,
    confirmToken: p.confirmToken,
    partnerNotes: p.partnerNotes,
    createdAt: p.createdAt.toISOString().slice(0, 10),
    items: p.items.map((i) => ({
      specimenId: i.specimenId,
      scientific: i.specimen.product.scientific,
      sizeLabel: formatCmAsInches(i.specimen.sizeCm),
      sex: i.specimen.sex,
      notes: i.notes,
    })),
  };
}

function itemLines(p: ProposalView): string {
  return p.items.map((i) => `${i.scientific} (${i.sizeLabel}, ${i.sex})`).join("<br />");
}

export async function listProposals(): Promise<ProposalView[]> {
  const db = requireDb();
  const rows = await db.restockProposal.findMany({
    include: proposalInclude,
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return rows.map(mapProposal);
}

export async function getProposalById(id: string): Promise<ProposalView | null> {
  const db = requireDb();
  const row = await db.restockProposal.findUnique({ where: { id }, include: proposalInclude });
  return row ? mapProposal(row) : null;
}

export async function getProposalByToken(token: string): Promise<ProposalView | null> {
  const db = requireDb();
  const row = await db.restockProposal.findUnique({
    where: { confirmToken: token },
    include: proposalInclude,
  });
  return row ? mapProposal(row) : null;
}

/** Draft a proposal suggesting concrete warehouse specimens. */
export async function createProposal(input: {
  locationId: string;
  specimenIds: string[];
  reason?: string;
  preferredDate?: Date | null;
}): Promise<string> {
  const db = requireDb();
  if (!input.specimenIds.length) throw new Error("Select at least one specimen.");

  return db.$transaction(async (tx) => {
    for (const id of input.specimenIds) {
      const s = await tx.specimen.findUnique({ where: { id } });
      if (!s) throw new Error(`Specimen not found: ${id}`);
      if (s.status !== "available" || s.locationType !== "warehouse") {
        throw new Error(`Specimen ${id} is not available at the warehouse.`);
      }
    }
    const proposal = await tx.restockProposal.create({
      data: {
        locationId: input.locationId,
        reason: input.reason ?? "",
        preferredDate: input.preferredDate ?? null,
        items: { create: input.specimenIds.map((specimenId) => ({ specimenId })) },
      },
    });
    return proposal.id;
  });
}

/** Send the proposal to the partner for confirmation (draft → sent). */
export async function sendProposal(id: string): Promise<void> {
  const db = requireDb();
  const p = await getProposalById(id);
  if (!p) throw new Error("Proposal not found.");
  if (p.status !== "draft") throw new Error(`Proposal already ${p.status}.`);

  const location = await db.storeLocation.findUnique({ where: { id: p.locationId } });
  if (!location?.email) {
    throw new Error("Partner has no email on file — add one under Locations first.");
  }

  await db.restockProposal.update({
    where: { id },
    data: { status: "sent", sentAt: new Date() },
  });

  await sendNotification({
    templateId: "partner-restock-proposal",
    event: "restock.sent",
    to: location.email,
    data: {
      partnerName: location.contactName || location.name,
      itemLines: itemLines(p),
      reason: p.reason || "Time to refresh your MSC display",
      preferredDate: p.preferredDate ?? "to be confirmed",
      confirmUrl: `${SITE.url}/en/p/restock/${p.confirmToken}`,
    },
    context: { proposalId: id, locationId: p.locationId },
  });
}

/** Partner response through the token page (sent → confirmed/declined). */
export async function respondToProposal(token: string, accept: boolean, partnerNotes = ""): Promise<ProposalView> {
  const db = requireDb();
  const p = await getProposalByToken(token);
  if (!p) throw new Error("Proposal not found.");
  if (p.status !== "sent") throw new Error("This proposal is no longer awaiting a response.");

  await db.restockProposal.update({
    where: { id: p.id },
    data: accept
      ? { status: "confirmed", confirmedAt: new Date(), partnerNotes }
      : { status: "declined", declinedAt: new Date(), partnerNotes },
  });

  const location = await db.storeLocation.findUnique({ where: { id: p.locationId } });

  if (accept && location?.email) {
    await sendNotification({
      templateId: "partner-restock-approved",
      event: "restock.confirmed",
      to: location.email,
      data: {
        partnerName: location.contactName || location.name,
        itemLines: itemLines(p),
        preferredDate: p.preferredDate ?? "to be scheduled",
      },
      context: { proposalId: p.id, locationId: p.locationId },
    });
  }

  await notifyStaff({
    templateId: "internal-restock-awaiting",
    event: accept ? "restock.confirmed" : "restock.declined",
    data: {
      locationName: p.locationName,
      status: accept ? "confirmed" : "declined",
      itemLines: itemLines(p),
    },
    context: { proposalId: p.id, locationId: p.locationId },
  });

  return (await getProposalById(p.id))!;
}

/** Ship the confirmed specimens (confirmed → in_transit): specimens move to transit. */
export async function shipProposal(id: string): Promise<void> {
  const db = requireDb();
  const p = await getProposalById(id);
  if (!p) throw new Error("Proposal not found.");
  if (p.status !== "confirmed") throw new Error(`Cannot ship a ${p.status} proposal.`);

  await db.$transaction(async (tx) => {
    for (const item of p.items) {
      const s = await tx.specimen.findUnique({ where: { id: item.specimenId } });
      if (!s) throw new Error(`Specimen not found: ${item.specimenId}`);
      if (s.status !== "available" || s.locationType !== "warehouse") {
        throw new Error(`Specimen ${item.specimenId} is no longer available at the warehouse.`);
      }
      await tx.specimen.update({
        where: { id: item.specimenId },
        data: { locationType: "transit", locationId: p.locationId },
      });
      await tx.inventoryMovement.create({
        data: {
          specimenId: item.specimenId,
          type: "transfer",
          fromLocationType: "warehouse",
          toLocationType: "transit",
          toLocationId: p.locationId,
          notes: `Restock ${p.id} — in transit to ${p.locationName}`,
        },
      });
    }
    await tx.restockProposal.update({
      where: { id },
      data: { status: "in_transit", shippedAt: new Date() },
    });
  });

  await syncAggregateStock();

  const location = await db.storeLocation.findUnique({ where: { id: p.locationId } });
  if (location?.email) {
    await sendNotification({
      templateId: "partner-transfer-notice",
      event: "restock.shipped",
      to: location.email,
      data: {
        partnerName: location.contactName || location.name,
        direction: "to",
        itemLines: itemLines(p),
      },
      context: { proposalId: id, locationId: p.locationId },
    });
  }
}

/** Confirm delivery at the partner (in_transit → completed): specimens go live on consignment. */
export async function completeProposal(id: string): Promise<void> {
  const db = requireDb();
  const p = await getProposalById(id);
  if (!p) throw new Error("Proposal not found.");
  if (p.status !== "in_transit") throw new Error(`Cannot complete a ${p.status} proposal.`);

  await db.$transaction(async (tx) => {
    for (const item of p.items) {
      const s = await tx.specimen.findUnique({ where: { id: item.specimenId } });
      if (!s || s.locationType !== "transit") continue;
      await tx.specimen.update({
        where: { id: item.specimenId },
        data: { locationType: "consignment", locationId: p.locationId },
      });
      await tx.inventoryMovement.create({
        data: {
          specimenId: item.specimenId,
          type: "transfer",
          fromLocationType: "transit",
          fromLocationId: p.locationId,
          toLocationType: "consignment",
          toLocationId: p.locationId,
          notes: `Restock ${p.id} — delivered to ${p.locationName}`,
        },
      });
    }
    await tx.restockProposal.update({
      where: { id },
      data: { status: "completed", completedAt: new Date() },
    });
  });

  await syncAggregateStock();

  const location = await db.storeLocation.findUnique({ where: { id: p.locationId } });
  if (location?.email) {
    await sendNotification({
      templateId: "partner-inventory-delivered",
      event: "restock.completed",
      to: location.email,
      data: {
        partnerName: location.contactName || location.name,
        itemLines: itemLines(p),
      },
      context: { proposalId: id, locationId: p.locationId },
    });
  }
}

/** Cancel a proposal at any pre-completion stage. In-transit specimens return to the warehouse. */
export async function cancelProposal(id: string): Promise<void> {
  const db = requireDb();
  const p = await getProposalById(id);
  if (!p) throw new Error("Proposal not found.");
  if (p.status === "completed" || p.status === "cancelled") return;

  await db.$transaction(async (tx) => {
    if (p.status === "in_transit") {
      for (const item of p.items) {
        const s = await tx.specimen.findUnique({ where: { id: item.specimenId } });
        if (!s || s.locationType !== "transit") continue;
        await tx.specimen.update({
          where: { id: item.specimenId },
          data: { locationType: "warehouse", locationId: null },
        });
        await tx.inventoryMovement.create({
          data: {
            specimenId: item.specimenId,
            type: "transfer",
            fromLocationType: "transit",
            fromLocationId: p.locationId,
            toLocationType: "warehouse",
            notes: `Restock ${p.id} cancelled — returned to warehouse`,
          },
        });
      }
    }
    await tx.restockProposal.update({ where: { id }, data: { status: "cancelled" } });
  });

  await syncAggregateStock();
}

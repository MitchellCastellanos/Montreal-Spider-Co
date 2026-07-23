import "server-only";
import type { PaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatCmAsInches } from "@/lib/size-inches";
import { IN_STOCK_STATUSES, syncAggregateStock } from "@/lib/data/specimens";
import { sendNotification } from "@/lib/notifications/service";
import { createTask } from "@/lib/data/tasks";

/**
 * Store audits — verify expected inventory against actual inventory at a
 * partner location. Results can generate investigation tasks, inventory
 * corrections and restock recommendations (all manual decisions).
 */

function requireDb() {
  if (!prisma) throw new Error("Database not configured.");
  return prisma;
}

export interface AuditItemInput {
  specimenId: string;
  result: "found" | "missing" | "sold";
  /** Size measured during the visit — updates the specimen's current size. */
  sizeCm?: number | null;
  healthNotes?: string;
  notes?: string;
  photoUrl?: string | null;
  /** Required when result is "sold" — what the partner says the customer paid. */
  salePrice?: number | null;
  paymentMethod?: PaymentMethod | null;
}

export interface CreateAuditInput {
  locationId: string;
  employee: string;
  auditedAt?: Date;
  notes?: string;
  items: AuditItemInput[];
}

export interface AuditListView {
  id: string;
  locationName: string;
  auditedAt: string;
  employee: string;
  expectedCount: number;
  foundCount: number;
  missingCount: number;
  soldCount: number;
  notes: string;
}

export interface AuditDetailItem {
  specimenId: string;
  scientific: string;
  sizeLabel: string;
  result: "found" | "missing" | "sold";
  sizeCm: number | null;
  healthNotes: string;
  notes: string;
  photoUrl: string | null;
  salePrice: number | null;
  paymentMethod: PaymentMethod | null;
}

export interface AuditDetailView extends AuditListView {
  locationId: string;
  items: AuditDetailItem[];
}

/** Specimens expected to be physically at a location (any in-stock or allocated status). */
export async function listExpectedSpecimensAt(locationId: string) {
  const db = requireDb();
  const rows = await db.specimen.findMany({
    where: {
      locationType: "consignment",
      locationId,
      status: { in: [...IN_STOCK_STATUSES, "allocated"] },
    },
    include: { product: { select: { scientific: true, commonEn: true } } },
    orderBy: { purchasedAt: "asc" },
  });
  return rows.map((s) => ({
    id: s.id,
    scientific: s.product.scientific,
    commonName: s.product.commonEn,
    sizeCm: s.sizeCm,
    sizeLabel: formatCmAsInches(s.sizeCm),
    sex: s.sex,
    status: s.status,
    price: s.price,
    msrp: s.msrp,
    settlementPrice: s.settlementPrice,
    qrToken: s.qrToken,
  }));
}

/**
 * Record a completed audit visit. Found specimens with a new measurement get a
 * growth record + current-size update. Missing specimens (truly unaccounted
 * for) generate investigation tasks — never mutated automatically, since
 * "missing" can mean escape, theft or miscount, not just an unregistered sale.
 * Specimens the partner confirms were sold (discovered during the count, not
 * registered as a walk-in sale) are processed exactly like a walk-in sale:
 * marked sold, settlement entry booked at the specimen's stipulated
 * settlement price, inventory movement recorded.
 */
export async function createAudit(input: CreateAuditInput): Promise<string> {
  const db = requireDb();
  if (!input.employee.trim()) throw new Error("Employee name is required.");
  if (!input.items.length) throw new Error("An audit needs at least one specimen result.");
  const auditedAt = input.auditedAt ?? new Date();

  for (const item of input.items) {
    if (item.result === "sold" && !(item.salePrice && item.salePrice > 0)) {
      throw new Error("Enter a sale price for every specimen marked sold.");
    }
  }

  const location = await db.storeLocation.findUnique({ where: { id: input.locationId } });
  if (!location) throw new Error("Store location not found.");

  const foundCount = input.items.filter((i) => i.result === "found").length;
  const missingCount = input.items.filter((i) => i.result === "missing").length;
  const soldCount = input.items.filter((i) => i.result === "sold").length;

  const belowMinimumAlerts: { label: string; salePrice: number; minPrice: number; msrp: number }[] = [];

  const auditId = await db.$transaction(async (tx) => {
    const audit = await tx.storeAudit.create({
      data: {
        locationId: input.locationId,
        auditedAt,
        employee: input.employee.trim(),
        notes: input.notes ?? "",
        expectedCount: input.items.length,
        foundCount,
        missingCount,
        soldCount,
      },
    });

    for (const item of input.items) {
      const s = await tx.specimen.findUnique({
        where: { id: item.specimenId },
        include: { product: { select: { scientific: true } } },
      });
      if (!s) throw new Error(`Specimen not found: ${item.specimenId}`);
      const label = `${s.product.scientific} (${item.specimenId})`;

      await tx.storeAuditItem.create({
        data: {
          auditId: audit.id,
          specimenId: item.specimenId,
          result: item.result,
          sizeCm: item.sizeCm ?? null,
          healthNotes: item.healthNotes ?? "",
          notes: item.notes ?? "",
          photoUrl: item.photoUrl ?? null,
          salePrice: item.result === "sold" ? item.salePrice : null,
          paymentMethod: item.result === "sold" ? item.paymentMethod ?? "cash" : null,
        },
      });

      if (item.result === "found" && item.sizeCm && item.sizeCm > 0 && item.sizeCm !== s.sizeCm) {
        await tx.growthRecord.create({
          data: {
            specimenId: item.specimenId,
            measuredAt: auditedAt,
            sizeCm: item.sizeCm,
            source: "audit",
            notes: `Store audit${item.healthNotes ? ` — ${item.healthNotes}` : ""}`,
          },
        });
        await tx.specimen.update({
          where: { id: item.specimenId },
          data: { sizeCm: item.sizeCm, lastMeasuredAt: auditedAt },
        });
      }

      if (item.result === "missing") {
        await tx.operationsTask.create({
          data: {
            type: "audit_investigation",
            title: `Missing specimen — audit at ${auditedAt.toISOString().slice(0, 10)}`,
            details:
              `${label} was not found during the store audit. ` +
              `Investigate (unregistered sale, escape, misplacement) and apply an inventory correction if needed.`,
            specimenId: item.specimenId,
            locationId: input.locationId,
            auditId: audit.id,
          },
        });
      }

      if (item.result === "sold") {
        if (s.status === "sold" || s.status === "written_off") {
          throw new Error(`Cannot mark ${label} sold — it is already ${s.status}.`);
        }
        if (s.status === "allocated") {
          throw new Error(`Cannot mark ${label} sold — it is reserved for a paid web order.`);
        }
        const salePrice = item.salePrice!;
        const paymentMethod: PaymentMethod = item.paymentMethod ?? "cash";
        const settlementPrice = s.settlementPrice ?? salePrice;
        const partnerMargin = Math.max(0, salePrice - settlementPrice);

        await tx.specimen.update({
          where: { id: item.specimenId },
          data: {
            status: "sold",
            salePrice,
            soldAt: auditedAt,
            salesChannel: "distributor",
            paymentMethod,
            notes: `${s.notes}\nDiscovered sold during store audit${item.notes ? ` — ${item.notes}` : ""}`.trim(),
          },
        });

        await tx.inventoryMovement.create({
          data: {
            specimenId: item.specimenId,
            type: "sale",
            fromLocationType: "consignment",
            fromLocationId: input.locationId,
            amount: salePrice,
            salesChannel: "distributor",
            paymentMethod,
            notes: `Discovered during store audit at ${location.name}`,
          },
        });

        await tx.settlementEntry.create({
          data: {
            locationId: input.locationId,
            specimenId: item.specimenId,
            soldAt: auditedAt,
            salePrice,
            settlementPrice,
            partnerMargin,
            notes: item.notes || "Discovered during store audit",
          },
        });

        const minPrice =
          s.msrp != null && location.minPricePct != null ? (s.msrp * location.minPricePct) / 100 : null;
        if (minPrice != null && salePrice < minPrice) {
          belowMinimumAlerts.push({ label, salePrice, minPrice, msrp: s.msrp! });
        }
      }
    }

    return audit.id;
  });

  if (soldCount > 0) await syncAggregateStock();

  for (const alert of belowMinimumAlerts) {
    await createTask({
      type: "general",
      title: `Below-minimum sale at ${location.name} (audit)`,
      details:
        `${alert.label} sold for $${alert.salePrice.toFixed(2)} — minimum policy is ` +
        `$${alert.minPrice.toFixed(2)} (MSRP $${alert.msrp.toFixed(2)} × ${location.minPricePct}%).`,
      locationId: input.locationId,
    });
  }

  // Partner summary email through the notification service.
  if (location.email) {
    await sendNotification({
      templateId: "partner-audit-completed",
      event: "audit.completed",
      to: location.email,
      data: {
        partnerName: location.contactName || location.name,
        auditDate: auditedAt.toLocaleDateString("en-CA", { month: "long", day: "numeric" }),
        foundCount: String(foundCount),
        missingCount: String(missingCount),
        soldCount: String(soldCount),
        notes: input.notes ?? "",
      },
      context: { auditId, locationId: input.locationId },
    });
  }

  return auditId;
}

/**
 * Apply an inventory correction for a specimen confirmed lost after an audit
 * investigation: writes the specimen off with a `correction` movement.
 */
export async function applyAuditCorrection(specimenId: string, notes: string): Promise<void> {
  const db = requireDb();
  await db.$transaction(async (tx) => {
    const s = await tx.specimen.findUnique({ where: { id: specimenId } });
    if (!s) throw new Error("Specimen not found.");
    if (s.status === "sold" || s.status === "written_off") {
      throw new Error(`Specimen is already ${s.status}.`);
    }
    await tx.specimen.update({
      where: { id: specimenId },
      data: { status: "written_off", notes: notes || s.notes },
    });
    await tx.inventoryMovement.create({
      data: {
        specimenId,
        type: "correction",
        fromLocationType: s.locationType,
        fromLocationId: s.locationId,
        notes: notes || "Audit correction — specimen unaccounted for",
      },
    });
  });
}

export async function listAudits(): Promise<AuditListView[]> {
  const db = requireDb();
  const rows = await db.storeAudit.findMany({
    include: { location: { select: { name: true } } },
    orderBy: { auditedAt: "desc" },
    take: 100,
  });
  return rows.map((a) => ({
    id: a.id,
    locationName: a.location.name,
    auditedAt: a.auditedAt.toISOString().slice(0, 10),
    employee: a.employee,
    expectedCount: a.expectedCount,
    foundCount: a.foundCount,
    missingCount: a.missingCount,
    soldCount: a.soldCount,
    notes: a.notes,
  }));
}

export async function getAuditById(id: string): Promise<AuditDetailView | null> {
  const db = requireDb();
  const a = await db.storeAudit.findUnique({
    where: { id },
    include: {
      location: { select: { name: true } },
      items: { include: { specimen: { include: { product: { select: { scientific: true } } } } } },
    },
  });
  if (!a) return null;
  return {
    id: a.id,
    locationId: a.locationId,
    locationName: a.location.name,
    auditedAt: a.auditedAt.toISOString().slice(0, 10),
    employee: a.employee,
    expectedCount: a.expectedCount,
    foundCount: a.foundCount,
    missingCount: a.missingCount,
    soldCount: a.soldCount,
    notes: a.notes,
    items: a.items.map((i) => ({
      specimenId: i.specimenId,
      scientific: i.specimen.product.scientific,
      sizeLabel: formatCmAsInches(i.specimen.sizeCm),
      result: i.result,
      sizeCm: i.sizeCm,
      healthNotes: i.healthNotes,
      notes: i.notes,
      photoUrl: i.photoUrl,
      salePrice: i.salePrice,
      paymentMethod: i.paymentMethod,
    })),
  };
}

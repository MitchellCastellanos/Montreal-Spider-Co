import "server-only";
import type { PaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatCmAsInches } from "@/lib/size-inches";
import { syncAggregateStock } from "@/lib/data/specimens";
import { sendNotification, notifyStaff } from "@/lib/notifications/service";
import { createTask } from "@/lib/data/tasks";

/**
 * Partner QR operations. Partners have no dashboards or accounts — a scanned
 * specimen QR (which embeds the store's partner token) is all the software
 * they need to register a walk-in sale or report an issue.
 */

function requireDb() {
  if (!prisma) throw new Error("Database not configured.");
  return prisma;
}

const specimenInclude = {
  product: { select: { scientific: true, commonEn: true, commonFr: true, slug: true, image: true } },
  location: true,
} as const;

export async function getSpecimenByQrToken(token: string) {
  const db = requireDb();
  return db.specimen.findUnique({ where: { qrToken: token }, include: specimenInclude });
}

export interface WalkInSaleInput {
  qrToken: string;
  /** Partner token from the QR link — authorizes the sale for that store only. */
  partnerToken: string;
  salePrice: number;
  paymentMethod: PaymentMethod;
  notes?: string;
}

export interface WalkInSaleResult {
  scientific: string;
  sizeLabel: string;
  salePrice: number;
  settlementPrice: number;
  partnerMargin: number;
}

/**
 * Register a walk-in sale at a partner store. Atomically marks the specimen
 * SOLD, creates the settlement ledger entry and the inventory movement, then
 * refreshes aggregates and notifies partner + staff.
 */
export async function registerWalkInSale(input: WalkInSaleInput): Promise<WalkInSaleResult> {
  const db = requireDb();
  if (!(input.salePrice > 0)) throw new Error("Sale price must be greater than 0.");

  const specimen = await getSpecimenByQrToken(input.qrToken);
  if (!specimen) throw new Error("Specimen not found.");
  if (specimen.locationType !== "consignment" || !specimen.location) {
    throw new Error("This specimen is not at a partner store.");
  }
  if (specimen.location.partnerToken !== input.partnerToken) {
    throw new Error("This QR code is not authorized for this store.");
  }
  if (specimen.status === "sold") throw new Error("This specimen is already sold.");
  if (specimen.status === "allocated") {
    throw new Error("This specimen is reserved for a paid web order — contact Montreal Spider Co.");
  }
  if (specimen.status === "written_off") throw new Error("This specimen is no longer in inventory.");

  const soldAt = new Date();
  const settlementPrice = specimen.settlementPrice ?? input.salePrice;
  const partnerMargin = Math.max(0, input.salePrice - settlementPrice);
  const minPrice =
    specimen.msrp != null && specimen.location.minPricePct != null
      ? (specimen.msrp * specimen.location.minPricePct) / 100
      : null;

  await db.$transaction(async (tx) => {
    await tx.specimen.update({
      where: { id: specimen.id },
      data: {
        status: "sold",
        salePrice: input.salePrice,
        soldAt,
        salesChannel: "distributor",
        paymentMethod: input.paymentMethod,
        notes: input.notes ? `${specimen.notes}\nWalk-in: ${input.notes}`.trim() : specimen.notes,
      },
    });

    await tx.inventoryMovement.create({
      data: {
        specimenId: specimen.id,
        type: "sale",
        fromLocationType: "consignment",
        fromLocationId: specimen.locationId,
        amount: input.salePrice,
        salesChannel: "distributor",
        paymentMethod: input.paymentMethod,
        notes: `Walk-in sale at ${specimen.location!.name}`,
      },
    });

    await tx.settlementEntry.create({
      data: {
        locationId: specimen.locationId!,
        specimenId: specimen.id,
        soldAt,
        salePrice: input.salePrice,
        settlementPrice,
        partnerMargin,
        notes: input.notes ?? "",
      },
    });
  });

  await syncAggregateStock(specimen.productId);

  const itemLine = `${specimen.product.scientific} (${formatCmAsInches(specimen.sizeCm)}, ${specimen.sex})`;

  if (specimen.location.email) {
    await sendNotification({
      templateId: "partner-specimen-sold",
      event: "walkin.sold",
      to: specimen.location.email,
      data: {
        partnerName: specimen.location.contactName || specimen.location.name,
        itemLine,
        salePrice: `$${input.salePrice.toFixed(2)} CAD`,
        settlementPrice: `$${settlementPrice.toFixed(2)} CAD`,
      },
      context: { specimenId: specimen.id, locationId: specimen.locationId! },
    });
  }

  await notifyStaff({
    templateId: "internal-new-order",
    event: "walkin.sold",
    data: {
      orderNumber: `Walk-in @ ${specimen.location.name}`,
      customerName: "walk-in customer",
      total: `$${input.salePrice.toFixed(2)} CAD`,
      method: `Walk-in sale — ${specimen.location.name}`,
      itemLines: itemLine,
    },
    context: { specimenId: specimen.id, locationId: specimen.locationId! },
  });

  // Below-minimum pricing is allowed to go through (the animal is sold either
  // way) but flagged for follow-up with the partner.
  if (minPrice != null && input.salePrice < minPrice) {
    await createTask({
      type: "general",
      title: `Below-minimum sale at ${specimen.location.name}`,
      details: `${itemLine} sold for $${input.salePrice.toFixed(2)} — minimum policy is $${minPrice.toFixed(2)} (MSRP $${specimen.msrp!.toFixed(2)} × ${specimen.location.minPricePct}%).`,
      specimenId: specimen.id,
      locationId: specimen.locationId,
    });
  }

  return {
    scientific: specimen.product.scientific,
    sizeLabel: formatCmAsInches(specimen.sizeCm),
    salePrice: input.salePrice,
    settlementPrice,
    partnerMargin,
  };
}

/** Report an issue with a specimen from its QR page — creates a task + staff alert. */
export async function reportSpecimenIssue(input: {
  qrToken: string;
  issue: string;
  reporter?: string;
}): Promise<void> {
  if (!input.issue.trim()) throw new Error("Describe the issue first.");
  const specimen = await getSpecimenByQrToken(input.qrToken);
  if (!specimen) throw new Error("Specimen not found.");

  const label = `${specimen.product.scientific} (${formatCmAsInches(specimen.sizeCm)})`;
  const locationName = specimen.location?.name ?? "MSC warehouse";

  await createTask({
    type: "general",
    title: `Issue reported — ${label}`,
    details: `${input.issue.trim()}${input.reporter ? `\nReported by: ${input.reporter}` : ""}\nLocation: ${locationName}`,
    specimenId: specimen.id,
    locationId: specimen.locationId,
  });

  await notifyStaff({
    templateId: "internal-specimen-issue",
    event: "specimen.issue",
    data: {
      specimenLabel: label,
      locationName,
      issue: input.issue.trim(),
    },
    context: { specimenId: specimen.id },
  });
}

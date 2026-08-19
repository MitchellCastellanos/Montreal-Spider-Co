import "server-only";
import type { PaymentMethod, SpecimenLocationType, SpecimenSex } from "@prisma/client";
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
  /** Null while a scan-driven visit is still in progress (see recordSpecimenScan / finishAuditVisit). */
  completedAt: string | null;
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
        // The desk-based checklist submits a whole visit atomically — unlike a
        // scan-driven visit (see recordSpecimenScan), there's no in-progress state.
        completedAt: auditedAt,
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
    completedAt: a.completedAt ? a.completedAt.toISOString() : null,
  }));
}

/** Scan-driven visits still in progress (started by a scan, not yet closed out with `finishAuditVisit`). */
export async function listOpenAudits(): Promise<AuditDetailView[]> {
  const db = requireDb();
  const rows = await db.storeAudit.findMany({
    where: { completedAt: null },
    include: {
      location: { select: { name: true } },
      items: { include: { specimen: { include: { product: { select: { scientific: true } } } } } },
    },
    orderBy: { auditedAt: "desc" },
  });
  return rows.map(toAuditDetailView);
}

function toAuditDetailView(a: NonNullable<Awaited<ReturnType<typeof fetchAuditWithItems>>>): AuditDetailView {
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
    completedAt: a.completedAt ? a.completedAt.toISOString() : null,
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

function fetchAuditWithItems(id: string) {
  const db = requireDb();
  return db.storeAudit.findUnique({
    where: { id },
    include: {
      location: { select: { name: true } },
      items: { include: { specimen: { include: { product: { select: { scientific: true } } } } } },
    },
  });
}

export async function getAuditById(id: string): Promise<AuditDetailView | null> {
  const a = await fetchAuditWithItems(id);
  return a ? toAuditDetailView(a) : null;
}

// ---------------------------------------------------------------------------
// Scan-driven audits — MSC staff scan a specimen's QR label on-site (see
// `/q/[token]`, which routes admins straight here instead of the public
// product page) and record found/sold/missing plus any new measurement, sex
// or pricing right there. Unlike the desk-based checklist above (`createAudit`,
// filled out from a list after the visit), each scan applies immediately —
// size/sex/price changes update the specimen, log a growth record / inventory
// movement, and — because the partner's shelf tag would otherwise go stale —
// email the partner right away rather than waiting for the visit to end.
// Multiple scans at the same store on the same day accumulate into one
// StoreAudit until the employee explicitly closes it with `finishAuditVisit`,
// which is what sends the partner the end-of-visit summary.
// ---------------------------------------------------------------------------

export interface ScanTarget {
  specimenId: string;
  qrToken: string;
  scientific: string;
  commonName: string;
  sizeCm: number;
  sizeLabel: string;
  sex: SpecimenSex;
  price: number;
  msrp: number | null;
  settlementPrice: number | null;
  status: string;
  locationType: SpecimenLocationType;
  locationId: string | null;
  locationName: string;
}

/** Loads the specimen behind a scanned QR token for the on-site audit screen. Read-only. */
export async function getScanTarget(qrToken: string): Promise<ScanTarget | null> {
  const db = requireDb();
  const s = await db.specimen.findUnique({
    where: { qrToken },
    include: { product: { select: { scientific: true, commonEn: true } }, location: { select: { name: true } } },
  });
  if (!s) return null;
  return {
    specimenId: s.id,
    qrToken: s.qrToken,
    scientific: s.product.scientific,
    commonName: s.product.commonEn,
    sizeCm: s.sizeCm,
    sizeLabel: formatCmAsInches(s.sizeCm),
    sex: s.sex,
    price: s.price,
    msrp: s.msrp,
    settlementPrice: s.settlementPrice,
    status: s.status,
    locationType: s.locationType,
    locationId: s.locationId,
    locationName: s.location?.name ?? "MSC warehouse",
  };
}

export interface ScanResultInput {
  qrToken: string;
  employee: string;
  result: "found" | "missing" | "sold";
  /** Re-measurement in cm — only meaningful for "found". Omit/0 to leave the size unchanged. */
  sizeCm?: number | null;
  sex?: SpecimenSex | null;
  /** New web listing price — only meaningful for "found". Omit to leave unchanged. */
  price?: number | null;
  /** `null` explicitly clears it; `undefined` leaves it unchanged. */
  msrp?: number | null;
  settlementPrice?: number | null;
  healthNotes?: string;
  notes?: string;
  /** Required when result is "sold". */
  salePrice?: number | null;
  paymentMethod?: PaymentMethod | null;
}

export interface ScanResultView {
  auditId: string;
  repriced: boolean;
}

/**
 * Record one scan during an on-site visit. Finds (or starts) today's open
 * audit for the specimen's store, upserts the audit item, and — for a "found"
 * result — applies any new size/sex/price straight to the specimen so the
 * change is live everywhere (storefront buy-boxes, settlement math, the next
 * audit's "expected" snapshot) the moment it's measured, not after a desk
 * write-up. Every side effect from the desk-based flow still applies (growth
 * history, missing → investigation task, sold → settlement entry + below-
 * minimum alert); repricing additionally emails the partner immediately,
 * since a stale shelf tag is time-sensitive in a way an end-of-visit summary
 * is not.
 */
export async function recordSpecimenScan(input: ScanResultInput): Promise<ScanResultView> {
  const db = requireDb();
  if (!input.employee.trim()) throw new Error("Employee name is required.");
  if (input.result === "sold" && !(input.salePrice && input.salePrice > 0)) {
    throw new Error("Enter a sale price.");
  }

  const specimen = await db.specimen.findUnique({
    where: { qrToken: input.qrToken },
    include: { product: { select: { scientific: true } }, location: true },
  });
  if (!specimen) throw new Error("Specimen not found.");
  if (specimen.locationType !== "consignment" || !specimen.location) {
    throw new Error("This specimen is not at a partner store — edit it from the inventory screen instead.");
  }
  if (specimen.status === "sold" || specimen.status === "written_off") {
    throw new Error(`Cannot audit — this specimen is already ${specimen.status}.`);
  }
  if (specimen.status === "allocated" && input.result === "sold") {
    throw new Error("Cannot mark this specimen sold — it is reserved for a paid web order.");
  }
  const location = specimen.location;
  const label = `${specimen.product.scientific} (${specimen.id})`;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const sizeCm = input.result === "found" && input.sizeCm && input.sizeCm > 0 ? input.sizeCm : null;
  const sizeChanged = sizeCm != null && sizeCm !== specimen.sizeCm;
  const sexChanged = input.result === "found" && input.sex != null && input.sex !== specimen.sex;
  const priceChanged = input.result === "found" && input.price != null && input.price !== specimen.price;
  const msrpChanged = input.result === "found" && input.msrp !== undefined && input.msrp !== specimen.msrp;
  const settlementChanged =
    input.result === "found" && input.settlementPrice !== undefined && input.settlementPrice !== specimen.settlementPrice;
  const repriced = sizeChanged || sexChanged || priceChanged || msrpChanged || settlementChanged;

  const { auditId, belowMinimumAlert } = await db.$transaction(async (tx) => {
    let belowMinimumAlert: { salePrice: number; minPrice: number; msrp: number } | null = null;

    let audit = await tx.storeAudit.findFirst({
      where: { locationId: location.id, completedAt: null, auditedAt: { gte: startOfDay } },
      orderBy: { auditedAt: "desc" },
    });
    if (!audit) {
      audit = await tx.storeAudit.create({
        data: { locationId: location.id, employee: input.employee.trim(), auditedAt: new Date() },
      });
    }

    await tx.storeAuditItem.upsert({
      where: { auditId_specimenId: { auditId: audit.id, specimenId: specimen.id } },
      create: {
        auditId: audit.id,
        specimenId: specimen.id,
        result: input.result,
        sizeCm,
        healthNotes: input.healthNotes ?? "",
        notes: input.notes ?? "",
        salePrice: input.result === "sold" ? input.salePrice : null,
        paymentMethod: input.result === "sold" ? (input.paymentMethod ?? "cash") : null,
      },
      update: {
        result: input.result,
        sizeCm,
        healthNotes: input.healthNotes ?? "",
        notes: input.notes ?? "",
        salePrice: input.result === "sold" ? input.salePrice : null,
        paymentMethod: input.result === "sold" ? (input.paymentMethod ?? "cash") : null,
      },
    });

    if (sizeChanged) {
      await tx.growthRecord.create({
        data: {
          specimenId: specimen.id,
          sizeCm: sizeCm!,
          source: "audit",
          notes: `Store audit scan${input.healthNotes ? ` — ${input.healthNotes}` : ""}`,
        },
      });
    }

    if (repriced) {
      await tx.specimen.update({
        where: { id: specimen.id },
        data: {
          ...(sizeChanged ? { sizeCm: sizeCm!, lastMeasuredAt: new Date() } : {}),
          ...(sexChanged ? { sex: input.sex! } : {}),
          ...(priceChanged ? { price: Math.max(0, input.price!) } : {}),
          ...(msrpChanged ? { msrp: input.msrp } : {}),
          ...(settlementChanged ? { settlementPrice: input.settlementPrice } : {}),
        },
      });
      const changeParts = [
        sizeChanged && `size ${specimen.sizeCm.toFixed(1)}cm → ${sizeCm!.toFixed(1)}cm`,
        sexChanged && `sex ${specimen.sex} → ${input.sex}`,
        priceChanged && `web price $${specimen.price.toFixed(2)} → $${input.price!.toFixed(2)}`,
        msrpChanged &&
          `MSRP ${specimen.msrp != null ? `$${specimen.msrp.toFixed(2)}` : "—"} → ${input.msrp != null ? `$${input.msrp.toFixed(2)}` : "—"}`,
        settlementChanged &&
          `settlement ${specimen.settlementPrice != null ? `$${specimen.settlementPrice.toFixed(2)}` : "—"} → ${input.settlementPrice != null ? `$${input.settlementPrice.toFixed(2)}` : "—"}`,
      ]
        .filter(Boolean)
        .join("; ");
      await tx.inventoryMovement.create({
        data: {
          specimenId: specimen.id,
          type: "correction",
          fromLocationType: "consignment",
          fromLocationId: location.id,
          notes: `Audit scan at ${location.name}: ${changeParts}`,
        },
      });
    }

    if (input.result === "missing") {
      await tx.operationsTask.create({
        data: {
          type: "audit_investigation",
          title: `Missing specimen — audit scan at ${location.name}`,
          details: `${label} was not found while scanning at ${location.name}. Investigate (unregistered sale, escape, misplacement) and apply an inventory correction if needed.`,
          specimenId: specimen.id,
          locationId: location.id,
          auditId: audit.id,
        },
      });
    }

    if (input.result === "sold") {
      const salePrice = input.salePrice!;
      const paymentMethod: PaymentMethod = input.paymentMethod ?? "cash";
      const settlementPrice = specimen.settlementPrice ?? salePrice;
      const partnerMargin = Math.max(0, salePrice - settlementPrice);

      await tx.specimen.update({
        where: { id: specimen.id },
        data: {
          status: "sold",
          salePrice,
          soldAt: new Date(),
          salesChannel: "distributor",
          paymentMethod,
          notes: `${specimen.notes}\nDiscovered sold during audit scan${input.notes ? ` — ${input.notes}` : ""}`.trim(),
        },
      });
      await tx.inventoryMovement.create({
        data: {
          specimenId: specimen.id,
          type: "sale",
          fromLocationType: "consignment",
          fromLocationId: location.id,
          amount: salePrice,
          salesChannel: "distributor",
          paymentMethod,
          notes: `Discovered during audit scan at ${location.name}`,
        },
      });
      await tx.settlementEntry.create({
        data: {
          locationId: location.id,
          specimenId: specimen.id,
          soldAt: new Date(),
          salePrice,
          settlementPrice,
          partnerMargin,
          notes: input.notes || "Discovered during audit scan",
        },
      });

      const minPrice =
        specimen.msrp != null && location.minPricePct != null ? (specimen.msrp * location.minPricePct) / 100 : null;
      if (minPrice != null && salePrice < minPrice) {
        belowMinimumAlert = { salePrice, minPrice, msrp: specimen.msrp! };
      }
    }

    const items = await tx.storeAuditItem.findMany({ where: { auditId: audit.id } });
    await tx.storeAudit.update({
      where: { id: audit.id },
      data: {
        employee: input.employee.trim(),
        expectedCount: items.length,
        foundCount: items.filter((i) => i.result === "found").length,
        missingCount: items.filter((i) => i.result === "missing").length,
        soldCount: items.filter((i) => i.result === "sold").length,
      },
    });

    return { auditId: audit.id, belowMinimumAlert };
  });

  if (input.result === "sold" || repriced) await syncAggregateStock();

  if (belowMinimumAlert) {
    await createTask({
      type: "general",
      title: `Below-minimum sale at ${location.name} (audit)`,
      details:
        `${label} sold for $${belowMinimumAlert.salePrice.toFixed(2)} — minimum policy is ` +
        `$${belowMinimumAlert.minPrice.toFixed(2)} (MSRP $${belowMinimumAlert.msrp.toFixed(2)} × ${location.minPricePct}%).`,
      locationId: location.id,
    });
  }

  if (repriced && location.email) {
    const changesLine = [
      sizeChanged && `Size: ${formatCmAsInches(specimen.sizeCm)} → ${formatCmAsInches(sizeCm!)}`,
      sexChanged && `Sex: ${specimen.sex} → ${input.sex}`,
      priceChanged && `Web price: $${specimen.price.toFixed(2)} CAD → $${input.price!.toFixed(2)} CAD`,
      msrpChanged &&
        `MSRP: ${specimen.msrp != null ? `$${specimen.msrp.toFixed(2)} CAD` : "—"} → ${input.msrp != null ? `$${input.msrp.toFixed(2)} CAD` : "—"}`,
      settlementChanged &&
        `Settlement (what you owe us): ${specimen.settlementPrice != null ? `$${specimen.settlementPrice.toFixed(2)} CAD` : "—"} → ${input.settlementPrice != null ? `$${input.settlementPrice.toFixed(2)} CAD` : "—"}`,
    ]
      .filter(Boolean)
      .join("<br />");

    await sendNotification({
      templateId: "partner-specimen-repriced",
      event: "audit.repriced",
      to: location.email,
      data: {
        partnerName: location.contactName || location.name,
        itemLine: `${specimen.product.scientific} (${formatCmAsInches(sizeCm ?? specimen.sizeCm)}, ${input.sex ?? specimen.sex})`,
        changesLine,
      },
      context: { specimenId: specimen.id, locationId: location.id, auditId },
    });

    await createTask({
      type: "general",
      title: `Update price tag at ${location.name}`,
      details: `${label} was re-measured/re-priced during today's audit — swap the shelf price tag so it matches the new listing.`,
      specimenId: specimen.id,
      locationId: location.id,
      auditId,
    });
  }

  return { auditId, repriced };
}

/** Closes out a scan-driven visit: sends the partner the end-of-visit summary. Idempotent. */
export async function finishAuditVisit(auditId: string): Promise<void> {
  const db = requireDb();
  const audit = await db.storeAudit.findUnique({ where: { id: auditId }, include: { location: true } });
  if (!audit) throw new Error("Audit not found.");
  if (audit.completedAt) return;

  await db.storeAudit.update({ where: { id: auditId }, data: { completedAt: new Date() } });

  if (audit.location.email) {
    await sendNotification({
      templateId: "partner-audit-completed",
      event: "audit.completed",
      to: audit.location.email,
      data: {
        partnerName: audit.location.contactName || audit.location.name,
        auditDate: audit.auditedAt.toLocaleDateString("en-CA", { month: "long", day: "numeric" }),
        foundCount: String(audit.foundCount),
        missingCount: String(audit.missingCount),
        soldCount: String(audit.soldCount),
        notes: audit.notes,
      },
      context: { auditId, locationId: audit.locationId },
    });
  }
}

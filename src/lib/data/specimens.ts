import "server-only";
import type {
  InventoryMovementType,
  PaymentMethod,
  Prisma,
  SalesChannel,
  SpecimenLocationType,
  SpecimenSex,
  SpecimenStatus,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { setDistributorPrice } from "@/lib/data/products";
import { cmToInches, formatCmAsInches } from "@/lib/size-inches";

export type {
  SpecimenStatus,
  SpecimenLocationType,
  SpecimenSex,
  SalesChannel,
  PaymentMethod,
  InventoryMovementType,
};

/**
 * Status and physical location are separate concepts:
 * - status answers "can this specimen be sold?" (available / allocated / sold / written_off)
 * - locationType/locationId answer "where is it physically?" (warehouse / partner store / transit)
 *
 * `consignment` remains in the status enum only for legacy rows (backfilled to
 * `available`); reads keep accepting it so nothing breaks mid-migration.
 */
export const IN_STOCK_STATUSES: SpecimenStatus[] = ["available", "consignment"];

/** In stock AND physically somewhere a customer can buy from (not in transit). */
const PURCHASABLE_WHERE = {
  status: { in: IN_STOCK_STATUSES },
  locationType: { not: "transit" as SpecimenLocationType },
} as const;

export interface SpecimenView {
  id: string;
  productId: string;
  productName: string;
  commonName: string;
  productImage: string | null;
  scientific: string;
  sizeCm: number;
  sizeInches: number;
  sizeLabel: string;
  sex: SpecimenSex;
  price: number;
  photoUrl: string | null;
  tarantulAppId: string | null;
  status: SpecimenStatus;
  locationType: SpecimenLocationType;
  locationId: string | null;
  locationName: string | null;
  unitCost: number;
  settlementPrice: number | null;
  msrp: number | null;
  purchasedAt: string;
  lastMeasuredAt: string | null;
  qrToken: string;
  supplier: string;
  notes: string;
  salePrice: number | null;
  soldAt: string | null;
  salesChannel: SalesChannel | null;
  paymentMethod: PaymentMethod | null;
}

export interface SpecimenFilters {
  productId?: string;
  status?: SpecimenStatus;
  locationType?: SpecimenLocationType;
  locationId?: string;
  q?: string;
}

/** One row in a "receive batch" intake — one or more identical specimens (same species/size/sex/cost/price/origin). */
export interface ReceiveBatchRowInput {
  productId: string;
  sizeCm: number;
  sex: SpecimenSex;
  unitCost: number;
  price: number;
  /** Amount owed to MSC when a partner sells the specimen. */
  settlementPrice?: number | null;
  /** Suggested retail price for partners. */
  msrp?: number | null;
  photoUrl?: string | null;
  quantity: number;
  purchasedAt: Date;
  supplier?: string;
  notes?: string;
  locationType?: SpecimenLocationType;
  locationId?: string;
  /** @deprecated per-product distributor reminder price — superseded by per-specimen settlementPrice. */
  distributorPrice?: number | null;
  /** Single ID when quantity is 1 */
  tarantulAppId?: string;
  /** Optional IDs when receiving multiple (length must match quantity if provided) */
  tarantulAppIds?: string[];
}

export interface ManualSaleInput {
  specimenIds: string[];
  salePrice: number;
  salesChannel: SalesChannel;
  paymentMethod: PaymentMethod;
  soldAt?: Date;
  notes?: string;
}

export interface TransferInput {
  specimenIds: string[];
  locationId: string;
  notes?: string;
  /** Admin-only price reminder for this product at the distributor. */
  distributorPrice?: number | null;
}

export interface WriteOffInput {
  specimenIds: string[];
  notes?: string;
}

export interface FinanceSummary {
  inventoryValue: number;
  inventoryCount: number;
  consignmentValue: number;
  consignmentCount: number;
  salesTotal: number;
  cogs: number;
  margin: number;
  marginPct: number;
  soldCount: number;
  byChannel: { channel: SalesChannel; count: number; revenue: number; cogs: number }[];
  byPayment: { method: PaymentMethod; count: number; revenue: number }[];
}

/** A distinct (size, sex, price) bucket of in-stock specimens for a product — the storefront "buy box". */
export interface AvailabilityGroup {
  productId: string;
  sizeCm: number;
  sizeInches: number;
  sizeLabel: string;
  sex: SpecimenSex;
  price: number;
  /** Total purchasable units (warehouse + at distributors). */
  stock: number;
  warehouseStock: number;
  distributorStock: number;
  photoUrl: string | null;
}

function requireDb() {
  if (!prisma) throw new Error("Database not configured.");
  return prisma;
}

function mapSpecimen(
  s: {
    id: string;
    productId: string;
    sizeCm: number;
    sex: SpecimenSex;
    price: number;
    photoUrl: string | null;
    tarantulAppId: string | null;
    status: SpecimenStatus;
    locationType: SpecimenLocationType;
    locationId: string | null;
    unitCost: number;
    settlementPrice: number | null;
    msrp: number | null;
    purchasedAt: Date;
    lastMeasuredAt: Date | null;
    qrToken: string;
    supplier: string;
    notes: string;
    salePrice: number | null;
    soldAt: Date | null;
    salesChannel: SalesChannel | null;
    paymentMethod: PaymentMethod | null;
    product: { commonEn: string; scientific: string; image: string | null };
    location: { name: string } | null;
  },
): SpecimenView {
  return {
    id: s.id,
    productId: s.productId,
    productName: s.product.scientific,
    commonName: s.product.commonEn,
    productImage: s.product.image,
    scientific: s.product.scientific,
    sizeCm: s.sizeCm,
    sizeInches: cmToInches(s.sizeCm),
    sizeLabel: formatCmAsInches(s.sizeCm),
    sex: s.sex,
    price: s.price,
    photoUrl: s.photoUrl,
    tarantulAppId: s.tarantulAppId,
    status: s.status,
    locationType: s.locationType,
    locationId: s.locationId,
    locationName: s.location?.name ?? null,
    unitCost: s.unitCost,
    settlementPrice: s.settlementPrice,
    msrp: s.msrp,
    purchasedAt: s.purchasedAt.toISOString().slice(0, 10),
    lastMeasuredAt: s.lastMeasuredAt?.toISOString().slice(0, 10) ?? null,
    qrToken: s.qrToken,
    supplier: s.supplier,
    notes: s.notes,
    salePrice: s.salePrice,
    soldAt: s.soldAt?.toISOString().slice(0, 10) ?? null,
    salesChannel: s.salesChannel,
    paymentMethod: s.paymentMethod,
  };
}

const specimenInclude = {
  product: { select: { commonEn: true, scientific: true, image: true } },
  location: true,
} as const;

export async function listSpecimens(filters: SpecimenFilters = {}): Promise<SpecimenView[]> {
  const db = requireDb();
  const where: Prisma.SpecimenWhereInput = {};

  if (filters.productId) where.productId = filters.productId;
  if (filters.status) where.status = filters.status;
  if (filters.locationType) where.locationType = filters.locationType;
  if (filters.locationId) where.locationId = filters.locationId;
  if (filters.q?.trim()) {
    const q = filters.q.trim();
    where.OR = [
      { tarantulAppId: { contains: q, mode: "insensitive" } },
      { product: { commonEn: { contains: q, mode: "insensitive" } } },
      { product: { scientific: { contains: q, mode: "insensitive" } } },
      { notes: { contains: q, mode: "insensitive" } },
    ];
  }

  const rows = await db.specimen.findMany({
    where,
    include: specimenInclude,
    orderBy: [{ status: "asc" }, { purchasedAt: "asc" }],
    take: 500,
  });
  return rows.map(mapSpecimen);
}

export async function getSpecimenById(id: string): Promise<SpecimenView | null> {
  const db = requireDb();
  const row = await db.specimen.findUnique({ where: { id }, include: specimenInclude });
  return row ? mapSpecimen(row) : null;
}

/** Group in-stock specimens (warehouse + distributor) into storefront buy-boxes by (size, sex, price). */
export async function listAvailabilityGroups(productIds?: string[]): Promise<AvailabilityGroup[]> {
  const db = requireDb();
  const rows = await db.specimen.findMany({
    where: {
      ...PURCHASABLE_WHERE,
      ...(productIds && productIds.length > 0 ? { productId: { in: productIds } } : {}),
    },
    select: {
      productId: true,
      sizeCm: true,
      sex: true,
      price: true,
      photoUrl: true,
      status: true,
      locationType: true,
    },
    orderBy: { purchasedAt: "asc" },
  });

  const groups = new Map<string, AvailabilityGroup>();
  for (const r of rows) {
    const key = `${r.productId}:${r.sizeCm}:${r.sex}:${r.price}`;
    const isWarehouse = r.locationType === "warehouse";
    const existing = groups.get(key);
    if (existing) {
      existing.stock += 1;
      if (isWarehouse) existing.warehouseStock += 1;
      else existing.distributorStock += 1;
      if (!existing.photoUrl && r.photoUrl) existing.photoUrl = r.photoUrl;
    } else {
      groups.set(key, {
        productId: r.productId,
        sizeCm: r.sizeCm,
        sizeInches: cmToInches(r.sizeCm),
        sizeLabel: formatCmAsInches(r.sizeCm),
        sex: r.sex,
        price: r.price,
        stock: 1,
        warehouseStock: isWarehouse ? 1 : 0,
        distributorStock: isWarehouse ? 0 : 1,
        photoUrl: r.photoUrl ?? null,
      });
    }
  }
  return [...groups.values()];
}

async function recordMovement(
  tx: Prisma.TransactionClient,
  data: {
    specimenId: string;
    type: InventoryMovementType;
    fromLocationType?: SpecimenLocationType | null;
    fromLocationId?: string | null;
    toLocationType?: SpecimenLocationType | null;
    toLocationId?: string | null;
    amount?: number | null;
    salesChannel?: SalesChannel | null;
    paymentMethod?: PaymentMethod | null;
    notes?: string;
  },
) {
  await tx.inventoryMovement.create({
    data: {
      specimenId: data.specimenId,
      type: data.type,
      fromLocationType: data.fromLocationType ?? null,
      fromLocationId: data.fromLocationId ?? null,
      toLocationType: data.toLocationType ?? null,
      toLocationId: data.toLocationId ?? null,
      amount: data.amount ?? null,
      salesChannel: data.salesChannel ?? null,
      paymentMethod: data.paymentMethod ?? null,
      notes: data.notes ?? "",
    },
  });
}

/** Recompute ProductDistributorStock from consignment specimens. */
export async function syncAggregateStock(productId?: string) {
  const db = requireDb();
  await db.$transaction(async (tx) => {
    const productFilter = productId ? { productId } : {};

    const consignmentCounts = await tx.specimen.groupBy({
      by: ["productId", "locationId"],
      where: {
        ...productFilter,
        status: { in: IN_STOCK_STATUSES },
        locationType: "consignment",
        locationId: { not: null },
      },
      _count: { _all: true },
    });

    const distRows = await tx.productDistributorStock.findMany({
      where: productFilter,
      select: { id: true, productId: true, locationId: true },
    });

    const countByKey = new Map<string, number>(
      consignmentCounts.map((c) => [`${c.productId}:${c.locationId}`, c._count._all]),
    );
    const syncedKeys = new Set<string>();

    for (const row of distRows) {
      const key = `${row.productId}:${row.locationId}`;
      syncedKeys.add(key);
      await tx.productDistributorStock.update({
        where: { id: row.id },
        data: { stock: countByKey.get(key) ?? 0 },
      });
    }

    for (const c of consignmentCounts) {
      if (!c.locationId) continue;
      const key = `${c.productId}:${c.locationId}`;
      if (syncedKeys.has(key)) continue;
      await tx.productDistributorStock.upsert({
        where: { productId_locationId: { productId: c.productId, locationId: c.locationId } },
        create: { productId: c.productId, locationId: c.locationId, stock: c._count._all },
        update: { stock: c._count._all },
      });
    }

    const productsWithConsignment = [...new Set(consignmentCounts.map((c) => c.productId))];
    if (productsWithConsignment.length > 0) {
      await tx.product.updateMany({
        where: { id: { in: productsWithConsignment } },
        data: { availableAtDistributor: true },
      });
    }
  });
  if (productId) {
    const { processWishlistStockAlerts, processArrivalAlerts } = await import("@/lib/account/stock-alerts");
    void processWishlistStockAlerts(productId).catch((e) => console.error("[syncAggregateStock] wishlist alerts:", e));
    void processArrivalAlerts(productId).catch((e) => console.error("[syncAggregateStock] arrival alerts:", e));
  }
}

/** Receive a batch of one or more rows (each row = N identical specimens) across one or more species. */
export async function receiveSpecimenBatch(rows: ReceiveBatchRowInput[]): Promise<string[]> {
  const db = requireDb();
  if (!rows.length) throw new Error("No rows to receive.");

  const ids: string[] = [];

  await db.$transaction(async (tx) => {
    for (const row of rows) {
      const qty = Math.max(1, Math.min(200, Math.round(row.quantity)));
      const locationType = row.locationType ?? "warehouse";
      const locationId = locationType === "consignment" ? row.locationId : null;
      if (locationType === "consignment" && !locationId) {
        throw new Error("Distributor location is required for consignment.");
      }
      if (!(row.sizeCm > 0)) throw new Error("Size (cm) is required.");

      const tarantulAppIds = row.tarantulAppIds ?? [];
      if (row.tarantulAppId && qty === 1) tarantulAppIds.push(row.tarantulAppId);
      if (tarantulAppIds.length > 0 && tarantulAppIds.length !== qty) {
        throw new Error("Number of TarantulApp IDs must match quantity.");
      }

      for (let i = 0; i < qty; i++) {
        const tarantulAppId = tarantulAppIds[i]?.trim() || null;
        if (tarantulAppId) {
          const taken = await tx.specimen.findUnique({ where: { tarantulAppId } });
          if (taken) throw new Error(`TarantulApp ID already in use: ${tarantulAppId}`);
        }

        const created = await tx.specimen.create({
          data: {
            productId: row.productId,
            sizeCm: row.sizeCm,
            sex: row.sex,
            price: row.price,
            settlementPrice: row.settlementPrice ?? null,
            msrp: row.msrp ?? null,
            photoUrl: row.photoUrl || null,
            tarantulAppId,
            status: "available",
            locationType,
            locationId,
            unitCost: row.unitCost,
            purchasedAt: row.purchasedAt,
            lastMeasuredAt: row.purchasedAt,
            supplier: row.supplier ?? "",
            notes: row.notes ?? "",
          },
        });
        ids.push(created.id);

        await tx.growthRecord.create({
          data: {
            specimenId: created.id,
            measuredAt: row.purchasedAt,
            sizeCm: row.sizeCm,
            source: "intake",
            notes: row.supplier ? `Intake from ${row.supplier}` : "Intake",
          },
        });

        await recordMovement(tx, {
          specimenId: created.id,
          type: "purchase",
          toLocationType: locationType,
          toLocationId: locationId,
          amount: row.unitCost,
          notes: row.supplier ? `Supplier: ${row.supplier}` : "",
        });
      }
    }
  });

  const arrivedByProduct = new Map<string, Date>();
  for (const row of rows) {
    const prev = arrivedByProduct.get(row.productId);
    if (!prev || row.purchasedAt > prev) arrivedByProduct.set(row.productId, row.purchasedAt);
  }
  for (const [productId, arrived] of arrivedByProduct) {
    await db.product.update({
      where: { id: productId },
      data: { arrived, newArrival: true, hideWhenSoldOut: false },
    });
  }

  const productIds = [...new Set(rows.map((r) => r.productId))];
  const consignmentProductIds = [...new Set(rows.filter((r) => r.locationType === "consignment").map((r) => r.productId))];
  if (consignmentProductIds.length > 0) {
    await db.product.updateMany({
      where: { id: { in: consignmentProductIds } },
      data: { availableAtDistributor: true },
    });
  }
  await Promise.all(productIds.map((id) => syncAggregateStock(id)));

  for (const row of rows) {
    if (
      row.locationType === "consignment" &&
      row.locationId &&
      row.distributorPrice != null &&
      row.distributorPrice > 0
    ) {
      await setDistributorPrice(row.productId, row.locationId, row.distributorPrice);
    }
  }

  return ids;
}

export async function transferToConsignment(input: TransferInput): Promise<void> {
  const db = requireDb();
  if (!input.specimenIds.length) throw new Error("No specimens selected.");

  await db.$transaction(async (tx) => {
    for (const id of input.specimenIds) {
      const s = await tx.specimen.findUnique({ where: { id } });
      if (!s) throw new Error(`Specimen not found: ${id}`);
      if (!IN_STOCK_STATUSES.includes(s.status)) {
        throw new Error(`Cannot transfer specimen ${id} (status: ${s.status}).`);
      }

      const fromType = s.locationType;
      const fromId = s.locationId;

      // Location changes; status stays "available" — location is not a status.
      await tx.specimen.update({
        where: { id },
        data: {
          status: "available",
          locationType: "consignment",
          locationId: input.locationId,
        },
      });

      await recordMovement(tx, {
        specimenId: id,
        type: "transfer",
        fromLocationType: fromType,
        fromLocationId: fromId,
        toLocationType: "consignment",
        toLocationId: input.locationId,
        notes: input.notes ?? "",
      });
    }
  });

  const productIds = [...new Set(
    (await db.specimen.findMany({
      where: { id: { in: input.specimenIds } },
      select: { productId: true },
    })).map((s) => s.productId),
  )];
  if (productIds.length > 0) {
    await db.product.updateMany({
      where: { id: { in: productIds } },
      data: { availableAtDistributor: true },
    });
  }

  await syncAggregateStock();

  if (input.distributorPrice != null && input.distributorPrice > 0) {
    await Promise.all(
      productIds.map((productId) => setDistributorPrice(productId, input.locationId, input.distributorPrice!)),
    );
  }
}

export async function transferToWarehouse(specimenIds: string[], notes?: string): Promise<void> {
  const db = requireDb();
  if (!specimenIds.length) throw new Error("No specimens selected.");

  await db.$transaction(async (tx) => {
    for (const id of specimenIds) {
      const s = await tx.specimen.findUnique({ where: { id } });
      if (!s) throw new Error(`Specimen not found: ${id}`);
      if (!IN_STOCK_STATUSES.includes(s.status)) {
        throw new Error(`Cannot transfer specimen ${id} (status: ${s.status}).`);
      }
      if (s.locationType === "warehouse") throw new Error(`Specimen ${id} is already at the warehouse.`);

      await tx.specimen.update({
        where: { id },
        data: {
          status: "available",
          locationType: "warehouse",
          locationId: null,
        },
      });

      await recordMovement(tx, {
        specimenId: id,
        type: "transfer",
        fromLocationType: s.locationType,
        fromLocationId: s.locationId,
        toLocationType: "warehouse",
        toLocationId: null,
        notes: notes ?? "Returned to warehouse",
      });
    }
  });

  await syncAggregateStock();
}

export async function sellSpecimensManual(input: ManualSaleInput): Promise<void> {
  const db = requireDb();
  if (!input.specimenIds.length) throw new Error("No specimens selected.");
  const priceEach = input.salePrice / input.specimenIds.length;
  const soldAt = input.soldAt ?? new Date();

  await db.$transaction(async (tx) => {
    for (const id of input.specimenIds) {
      const s = await tx.specimen.findUnique({ where: { id } });
      if (!s) throw new Error(`Specimen not found: ${id}`);
      if (!IN_STOCK_STATUSES.includes(s.status)) {
        throw new Error(`Cannot sell specimen ${id} (status: ${s.status}).`);
      }

      await tx.specimen.update({
        where: { id },
        data: {
          status: "sold",
          salePrice: priceEach,
          soldAt,
          salesChannel: input.salesChannel,
          paymentMethod: input.paymentMethod,
          notes: input.notes ? `${s.notes}\n${input.notes}`.trim() : s.notes,
        },
      });

      await recordMovement(tx, {
        specimenId: id,
        type: "sale",
        fromLocationType: s.locationType,
        fromLocationId: s.locationId,
        amount: priceEach,
        salesChannel: input.salesChannel,
        paymentMethod: input.paymentMethod,
        notes: input.notes ?? "",
      });

      // A sale of a specimen physically at a partner store is a partner sale —
      // record it in the settlement ledger (financial source of truth).
      if (s.locationType === "consignment" && s.locationId) {
        const settlementPrice = s.settlementPrice ?? priceEach;
        await tx.settlementEntry.create({
          data: {
            locationId: s.locationId,
            specimenId: s.id,
            soldAt,
            salePrice: priceEach,
            settlementPrice,
            partnerMargin: Math.max(0, priceEach - settlementPrice),
            notes: input.notes ?? "",
          },
        });
      }
    }
  });

  await syncAggregateStock();
}

export async function writeOffSpecimens(input: WriteOffInput): Promise<void> {
  const db = requireDb();
  if (!input.specimenIds.length) throw new Error("No specimens selected.");

  await db.$transaction(async (tx) => {
    for (const id of input.specimenIds) {
      const s = await tx.specimen.findUnique({ where: { id } });
      if (!s) throw new Error(`Specimen not found: ${id}`);
      if (s.status === "sold" || s.status === "written_off") {
        throw new Error(`Cannot write off specimen ${id}.`);
      }
      if (s.status === "allocated") {
        throw new Error(`Specimen ${id} is allocated to a paid order — cancel/refund the order first.`);
      }

      await tx.specimen.update({
        where: { id },
        data: { status: "written_off", notes: input.notes ?? s.notes },
      });

      await recordMovement(tx, {
        specimenId: id,
        type: "write_off",
        fromLocationType: s.locationType,
        fromLocationId: s.locationId,
        notes: input.notes ?? "",
      });
    }
  });

  await syncAggregateStock();
}

export interface UpdateSpecimenInput {
  sizeCm: number;
  sex: SpecimenSex;
  unitCost: number;
  price: number;
  settlementPrice?: number | null;
  msrp?: number | null;
  locationType: SpecimenLocationType;
  locationId?: string | null;
  notes: string;
}

/** Inline quick-edit from the inventory list — size/sex/cost/price/location/notes for a specimen still in hand. */
export async function updateSpecimen(specimenId: string, input: UpdateSpecimenInput): Promise<void> {
  const db = requireDb();
  if (!(input.sizeCm > 0)) throw new Error("Size (cm) must be greater than 0.");

  const locationId = input.locationType === "consignment" ? input.locationId || null : null;
  if (input.locationType === "consignment" && !locationId) {
    throw new Error("Distributor location is required.");
  }

  await db.$transaction(async (tx) => {
    const s = await tx.specimen.findUnique({ where: { id: specimenId } });
    if (!s) throw new Error("Specimen not found.");
    if (s.status === "sold" || s.status === "written_off") {
      throw new Error("Cannot edit a sold or written-off specimen.");
    }

    const locationChanged = input.locationType !== s.locationType || locationId !== s.locationId;
    const sizeChanged = input.sizeCm !== s.sizeCm;

    await tx.specimen.update({
      where: { id: specimenId },
      data: {
        sizeCm: input.sizeCm,
        sex: input.sex,
        unitCost: Math.max(0, input.unitCost),
        price: Math.max(0, input.price),
        settlementPrice: input.settlementPrice !== undefined ? input.settlementPrice : s.settlementPrice,
        msrp: input.msrp !== undefined ? input.msrp : s.msrp,
        notes: input.notes,
        locationType: input.locationType,
        locationId,
        // Location is not a status — normalize legacy "consignment" status, keep everything else.
        status: s.status === "consignment" ? "available" : s.status,
        ...(sizeChanged ? { lastMeasuredAt: new Date() } : {}),
      },
    });

    if (sizeChanged) {
      await tx.growthRecord.create({
        data: { specimenId, sizeCm: input.sizeCm, source: "manual", notes: "Inventory quick-edit" },
      });
    }

    if (locationChanged) {
      await recordMovement(tx, {
        specimenId,
        type: "transfer",
        fromLocationType: s.locationType,
        fromLocationId: s.locationId,
        toLocationType: input.locationType,
        toLocationId: locationId,
        notes: "Edited via inventory quick-edit",
      });
    }
  });

  if (input.locationType === "consignment") {
    const specimen = await db.specimen.findUnique({ where: { id: specimenId }, select: { productId: true } });
    if (specimen) {
      await db.product.update({
        where: { id: specimen.productId },
        data: { availableAtDistributor: true },
      });
    }
  }

  await syncAggregateStock();
}

export async function updateTarantulAppId(specimenId: string, tarantulAppId: string | null): Promise<void> {
  const db = requireDb();
  const trimmed = tarantulAppId?.trim() || null;
  if (trimmed) {
    const taken = await db.specimen.findFirst({
      where: { tarantulAppId: trimmed, NOT: { id: specimenId } },
    });
    if (taken) throw new Error("TarantulApp ID already in use.");
  }
  await db.specimen.update({
    where: { id: specimenId },
    data: { tarantulAppId: trimmed },
  });
}

/** FIFO allocation for web orders — warehouse first, then partner consignment stock. */
export interface DistributorPickupLine {
  productName: string;
  sizeLabel: string;
  sex: SpecimenSex;
  distributorName: string;
  distributorPhone: string;
  distributorEmail: string;
  locationId: string;
  price: number;
}

export interface AllocateSpecimensResult {
  ids: string[];
  distributorPickups: DistributorPickupLine[];
}

/**
 * Reserve specimens for a PAID order (available → allocated). They vanish from
 * the storefront immediately but are NOT sold yet — that only happens on
 * physical delivery (see `markOrderSpecimensSold`). The sale price is recorded
 * now (it is the amount actually paid) and never overwritten.
 */
export async function allocateSpecimensFifo(
  tx: Prisma.TransactionClient,
  opts: {
    productId: string;
    sizeCm: number;
    sex: SpecimenSex;
    price: number;
    qty: number;
    salePriceEach: number;
    orderId: string;
    orderLineId: string;
    salesChannel?: SalesChannel;
    paymentMethod?: PaymentMethod;
  },
): Promise<AllocateSpecimensResult> {
  const match = {
    productId: opts.productId,
    sizeCm: opts.sizeCm,
    sex: opts.sex,
    price: opts.price,
    status: { in: IN_STOCK_STATUSES },
  };

  const specimenInclude = {
    location: { select: { name: true, phone: true, email: true } },
    product: { select: { commonEn: true, scientific: true } },
  } as const;

  const warehouseSpecimens = await tx.specimen.findMany({
    where: { ...match, locationType: "warehouse" },
    include: specimenInclude,
    orderBy: { purchasedAt: "asc" },
    take: opts.qty,
  });

  let specimens = warehouseSpecimens;
  if (specimens.length < opts.qty) {
    const consignmentSpecimens = await tx.specimen.findMany({
      where: { ...match, locationType: "consignment" },
      include: specimenInclude,
      orderBy: { purchasedAt: "asc" },
      take: opts.qty - specimens.length,
    });
    specimens = [...specimens, ...consignmentSpecimens];
  }

  if (specimens.length < opts.qty) {
    throw new Error(`Insufficient specimens for ${opts.productId}/${opts.sizeCm}cm/${opts.sex}`);
  }

  const ids: string[] = [];
  const distributorPickups: DistributorPickupLine[] = [];

  for (const s of specimens) {
    await tx.specimen.update({
      where: { id: s.id },
      data: {
        status: "allocated",
        salePrice: opts.salePriceEach,
        salesChannel: opts.salesChannel ?? "web",
        paymentMethod: opts.paymentMethod ?? "stripe",
        orderId: opts.orderId,
      },
    });

    await tx.orderLineSpecimen.create({
      data: { orderLineId: opts.orderLineId, specimenId: s.id },
    });

    await recordMovement(tx, {
      specimenId: s.id,
      type: "allocation",
      fromLocationType: s.locationType,
      fromLocationId: s.locationId,
      amount: opts.salePriceEach,
      salesChannel: opts.salesChannel ?? "web",
      paymentMethod: opts.paymentMethod ?? "stripe",
      notes: `Order ${opts.orderId}`,
    });

    ids.push(s.id);

    if (s.locationType === "consignment" && s.location && s.locationId) {
      distributorPickups.push({
        productName: s.product.scientific,
        sizeLabel: formatCmAsInches(s.sizeCm),
        sex: s.sex,
        distributorName: s.location.name,
        distributorPhone: s.location.phone,
        distributorEmail: s.location.email,
        locationId: s.locationId,
        price: opts.salePriceEach,
      });
    }
  }

  return { ids, distributorPickups };
}

/** @deprecated renamed — orders now allocate on payment and sell on delivery. */
export const assignSpecimensFifo = allocateSpecimensFifo;

/**
 * Complete the sale of an order's allocated specimens (physical delivery
 * confirmed). Only now do they become SOLD.
 */
export async function markOrderSpecimensSold(orderId: string, soldAt = new Date()): Promise<void> {
  const db = requireDb();
  await db.$transaction(async (tx) => {
    const specimens = await tx.specimen.findMany({ where: { orderId } });
    for (const s of specimens) {
      if (s.status === "sold") continue;
      if (s.status !== "allocated") {
        throw new Error(`Specimen ${s.id} on order ${orderId} is not allocated (status: ${s.status}).`);
      }
      await tx.specimen.update({
        where: { id: s.id },
        data: { status: "sold", soldAt },
      });
      await recordMovement(tx, {
        specimenId: s.id,
        type: "sale",
        fromLocationType: s.locationType,
        fromLocationId: s.locationId,
        amount: s.salePrice,
        salesChannel: s.salesChannel,
        paymentMethod: s.paymentMethod,
        notes: `Delivery confirmed — order ${orderId}`,
      });
    }
  });
  await syncAggregateStock();
}

/**
 * Release an order's allocated specimens back to AVAILABLE (cancellation /
 * no-show). Physical location is untouched — disposition is a separate,
 * manual decision.
 */
export async function releaseOrderSpecimens(orderId: string, notes = ""): Promise<string[]> {
  const db = requireDb();
  const released: string[] = [];
  await db.$transaction(async (tx) => {
    const specimens = await tx.specimen.findMany({ where: { orderId } });
    for (const s of specimens) {
      if (s.status !== "allocated") continue;
      await tx.orderLineSpecimen.deleteMany({ where: { specimenId: s.id } });
      await tx.specimen.update({
        where: { id: s.id },
        data: {
          status: "available",
          orderId: null,
          salePrice: null,
          soldAt: null,
          salesChannel: null,
          paymentMethod: null,
        },
      });
      await recordMovement(tx, {
        specimenId: s.id,
        type: "release",
        fromLocationType: s.locationType,
        fromLocationId: s.locationId,
        notes: notes || `Released from order ${orderId}`,
      });
      released.push(s.id);
    }
  });
  await syncAggregateStock();
  return released;
}

export async function countAvailableWarehouse(
  productId: string,
  sizeCm: number,
  sex: SpecimenSex,
  price: number,
): Promise<number> {
  const db = requireDb();
  return db.specimen.count({
    where: { productId, sizeCm, sex, price, status: { in: IN_STOCK_STATUSES }, locationType: "warehouse" },
  });
}

/** Warehouse + distributor consignment stock for a buy-box (storefront checkout). */
export async function countPurchasableStock(
  productId: string,
  sizeCm: number,
  sex: SpecimenSex,
  price: number,
): Promise<number> {
  const db = requireDb();
  return db.specimen.count({
    where: { productId, sizeCm, sex, price, ...PURCHASABLE_WHERE },
  });
}

export async function getFinanceSummary(from?: Date, to?: Date): Promise<FinanceSummary> {
  const db = requireDb();

  const inStock = await db.specimen.findMany({
    where: { status: { in: [...IN_STOCK_STATUSES, "allocated"] } },
    select: { unitCost: true, locationType: true },
  });

  let inventoryValue = 0;
  let inventoryCount = 0;
  let consignmentValue = 0;
  let consignmentCount = 0;
  for (const s of inStock) {
    if (s.locationType === "consignment") {
      consignmentValue += s.unitCost;
      consignmentCount++;
    } else {
      inventoryValue += s.unitCost;
      inventoryCount++;
    }
  }

  const soldWhere: Prisma.SpecimenWhereInput = { status: "sold" };
  if (from || to) {
    soldWhere.soldAt = {};
    if (from) soldWhere.soldAt.gte = from;
    if (to) soldWhere.soldAt.lte = to;
  }

  const sold = await db.specimen.findMany({
    where: soldWhere,
    select: {
      unitCost: true,
      salePrice: true,
      salesChannel: true,
      paymentMethod: true,
    },
  });

  let salesTotal = 0;
  let cogs = 0;
  const channelMap = new Map<SalesChannel, { count: number; revenue: number; cogs: number }>();
  const paymentMap = new Map<PaymentMethod, { count: number; revenue: number }>();

  for (const s of sold) {
    const rev = s.salePrice ?? 0;
    salesTotal += rev;
    cogs += s.unitCost;

    const ch = s.salesChannel ?? "other";
    const ce = channelMap.get(ch) ?? { count: 0, revenue: 0, cogs: 0 };
    ce.count++;
    ce.revenue += rev;
    ce.cogs += s.unitCost;
    channelMap.set(ch, ce);

    const pm = s.paymentMethod ?? "other";
    const pe = paymentMap.get(pm) ?? { count: 0, revenue: 0 };
    pe.count++;
    pe.revenue += rev;
    paymentMap.set(pm, pe);
  }

  const margin = salesTotal - cogs;

  return {
    inventoryValue,
    inventoryCount,
    consignmentValue,
    consignmentCount,
    salesTotal,
    cogs,
    margin,
    marginPct: salesTotal > 0 ? (margin / salesTotal) * 100 : 0,
    soldCount: sold.length,
    byChannel: [...channelMap.entries()].map(([channel, v]) => ({ channel, ...v })),
    byPayment: [...paymentMap.entries()].map(([method, v]) => ({ method, ...v })),
  };
}

export async function exportSoldSpecimensCsv(from?: Date, to?: Date): Promise<string> {
  const db = requireDb();
  const where: Prisma.SpecimenWhereInput = { status: "sold" };
  if (from || to) {
    where.soldAt = {};
    if (from) where.soldAt.gte = from;
    if (to) where.soldAt.lte = to;
  }

  const rows = await db.specimen.findMany({
    where,
    include: { product: true, location: true },
    orderBy: { soldAt: "desc" },
  });

  const header = "soldAt,tarantulAppId,scientific,commonName,sizeCm,sex,unitCost,salePrice,margin,channel,payment,location\n";
  const lines = rows.map((s) => {
    const margin = (s.salePrice ?? 0) - s.unitCost;
    return [
      s.soldAt?.toISOString().slice(0, 10) ?? "",
      s.tarantulAppId ?? "",
      s.product.scientific,
      `"${s.product.commonEn.replace(/"/g, '""')}"`,
      s.sizeCm.toFixed(2),
      s.sex,
      s.unitCost.toFixed(2),
      (s.salePrice ?? 0).toFixed(2),
      margin.toFixed(2),
      s.salesChannel ?? "",
      s.paymentMethod ?? "",
      s.location?.name ?? "warehouse",
    ].join(",");
  });

  return header + lines.join("\n");
}

export async function deleteSpecimens(specimenIds: string[]): Promise<void> {
  const db = requireDb();
  if (!specimenIds.length) throw new Error("No specimens selected.");

  await db.$transaction(async (tx) => {
    for (const id of specimenIds) {
      const s = await tx.specimen.findUnique({
        where: { id },
        include: { orderLineLinks: true },
      });
      if (!s) throw new Error(`Specimen not found: ${id}`);
      if (s.status === "sold" || s.status === "allocated") {
        throw new Error(`Cannot delete ${s.status} specimen${s.tarantulAppId ? ` (${s.tarantulAppId})` : ""}.`);
      }
      if (s.orderLineLinks.length > 0) {
        throw new Error(`Specimen ${id} is linked to an order.`);
      }
      await tx.inventoryMovement.deleteMany({ where: { specimenId: id } });
      await tx.specimen.delete({ where: { id } });
    }
  });

  await syncAggregateStock();
}

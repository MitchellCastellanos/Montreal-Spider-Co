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
import { cmToInches, formatCmAsInches } from "@/lib/size-inches";

export type {
  SpecimenStatus,
  SpecimenLocationType,
  SpecimenSex,
  SalesChannel,
  PaymentMethod,
  InventoryMovementType,
};

export interface SpecimenView {
  id: string;
  productId: string;
  productName: string;
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
  purchasedAt: string;
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
  photoUrl?: string | null;
  quantity: number;
  purchasedAt: Date;
  supplier?: string;
  notes?: string;
  locationType?: SpecimenLocationType;
  locationId?: string;
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
  stock: number;
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
    purchasedAt: Date;
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
    productName: s.product.commonEn,
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
    purchasedAt: s.purchasedAt.toISOString().slice(0, 10),
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

/** Group available warehouse specimens into storefront buy-boxes by (size, sex, price). */
export async function listAvailabilityGroups(productIds?: string[]): Promise<AvailabilityGroup[]> {
  const db = requireDb();
  const rows = await db.specimen.findMany({
    where: {
      status: "available",
      locationType: "warehouse",
      ...(productIds && productIds.length > 0 ? { productId: { in: productIds } } : {}),
    },
    select: { productId: true, sizeCm: true, sex: true, price: true, photoUrl: true },
    orderBy: { purchasedAt: "asc" },
  });

  const groups = new Map<string, AvailabilityGroup>();
  for (const r of rows) {
    const key = `${r.productId}:${r.sizeCm}:${r.sex}:${r.price}`;
    const existing = groups.get(key);
    if (existing) {
      existing.stock += 1;
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
      where: { ...productFilter, status: "consignment", locationId: { not: null } },
      _count: { _all: true },
    });

    const distRows = await tx.productDistributorStock.findMany({
      where: productFilter,
      select: { id: true, productId: true, locationId: true },
    });

    for (const row of distRows) {
      const match = consignmentCounts.find((c) => c.productId === row.productId && c.locationId === row.locationId);
      await tx.productDistributorStock.update({
        where: { id: row.id },
        data: { stock: match?._count._all ?? 0 },
      });
    }
  });
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

      const status = locationType === "consignment" ? "consignment" : "available";

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
            photoUrl: row.photoUrl || null,
            tarantulAppId,
            status,
            locationType,
            locationId,
            unitCost: row.unitCost,
            purchasedAt: row.purchasedAt,
            supplier: row.supplier ?? "",
            notes: row.notes ?? "",
          },
        });
        ids.push(created.id);

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
  await Promise.all(productIds.map((id) => syncAggregateStock(id)));
  return ids;
}

export async function transferToConsignment(input: TransferInput): Promise<void> {
  const db = requireDb();
  if (!input.specimenIds.length) throw new Error("No specimens selected.");

  await db.$transaction(async (tx) => {
    for (const id of input.specimenIds) {
      const s = await tx.specimen.findUnique({ where: { id } });
      if (!s) throw new Error(`Specimen not found: ${id}`);
      if (s.status !== "available" && s.status !== "consignment") {
        throw new Error(`Cannot transfer specimen ${id} (status: ${s.status}).`);
      }

      const fromType = s.locationType;
      const fromId = s.locationId;

      await tx.specimen.update({
        where: { id },
        data: {
          status: "consignment",
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

  await syncAggregateStock();
}

export async function transferToWarehouse(specimenIds: string[], notes?: string): Promise<void> {
  const db = requireDb();
  if (!specimenIds.length) throw new Error("No specimens selected.");

  await db.$transaction(async (tx) => {
    for (const id of specimenIds) {
      const s = await tx.specimen.findUnique({ where: { id } });
      if (!s) throw new Error(`Specimen not found: ${id}`);
      if (s.status !== "consignment") throw new Error(`Specimen ${id} is not in consignment.`);

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
        fromLocationType: "consignment",
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
      if (s.status !== "available" && s.status !== "consignment") {
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

    await tx.specimen.update({
      where: { id: specimenId },
      data: {
        sizeCm: input.sizeCm,
        sex: input.sex,
        unitCost: Math.max(0, input.unitCost),
        price: Math.max(0, input.price),
        notes: input.notes,
        locationType: input.locationType,
        locationId,
        status: input.locationType === "consignment" ? "consignment" : "available",
      },
    });

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

/** FIFO assignment from warehouse for web orders — matches the (size, sex, price) buy-box the customer ordered. */
export async function assignSpecimensFifo(
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
): Promise<string[]> {
  const specimens = await tx.specimen.findMany({
    where: {
      productId: opts.productId,
      sizeCm: opts.sizeCm,
      sex: opts.sex,
      price: opts.price,
      status: "available",
      locationType: "warehouse",
    },
    orderBy: { purchasedAt: "asc" },
    take: opts.qty,
  });

  if (specimens.length < opts.qty) {
    throw new Error(`Insufficient specimens for ${opts.productId}/${opts.sizeCm}cm/${opts.sex}`);
  }

  const soldAt = new Date();
  const ids: string[] = [];

  for (const s of specimens) {
    await tx.specimen.update({
      where: { id: s.id },
      data: {
        status: "sold",
        salePrice: opts.salePriceEach,
        soldAt,
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
      type: "sale",
      fromLocationType: "warehouse",
      fromLocationId: null,
      amount: opts.salePriceEach,
      salesChannel: opts.salesChannel ?? "web",
      paymentMethod: opts.paymentMethod ?? "stripe",
      notes: `Order ${opts.orderId}`,
    });

    ids.push(s.id);
  }

  return ids;
}

export async function countAvailableWarehouse(
  productId: string,
  sizeCm: number,
  sex: SpecimenSex,
  price: number,
): Promise<number> {
  const db = requireDb();
  return db.specimen.count({
    where: { productId, sizeCm, sex, price, status: "available", locationType: "warehouse" },
  });
}

export async function getFinanceSummary(from?: Date, to?: Date): Promise<FinanceSummary> {
  const db = requireDb();

  const inStock = await db.specimen.findMany({
    where: { status: { in: ["available", "consignment"] } },
    select: { unitCost: true, status: true },
  });

  let inventoryValue = 0;
  let inventoryCount = 0;
  let consignmentValue = 0;
  let consignmentCount = 0;
  for (const s of inStock) {
    if (s.status === "available") {
      inventoryValue += s.unitCost;
      inventoryCount++;
    } else {
      consignmentValue += s.unitCost;
      consignmentCount++;
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

  const header = "soldAt,tarantulAppId,species,scientific,sizeCm,sex,unitCost,salePrice,margin,channel,payment,location\n";
  const lines = rows.map((s) => {
    const margin = (s.salePrice ?? 0) - s.unitCost;
    return [
      s.soldAt?.toISOString().slice(0, 10) ?? "",
      s.tarantulAppId ?? "",
      `"${s.product.commonEn.replace(/"/g, '""')}"`,
      s.product.scientific,
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
      if (s.status === "sold") {
        throw new Error(`Cannot delete sold specimen${s.tarantulAppId ? ` (${s.tarantulAppId})` : ""}.`);
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

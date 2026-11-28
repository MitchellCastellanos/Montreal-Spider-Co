import "server-only";
import type { SpecimenSex, SupplierOffer } from "@prisma/client";
import { prisma } from "@/lib/db";
import { logDbFallback } from "@/lib/data/db-safe";

function requireDb() {
  if (!prisma) throw new Error("Database not configured.");
  return prisma;
}

export type OfferWithProduct = SupplierOffer & { product: { slug: string; scientific: string; commonEn: string } };

export async function listOffers(): Promise<OfferWithProduct[]> {
  if (!prisma) return [];
  try {
    return await prisma.supplierOffer.findMany({
      include: { product: { select: { slug: true, scientific: true, commonEn: true } } },
      orderBy: [{ published: "desc" }, { createdAt: "desc" }],
    });
  } catch (e) {
    logDbFallback("listOffers", e);
    return [];
  }
}

/** Published offers for the given products (storefront). Private cost is not selected. */
export async function listPublishedOffers(productIds: string[]) {
  if (!prisma || productIds.length === 0) return [];
  return prisma.supplierOffer.findMany({
    where: { productId: { in: productIds }, published: true },
    select: { id: true, productId: true, sizeCm: true, sex: true, price: true, leadDaysMin: true, leadDaysMax: true, maxPerOrder: true },
    orderBy: { price: "asc" },
  });
}

export interface OfferInput {
  priceMode?: "manual" | "margin";
  productId: string;
  sizeCm: number;
  sex: SpecimenSex;
  price: number;
  unitCost: number;
  leadDaysMin: number;
  leadDaysMax: number;
  maxPerOrder: number;
  notes: string;
}

function validate(input: OfferInput): void {
  if (!input.productId) throw new Error("Choose a listing.");
  if (!(input.sizeCm > 0)) throw new Error("Size is required.");
  if (!(input.price > 0)) throw new Error("Price must be greater than 0.");
  if (!(input.unitCost >= 0)) throw new Error("Cost can't be negative.");
  if (!(input.leadDaysMin >= 1) || input.leadDaysMax < input.leadDaysMin) throw new Error("Lead time: max must be ≥ min ≥ 1 business day.");
  if (!(input.maxPerOrder >= 1 && input.maxPerOrder <= 5)) throw new Error("Max per order must be 1–5.");
}

export async function createOffer(input: OfferInput): Promise<SupplierOffer> {
  validate(input);
  return requireDb().supplierOffer.create({ data: { ...input, published: false } });
}

export async function setOfferPublished(id: string, published: boolean): Promise<void> {
  await requireDb().supplierOffer.update({ where: { id }, data: { published, publishedAt: published ? new Date() : null } });
}

/** Instantly hide every external offer without touching own inventory. */
export async function unpublishAllOffers(): Promise<number> {
  const r = await requireDb().supplierOffer.updateMany({ where: { published: true }, data: { published: false, publishedAt: null } });
  return r.count;
}

export async function deleteOffer(id: string): Promise<void> {
  // OrderLine.supplierOfferId is SetNull, so historic orders keep their lines.
  await requireDb().supplierOffer.delete({ where: { id } });
}

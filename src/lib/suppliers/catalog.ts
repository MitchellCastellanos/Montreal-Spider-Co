import "server-only";
import { prisma } from "@/lib/db";
import { getExternalSettings } from "@/lib/external-orders/settings";
import { computeOfferPrice } from "@/lib/external-orders/pricing";
import { pricingFrom } from "@/lib/external-orders/rotation-service";
import { isListed, speciesKey } from "@/lib/suppliers/tarcan";
import { normalizeScientific } from "@/lib/species-lookup-utils";

function requireDb() {
  if (!prisma) throw new Error("Database not configured.");
  return prisma;
}

export interface CatalogRow {
  id: string;
  externalId: number;
  rawName: string;
  sizeRaw: string;
  sizeParsed: boolean;
  sex: string;
  price: number;
  prevPrice: number | null;
  notes: string;
  isNewArrival: boolean;
  listed: boolean;
  missingRuns: number;
  lastSeen: string;
  /** Listing (species page) matched by exact "Genus species" — null when MSC has none. */
  productId: string | null;
  productLabel: string | null;
  hasOffer: boolean;
}

/** Match every catalog item to an MSC listing by exact species name (never fuzzy; ambiguous names stay unmatched). */
export async function listCatalog(now = new Date()): Promise<CatalogRow[]> {
  const db = requireDb();
  const [items, products] = await Promise.all([
    db.supplierItem.findMany({ where: { supplier: "tarcan" }, include: { offer: { select: { id: true } } }, orderBy: [{ genus: "asc" }, { species: "asc" }, { sizeCm: "asc" }] }),
    db.product.findMany({ select: { id: true, scientific: true, commonEn: true } }),
  ]);
  const byKey = new Map<string, { id: string; label: string }[]>();
  for (const p of products) {
    const k = normalizeScientific(p.scientific).toLowerCase();
    if (!k.includes(" ")) continue;
    const list = byKey.get(k) ?? [];
    list.push({ id: p.id, label: `${p.scientific}${p.commonEn ? ` — ${p.commonEn}` : ""}` });
    byKey.set(k, list);
  }
  return items.map((i) => {
    const matches = byKey.get(speciesKey(i.rawName)) ?? [];
    const match = matches.length === 1 ? matches[0] : null;
    return {
      id: i.id,
      externalId: i.externalId,
      rawName: i.rawName,
      sizeRaw: i.sizeRaw,
      sizeParsed: i.sizeCm != null,
      sex: i.sex,
      price: i.price,
      prevPrice: i.prevPrice,
      notes: i.notes,
      isNewArrival: i.isNewArrival,
      listed: isListed(i, now),
      missingRuns: i.missingRuns,
      lastSeen: i.lastSeenAt.toISOString().slice(0, 16).replace("T", " "),
      productId: match?.id ?? null,
      productLabel: match?.label ?? null,
      hasOffer: Boolean(i.offer),
    };
  });
}

/** Create a HIDDEN, margin-priced offer from a catalog item (the supplier's price becomes the private cost). */
export async function createOfferFromItem(itemId: string): Promise<string> {
  const db = requireDb();
  const rows = await listCatalog();
  const row = rows.find((r) => r.id === itemId);
  if (!row) throw new Error("Catalog item not found.");
  if (row.hasOffer) throw new Error("This item already has an offer.");
  if (!row.productId) throw new Error("No species listing matches this name exactly — create or rename the listing first.");
  const item = await db.supplierItem.findUnique({ where: { id: itemId } });
  if (!item?.sizeCm) throw new Error("The supplier's size text couldn't be read — create this offer manually.");
  const priced = computeOfferPrice(item.price, pricingFrom(await getExternalSettings()));
  if (!priced) throw new Error("The profit margin target can't be reached — lower it in Settings.");
  const offer = await db.supplierOffer.create({
    data: {
      productId: row.productId,
      itemId,
      supplier: "Tarantula Canada",
      sizeCm: item.sizeCm,
      sex: item.sex,
      unitCost: item.price,
      price: priced.price,
      priceMode: "margin",
      published: false,
      notes: `Tarantula Canada item ${item.externalId}`,
    },
  });
  return offer.id;
}

/** Bulk: hidden offers for every listed, matched, readable item without an offer yet. Returns how many were created. */
export async function createOffersForMatched(limit = 60): Promise<number> {
  const rows = (await listCatalog()).filter((r) => r.listed && r.productId && r.sizeParsed && !r.hasOffer).slice(0, limit);
  let n = 0;
  for (const r of rows) {
    try {
      await createOfferFromItem(r.id);
      n++;
    } catch {
      // skip items that can't be priced
    }
  }
  return n;
}

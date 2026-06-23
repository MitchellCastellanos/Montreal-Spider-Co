import "server-only";
import type { Product as DbProduct, ProductDistributorStock as DbDistStock, StoreLocation as DbLocation } from "@prisma/client";
import { prisma, hasDatabase } from "@/lib/db";
import { getDefaultProductImage } from "@/lib/data/site-settings";
import { logDbFallback } from "@/lib/data/db-safe";
import { getDistributors } from "@/lib/data/distributors";
import { getDistributorLocations } from "@/lib/data/locations";
import { listAvailabilityGroups } from "@/lib/data/specimens";
import { getSpeciesById, type SpeciesProfile } from "@/lib/data/species";
import { deriveSlug } from "@/lib/species-utils";
import { PRODUCTS as SEED, GENERA as SEED_GENERA } from "@/lib/products";
import { parseWeeklyHours, EMPTY_WEEKLY_HOURS } from "@/lib/opening-hours";
import { isStorefrontVisible, type AvailableUnit, type DistributorSnippet, type Product, type ProductDistributorStock } from "@/lib/types";

export type { Product };

type DbProductFull = DbProduct & {
  distributorStocks?: (DbDistStock & { location?: DbLocation })[];
};

const productInclude = {
  distributorStocks: { include: { location: true } },
} as const;

function mapDistributorSnippet(d: DbLocation): DistributorSnippet {
  return {
    id: d.id,
    name: d.name,
    neighborhood: d.neighborhood,
    address: d.address,
    phone: d.phone,
    mapsUrl: d.mapsUrl,
    hours: parseWeeklyHours(d.hours) ?? { ...EMPTY_WEEKLY_HOURS },
  };
}

function mapProduct(p: DbProductFull, defaultImage?: string | null): Product {
  const image = p.image ?? defaultImage ?? undefined;
  const distributorStocks: ProductDistributorStock[] = (p.distributorStocks ?? []).map((ds) => ({
    distributorId: ds.locationId,
    stock: ds.stock,
  }));
  const distributors: DistributorSnippet[] = (p.distributorStocks ?? [])
    .filter((ds) => ds.stock > 0 && ds.location?.active && ds.location.isDistributor)
    .map((ds) => mapDistributorSnippet(ds.location!));

  return {
    id: p.id,
    slug: p.slug,
    scientific: p.scientific,
    common: { en: p.commonEn, fr: p.commonFr },
    genus: p.genus,
    experience: p.experience,
    type: p.type,
    temperament: p.temperament,
    availability: [],
    featured: p.featured,
    newArrival: p.newArrival,
    availableAtPickup: p.availableAtPickup,
    availableAtDistributor: p.availableAtDistributor,
    hideWhenSoldOut: p.hideWhenSoldOut,
    distributorStocks,
    distributors: p.availableAtDistributor ? distributors : undefined,
    hue: p.hue,
    accent: p.accent,
    image,
    adultSize: { en: p.adultSizeEn, fr: p.adultSizeFr },
    growth: { en: p.growthEn, fr: p.growthFr },
    origin: { en: p.originEn, fr: p.originFr },
    lifespan: { en: p.lifespanEn, fr: p.lifespanFr },
    humidity: p.humidity,
    temperature: p.temperature,
    enclosure: { en: p.enclosureEn, fr: p.enclosureFr },
    diet: { en: p.dietEn, fr: p.dietFr },
    description: { en: p.descriptionEn, fr: p.descriptionFr },
    careGuide: p.careGuide ?? undefined,
    arrived: p.arrived.toISOString().slice(0, 10),
  };
}

/** Attach full distributor list for storefront tooltips. */
async function attachDistributorDetails(products: Product[]): Promise<Product[]> {
  const allDistributors = await getDistributors();
  return products.map((p) => {
    if (!p.availableAtDistributor) return p;
    const stockMap = new Map((p.distributorStocks ?? []).map((s) => [s.distributorId, s.stock]));
    const withStock = allDistributors.filter((d) => (stockMap.get(d.id) ?? 0) > 0);
    const list = withStock.length > 0 ? withStock : allDistributors;
    return {
      ...p,
      distributors: list.map((d) => ({
        id: d.id,
        name: d.name,
        neighborhood: d.neighborhood,
        address: d.address,
        phone: d.phone,
        mapsUrl: d.mapsUrl,
        hours: d.hours,
      })),
    };
  });
}

/** Attach live specimen-based availability (size/sex/price buckets) to each product. */
async function attachAvailability(products: Product[]): Promise<Product[]> {
  if (!prisma || products.length === 0) return products;
  try {
    const groups = await listAvailabilityGroups(products.map((p) => p.id));
    const byProduct = new Map<string, AvailableUnit[]>();
    for (const g of groups) {
      const list = byProduct.get(g.productId) ?? [];
      list.push({
        key: `${g.sizeCm}:${g.sex}:${g.price}`,
        sizeCm: g.sizeCm,
        sizeInches: g.sizeInches,
        sizeLabel: g.sizeLabel,
        sex: g.sex,
        price: g.price,
        stock: g.stock,
        photo: g.photoUrl ?? undefined,
      });
      byProduct.set(g.productId, list);
    }
    return products.map((p) => ({
      ...p,
      availability: (byProduct.get(p.id) ?? []).sort((a, b) => a.price - b.price || a.sizeCm - b.sizeCm),
    }));
  } catch (e) {
    logDbFallback("attachAvailability", e);
    return products;
  }
}

/** True when reading live data from the database (vs the static seed). */
export const isLive = hasDatabase;

export async function getAllProducts(): Promise<Product[]> {
  if (prisma) {
    try {
      const [rows, defaultImage] = await Promise.all([
        prisma.product.findMany({ include: productInclude, orderBy: { arrived: "desc" } }),
        getDefaultProductImage(),
      ]);
      const withDistributors = await attachDistributorDetails(rows.map((p) => mapProduct(p, defaultImage)));
      return attachAvailability(withDistributors);
    } catch (e) {
      logDbFallback("getAllProducts", e);
    }
  }
  return attachDistributorDetails(SEED);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  if (prisma) {
    try {
      const [row, defaultImage] = await Promise.all([
        prisma.product.findUnique({ where: { slug }, include: productInclude }),
        getDefaultProductImage(),
      ]);
      if (!row) return null;
      const mapped = mapProduct(row, defaultImage);
      const [withDistributors] = await attachDistributorDetails([mapped]);
      return (await attachAvailability([withDistributors]))[0];
    } catch (e) {
      logDbFallback("getProductBySlug", e);
    }
  }
  const found = SEED.find((p) => p.slug === slug);
  if (!found) return null;
  return (await attachDistributorDetails([found]))[0];
}

export async function getProductById(id: string): Promise<Product | null> {
  if (prisma) {
    try {
      const [row, defaultImage] = await Promise.all([
        prisma.product.findUnique({ where: { id }, include: productInclude }),
        getDefaultProductImage(),
      ]);
      if (!row) return null;
      const mapped = mapProduct(row, defaultImage);
      const [withDistributors] = await attachDistributorDetails([mapped]);
      return (await attachAvailability([withDistributors]))[0];
    } catch (e) {
      logDbFallback("getProductById", e);
    }
  }
  const found = SEED.find((p) => p.id === id);
  if (!found) return null;
  return (await attachDistributorDetails([found]))[0];
}

/** Admin edit form — returns the stored image only (no site default fallback). */
export async function getProductByIdForAdmin(id: string): Promise<Product | null> {
  if (prisma) {
    try {
      const row = await prisma.product.findUnique({ where: { id }, include: productInclude });
      if (!row) return null;
      return (await attachAvailability([mapProduct(row, null)]))[0];
    } catch (e) {
      logDbFallback("getProductByIdForAdmin", e);
    }
  }
  const found = SEED.find((p) => p.id === id);
  if (!found) return null;
  return (await attachDistributorDetails([found]))[0];
}

/** Public-facing products only — excludes listings the admin hid once sold out. Admin pages use getAllProducts() directly. */
export async function getStorefrontProducts(): Promise<Product[]> {
  const all = await getAllProducts();
  return all.filter(isStorefrontVisible);
}

export async function getFeatured(count = 4): Promise<Product[]> {
  const all = await getStorefrontProducts();
  return all.filter((p) => p.featured).slice(0, count);
}

export async function getRelated(product: Product, count = 3): Promise<Product[]> {
  const all = await getStorefrontProducts();
  return all
    .filter((o) => o.id !== product.id && (o.genus === product.genus || o.experience === product.experience))
    .slice(0, count);
}

export async function getGenera(): Promise<string[]> {
  if (prisma) {
    const all = await getAllProducts();
    return Array.from(new Set(all.map((p) => p.genus))).sort();
  }
  return SEED_GENERA;
}

// ---------------------------------------------------------------------------
// Admin mutations (require a configured database)
// ---------------------------------------------------------------------------

export interface ProductDistributorStockInput {
  distributorId: string;
  stock: number;
}

export interface ProductInput {
  slug: string;
  scientific: string;
  commonEn: string;
  commonFr: string;
  genus: string;
  experience: "beginner" | "intermediate" | "advanced";
  type: "terrestrial" | "arboreal" | "fossorial";
  temperament: "docile" | "skittish" | "defensive";
  featured: boolean;
  newArrival: boolean;
  availableAtPickup: boolean;
  availableAtDistributor: boolean;
  hideWhenSoldOut: boolean;
  hue: number;
  accent: string;
  image: string | null;
  adultSizeEn: string;
  adultSizeFr: string;
  growthEn: string;
  growthFr: string;
  originEn: string;
  originFr: string;
  lifespanEn: string;
  lifespanFr: string;
  humidity: string;
  temperature: string;
  enclosureEn: string;
  enclosureFr: string;
  dietEn: string;
  dietFr: string;
  descriptionEn: string;
  descriptionFr: string;
  careGuide: string | null;
  distributorStocks: ProductDistributorStockInput[];
}

function distributorStockCreates(stocks: ProductDistributorStockInput[]) {
  return stocks
    .filter((s) => s.distributorId && Number.isFinite(s.stock))
    .map((s) => ({ locationId: s.distributorId, stock: Math.max(0, Math.round(s.stock)) }));
}

function requireDb() {
  if (!prisma) throw new Error("Database not configured. Set DATABASE_URL to manage products.");
  return prisma;
}

export async function createProduct(input: ProductInput): Promise<string> {
  const db = requireDb();
  const { distributorStocks, ...fields } = input;
  const created = await db.product.create({
    data: {
      ...fields,
      distributorStocks: { create: distributorStockCreates(distributorStocks) },
    },
  });
  return created.id;
}

export async function updateProduct(id: string, input: ProductInput): Promise<void> {
  const db = requireDb();
  const { distributorStocks, ...fields } = input;
  await db.$transaction([
    db.productDistributorStock.deleteMany({ where: { productId: id } }),
    db.product.update({
      where: { id },
      data: {
        ...fields,
        distributorStocks: { create: distributorStockCreates(distributorStocks) },
      },
    }),
  ]);
}

export async function deleteProduct(id: string): Promise<void> {
  const db = requireDb();
  await db.product.delete({ where: { id } });
}

function speciesProfileToProductInput(
  species: SpeciesProfile,
  slug: string,
  distributorStocks: ProductDistributorStockInput[],
): ProductInput {
  return {
    slug,
    scientific: species.scientific,
    commonEn: species.commonEn,
    commonFr: species.commonFr || species.commonEn,
    genus: species.genus,
    experience: species.experience,
    type: species.type,
    temperament: species.temperament,
    featured: false,
    newArrival: true,
    availableAtPickup: true,
    availableAtDistributor: false,
    hideWhenSoldOut: false,
    hue: species.hue,
    accent: species.accent,
    image: species.image,
    adultSizeEn: species.adultSizeEn,
    adultSizeFr: species.adultSizeFr,
    growthEn: species.growthEn,
    growthFr: species.growthFr,
    originEn: species.originEn,
    originFr: species.originFr,
    lifespanEn: species.lifespanEn,
    lifespanFr: species.lifespanFr,
    humidity: species.humidity,
    temperature: species.temperature,
    enclosureEn: species.enclosureEn,
    enclosureFr: species.enclosureFr,
    dietEn: species.dietEn,
    dietFr: species.dietFr,
    descriptionEn: species.descriptionEn,
    descriptionFr: species.descriptionFr,
    careGuide: species.careGuide,
    distributorStocks,
  };
}

async function uniqueProductSlug(base: string): Promise<string> {
  const db = requireDb();
  let slug = base;
  let n = 2;
  while (await db.product.findUnique({ where: { slug } })) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

/**
 * Return the storefront listing for a species, creating one from the species profile when missing.
 * Received stock always gets a visible listing (hideWhenSoldOut stays false).
 */
export async function ensureProductListingForSpecies(speciesId: string): Promise<string> {
  const species = await getSpeciesById(speciesId);
  if (!species) throw new Error("Species not found in catalog.");

  const db = requireDb();
  const existing = await db.product.findFirst({
    where: {
      OR: [{ speciesId }, { scientific: { equals: species.scientific, mode: "insensitive" } }],
    },
  });

  if (existing) {
    await db.product.update({
      where: { id: existing.id },
      data: {
        speciesId,
        hideWhenSoldOut: false,
        newArrival: true,
      },
    });
    return existing.id;
  }

  const distributors = await getDistributorLocations();
  const distributorStocks = distributors
    .filter((d) => d.isDistributor)
    .map((d) => ({ distributorId: d.id, stock: 0 }));

  const slug = await uniqueProductSlug(deriveSlug(species.scientific, species.commonEn));
  const productId = await createProduct(speciesProfileToProductInput(species, slug, distributorStocks));

  await db.product.update({ where: { id: productId }, data: { speciesId } });
  return productId;
}

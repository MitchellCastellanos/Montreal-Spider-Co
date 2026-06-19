import "server-only";
import type { Product as DbProduct, ProductSize as DbSize, ProductDistributorStock as DbDistStock, StoreLocation as DbLocation } from "@prisma/client";
import { prisma, hasDatabase } from "@/lib/db";
import { getDefaultProductImage } from "@/lib/data/site-settings";
import { logDbFallback } from "@/lib/data/db-safe";
import { getDistributors } from "@/lib/data/distributors";
import { PRODUCTS as SEED, GENERA as SEED_GENERA } from "@/lib/products";
import { parseWeeklyHours, EMPTY_WEEKLY_HOURS } from "@/lib/opening-hours";
import type { DistributorSnippet, Product, ProductDistributorStock } from "@/lib/types";

export type { Product };

type DbProductFull = DbProduct & {
  sizes: DbSize[];
  distributorStocks?: (DbDistStock & { location?: DbLocation })[];
};

const productInclude = {
  sizes: true,
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
    sizes: [...p.sizes]
      .sort((a, b) => a.position - b.position)
      .map((s) => ({ id: s.key, label: { en: s.labelEn, fr: s.labelFr }, price: s.price, stock: s.stock })),
    featured: p.featured,
    newArrival: p.newArrival,
    availableAtPickup: p.availableAtPickup,
    availableAtDistributor: p.availableAtDistributor,
    distributorStocks,
    distributors: p.availableAtDistributor ? distributors : undefined,
    rating: p.rating,
    reviews: p.reviews,
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

/** True when reading live data from the database (vs the static seed). */
export const isLive = hasDatabase;

export async function getAllProducts(): Promise<Product[]> {
  if (prisma) {
    try {
      const [rows, defaultImage] = await Promise.all([
        prisma.product.findMany({ include: productInclude, orderBy: { arrived: "desc" } }),
        getDefaultProductImage(),
      ]);
      return attachDistributorDetails(rows.map((p) => mapProduct(p, defaultImage)));
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
      return (await attachDistributorDetails([mapped]))[0];
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
      return (await attachDistributorDetails([mapped]))[0];
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
      return row ? mapProduct(row, null) : null;
    } catch (e) {
      logDbFallback("getProductByIdForAdmin", e);
    }
  }
  const found = SEED.find((p) => p.id === id);
  if (!found) return null;
  return (await attachDistributorDetails([found]))[0];
}

export async function getFeatured(count = 4): Promise<Product[]> {
  const all = await getAllProducts();
  return all.filter((p) => p.featured).slice(0, count);
}

export async function getRelated(product: Product, count = 3): Promise<Product[]> {
  const all = await getAllProducts();
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

export interface ProductSizeInput {
  key: string;
  labelEn: string;
  labelFr: string;
  price: number;
  stock: number;
}

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
  rating: number;
  reviews: number;
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
  sizes: ProductSizeInput[];
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
  const { sizes, distributorStocks, ...fields } = input;
  const created = await db.product.create({
    data: {
      ...fields,
      sizes: { create: sizes.map((s, i) => ({ ...s, position: i })) },
      distributorStocks: { create: distributorStockCreates(distributorStocks) },
    },
  });
  return created.id;
}

export async function updateProduct(id: string, input: ProductInput): Promise<void> {
  const db = requireDb();
  const { sizes, distributorStocks, ...fields } = input;
  await db.$transaction([
    db.productSize.deleteMany({ where: { productId: id } }),
    db.productDistributorStock.deleteMany({ where: { productId: id } }),
    db.product.update({
      where: { id },
      data: {
        ...fields,
        sizes: { create: sizes.map((s, i) => ({ ...s, position: i })) },
        distributorStocks: { create: distributorStockCreates(distributorStocks) },
      },
    }),
  ]);
}

export async function deleteProduct(id: string): Promise<void> {
  const db = requireDb();
  await db.product.delete({ where: { id } });
}

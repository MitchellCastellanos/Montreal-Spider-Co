import "server-only";
import type { Product as DbProduct, ProductSize as DbSize } from "@prisma/client";
import { prisma, hasDatabase } from "@/lib/db";
import { getDefaultProductImage } from "@/lib/data/site-settings";
import { PRODUCTS as SEED, GENERA as SEED_GENERA } from "@/lib/products";
import type { Product } from "@/lib/types";

export type { Product };

type DbProductWithSizes = DbProduct & { sizes: DbSize[] };

function mapProduct(p: DbProductWithSizes, defaultImage?: string | null): Product {
  const image = p.image ?? defaultImage ?? undefined;
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

/** True when reading live data from the database (vs the static seed). */
export const isLive = hasDatabase;

export async function getAllProducts(): Promise<Product[]> {
  if (prisma) {
    const [rows, defaultImage] = await Promise.all([
      prisma.product.findMany({ include: { sizes: true }, orderBy: { arrived: "desc" } }),
      getDefaultProductImage(),
    ]);
    return rows.map((p) => mapProduct(p, defaultImage));
  }
  return SEED;
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  if (prisma) {
    const [row, defaultImage] = await Promise.all([
      prisma.product.findUnique({ where: { slug }, include: { sizes: true } }),
      getDefaultProductImage(),
    ]);
    return row ? mapProduct(row, defaultImage) : null;
  }
  return SEED.find((p) => p.slug === slug) ?? null;
}

export async function getProductById(id: string): Promise<Product | null> {
  if (prisma) {
    const [row, defaultImage] = await Promise.all([
      prisma.product.findUnique({ where: { id }, include: { sizes: true } }),
      getDefaultProductImage(),
    ]);
    return row ? mapProduct(row, defaultImage) : null;
  }
  return SEED.find((p) => p.id === id) ?? null;
}

/** Admin edit form — returns the stored image only (no site default fallback). */
export async function getProductByIdForAdmin(id: string): Promise<Product | null> {
  if (prisma) {
    const row = await prisma.product.findUnique({ where: { id }, include: { sizes: true } });
    return row ? mapProduct(row, null) : null;
  }
  return SEED.find((p) => p.id === id) ?? null;
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
}

function requireDb() {
  if (!prisma) throw new Error("Database not configured. Set DATABASE_URL to manage products.");
  return prisma;
}

export async function createProduct(input: ProductInput): Promise<string> {
  const db = requireDb();
  const { sizes, ...fields } = input;
  const created = await db.product.create({
    data: {
      ...fields,
      sizes: { create: sizes.map((s, i) => ({ ...s, position: i })) },
    },
  });
  return created.id;
}

export async function updateProduct(id: string, input: ProductInput): Promise<void> {
  const db = requireDb();
  const { sizes, ...fields } = input;
  await db.$transaction([
    db.productSize.deleteMany({ where: { productId: id } }),
    db.product.update({
      where: { id },
      data: {
        ...fields,
        sizes: { create: sizes.map((s, i) => ({ ...s, position: i })) },
      },
    }),
  ]);
}

export async function deleteProduct(id: string): Promise<void> {
  const db = requireDb();
  await db.product.delete({ where: { id } });
}

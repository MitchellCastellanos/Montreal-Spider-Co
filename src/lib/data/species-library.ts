import "server-only";
import type { SpeciesLibraryImage } from "@prisma/client";
import { prisma } from "@/lib/db";
import { logDbFallback } from "@/lib/data/db-safe";
import { formatCreditNote } from "@/lib/species-lookup-utils";

export type LibraryImage = SpeciesLibraryImage;

function requireDb() {
  if (!prisma) throw new Error("Database not configured.");
  return prisma;
}

export async function listLibraryImages(query?: string): Promise<LibraryImage[]> {
  if (!prisma) return [];
  const q = query?.trim();
  try {
    if (!q) {
      return await prisma.speciesLibraryImage.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
    }
    return await prisma.speciesLibraryImage.findMany({
      where: {
        OR: [
          { label: { contains: q, mode: "insensitive" } },
          { scientific: { contains: q, mode: "insensitive" } },
          { genus: { contains: q, mode: "insensitive" } },
          { slug: { contains: q, mode: "insensitive" } },
          { notes: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  } catch (e) {
    logDbFallback("listLibraryImages", e);
    return [];
  }
}

export type LibraryImageInput = {
  url: string;
  label?: string;
  scientific?: string;
  genus?: string;
  slug?: string;
  notes?: string;
};

export async function addLibraryImage(input: LibraryImageInput): Promise<LibraryImage> {
  const db = requireDb();
  const existing = await db.speciesLibraryImage.findFirst({ where: { url: input.url } });
  if (existing) {
    return db.speciesLibraryImage.update({
      where: { id: existing.id },
      data: {
        label: input.label ?? existing.label,
        scientific: input.scientific ?? existing.scientific,
        genus: input.genus ?? existing.genus,
        slug: input.slug ?? existing.slug,
        notes: input.notes ?? existing.notes,
      },
    });
  }
  return db.speciesLibraryImage.create({
    data: {
      url: input.url,
      label: input.label ?? "",
      scientific: input.scientific ?? "",
      genus: input.genus ?? "",
      slug: input.slug ?? "",
      notes: input.notes ?? "",
    },
  });
}

export async function deleteLibraryImage(id: string): Promise<void> {
  const db = requireDb();
  await db.speciesLibraryImage.delete({ where: { id } });
}

/** Suggest library images matching product identity fields. */
export async function suggestLibraryImages(scientific: string, genus: string, slug: string): Promise<LibraryImage[]> {
  if (!prisma) return [];
  const terms = [scientific, genus, slug].map((s) => s.trim()).filter(Boolean);
  if (terms.length === 0) return listLibraryImages();

  try {
    return await prisma.speciesLibraryImage.findMany({
      where: {
        OR: terms.flatMap((term) => [
          { scientific: { contains: term, mode: "insensitive" as const } },
          { genus: { contains: term, mode: "insensitive" as const } },
          { slug: { contains: term, mode: "insensitive" as const } },
          { label: { contains: term, mode: "insensitive" as const } },
        ]),
      },
      orderBy: { createdAt: "desc" },
      take: 24,
    });
  } catch (e) {
    logDbFallback("suggestLibraryImages", e);
    return [];
  }
}

/**
 * Credit lines for photos imported from open catalogs (notes start with "Credit:").
 * Returns a map of photo URL → human-readable credit; photos without a credit are omitted.
 */
export async function getImageCredits(urls: (string | null | undefined)[]): Promise<Record<string, string>> {
  const wanted = Array.from(new Set(urls.filter((u): u is string => Boolean(u))));
  if (!prisma || wanted.length === 0) return {};
  try {
    const rows = await prisma.speciesLibraryImage.findMany({
      where: { url: { in: wanted }, notes: { startsWith: "Credit:" } },
      select: { url: true, notes: true },
    });
    const out: Record<string, string> = {};
    for (const r of rows) out[r.url] = formatCreditNote(r.notes);
    return out;
  } catch (e) {
    logDbFallback("getImageCredits", e);
    return {};
  }
}

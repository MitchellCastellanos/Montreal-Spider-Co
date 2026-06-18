import "server-only";
import type { SpeciesLibraryImage } from "@prisma/client";
import { prisma } from "@/lib/db";

export type LibraryImage = SpeciesLibraryImage;

function requireDb() {
  if (!prisma) throw new Error("Database not configured.");
  return prisma;
}

export async function listLibraryImages(query?: string): Promise<LibraryImage[]> {
  const db = requireDb();
  const q = query?.trim();
  if (!q) {
    return db.speciesLibraryImage.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  }
  return db.speciesLibraryImage.findMany({
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
  const db = requireDb();
  const terms = [scientific, genus, slug].map((s) => s.trim()).filter(Boolean);
  if (terms.length === 0) return listLibraryImages();

  return db.speciesLibraryImage.findMany({
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
}

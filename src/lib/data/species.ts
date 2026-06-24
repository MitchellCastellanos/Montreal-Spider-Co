import "server-only";
import type { Species as DbSpecies } from "@prisma/client";
import { prisma } from "@/lib/db";
import { logDbFallback } from "@/lib/data/db-safe";
import { PRODUCTS as SEED } from "@/lib/products";
import { deriveGenus, deriveHue, deriveAccent } from "@/lib/species-utils";

export type SpeciesProfile = {
  id: string;
  scientific: string;
  commonEn: string;
  commonFr: string;
  genus: string;
  experience: "beginner" | "intermediate" | "advanced";
  type: "terrestrial" | "arboreal" | "fossorial";
  temperament: "docile" | "skittish" | "defensive";
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
};

export type SpeciesInput = Omit<SpeciesProfile, "id">;

function mapSpecies(s: DbSpecies): SpeciesProfile {
  return {
    id: s.id,
    scientific: s.scientific,
    commonEn: s.commonEn,
    commonFr: s.commonFr,
    genus: s.genus,
    experience: s.experience,
    type: s.type,
    temperament: s.temperament,
    hue: s.hue,
    accent: s.accent,
    image: s.image,
    adultSizeEn: s.adultSizeEn,
    adultSizeFr: s.adultSizeFr,
    growthEn: s.growthEn,
    growthFr: s.growthFr,
    originEn: s.originEn,
    originFr: s.originFr,
    lifespanEn: s.lifespanEn,
    lifespanFr: s.lifespanFr,
    humidity: s.humidity,
    temperature: s.temperature,
    enclosureEn: s.enclosureEn,
    enclosureFr: s.enclosureFr,
    dietEn: s.dietEn,
    dietFr: s.dietFr,
    descriptionEn: s.descriptionEn,
    descriptionFr: s.descriptionFr,
    careGuide: s.careGuide,
  };
}

function requireDb() {
  if (!prisma) throw new Error("Database not configured.");
  return prisma;
}

export async function listSpecies(query?: string): Promise<SpeciesProfile[]> {
  if (!prisma) {
    return SEED.map((p) => ({
      id: p.id,
      scientific: p.scientific,
      commonEn: p.common.en,
      commonFr: p.common.fr,
      genus: p.genus,
      experience: p.experience,
      type: p.type,
      temperament: p.temperament,
      hue: p.hue,
      accent: p.accent,
      image: p.image ?? null,
      adultSizeEn: p.adultSize.en,
      adultSizeFr: p.adultSize.fr,
      growthEn: p.growth.en,
      growthFr: p.growth.fr,
      originEn: p.origin.en,
      originFr: p.origin.fr,
      lifespanEn: p.lifespan.en,
      lifespanFr: p.lifespan.fr,
      humidity: p.humidity,
      temperature: p.temperature,
      enclosureEn: p.enclosure.en,
      enclosureFr: p.enclosure.fr,
      dietEn: p.diet.en,
      dietFr: p.diet.fr,
      descriptionEn: p.description.en,
      descriptionFr: p.description.fr,
      careGuide: p.careGuide ?? null,
    }));
  }

  const q = query?.trim();
  try {
    const rows = await prisma.species.findMany({
      where: q
        ? {
            OR: [
              { scientific: { contains: q, mode: "insensitive" } },
              { commonEn: { contains: q, mode: "insensitive" } },
              { commonFr: { contains: q, mode: "insensitive" } },
              { genus: { contains: q, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: [{ genus: "asc" }, { scientific: "asc" }],
    });
    return rows.map(mapSpecies);
  } catch (e) {
    logDbFallback("listSpecies", e);
    return [];
  }
}

export async function getSpeciesById(id: string): Promise<SpeciesProfile | null> {
  if (!prisma) return listSpecies().then((all) => all.find((s) => s.id === id) ?? null);
  try {
    const row = await prisma.species.findUnique({ where: { id } });
    return row ? mapSpecies(row) : null;
  } catch (e) {
    logDbFallback("getSpeciesById", e);
    return null;
  }
}

export async function upsertSpecies(input: SpeciesInput): Promise<string> {
  const db = requireDb();
  const scientific = input.scientific.trim();
  if (!scientific) throw new Error("Scientific name required.");

  const data = {
    ...input,
    scientific,
    genus: input.genus.trim() || deriveGenus(scientific),
    commonFr: input.commonFr.trim() || input.commonEn,
  };

  const row = await db.species.upsert({
    where: { scientific },
    create: data,
    update: data,
  });
  return row.id;
}

/** Create or update a minimal species profile (e.g. when receiving stock for a new species). */
export async function upsertSpeciesMinimal(
  scientific: string,
  commonEn?: string,
  commonFr?: string,
): Promise<string> {
  const sci = scientific.trim();
  if (!sci) throw new Error("Scientific name is required.");

  const en = (commonEn ?? "").trim();
  const fr = (commonFr ?? en).trim();

  return upsertSpecies({
    scientific: sci,
    commonEn: en,
    commonFr: fr,
    genus: deriveGenus(sci),
    experience: "beginner",
    type: "terrestrial",
    temperament: "docile",
    hue: deriveHue(sci),
    accent: deriveAccent(sci),
    image: null,
    adultSizeEn: "",
    adultSizeFr: "",
    growthEn: "",
    growthFr: "",
    originEn: "",
    originFr: "",
    lifespanEn: "",
    lifespanFr: "",
    humidity: "",
    temperature: "",
    enclosureEn: "",
    enclosureFr: "",
    dietEn: "",
    dietFr: "",
    descriptionEn: "",
    descriptionFr: "",
    careGuide: null,
  });
}

/** Link a product to its species row (creates species if missing). */
export async function linkProductToSpecies(productId: string, input: SpeciesInput): Promise<void> {
  const db = requireDb();
  const speciesId = await upsertSpecies(input);
  await db.product.update({ where: { id: productId }, data: { speciesId } });
}
import "server-only";
import type { AuthorizedDistributor as DbDistributor, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { logDbFallback } from "@/lib/data/db-safe";
import { AUTHORIZED_DISTRIBUTORS as SEED } from "@/lib/locations";
import { EMPTY_WEEKLY_HOURS, parseWeeklyHours, type WeeklyHours } from "@/lib/opening-hours";

export interface DistributorView {
  id: string;
  name: string;
  neighborhood: string;
  address: string;
  hours: WeeklyHours;
  mapsUrl: string;
  phone: string;
  active: boolean;
}

function readHours(raw: Prisma.JsonValue): WeeklyHours {
  return parseWeeklyHours(raw) ?? { ...EMPTY_WEEKLY_HOURS };
}

function mapDistributor(d: DbDistributor): DistributorView {
  return {
    id: d.id,
    name: d.name,
    neighborhood: d.neighborhood,
    address: d.address,
    hours: readHours(d.hours),
    mapsUrl: d.mapsUrl,
    phone: d.phone,
    active: d.active,
  };
}

function seedView(): DistributorView[] {
  return SEED.map((d) => ({
    id: d.id,
    name: d.name,
    neighborhood: d.neighborhood,
    address: d.address,
    hours: d.hours,
    mapsUrl: d.mapsUrl ?? "",
    phone: d.phone ?? "",
    active: true,
  }));
}

/** Active distributors for the storefront. */
export async function getDistributors(): Promise<DistributorView[]> {
  if (prisma) {
    try {
      const rows = await prisma.authorizedDistributor.findMany({ where: { active: true }, orderBy: { position: "asc" } });
      return rows.map(mapDistributor);
    } catch (e) {
      logDbFallback("getDistributors", e);
    }
  }
  return seedView();
}

/** All distributors (incl. inactive) for the admin. */
export async function getAllDistributors(): Promise<DistributorView[]> {
  if (prisma) {
    try {
      const rows = await prisma.authorizedDistributor.findMany({ orderBy: { position: "asc" } });
      return rows.map(mapDistributor);
    } catch (e) {
      logDbFallback("getAllDistributors", e);
    }
  }
  return seedView();
}

export async function getDistributorById(id: string): Promise<DistributorView | null> {
  if (prisma) {
    try {
      const r = await prisma.authorizedDistributor.findUnique({ where: { id } });
      return r ? mapDistributor(r) : null;
    } catch (e) {
      logDbFallback("getDistributorById", e);
    }
  }
  return seedView().find((d) => d.id === id) ?? null;
}

export interface DistributorInput {
  name: string;
  neighborhood: string;
  address: string;
  hours: WeeklyHours;
  mapsUrl: string;
  phone: string;
  active: boolean;
}

function requireDb() {
  if (!prisma) throw new Error("Database not configured. Set DATABASE_URL to manage distributors.");
  return prisma;
}

export async function createDistributor(input: DistributorInput): Promise<void> {
  const db = requireDb();
  const count = await db.authorizedDistributor.count();
  await db.authorizedDistributor.create({
    data: {
      name: input.name,
      neighborhood: input.neighborhood,
      address: input.address,
      hours: input.hours as unknown as Prisma.InputJsonValue,
      mapsUrl: input.mapsUrl,
      phone: input.phone,
      active: input.active,
      position: count,
    },
  });
}

export async function updateDistributor(id: string, input: DistributorInput): Promise<void> {
  const db = requireDb();
  await db.authorizedDistributor.update({
    where: { id },
    data: {
      name: input.name,
      neighborhood: input.neighborhood,
      address: input.address,
      hours: input.hours as unknown as Prisma.InputJsonValue,
      mapsUrl: input.mapsUrl,
      phone: input.phone,
      active: input.active,
    },
  });
}

export async function deleteDistributor(id: string): Promise<void> {
  const db = requireDb();
  await db.authorizedDistributor.delete({ where: { id } });
}

export async function deleteDistributors(ids: string[]): Promise<void> {
  const db = requireDb();
  if (ids.length === 0) return;
  await db.authorizedDistributor.deleteMany({ where: { id: { in: ids } } });
}

export async function setDistributorsActive(ids: string[], active: boolean): Promise<void> {
  const db = requireDb();
  if (ids.length === 0) return;
  await db.authorizedDistributor.updateMany({ where: { id: { in: ids } }, data: { active } });
}

export async function setDistributorActive(id: string, active: boolean): Promise<void> {
  const db = requireDb();
  await db.authorizedDistributor.update({ where: { id }, data: { active } });
}

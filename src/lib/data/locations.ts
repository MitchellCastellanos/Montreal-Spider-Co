import "server-only";
import type { PickupPoint as DbPickup, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { logDbFallback } from "@/lib/data/db-safe";
import { PICKUP_POINTS as SEED, DELIVERY_ZONES, FREE_DELIVERY_THRESHOLD } from "@/lib/locations";
import { EMPTY_WEEKLY_HOURS, parseWeeklyHours, type WeeklyHours } from "@/lib/opening-hours";

export { DELIVERY_ZONES, FREE_DELIVERY_THRESHOLD };

export interface PickupView {
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

function mapPickup(p: DbPickup): PickupView {
  return {
    id: p.id,
    name: p.name,
    neighborhood: p.neighborhood,
    address: p.address,
    hours: readHours(p.hours),
    mapsUrl: p.mapsUrl,
    phone: p.phone,
    active: p.active,
  };
}

function seedView(): PickupView[] {
  return SEED.map((p) => ({
    id: p.id,
    name: p.name,
    neighborhood: p.neighborhood,
    address: p.address,
    hours: p.hours,
    mapsUrl: p.mapsUrl ?? "",
    phone: p.phone ?? "",
    active: true,
  }));
}

/** Active pickup points for the storefront. */
export async function getPickupPoints(): Promise<PickupView[]> {
  if (prisma) {
    try {
      const rows = await prisma.pickupPoint.findMany({ where: { active: true }, orderBy: { position: "asc" } });
      return rows.map(mapPickup);
    } catch (e) {
      logDbFallback("getPickupPoints", e);
    }
  }
  return seedView();
}

/** All pickup points (incl. inactive) for the admin. */
export async function getAllPickupPoints(): Promise<PickupView[]> {
  if (prisma) {
    try {
      const rows = await prisma.pickupPoint.findMany({ orderBy: { position: "asc" } });
      return rows.map(mapPickup);
    } catch (e) {
      logDbFallback("getAllPickupPoints", e);
    }
  }
  return seedView();
}

export async function getPickupPointById(id: string): Promise<PickupView | null> {
  if (prisma) {
    try {
      const r = await prisma.pickupPoint.findUnique({ where: { id } });
      return r ? mapPickup(r) : null;
    } catch (e) {
      logDbFallback("getPickupPointById", e);
    }
  }
  return seedView().find((p) => p.id === id) ?? null;
}

export interface PickupInput {
  name: string;
  neighborhood: string;
  address: string;
  hours: WeeklyHours;
  mapsUrl: string;
  phone: string;
  active: boolean;
}

function requireDb() {
  if (!prisma) throw new Error("Database not configured. Set DATABASE_URL to manage pickup points.");
  return prisma;
}

export async function createPickupPoint(input: PickupInput): Promise<void> {
  const db = requireDb();
  const count = await db.pickupPoint.count();
  await db.pickupPoint.create({
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

export async function updatePickupPoint(id: string, input: PickupInput): Promise<void> {
  const db = requireDb();
  await db.pickupPoint.update({
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

export async function deletePickupPoint(id: string): Promise<void> {
  const db = requireDb();
  await db.pickupPoint.delete({ where: { id } });
}

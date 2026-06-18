import "server-only";
import type { PickupPoint as DbPickup } from "@prisma/client";
import { prisma } from "@/lib/db";
import { logDbFallback } from "@/lib/data/db-safe";
import { PICKUP_POINTS as SEED, DELIVERY_ZONES, FREE_DELIVERY_THRESHOLD } from "@/lib/locations";

export { DELIVERY_ZONES, FREE_DELIVERY_THRESHOLD };

export interface PickupView {
  id: string;
  name: string;
  neighborhood: string;
  address: { en: string; fr: string };
  hours: { en: string; fr: string };
  active: boolean;
}

function mapPickup(p: DbPickup): PickupView {
  return {
    id: p.id,
    name: p.name,
    neighborhood: p.neighborhood,
    address: { en: p.addressEn, fr: p.addressFr },
    hours: { en: p.hoursEn, fr: p.hoursFr },
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
  addressEn: string;
  addressFr: string;
  hoursEn: string;
  hoursFr: string;
  active: boolean;
}

function requireDb() {
  if (!prisma) throw new Error("Database not configured. Set DATABASE_URL to manage pickup points.");
  return prisma;
}

export async function createPickupPoint(input: PickupInput): Promise<void> {
  const db = requireDb();
  const count = await db.pickupPoint.count();
  await db.pickupPoint.create({ data: { ...input, position: count } });
}

export async function updatePickupPoint(id: string, input: PickupInput): Promise<void> {
  const db = requireDb();
  await db.pickupPoint.update({ where: { id }, data: input });
}

export async function deletePickupPoint(id: string): Promise<void> {
  const db = requireDb();
  await db.pickupPoint.delete({ where: { id } });
}

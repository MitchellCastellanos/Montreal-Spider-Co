import "server-only";
import type { StoreLocation as DbLocation, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { logDbFallback } from "@/lib/data/db-safe";
import { STORE_LOCATIONS as SEED, DELIVERY_ZONES, FREE_DELIVERY_THRESHOLD } from "@/lib/locations";
import { EMPTY_WEEKLY_HOURS, parseWeeklyHours, type WeeklyHours } from "@/lib/opening-hours";

export { DELIVERY_ZONES, FREE_DELIVERY_THRESHOLD };

export interface StoreLocationView {
  id: string;
  name: string;
  neighborhood: string;
  address: string;
  hours: WeeklyHours;
  mapsUrl: string;
  phone: string;
  active: boolean;
  isPickup: boolean;
  isDistributor: boolean;
  email: string;
  contactName: string;
  whatsapp: string;
  partnerToken: string;
  minPricePct: number | null;
}

/** @deprecated alias */
export type PickupView = StoreLocationView;
export type DistributorView = StoreLocationView;

function readHours(raw: Prisma.JsonValue): WeeklyHours {
  return parseWeeklyHours(raw) ?? { ...EMPTY_WEEKLY_HOURS };
}

function mapLocation(row: DbLocation): StoreLocationView {
  return {
    id: row.id,
    name: row.name,
    neighborhood: row.neighborhood,
    address: row.address,
    hours: readHours(row.hours),
    mapsUrl: row.mapsUrl,
    phone: row.phone,
    active: row.active,
    isPickup: row.isPickup,
    isDistributor: row.isDistributor,
    email: row.email,
    contactName: row.contactName,
    whatsapp: row.whatsapp,
    partnerToken: row.partnerToken,
    minPricePct: row.minPricePct,
  };
}

function seedView(): StoreLocationView[] {
  return SEED.map((l) => ({
    id: l.id,
    name: l.name,
    neighborhood: l.neighborhood,
    address: l.address,
    hours: l.hours,
    mapsUrl: l.mapsUrl ?? "",
    phone: l.phone ?? "",
    active: true,
    isPickup: l.isPickup,
    isDistributor: l.isDistributor,
    email: "",
    contactName: "",
    whatsapp: "",
    partnerToken: "",
    minPricePct: null,
  }));
}

export async function getAllLocations(): Promise<StoreLocationView[]> {
  if (prisma) {
    try {
      const rows = await prisma.storeLocation.findMany({ orderBy: { position: "asc" } });
      return rows.map(mapLocation);
    } catch (e) {
      logDbFallback("getAllLocations", e);
    }
  }
  return seedView();
}

/** Active pickup points for checkout & delivery page. */
export async function getPickupPoints(): Promise<StoreLocationView[]> {
  const all = await getAllLocations();
  return all.filter((l) => l.active && l.isPickup);
}

/** Active distributors for storefront. */
export async function getDistributors(): Promise<StoreLocationView[]> {
  const all = await getAllLocations();
  return all.filter((l) => l.active && l.isDistributor);
}

/** All distributor locations (incl. inactive) for admin product stock. */
export async function getDistributorLocations(): Promise<StoreLocationView[]> {
  const all = await getAllLocations();
  return all.filter((l) => l.isDistributor);
}

/** @deprecated */
export const getAllPickupPoints = getAllLocations;
export const getAllDistributors = getDistributorLocations;

export async function getLocationById(id: string): Promise<StoreLocationView | null> {
  if (prisma) {
    try {
      const r = await prisma.storeLocation.findUnique({ where: { id } });
      return r ? mapLocation(r) : null;
    } catch (e) {
      logDbFallback("getLocationById", e);
    }
  }
  return seedView().find((l) => l.id === id) ?? null;
}

/** @deprecated */
export const getPickupPointById = getLocationById;

export interface LocationInput {
  name: string;
  neighborhood: string;
  address: string;
  hours: WeeklyHours;
  mapsUrl: string;
  phone: string;
  active: boolean;
  isPickup: boolean;
  isDistributor: boolean;
  email?: string;
  contactName?: string;
  whatsapp?: string;
  minPricePct?: number | null;
}

export interface LocationBulkRow {
  id: string;
  name: string;
  neighborhood: string;
  address: string;
  phone: string;
  mapsUrl: string;
  active: boolean;
  isPickup: boolean;
  isDistributor: boolean;
  hours?: WeeklyHours;
  email?: string;
  contactName?: string;
  whatsapp?: string;
  minPricePct?: number | null;
}

function requireDb() {
  if (!prisma) throw new Error("Database not configured. Set DATABASE_URL to manage locations.");
  return prisma;
}

export async function createLocation(input: LocationInput): Promise<string> {
  const db = requireDb();
  const count = await db.storeLocation.count();
  const created = await db.storeLocation.create({
    data: {
      name: input.name,
      neighborhood: input.neighborhood,
      address: input.address,
      hours: input.hours as unknown as Prisma.InputJsonValue,
      mapsUrl: input.mapsUrl,
      phone: input.phone,
      active: input.active,
      isPickup: input.isPickup,
      isDistributor: input.isDistributor,
      email: input.email ?? "",
      contactName: input.contactName ?? "",
      whatsapp: input.whatsapp ?? "",
      minPricePct: input.minPricePct ?? null,
      position: count,
    },
  });
  return created.id;
}

export async function updateLocation(id: string, input: LocationInput): Promise<void> {
  const db = requireDb();
  await db.storeLocation.update({
    where: { id },
    data: {
      name: input.name,
      neighborhood: input.neighborhood,
      address: input.address,
      hours: input.hours as unknown as Prisma.InputJsonValue,
      mapsUrl: input.mapsUrl,
      phone: input.phone,
      active: input.active,
      isPickup: input.isPickup,
      isDistributor: input.isDistributor,
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.contactName !== undefined ? { contactName: input.contactName } : {}),
      ...(input.whatsapp !== undefined ? { whatsapp: input.whatsapp } : {}),
      ...(input.minPricePct !== undefined ? { minPricePct: input.minPricePct } : {}),
    },
  });
}

export async function bulkUpdateLocations(rows: LocationBulkRow[]): Promise<void> {
  const db = requireDb();
  await db.$transaction(
    rows.map((row) =>
      db.storeLocation.update({
        where: { id: row.id },
        data: {
          name: row.name,
          neighborhood: row.neighborhood,
          address: row.address,
          phone: row.phone,
          mapsUrl: row.mapsUrl,
          active: row.active,
          isPickup: row.isPickup,
          isDistributor: row.isDistributor,
          ...(row.hours ? { hours: row.hours as unknown as Prisma.InputJsonValue } : {}),
          ...(row.email !== undefined ? { email: row.email } : {}),
          ...(row.contactName !== undefined ? { contactName: row.contactName } : {}),
          ...(row.whatsapp !== undefined ? { whatsapp: row.whatsapp } : {}),
          ...(row.minPricePct !== undefined ? { minPricePct: row.minPricePct } : {}),
        },
      }),
    ),
  );
}

export async function deleteLocation(id: string): Promise<void> {
  const db = requireDb();
  await db.storeLocation.delete({ where: { id } });
}

export async function deleteLocations(ids: string[]): Promise<void> {
  const db = requireDb();
  if (ids.length === 0) return;
  await db.storeLocation.deleteMany({ where: { id: { in: ids } } });
}

import "server-only";
import { prisma } from "@/lib/db";
import { SITE } from "@/lib/site";

/**
 * Partner authorization without accounts.
 *
 * Each StoreLocation has a secret `partnerToken`. Partner-facing links carry it
 * as `?k=…` and server actions must validate it against the specimen's or
 * fulfillment's location. MSC admin bypasses this via `isAdminAuthed()` on
 * separate admin actions (Operations, admin walk-in sale, etc.).
 */

function requireDb() {
  if (!prisma) throw new Error("Database not configured.");
  return prisma;
}

/** Throws if the partner key does not match the store location. */
export async function assertPartnerTokenForLocation(
  partnerToken: string,
  locationId: string,
): Promise<void> {
  const key = partnerToken.trim();
  if (!key) throw new Error("Partner authorization required — use the link from your store email or QR label.");

  const db = requireDb();
  const location = await db.storeLocation.findUnique({
    where: { id: locationId },
    select: { partnerToken: true, name: true },
  });
  if (!location) throw new Error("Store not found.");
  if (location.partnerToken !== key) {
    throw new Error(`This action is not authorized for ${location.name}.`);
  }
}

/** Partner pickup handover link — includes the store key when known. */
export function partnerPickupUrl(pickupToken: string, partnerToken?: string | null): string {
  const base = `${SITE.url}/en/p/pickup/${pickupToken}`;
  return partnerToken ? `${base}?k=${partnerToken}` : base;
}

/** Specimen QR hub — sale actions unlock only with the store key on the label. */
export function specimenQrUrl(qrToken: string, partnerToken?: string | null): string {
  const base = `${SITE.url}/q/${qrToken}`;
  return partnerToken ? `${base}?k=${partnerToken}` : base;
}

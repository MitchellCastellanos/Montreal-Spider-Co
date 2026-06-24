import "server-only";
import type { Experience, FulfillmentMethod } from "@prisma/client";
import { prisma } from "@/lib/db";

export interface CustomerPreferences {
  experience: Experience | null;
  prefMethod: FulfillmentMethod | null;
  prefPickupId: string | null;
  prefPickupSubtype: string | null;
  prefMetroStationId: string | null;
  prefMetroLine: string | null;
  prefMeetupZoneId: string | null;
  prefMeetupAvailability: string | null;
  prefCustomMeetup: string | null;
  prefOrderNotes: string;
  notifyStock: boolean;
  notifyPromos: boolean;
  notifyCare: boolean;
}

export interface FulfillmentPrefsInput {
  prefMethod?: FulfillmentMethod | null;
  prefPickupId?: string | null;
  prefPickupSubtype?: string | null;
  prefMetroStationId?: string | null;
  prefMetroLine?: string | null;
  prefMeetupZoneId?: string | null;
  prefMeetupAvailability?: string | null;
  prefCustomMeetup?: string | null;
  prefOrderNotes?: string;
}

export async function saveFulfillmentFromCheckout(
  customerId: string,
  input: FulfillmentPrefsInput & { notes?: string },
): Promise<void> {
  if (!prisma) return;
  await prisma.customer.update({
    where: { id: customerId },
    data: {
      prefMethod: "pickup",
      prefPickupId: input.prefPickupId ?? undefined,
      prefPickupSubtype: input.prefPickupSubtype ?? undefined,
      prefMetroStationId: input.prefMetroStationId ?? undefined,
      prefMetroLine: input.prefMetroLine ?? undefined,
      prefMeetupZoneId: input.prefMeetupZoneId ?? undefined,
      prefMeetupAvailability: input.prefMeetupAvailability ?? undefined,
      prefCustomMeetup: input.prefCustomMeetup ?? undefined,
      prefOrderNotes: input.notes?.trim() ?? undefined,
    },
  });
}

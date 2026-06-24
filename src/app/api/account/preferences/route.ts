import { NextResponse } from "next/server";
import type { Experience } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCustomerIdFromSession } from "@/lib/customer-auth";

export async function GET() {
  const customerId = await getCustomerIdFromSession();
  if (!customerId || !prisma) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const c = await prisma.customer.findUnique({
    where: { id: customerId },
    select: {
      experience: true,
      prefMethod: true,
      prefPickupId: true,
      prefPickupSubtype: true,
      prefMetroStationId: true,
      prefMetroLine: true,
      prefMeetupZoneId: true,
      prefMeetupAvailability: true,
      prefCustomMeetup: true,
      prefOrderNotes: true,
      notifyStock: true,
      notifyPromos: true,
      notifyCare: true,
      referralCode: true,
    },
  });
  if (!c) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json(c);
}

export async function PATCH(req: Request) {
  const customerId = await getCustomerIdFromSession();
  if (!customerId || !prisma) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const experience = body.experience as Experience | null | undefined;
  if (experience !== undefined && experience !== null && !["beginner", "intermediate", "advanced"].includes(experience)) {
    return NextResponse.json({ error: "Invalid experience level." }, { status: 400 });
  }

  await prisma.customer.update({
    where: { id: customerId },
    data: {
      ...(experience !== undefined ? { experience } : {}),
      ...(body.prefMethod !== undefined ? { prefMethod: body.prefMethod as "pickup" | "delivery" | null } : {}),
      ...(body.prefPickupId !== undefined ? { prefPickupId: body.prefPickupId as string | null } : {}),
      ...(body.prefPickupSubtype !== undefined ? { prefPickupSubtype: body.prefPickupSubtype as string | null } : {}),
      ...(body.prefMetroStationId !== undefined ? { prefMetroStationId: body.prefMetroStationId as string | null } : {}),
      ...(body.prefMetroLine !== undefined ? { prefMetroLine: body.prefMetroLine as string | null } : {}),
      ...(body.prefMeetupZoneId !== undefined ? { prefMeetupZoneId: body.prefMeetupZoneId as string | null } : {}),
      ...(body.prefMeetupAvailability !== undefined ? { prefMeetupAvailability: body.prefMeetupAvailability as string | null } : {}),
      ...(body.prefCustomMeetup !== undefined ? { prefCustomMeetup: body.prefCustomMeetup as string | null } : {}),
      ...(body.prefOrderNotes !== undefined ? { prefOrderNotes: String(body.prefOrderNotes) } : {}),
      ...(body.notifyStock !== undefined ? { notifyStock: Boolean(body.notifyStock) } : {}),
      ...(body.notifyPromos !== undefined ? { notifyPromos: Boolean(body.notifyPromos) } : {}),
      ...(body.notifyCare !== undefined ? { notifyCare: Boolean(body.notifyCare) } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}

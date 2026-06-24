import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCustomerIdFromSession } from "@/lib/customer-auth";

export async function PATCH(req: Request) {
  const customerId = await getCustomerIdFromSession();
  if (!customerId || !prisma) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: { name?: string; phone?: string; experience?: "beginner" | "intermediate" | "advanced" | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  await prisma.customer.update({
    where: { id: customerId },
    data: {
      ...(body.name !== undefined ? { name: body.name.trim() } : {}),
      ...(body.phone !== undefined ? { phone: body.phone.trim() } : {}),
      ...(body.experience !== undefined ? { experience: body.experience } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}

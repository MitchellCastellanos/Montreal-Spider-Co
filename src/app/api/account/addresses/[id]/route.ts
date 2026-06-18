import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCustomerIdFromSession } from "@/lib/customer-auth";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const customerId = await getCustomerIdFromSession();
  if (!customerId || !prisma) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const address = await prisma.address.findFirst({ where: { id, customerId } });
  if (!address) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  await prisma.address.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

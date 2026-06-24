import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCustomerIdFromSession } from "@/lib/customer-auth";

export async function GET() {
  const customerId = await getCustomerIdFromSession();
  if (!customerId || !prisma) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { savedCart: true },
  });
  return NextResponse.json({ lines: customer?.savedCart ?? [] });
}

export async function PUT(req: Request) {
  const customerId = await getCustomerIdFromSession();
  if (!customerId || !prisma) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  let body: { lines?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!Array.isArray(body.lines)) {
    return NextResponse.json({ error: "Invalid cart." }, { status: 400 });
  }

  await prisma.customer.update({
    where: { id: customerId },
    data: { savedCart: body.lines },
  });

  return NextResponse.json({ ok: true });
}

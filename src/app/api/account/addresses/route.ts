import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCustomerIdFromSession } from "@/lib/customer-auth";

export async function POST(req: Request) {
  const customerId = await getCustomerIdFromSession();
  if (!customerId || !prisma) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: { label?: string; line1?: string; city?: string; postal?: string; isDefault?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!body.line1?.trim()) {
    return NextResponse.json({ error: "Address is required." }, { status: 400 });
  }

  if (body.isDefault) {
    await prisma.address.updateMany({
      where: { customerId },
      data: { isDefault: false },
    });
  }

  const address = await prisma.address.create({
    data: {
      customerId,
      label: body.label?.trim() || "Home",
      line1: body.line1.trim(),
      city: body.city?.trim() ?? "",
      postal: body.postal?.trim() ?? "",
      isDefault: body.isDefault ?? false,
    },
  });

  return NextResponse.json({ address });
}

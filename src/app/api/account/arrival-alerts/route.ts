import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCustomerIdFromSession } from "@/lib/customer-auth";
import { getProductById } from "@/lib/data/products";

export async function GET() {
  const customerId = await getCustomerIdFromSession();
  if (!customerId || !prisma) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const alerts = await prisma.arrivalAlert.findMany({
    where: { customerId, active: true },
    orderBy: { createdAt: "desc" },
  });

  const enriched = await Promise.all(
    alerts.map(async (a) => {
      if (a.productId) {
        const product = await getProductById(a.productId);
        return {
          id: a.id,
          productId: a.productId,
          genus: null,
          label: product ? `${product.common.en} (${product.scientific})` : a.productId,
        };
      }
      return { id: a.id, productId: null, genus: a.genus, label: a.genus ?? "" };
    }),
  );

  return NextResponse.json({ alerts: enriched });
}

export async function POST(req: Request) {
  const customerId = await getCustomerIdFromSession();
  if (!customerId || !prisma) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  let body: { productId?: string; genus?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!body.productId && !body.genus?.trim()) {
    return NextResponse.json({ error: "Product or genus required." }, { status: 400 });
  }

  const alert = await prisma.arrivalAlert.create({
    data: {
      customerId,
      productId: body.productId ?? null,
      genus: body.genus?.trim() ?? null,
    },
  });

  return NextResponse.json({ alert });
}

export async function DELETE(req: Request) {
  const customerId = await getCustomerIdFromSession();
  if (!customerId || !prisma) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  await prisma.arrivalAlert.deleteMany({ where: { id, customerId } });
  return NextResponse.json({ ok: true });
}

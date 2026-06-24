import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCustomerIdFromSession } from "@/lib/customer-auth";
import { getProductById } from "@/lib/data/products";

export async function GET() {
  const customerId = await getCustomerIdFromSession();
  if (!customerId || !prisma) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const items = await prisma.wishlistItem.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
  });

  const enriched = await Promise.all(
    items.map(async (item) => {
      const product = await getProductById(item.productId);
      if (!product) return null;
      const unit = item.unitKey
        ? product.availability.find((u) => u.key === item.unitKey)
        : product.availability.find((u) => u.stock > 0) ?? product.availability[0];
      return {
        id: item.id,
        productId: item.productId,
        unitKey: item.unitKey,
        notifyStock: item.notifyStock,
        slug: product.slug,
        scientific: product.scientific,
        commonEn: product.common.en,
        commonFr: product.common.fr,
        image: product.image,
        hue: product.hue,
        inStock: (unit?.stock ?? 0) > 0,
        unitLabel: unit?.sizeLabel ?? "",
        price: unit?.price ?? 0,
      };
    }),
  );

  return NextResponse.json({ items: enriched.filter(Boolean) });
}

export async function POST(req: Request) {
  const customerId = await getCustomerIdFromSession();
  if (!customerId || !prisma) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  let body: { productId?: string; unitKey?: string; notifyStock?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!body.productId) return NextResponse.json({ error: "Product required." }, { status: 400 });

  const item = await prisma.wishlistItem.upsert({
    where: {
      customerId_productId_unitKey: {
        customerId,
        productId: body.productId,
        unitKey: body.unitKey ?? "",
      },
    },
    create: {
      customerId,
      productId: body.productId,
      unitKey: body.unitKey ?? "",
      notifyStock: body.notifyStock ?? true,
    },
    update: { notifyStock: body.notifyStock ?? true },
  });

  return NextResponse.json({ item });
}

export async function DELETE(req: Request) {
  const customerId = await getCustomerIdFromSession();
  if (!customerId || !prisma) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const productId = searchParams.get("productId");
  const unitKey = searchParams.get("unitKey") ?? "";

  if (id) {
    await prisma.wishlistItem.deleteMany({ where: { id, customerId } });
  } else if (productId) {
    await prisma.wishlistItem.deleteMany({ where: { customerId, productId, unitKey } });
  } else {
    return NextResponse.json({ error: "Missing id or productId." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

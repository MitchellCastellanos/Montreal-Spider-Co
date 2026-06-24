import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCustomerIdFromSession } from "@/lib/customer-auth";

export async function GET(req: Request) {
  const customerId = await getCustomerIdFromSession();
  if (!customerId || !prisma) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const productId = new URL(req.url).searchParams.get("productId");

  if (productId) {
    const review = await prisma.productReview.findUnique({
      where: { customerId_productId: { customerId, productId } },
    });
    const all = await prisma.productReview.findMany({
      where: { productId },
      include: { customer: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    const purchased = await prisma.orderLine.findFirst({
      where: { productId, order: { customerId } },
    });
    return NextResponse.json({
      mine: review,
      reviews: all.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        name: r.customer.name.split(" ")[0],
        date: r.createdAt.toISOString(),
      })),
      canReview: Boolean(purchased),
    });
  }

  const reviews = await prisma.productReview.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ reviews });
}

export async function POST(req: Request) {
  const customerId = await getCustomerIdFromSession();
  if (!customerId || !prisma) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  let body: { productId?: string; rating?: number; comment?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!body.productId || !body.rating || body.rating < 1 || body.rating > 5) {
    return NextResponse.json({ error: "Invalid review." }, { status: 400 });
  }

  const purchased = await prisma.orderLine.findFirst({
    where: { productId: body.productId, order: { customerId } },
    include: { order: true },
  });
  if (!purchased) {
    return NextResponse.json({ error: "Only verified buyers can review." }, { status: 403 });
  }

  const review = await prisma.productReview.upsert({
    where: { customerId_productId: { customerId, productId: body.productId } },
    create: {
      customerId,
      productId: body.productId,
      orderId: purchased.orderId,
      rating: body.rating,
      comment: body.comment?.trim() ?? "",
    },
    update: {
      rating: body.rating,
      comment: body.comment?.trim() ?? "",
    },
  });

  return NextResponse.json({ review });
}

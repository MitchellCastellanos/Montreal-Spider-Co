import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCustomerIdFromSession } from "@/lib/customer-auth";

type Params = { params: Promise<{ orderNumber: string }> };

async function getOrderForCustomer(orderNumber: string, customerId: string) {
  if (!prisma) return null;
  return prisma.order.findFirst({
    where: { orderNumber, customerId },
    include: {
      lines: true,
      specimens: { select: { tarantulAppId: true, sizeCm: true, sex: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
}

export async function GET(_req: Request, { params }: Params) {
  const customerId = await getCustomerIdFromSession();
  if (!customerId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { orderNumber } = await params;
  const order = await getOrderForCustomer(orderNumber, customerId);
  if (!order) return NextResponse.json({ error: "Not found." }, { status: 404 });

  return NextResponse.json({
    messages: order.messages.map((m) => ({
      id: m.id,
      author: m.author,
      body: m.body,
      date: m.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: Request, { params }: Params) {
  const customerId = await getCustomerIdFromSession();
  if (!customerId || !prisma) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { orderNumber } = await params;
  const order = await getOrderForCustomer(orderNumber, customerId);
  if (!order) return NextResponse.json({ error: "Not found." }, { status: 404 });

  let body: { message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const text = body.message?.trim();
  if (!text) return NextResponse.json({ error: "Message required." }, { status: 400 });

  const message = await prisma.orderMessage.create({
    data: {
      orderId: order.id,
      customerId,
      author: "customer",
      body: text,
    },
  });

  return NextResponse.json({
    message: {
      id: message.id,
      author: message.author,
      body: message.body,
      date: message.createdAt.toISOString(),
    },
  });
}

import { NextResponse } from "next/server";
import type { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isAdminAuthed } from "@/lib/auth";

type Params = { params: Promise<{ orderNumber: string }> };

export async function GET(_req: Request, { params }: Params) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!prisma) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const { orderNumber } = await params;
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      lines: true,
      messages: { orderBy: { createdAt: "asc" } },
      customer: { select: { name: true, email: true, phone: true } },
    },
  });
  if (!order) return NextResponse.json({ error: "Not found." }, { status: 404 });

  return NextResponse.json({
    order: {
      orderNumber: order.orderNumber,
      status: order.status,
      statusDetail: order.statusDetail,
      total: order.total,
      createdAt: order.createdAt.toISOString(),
      customerName: order.name,
      customerEmail: order.email,
      customerPhone: order.phone,
      lines: order.lines.map((l) => ({
        name: l.nameEn,
        size: l.sizeLabelEn,
        qty: l.qty,
        price: l.unitPrice,
      })),
      messages: order.messages.map((m) => ({
        id: m.id,
        author: m.author,
        body: m.body,
        date: m.createdAt.toISOString(),
      })),
    },
  });
}

export async function PATCH(req: Request, { params }: Params) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!prisma) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const { orderNumber } = await params;
  let body: { status?: OrderStatus; statusDetail?: string; staffMessage?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { orderNumber } });
  if (!order) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await prisma.order.update({
    where: { orderNumber },
    data: {
      ...(body.status ? { status: body.status } : {}),
      ...(body.statusDetail !== undefined ? { statusDetail: body.statusDetail } : {}),
    },
  });

  if (body.staffMessage?.trim() && order.customerId) {
    await prisma.orderMessage.create({
      data: {
        orderId: order.id,
        customerId: order.customerId,
        author: "staff",
        body: body.staffMessage.trim(),
      },
    });
  }

  return NextResponse.json({ ok: true });
}

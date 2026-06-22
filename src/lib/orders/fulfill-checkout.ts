import "server-only";
import type Stripe from "stripe";
import type { FulfillmentMethod, OrderStatus, SpecimenSex } from "@prisma/client";
import { prisma } from "@/lib/db";
import { sendOrderConfirmationEmail } from "@/lib/email";
import { assignSpecimensFifo, syncAggregateStock } from "@/lib/data/specimens";

function generateOrderNumber(): string {
  return `MSC-${Math.floor(1000 + Math.random() * 9000)}`;
}

export async function fulfillCheckoutSession(session: Stripe.Checkout.Session) {
  if (!prisma) throw new Error("Database not configured.");

  const existing = await prisma.order.findUnique({
    where: { stripeSessionId: session.id },
    include: { lines: true },
  });
  if (existing) return existing;

  const md = session.metadata ?? {};
  const method = (md.method === "pickup" ? "pickup" : "delivery") as FulfillmentMethod;
  const email = (session.customer_details?.email ?? session.customer_email ?? md.customerEmail ?? "").trim().toLowerCase();
  if (!email) throw new Error("Missing customer email on checkout session.");

  const orderItems = JSON.parse(md.orderItems || "[]") as {
    productId: string;
    sizeCm: number;
    sex: SpecimenSex;
    nameEn: string;
    nameFr: string;
    sizeLabelEn: string;
    sizeLabelFr: string;
    qty: number;
    price: number;
  }[];
  if (!orderItems.length) throw new Error("Missing order items in session metadata.");

  let orderNumber = generateOrderNumber();
  for (let attempt = 0; attempt < 5; attempt++) {
    const taken = await prisma.order.findUnique({ where: { orderNumber } });
    if (!taken) break;
    orderNumber = generateOrderNumber();
  }

  const customerId =
    md.customerId ||
    (email ? (await prisma.customer.findUnique({ where: { email }, select: { id: true } }))?.id : null) ||
    null;
  const status: OrderStatus = method === "pickup" ? "ready" : "processing";

  const order = await prisma.$transaction(async (tx) => {
    for (const item of orderItems) {
      const available = await tx.specimen.count({
        where: {
          productId: item.productId,
          sizeCm: item.sizeCm,
          sex: item.sex,
          price: item.price,
          status: "available",
          locationType: "warehouse",
        },
      });
      if (available < item.qty) {
        throw new Error(`Insufficient stock for ${item.productId}/${item.sizeCm}cm/${item.sex}`);
      }
    }

    const created = await tx.order.create({
      data: {
        orderNumber,
        stripeSessionId: session.id,
        customerId,
        email,
        name: md.customerName ?? session.customer_details?.name ?? "",
        phone: md.customerPhone ?? session.customer_details?.phone ?? "",
        method,
        status,
        subtotal: Number(md.subtotal ?? 0),
        deliveryFee: Number(md.deliveryFee ?? 0),
        tax: Number(md.tax ?? 0),
        total: (session.amount_total ?? 0) / 100,
        notes: md.customerNotes ?? "",
        address: md.address ?? null,
        city: md.city ?? null,
        postal: md.postal ?? null,
        zoneId: md.zoneId ?? null,
        pickupId: md.pickupId ?? null,
        locale: md.locale ?? "en",
        salesChannel: "web",
        paymentMethod: "stripe",
        lines: {
          create: orderItems.map((item) => ({
            productId: item.productId,
            sizeCm: item.sizeCm,
            sex: item.sex,
            nameEn: item.nameEn,
            nameFr: item.nameFr,
            sizeLabelEn: item.sizeLabelEn,
            sizeLabelFr: item.sizeLabelFr,
            qty: item.qty,
            unitPrice: item.price,
          })),
        },
      },
      include: { lines: true },
    });

    for (const line of created.lines) {
      await assignSpecimensFifo(tx, {
        productId: line.productId,
        sizeCm: line.sizeCm!,
        sex: line.sex!,
        price: line.unitPrice,
        qty: line.qty,
        salePriceEach: line.unitPrice,
        orderId: created.id,
        orderLineId: line.id,
        salesChannel: "web",
        paymentMethod: "stripe",
      });
    }

    return created;
  });

  await syncAggregateStock();

  try {
    await sendOrderConfirmationEmail({
      to: email,
      locale: (md.locale === "fr" ? "fr" : "en") as "en" | "fr",
      orderNumber: order.orderNumber,
      total: order.total,
      name: order.name,
    });
  } catch (e) {
    console.error("[fulfill-checkout] email failed:", e);
  }

  return order;
}

export async function getOrderByStripeSession(sessionId: string) {
  if (!prisma) return null;
  return prisma.order.findUnique({
    where: { stripeSessionId: sessionId },
    include: { lines: true },
  });
}

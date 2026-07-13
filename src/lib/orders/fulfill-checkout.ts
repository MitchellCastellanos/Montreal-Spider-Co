import "server-only";
import type Stripe from "stripe";
import type { FulfillmentMethod, SpecimenSex } from "@prisma/client";
import { prisma } from "@/lib/db";
import { sendNotification, notifyStaff } from "@/lib/notifications/service";
import { allocateSpecimensFifo, syncAggregateStock, type DistributorPickupLine } from "@/lib/data/specimens";
import { createFulfillmentForOrder } from "@/lib/fulfillment/fulfillment";
import { redeemCoupon } from "@/lib/account/coupons";
import { grantReferralReward } from "@/lib/account/referral";
import { saveFulfillmentFromCheckout } from "@/lib/account/preferences";

function generateOrderNumber(): string {
  return `MSC-${Math.floor(1000 + Math.random() * 9000)}`;
}

/**
 * Post-payment order creation. The order becomes PAID and its specimens become
 * ALLOCATED (reserved, hidden from the storefront). They only become SOLD when
 * physical delivery is confirmed through the Fulfillment module.
 */
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

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  const distributorAlerts: DistributorPickupLine[] = [];

  const { order } = await prisma.$transaction(async (tx) => {
    for (const item of orderItems) {
      const available = await tx.specimen.count({
        where: {
          productId: item.productId,
          sizeCm: item.sizeCm,
          sex: item.sex,
          price: item.price,
          status: { in: ["available", "consignment"] },
          locationType: { not: "transit" },
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
        stripePaymentIntentId: paymentIntentId,
        customerId,
        email,
        name: md.customerName ?? session.customer_details?.name ?? "",
        phone: md.customerPhone ?? session.customer_details?.phone ?? "",
        method,
        status: "paid",
        subtotal: Number(md.subtotal ?? 0),
        discountAmount: Number(md.discountAmount ?? 0),
        couponCode: md.couponCode ?? null,
        deliveryFee: Number(md.deliveryFee ?? 0),
        tax: Number(md.tax ?? 0),
        total: (session.amount_total ?? 0) / 100,
        notes: md.customerNotes ?? "",
        address: md.address ?? null,
        city: md.city ?? null,
        postal: md.postal ?? null,
        zoneId: md.zoneId ?? null,
        pickupId: md.pickupId ?? null,
        pickupSubtype: md.pickupSubtype ?? (method === "pickup" ? "pickup_point" : null),
        metroStationId: md.metroStationId ?? null,
        metroLine: md.metroLine ?? null,
        meetupZoneId: md.meetupZoneId ?? null,
        meetupAvailability: md.meetupAvailability ?? null,
        customMeetupRequest: md.customMeetupRequest ?? null,
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
      const { distributorPickups } = await allocateSpecimensFifo(tx, {
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
      distributorAlerts.push(...distributorPickups);
    }

    await createFulfillmentForOrder(tx, created);

    return { order: created };
  });

  await syncAggregateStock();

  if (md.couponId) {
    try {
      await redeemCoupon(md.couponId);
    } catch (e) {
      console.error("[fulfill-checkout] coupon redeem failed:", e);
    }
  }

  if (customerId) {
    try {
      await saveFulfillmentFromCheckout(customerId, {
        prefPickupId: md.pickupId ?? null,
        prefPickupSubtype: md.pickupSubtype ?? null,
        prefMetroStationId: md.metroStationId ?? null,
        prefMetroLine: md.metroLine ?? null,
        prefMeetupZoneId: md.meetupZoneId ?? null,
        prefMeetupAvailability: md.meetupAvailability ?? null,
        prefCustomMeetup: md.customMeetupRequest ?? null,
        notes: md.customerNotes,
      });

      const buyer = await prisma.customer.findUnique({
        where: { id: customerId },
        select: { referredById: true },
      });
      if (buyer?.referredById) {
        const priorOrders = await prisma.order.count({
          where: { customerId, id: { not: order.id } },
        });
        if (priorOrders === 0) {
          await grantReferralReward(buyer.referredById);
        }
      }
    } catch (e) {
      console.error("[fulfill-checkout] post-order account updates failed:", e);
    }
  }

  const locale = (md.locale === "fr" ? "fr" : "en") as "en" | "fr";
  const itemLines = order.lines.map((l) => `${l.qty}× ${l.nameEn} (${l.sizeLabelEn})`).join("\n");

  // All emails go through the Notification Service (rendered, delivered, logged).
  await sendNotification({
    templateId: "order-confirmation",
    event: "order.paid",
    to: email,
    locale,
    data: {
      name: order.name,
      orderNumber: order.orderNumber,
      total: `$${order.total.toFixed(2)} CAD`,
    },
    context: { orderId: order.id },
  });

  await notifyStaff({
    templateId: "internal-new-order",
    event: "order.paid",
    data: {
      orderNumber: order.orderNumber,
      customerName: order.name,
      total: `$${order.total.toFixed(2)} CAD`,
      method:
        md.pickupSubtype === "metro_meetup"
          ? `Metro meetup — ${md.metroStationName ?? ""}`
          : md.pickupSubtype === "custom_meetup"
            ? "Custom meetup"
            : `Pickup point ${md.pickupId ?? ""}`,
      itemLines: itemLines.replace(/\n/g, "<br />"),
    },
    context: { orderId: order.id },
  });

  // Reserved partner stock: ask each partner to hold the specimen(s).
  const byLocation = new Map<string, DistributorPickupLine[]>();
  for (const line of distributorAlerts) {
    const list = byLocation.get(line.locationId) ?? [];
    list.push(line);
    byLocation.set(line.locationId, list);
  }
  for (const [locationId, lines] of byLocation) {
    const partnerEmail = lines[0].distributorEmail;
    await sendNotification({
      templateId: "partner-pickup-reservation",
      event: "order.paid",
      to: partnerEmail,
      data: {
        partnerName: lines[0].distributorName,
        orderNumber: order.orderNumber,
        itemLines: lines.map((l) => `${l.productName} (${l.sizeLabel}, ${l.sex})`).join("<br />"),
      },
      context: { orderId: order.id, locationId },
    });
  }
  if (distributorAlerts.length > 0) {
    // Staff still get the legacy "call the distributor" alert — it carries the phone numbers.
    await notifyStaff({
      templateId: "distributor-sale-alert",
      event: "order.paid",
      data: {
        orderNumber: order.orderNumber,
        customerName: order.name,
        customerEmail: order.email,
        customerPhone: order.phone,
        total: `$${order.total.toFixed(2)} CAD`,
        itemLines: distributorAlerts
          .map(
            (l) =>
              `• ${l.productName} (${l.sizeLabel}, ${l.sex}) @ ${l.distributorName} — $${l.price.toFixed(2)}${l.distributorPhone ? ` · ${l.distributorPhone}` : ""}`,
          )
          .join("\n"),
      },
      context: { orderId: order.id },
    });
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

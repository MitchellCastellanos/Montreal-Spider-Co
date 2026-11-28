import "server-only";
import type Stripe from "stripe";
import type { Order, OrderLine, Prisma, SpecimenSex, SupplierOffer } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { SITE } from "@/lib/site";
import { formatDeadline } from "@/lib/business-days";
import { notifyStaff, sendNotification } from "@/lib/notifications/service";
import { createFulfillmentForOrder } from "@/lib/fulfillment/fulfillment";
import { syncAggregateStock } from "@/lib/data/specimens";
import { redeemCoupon } from "@/lib/account/coupons";
import { grantReferralReward } from "@/lib/account/referral";
import { saveFulfillmentFromCheckout } from "@/lib/account/preferences";
import { nextOrderNumber } from "@/lib/orders/order-number";
import { getExternalSettings } from "@/lib/external-orders/settings";
import {
  apologyCouponCode,
  extendDeadline,
  holdUrgency,
  initialHoldDeadline,
} from "@/lib/external-orders/pure";

/**
 * External (made-to-order) orders: the customer's card is AUTHORIZED at checkout, not charged.
 * Staff buy the specimen from the supplier and "confirm" (→ the authorization is captured and a real
 * Specimen is created and linked to the order), or "decline" (→ the authorization is cancelled and the
 * customer is never charged). Unconfirmed holds are released automatically at their deadline.
 */

type ExternalItem = {
  productId: string;
  offerId: string;
  sizeCm: number;
  sex: SpecimenSex;
  nameEn: string;
  nameFr: string;
  sizeLabelEn: string;
  sizeLabelFr: string;
  qty: number;
  price: number;
};

type HeldOrder = Order & { lines: (OrderLine & { supplierOffer: SupplierOffer | null })[] };

function requireDb() {
  if (!prisma) throw new Error("Database not configured.");
  return prisma;
}

function loc(order: { locale: string }): "en" | "fr" {
  return order.locale === "fr" ? "fr" : "en";
}

function itemLines(order: HeldOrder): string {
  return order.lines.map((l) => `${l.qty}× ${l.nameEn} (${l.sizeLabelEn}${l.sex ? `, ${l.sex}` : ""})`).join(", ");
}

function adminUrl(): string {
  return `${SITE.url.replace(/\/$/, "")}/en/admin/external`;
}

async function loadHeld(orderId: string): Promise<HeldOrder> {
  const order = await requireDb().order.findUnique({
    where: { id: orderId },
    include: { lines: { include: { supplierOffer: true } } },
  });
  if (!order) throw new Error("Order not found.");
  return order;
}

/** Webhook entry: create the order in a held state. Idempotent per Checkout Session (caller checks). */
export async function fulfillExternalHold(session: Stripe.Checkout.Session): Promise<HeldOrder> {
  const db = requireDb();
  const md = session.metadata ?? {};
  const items = JSON.parse(md.orderItems || "[]") as ExternalItem[];
  if (!items.length || !items[0].offerId) throw new Error("Missing external order items in session metadata.");

  const email = (session.customer_details?.email ?? session.customer_email ?? md.customerEmail ?? "").trim().toLowerCase();
  if (!email) throw new Error("Missing customer email on checkout session.");

  const piId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  if (!piId) throw new Error("Missing payment intent on external checkout session.");
  const pi = await getStripe().paymentIntents.retrieve(piId);
  if (pi.status !== "requires_capture" && pi.status !== "succeeded") {
    throw new Error(`Unexpected PaymentIntent status for external order: ${pi.status}`);
  }

  const settings = await getExternalSettings();
  const now = new Date();
  const { deadline, authExpiresAt } = initialHoldDeadline(now, settings);
  const customerId =
    md.customerId || (await db.customer.findUnique({ where: { email }, select: { id: true } }))?.id || null;
  const orderNumber = await nextOrderNumber();

  const order = await db.order.create({
    data: {
      orderNumber,
      stripeSessionId: session.id,
      stripePaymentIntentId: piId,
      customerId,
      email,
      name: md.customerName ?? session.customer_details?.name ?? "",
      phone: md.customerPhone ?? session.customer_details?.phone ?? "",
      method: "pickup",
      status: "processing",
      statusDetail: "Awaiting availability confirmation",
      subtotal: Number(md.subtotal ?? 0),
      discountAmount: Number(md.discountAmount ?? 0),
      couponCode: md.couponCode ?? null,
      deliveryFee: Number(md.deliveryFee ?? 0),
      tax: Number(md.tax ?? 0),
      total: (session.amount_total ?? 0) / 100,
      notes: md.customerNotes ?? "",
      pickupId: md.pickupId ?? null,
      pickupSubtype: md.pickupSubtype ?? "pickup_point",
      metroStationId: md.metroStationId ?? null,
      metroLine: md.metroLine ?? null,
      meetupZoneId: md.meetupZoneId ?? null,
      meetupAvailability: md.meetupAvailability ?? null,
      customMeetupRequest: md.customMeetupRequest ?? null,
      locale: md.locale ?? "en",
      salesChannel: "web",
      paymentMethod: "stripe",
      // `succeeded` means the method captured immediately (can't be un-captured): treat it as already charged.
      holdStatus: pi.status === "succeeded" ? "captured" : "authorized",
      holdDeadline: deadline,
      holdAuthExpiresAt: authExpiresAt,
      lines: {
        create: items.map((i) => ({
          productId: i.productId,
          supplierOfferId: i.offerId,
          sizeCm: i.sizeCm,
          sex: i.sex,
          nameEn: i.nameEn,
          nameFr: i.nameFr,
          sizeLabelEn: i.sizeLabelEn,
          sizeLabelFr: i.sizeLabelFr,
          qty: i.qty,
          unitPrice: i.price,
        })),
      },
    },
    include: { lines: { include: { supplierOffer: true } } },
  });

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
    } catch (e) {
      console.error("[external-orders] saving fulfillment preferences failed:", e);
    }
  }

  const l = loc(order);
  await sendNotification({
    templateId: "external-order-received",
    event: "order.external_requested",
    to: email,
    locale: l,
    data: { name: order.name, orderNumber, itemLines: itemLines(order), deadline: formatDeadline(deadline, l) },
    context: { orderId: order.id },
  });
  await notifyStaff({
    templateId: "internal-external-order",
    event: "order.external_requested",
    data: {
      orderNumber,
      customerName: order.name,
      itemLines: itemLines(order),
      supplier: order.lines[0]?.supplierOffer?.supplier ?? "the supplier",
      deadline: formatDeadline(deadline, "en"),
      adminUrl: adminUrl(),
    },
    context: { orderId: order.id },
  });
  return order;
}

/** Retrieve the PaymentIntent behind a held order. */
async function getIntent(order: Order): Promise<Stripe.PaymentIntent> {
  if (!order.stripePaymentIntentId) throw new Error("This order has no payment intent.");
  return getStripe().paymentIntents.retrieve(order.stripePaymentIntentId);
}

/**
 * Staff bought the specimen: capture the held payment, create the real Specimen(s) (allocated to the
 * order, with the true supplier cost) and hand the order to normal fulfillment.
 * Safe to retry: if the capture already went through, it continues from there.
 */
export async function confirmExternalOrder(orderId: string, opts: { unitCost?: number } = {}): Promise<void> {
  const db = requireDb();
  const order = await loadHeld(orderId);
  if (order.holdStatus === "captured" && (await db.orderLineSpecimen.count({ where: { orderLine: { orderId } } })) > 0) {
    throw new Error("This order is already confirmed.");
  }
  if (order.holdStatus === "released") throw new Error("This order was already released — the customer was not charged.");
  if (order.lines.length !== 1) throw new Error("Unexpected external order shape.");
  const line = order.lines[0];

  const pi = await getIntent(order);
  if (pi.status === "requires_capture") {
    try {
      await getStripe().paymentIntents.capture(pi.id, {}, { idempotencyKey: `msc-capture-${order.id}` });
    } catch (e) {
      const again = await getIntent(order);
      if (again.status === "canceled") {
        await db.order.update({ where: { id: order.id }, data: { holdStatus: "released", status: "cancelled", statusDetail: "Authorization expired" } });
        throw new Error("The card authorization has expired or was cancelled — the customer was not charged. Contact them.");
      }
      if (again.status !== "succeeded") throw e;
    }
  } else if (pi.status === "canceled") {
    await db.order.update({ where: { id: order.id }, data: { holdStatus: "released", status: "cancelled", statusDetail: "Authorization expired" } });
    throw new Error("The card authorization has expired or was cancelled — the customer was not charged. Contact them.");
  } else if (pi.status !== "succeeded") {
    throw new Error(`Payment is not ready to capture (status: ${pi.status}).`);
  }

  const offer = line.supplierOffer;
  const unitCost = opts.unitCost != null && opts.unitCost >= 0 ? opts.unitCost : (offer?.unitCost ?? 0);
  const now = new Date();

  await db.$transaction(async (tx: Prisma.TransactionClient) => {
    for (let i = 0; i < line.qty; i++) {
      const specimen = await tx.specimen.create({
        data: {
          productId: line.productId,
          sizeCm: line.sizeCm ?? 0,
          sex: line.sex ?? "unsexed",
          price: line.unitPrice,
          status: "allocated",
          locationType: "warehouse",
          unitCost,
          supplier: offer?.supplier ?? "Supplier",
          purchasedAt: now,
          lastMeasuredAt: now,
          salePrice: line.unitPrice,
          salesChannel: "web",
          paymentMethod: "stripe",
          orderId: order.id,
          notes: `Bought to order for ${order.orderNumber}`,
        },
      });
      await tx.orderLineSpecimen.create({ data: { orderLineId: line.id, specimenId: specimen.id } });
      await tx.inventoryMovement.create({
        data: { specimenId: specimen.id, type: "purchase", toLocationType: "warehouse", amount: unitCost, notes: `Made-to-order ${order.orderNumber}` },
      });
      await tx.inventoryMovement.create({
        data: { specimenId: specimen.id, type: "allocation", fromLocationType: "warehouse", amount: line.unitPrice, salesChannel: "web", paymentMethod: "stripe", notes: `Order ${order.id}` },
      });
    }
    await tx.order.update({ where: { id: order.id }, data: { holdStatus: "captured", status: "paid", statusDetail: "" } });
    await createFulfillmentForOrder(tx, order);
  });

  await syncAggregateStock();

  // Deferred until payment is real: coupon use and referral reward.
  if (order.couponCode) {
    try {
      const coupon = await db.coupon.findUnique({ where: { code: order.couponCode } });
      if (coupon) await redeemCoupon(coupon.id);
    } catch (e) {
      console.error("[external-orders] coupon redeem failed:", e);
    }
  }
  if (order.customerId) {
    try {
      const buyer = await db.customer.findUnique({ where: { id: order.customerId }, select: { referredById: true } });
      if (buyer?.referredById) {
        const prior = await db.order.count({ where: { customerId: order.customerId, id: { not: order.id }, holdStatus: { not: "released" } } });
        if (prior === 0) await grantReferralReward(buyer.referredById);
      }
    } catch (e) {
      console.error("[external-orders] referral reward failed:", e);
    }
  }

  const lead = offer ? `${offer.leadDaysMin}–${offer.leadDaysMax}` : "1–3";
  const l = loc(order);
  await sendNotification({
    templateId: "external-order-confirmed",
    event: "order.external_confirmed",
    to: order.email,
    locale: l,
    data: {
      name: order.name,
      orderNumber: order.orderNumber,
      itemLines: itemLines(order),
      leadTime: l === "fr" ? `${lead} jours ouvrables` : `${lead} business days`,
    },
    context: { orderId: order.id },
  });
}

export interface DeclineOptions {
  /** Apology credit (CAD) to email as a single-use coupon. 0/undefined = none. */
  credit?: number;
  /** Released automatically at the deadline (vs. by staff). */
  auto?: boolean;
}

/**
 * MSC can't get the specimen: cancel the authorization (the customer is never charged) and email an
 * apology, with an optional single-use credit coupon.
 */
export async function declineExternalOrder(orderId: string, opts: DeclineOptions = {}): Promise<{ couponCode: string | null }> {
  const db = requireDb();
  const order = await loadHeld(orderId);
  if (order.holdStatus !== "authorized") {
    throw new Error(order.holdStatus === "captured" ? "Already charged — use the regular refund/cancel flow." : "Already released.");
  }

  const pi = await getIntent(order);
  if (pi.status === "succeeded") throw new Error("The payment was already captured — use the regular refund/cancel flow.");
  if (pi.status !== "canceled") await getStripe().paymentIntents.cancel(pi.id);

  let couponCode: string | null = null;
  const credit = opts.credit ?? 0;
  if (credit > 0) {
    for (let attempt = 0; attempt < 3 && !couponCode; attempt++) {
      const code = apologyCouponCode();
      try {
        await db.coupon.create({
          data: {
            code,
            type: "fixed",
            value: credit,
            customerId: order.customerId,
            maxUses: 1,
            expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          },
        });
        couponCode = code;
      } catch {
        // code collision — try another
      }
    }
  }

  await db.order.update({
    where: { id: order.id },
    data: { holdStatus: "released", status: "cancelled", statusDetail: opts.auto ? "Specimen not confirmed in time" : "Specimen unavailable" },
  });

  const l = loc(order);
  const money = `$${credit.toFixed(2)}`;
  const creditLine = couponCode
    ? l === "fr"
      ? `En guise d'excuses, voici un crédit de ${money} pour votre prochaine commande : <strong>${couponCode}</strong> (valide 60 jours).`
      : `As an apology, here is a ${money} credit code for your next order: <strong>${couponCode}</strong> (valid 60 days).`
    : "";
  await sendNotification({
    templateId: "external-order-unavailable",
    event: "order.external_released",
    to: order.email,
    locale: l,
    data: { name: order.name, orderNumber: order.orderNumber, itemLines: itemLines(order), creditLine },
    context: { orderId: order.id },
  });
  return { couponCode };
}

/** Give staff more time (e.g. to go to the supplier tomorrow). Never past the authorization's safe limit. */
export async function extendExternalHold(orderId: string, extraBusinessDays: number): Promise<{ deadline: Date; capped: boolean }> {
  const db = requireDb();
  const order = await loadHeld(orderId);
  if (order.holdStatus !== "authorized") throw new Error("Only orders waiting for confirmation can be extended.");
  if (!order.holdDeadline || !order.holdAuthExpiresAt) throw new Error("This order has no hold window.");
  const days = Math.floor(extraBusinessDays);
  if (!Number.isFinite(days) || days < 1 || days > 5) throw new Error("Enter between 1 and 5 business days.");

  const settings = await getExternalSettings();
  const r = extendDeadline(order.holdDeadline, new Date(), days, settings.supplierHours, order.holdAuthExpiresAt);
  if (!r.ok) {
    throw new Error("The card authorization is at its safe limit and can't be extended — confirm or decline now.");
  }
  await db.order.update({
    where: { id: order.id },
    data: { holdDeadline: r.deadline, holdExtensions: { increment: 1 } },
  });

  const l = loc(order);
  await sendNotification({
    templateId: "external-order-delayed",
    event: "order.external_extended",
    to: order.email,
    locale: l,
    data: { name: order.name, orderNumber: order.orderNumber, deadline: formatDeadline(r.deadline, l) },
    context: { orderId: order.id },
  });
  return { deadline: r.deadline, capped: r.capped };
}

/** Cron sweep: release holds past their deadline, remind staff about those due within 24h. */
export async function processExternalHolds(now = new Date()): Promise<{ released: number; reminded: number; errors: number }> {
  const db = requireDb();
  const held = await db.order.findMany({
    where: { holdStatus: "authorized" },
    include: { lines: { include: { supplierOffer: true } } },
  });
  const settings = await getExternalSettings();
  let released = 0;
  let reminded = 0;
  let errors = 0;

  for (const order of held) {
    if (!order.holdDeadline) continue;
    const urgency = holdUrgency(order.holdDeadline, now);
    try {
      if (urgency === "overdue") {
        await declineExternalOrder(order.id, { credit: settings.apologyCredit, auto: true });
        released++;
        await notifyStaff({
          templateId: "internal-external-order-due",
          event: "order.external_released",
          data: {
            orderNumber: order.orderNumber,
            customerName: order.name,
            deadline: formatDeadline(order.holdDeadline, "en"),
            status: "was auto-released (not confirmed in time; customer not charged)",
            adminUrl: adminUrl(),
          },
          context: { orderId: order.id },
        });
      } else if (urgency === "due_soon") {
        reminded++;
        await notifyStaff({
          templateId: "internal-external-order-due",
          event: "order.external_reminder",
          data: {
            orderNumber: order.orderNumber,
            customerName: order.name,
            deadline: formatDeadline(order.holdDeadline, "en"),
            status: "is due within 24 hours",
            adminUrl: adminUrl(),
          },
          context: { orderId: order.id },
        });
      }
    } catch (e) {
      errors++;
      console.error("[external-orders] sweep failed for", order.orderNumber, e);
    }
  }
  return { released, reminded, errors };
}

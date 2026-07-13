import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { SITE } from "@/lib/site";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { getSettings } from "@/lib/data/settings";
import { markOrderSpecimensSold, releaseOrderSpecimens } from "@/lib/data/specimens";
import { sendNotification, notifyStaff } from "@/lib/notifications/service";

/**
 * Fulfillment domain — everything that happens AFTER payment until physical
 * delivery. Separate from Orders (the purchase) and Inventory (the specimens).
 *
 * Lifecycle: pending → preparing → ready → completed
 *                                        ↘ no_show / cancelled (refund + release)
 */

function requireDb() {
  if (!prisma) throw new Error("Database not configured.");
  return prisma;
}

type OrderWithRelations = Prisma.OrderGetPayload<{
  include: { lines: true; specimens: { include: { product: true } } };
}>;

const fulfillmentInclude = {
  order: { include: { lines: true, specimens: { include: { product: true } } } },
  location: true,
} as const;

export type FulfillmentWithOrder = Prisma.FulfillmentGetPayload<{ include: typeof fulfillmentInclude }>;

function orderItemLines(order: OrderWithRelations): string {
  return order.lines.map((l) => `${l.qty}× ${l.nameEn} (${l.sizeLabelEn})`).join("\n");
}

function fulfillmentMethodLabel(order: OrderWithRelations, locationName?: string | null): string {
  if (order.pickupSubtype === "metro_meetup") return `Metro meetup — ${order.metroStationId ?? ""}`;
  if (order.pickupSubtype === "custom_meetup") return `Custom meetup — ${order.customMeetupRequest ?? ""}`;
  return `Pickup — ${locationName ?? order.pickupId ?? "pickup point"}`;
}

function fmtDate(d: Date, locale: "en" | "fr"): string {
  return d.toLocaleDateString(locale === "fr" ? "fr-CA" : "en-CA", {
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function orderLocale(order: { locale: string }): "en" | "fr" {
  return order.locale === "fr" ? "fr" : "en";
}

/** Create the fulfillment record for a freshly paid order (idempotent). */
export async function createFulfillmentForOrder(
  tx: Prisma.TransactionClient,
  order: { id: string; pickupId: string | null; pickupSubtype: string | null },
): Promise<void> {
  const existing = await tx.fulfillment.findUnique({ where: { orderId: order.id } });
  if (existing) return;
  await tx.fulfillment.create({
    data: {
      orderId: order.id,
      status: "pending",
      locationId: order.pickupSubtype === "pickup_point" ? order.pickupId : null,
    },
  });
}

export async function listFulfillments(statuses?: ("pending" | "preparing" | "ready" | "completed" | "no_show" | "cancelled")[]): Promise<FulfillmentWithOrder[]> {
  const db = requireDb();
  return db.fulfillment.findMany({
    where: statuses && statuses.length > 0 ? { status: { in: statuses } } : {},
    include: fulfillmentInclude,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function getFulfillmentById(id: string): Promise<FulfillmentWithOrder | null> {
  const db = requireDb();
  return db.fulfillment.findUnique({ where: { id }, include: fulfillmentInclude });
}

export async function getFulfillmentByPickupToken(token: string): Promise<FulfillmentWithOrder | null> {
  const db = requireDb();
  return db.fulfillment.findUnique({ where: { pickupToken: token }, include: fulfillmentInclude });
}

/** Start preparation (pending → preparing). Notifies the customer. */
export async function markPreparing(fulfillmentId: string): Promise<void> {
  const db = requireDb();
  const f = await getFulfillmentById(fulfillmentId);
  if (!f) throw new Error("Fulfillment not found.");
  if (f.status !== "pending") throw new Error(`Cannot start preparing (status: ${f.status}).`);

  await db.$transaction([
    db.fulfillment.update({ where: { id: fulfillmentId }, data: { status: "preparing" } }),
    db.order.update({ where: { id: f.orderId }, data: { status: "processing" } }),
  ]);

  await sendNotification({
    templateId: "preparing-specimen",
    event: "fulfillment.preparing",
    to: f.order.email,
    locale: orderLocale(f.order),
    data: { name: f.order.name, orderNumber: f.order.orderNumber },
    context: { orderId: f.orderId, fulfillmentId },
  });
}

/**
 * Mark ready for pickup (→ ready). Starts the no-show clock and notifies the
 * customer plus the partner who will hand the order over.
 */
export async function markReady(fulfillmentId: string, scheduledFor?: Date): Promise<void> {
  const db = requireDb();
  const f = await getFulfillmentById(fulfillmentId);
  if (!f) throw new Error("Fulfillment not found.");
  if (f.status !== "pending" && f.status !== "preparing") {
    throw new Error(`Cannot mark ready (status: ${f.status}).`);
  }

  const settings = await getSettings();
  const readyAt = new Date();
  const collectBy = new Date(readyAt.getTime() + settings.pickupWindowDays * 24 * 60 * 60 * 1000);

  await db.$transaction([
    db.fulfillment.update({
      where: { id: fulfillmentId },
      data: { status: "ready", readyAt, collectBy, scheduledFor: scheduledFor ?? f.scheduledFor },
    }),
    db.order.update({ where: { id: f.orderId }, data: { status: "ready" } }),
  ]);

  const locale = orderLocale(f.order);
  await sendNotification({
    templateId: "pickup-ready",
    event: "fulfillment.ready",
    to: f.order.email,
    locale,
    data: {
      name: f.order.name,
      orderNumber: f.order.orderNumber,
      pickupName: f.location?.name ?? fulfillmentMethodLabel(f.order),
      pickupAddress: f.location?.address ?? "",
      pickupWindow: `${settings.pickupWindowDays} ${locale === "fr" ? "jours" : "days"}`,
    },
    context: { orderId: f.orderId, fulfillmentId },
  });

  if (f.location?.email) {
    await sendNotification({
      templateId: "partner-customer-arriving",
      event: "fulfillment.ready",
      to: f.location.email,
      data: {
        partnerName: f.location.contactName || f.location.name,
        orderNumber: f.order.orderNumber,
        customerName: f.order.name,
        itemLines: orderItemLines(f.order),
        confirmUrl: `${SITE.url}/en/p/pickup/${f.pickupToken}`,
      },
      context: { orderId: f.orderId, fulfillmentId, locationId: f.location.id },
    });
  }
}

/**
 * Confirm physical handover (→ completed). This is the ONLY place a web
 * order's specimens become SOLD.
 */
export async function confirmPickup(fulfillmentId: string): Promise<void> {
  const db = requireDb();
  const f = await getFulfillmentById(fulfillmentId);
  if (!f) throw new Error("Fulfillment not found.");
  if (f.status === "completed") return;
  if (f.status === "cancelled" || f.status === "no_show") {
    throw new Error(`Cannot complete a ${f.status} fulfillment.`);
  }

  const completedAt = new Date();
  await markOrderSpecimensSold(f.orderId, completedAt);
  await db.$transaction([
    db.fulfillment.update({ where: { id: fulfillmentId }, data: { status: "completed", completedAt } }),
    db.order.update({ where: { id: f.orderId }, data: { status: "delivered" } }),
  ]);

  const locale = orderLocale(f.order);
  await sendNotification({
    templateId: "pickup-completed",
    event: "fulfillment.completed",
    to: f.order.email,
    locale,
    data: {
      name: f.order.name,
      orderNumber: f.order.orderNumber,
      careUrl: `${SITE.url}/${locale}/care`,
    },
    context: { orderId: f.orderId, fulfillmentId },
  });
}

/** Manual reminder (also used by the scheduler). */
export async function sendPickupReminder(fulfillmentId: string, final = false): Promise<void> {
  const db = requireDb();
  const f = await getFulfillmentById(fulfillmentId);
  if (!f) throw new Error("Fulfillment not found.");
  if (f.status !== "ready") throw new Error("Order is not waiting for pickup.");

  const locale = orderLocale(f.order);
  await sendNotification({
    templateId: final ? "final-pickup-reminder" : "pickup-reminder",
    event: final ? "fulfillment.final_reminder" : "fulfillment.reminder",
    to: f.order.email,
    locale,
    data: {
      name: f.order.name,
      orderNumber: f.order.orderNumber,
      pickupName: f.location?.name ?? fulfillmentMethodLabel(f.order),
      collectBy: f.collectBy ? fmtDate(f.collectBy, locale) : "",
    },
    context: { orderId: f.orderId, fulfillmentId },
  });

  await db.fulfillment.update({
    where: { id: fulfillmentId },
    data: { remindersSent: { increment: 1 }, lastReminderAt: new Date() },
  });
}

async function refundOrder(
  order: { id: string; orderNumber: string; total: number; stripePaymentIntentId: string | null; paymentMethod: string },
  keepFee: number,
): Promise<{ refundId: string | null; amount: number }> {
  const amount = Math.max(0, Math.round((order.total - keepFee) * 100) / 100);
  if (amount <= 0) return { refundId: null, amount: 0 };

  if (order.paymentMethod === "stripe" && stripeConfigured && order.stripePaymentIntentId) {
    const refund = await getStripe().refunds.create({
      payment_intent: order.stripePaymentIntentId,
      amount: Math.round(amount * 100),
      metadata: { orderNumber: order.orderNumber },
    });
    return { refundId: refund.id, amount };
  }

  // No automatic path (legacy order without an intent id, or non-Stripe payment):
  // surface a manual task instead of failing the whole workflow.
  const db = requireDb();
  await db.operationsTask.create({
    data: {
      type: "general",
      title: `Manual refund needed — ${order.orderNumber}`,
      details: `Refund $${amount.toFixed(2)} CAD could not be issued automatically (no Stripe payment intent on file).`,
      orderId: order.id,
    },
  });
  return { refundId: null, amount };
}

export interface CancelOptions {
  /** Reason shown to the customer ("the pickup window expired", …). */
  reason: string;
  reasonFr?: string;
  /** Optional fee retained from the refund (no-show fee). */
  noShowFee?: number;
  /** Whether this cancellation is a no-show (affects status + partner email). */
  isNoShow?: boolean;
}

/**
 * Cancel a fulfillment: automatic refund, specimens released back to AVAILABLE,
 * and a manual-disposition task so the team decides where the inventory goes
 * (leave at partner / return to warehouse / transfer elsewhere).
 */
export async function cancelFulfillment(fulfillmentId: string, opts: CancelOptions): Promise<void> {
  const db = requireDb();
  const f = await getFulfillmentById(fulfillmentId);
  if (!f) throw new Error("Fulfillment not found.");
  if (f.status === "completed") throw new Error("Order was already delivered.");
  if (f.status === "cancelled" || f.status === "no_show") return;

  const fee = Math.max(0, opts.noShowFee ?? 0);
  const now = new Date();

  // 1) Refund first — if Stripe fails we abort before touching inventory.
  const { refundId, amount } = await refundOrder(f.order, fee);

  // 2) Release specimens back to available.
  const releasedIds = await releaseOrderSpecimens(
    f.orderId,
    opts.isNoShow ? `No-show — order ${f.order.orderNumber}` : `Cancelled — order ${f.order.orderNumber}`,
  );

  // 3) Update fulfillment + order.
  await db.$transaction([
    db.fulfillment.update({
      where: { id: fulfillmentId },
      data: {
        status: opts.isNoShow ? "no_show" : "cancelled",
        cancelledAt: now,
        noShowAt: opts.isNoShow ? now : null,
        stripeRefundId: refundId,
        refundedAt: refundId ? now : null,
        refundAmount: amount,
        noShowFee: fee,
      },
    }),
    db.order.update({
      where: { id: f.orderId },
      data: { status: "cancelled", statusDetail: opts.reason },
    }),
  ]);

  // 4) Inventory disposition is a manual decision — create the internal task.
  const specimens = f.order.specimens;
  const specimenList = specimens
    .map((s) => `${s.product.scientific} (${s.sizeCm} cm, ${s.sex})`)
    .join("; ");
  await db.operationsTask.create({
    data: {
      type: "no_show_disposition",
      title: `Disposition — order ${f.order.orderNumber} ${opts.isNoShow ? "no-show" : "cancelled"}`,
      details:
        `Specimens released back to AVAILABLE: ${specimenList || releasedIds.join(", ")}. ` +
        `Decide: leave at current location, return to warehouse, or transfer elsewhere.`,
      orderId: f.orderId,
      locationId: f.locationId,
      specimenId: specimens.length === 1 ? specimens[0].id : null,
    },
  });

  // 5) Notifications.
  const locale = orderLocale(f.order);
  await sendNotification({
    templateId: "order-cancelled",
    event: "fulfillment.cancelled",
    to: f.order.email,
    locale,
    data: {
      name: f.order.name,
      orderNumber: f.order.orderNumber,
      reason: locale === "fr" ? (opts.reasonFr ?? opts.reason) : opts.reason,
    },
    context: { orderId: f.orderId, fulfillmentId },
  });

  if (amount > 0 && refundId) {
    await sendNotification({
      templateId: "refund-issued",
      event: "fulfillment.refunded",
      to: f.order.email,
      locale,
      data: {
        name: f.order.name,
        orderNumber: f.order.orderNumber,
        amount: `$${amount.toFixed(2)} CAD`,
      },
      context: { orderId: f.orderId, fulfillmentId },
    });
  }

  if (opts.isNoShow && f.location?.email) {
    await sendNotification({
      templateId: "partner-no-show-summary",
      event: "fulfillment.no_show",
      to: f.location.email,
      data: {
        partnerName: f.location.contactName || f.location.name,
        orderNumber: f.order.orderNumber,
        itemLines: orderItemLines(f.order),
      },
      context: { orderId: f.orderId, fulfillmentId, locationId: f.location.id },
    });
  }

  await notifyStaff({
    templateId: "internal-refund-processed",
    event: "fulfillment.refunded",
    data: {
      orderNumber: f.order.orderNumber,
      amount: `$${amount.toFixed(2)} CAD`,
      reason: opts.isNoShow ? "no-show" : opts.reason,
    },
    context: { orderId: f.orderId, fulfillmentId },
  });
}

/** No-show shortcut used by the admin and the scheduler. */
export async function processNoShow(fulfillmentId: string, noShowFee = 0): Promise<void> {
  await cancelFulfillment(fulfillmentId, {
    reason: "the pickup window expired",
    reasonFr: "le délai de cueillette est expiré",
    noShowFee,
    isNoShow: true,
  });
}

const HOUR = 60 * 60 * 1000;
/** Grace period after the no-show warning before automatic cancellation. */
const NO_SHOW_GRACE_MS = 24 * HOUR;

export interface SchedulerResult {
  reminders: number;
  warnings: number;
  noShows: number;
}

/**
 * Scheduled sweep (cron): sends pickup reminders as the deadline approaches,
 * a no-show warning when it passes, and automatically cancels + refunds after
 * the grace period.
 */
export async function processOverdueFulfillments(): Promise<SchedulerResult> {
  const db = requireDb();
  const now = new Date();
  const result: SchedulerResult = { reminders: 0, warnings: 0, noShows: 0 };

  const waiting = await db.fulfillment.findMany({
    where: { status: "ready", collectBy: { not: null } },
    include: fulfillmentInclude,
  });

  for (const f of waiting) {
    const collectBy = f.collectBy!;
    try {
      if (now.getTime() >= collectBy.getTime() + NO_SHOW_GRACE_MS) {
        // Past deadline + grace → automatic no-show (cancel + refund + task).
        await processNoShow(f.id);
        result.noShows++;
      } else if (now >= collectBy) {
        // Past deadline → warn customer once, alert staff.
        if (f.remindersSent < 2) {
          const locale = orderLocale(f.order);
          await sendNotification({
            templateId: "no-show-warning",
            event: "fulfillment.no_show_warning",
            to: f.order.email,
            locale,
            data: {
              name: f.order.name,
              orderNumber: f.order.orderNumber,
              graceHours: String(Math.round(NO_SHOW_GRACE_MS / HOUR)),
            },
            context: { orderId: f.orderId, fulfillmentId: f.id },
          });
          await notifyStaff({
            templateId: "internal-pickup-overdue",
            event: "fulfillment.overdue",
            data: {
              orderNumber: f.order.orderNumber,
              customerName: f.order.name,
              collectBy: fmtDate(collectBy, "en"),
              pickupName: f.location?.name ?? fulfillmentMethodLabel(f.order),
            },
            context: { orderId: f.orderId, fulfillmentId: f.id },
          });
          await db.fulfillment.update({
            where: { id: f.id },
            data: { remindersSent: 2, lastReminderAt: now },
          });
          result.warnings++;
        }
      } else if (
        f.remindersSent === 0 &&
        now.getTime() >= collectBy.getTime() - 24 * HOUR
      ) {
        // 24h before deadline → final reminder.
        await sendPickupReminder(f.id, true);
        result.reminders++;
      }
    } catch (e) {
      console.error(`[fulfillment] scheduler failed for ${f.id}:`, e);
    }
  }

  return result;
}

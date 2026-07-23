import { hasDatabase } from "@/lib/db";
import { isLocale, type Locale } from "@/i18n/config";
import { listFulfillments, type FulfillmentWithOrder } from "@/lib/fulfillment/fulfillment";
import { listTasks } from "@/lib/data/tasks";
import OperationsHub, { type FulfillmentRow } from "@/components/admin/OperationsHub";

export const dynamic = "force-dynamic";

function methodLabel(f: FulfillmentWithOrder): string {
  const o = f.order;
  if (o.pickupSubtype === "metro_meetup") return `Metro meetup — ${o.metroStationId ?? ""}`;
  if (o.pickupSubtype === "custom_meetup") return `Custom meetup — ${o.customMeetupRequest ?? ""}`;
  return "Pickup point";
}

function toRow(f: FulfillmentWithOrder): FulfillmentRow {
  return {
    id: f.id,
    orderNumber: f.order.orderNumber,
    status: f.status,
    customerName: f.order.name,
    customerEmail: f.order.email,
    customerPhone: f.order.phone,
    method: methodLabel(f),
    locationName: f.location?.name ?? null,
    items: f.order.lines.map((l) => `${l.qty}× ${l.nameEn} (${l.sizeLabelEn})`).join(" · "),
    total: f.order.total,
    readyAt: f.readyAt?.toISOString().slice(0, 10) ?? null,
    collectBy: f.collectBy?.toISOString().slice(0, 10) ?? null,
    remindersSent: f.remindersSent,
    pickupToken: f.pickupToken,
    createdAt: f.createdAt.toISOString().slice(0, 10),
  };
}

export default async function AdminOperationsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";

  if (!hasDatabase) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold text-cream">Operations</h1>
        <p className="mt-4 text-sm text-muted">Connect a database to manage fulfillment.</p>
      </div>
    );
  }

  const [activeFulfillments, closedFulfillments, tasks] = await Promise.all([
    listFulfillments(["pending", "preparing", "ready"]),
    listFulfillments(["completed", "no_show", "cancelled"]),
    listTasks(),
  ]);

  return (
    <OperationsHub
      locale={loc}
      active={activeFulfillments.map(toRow)}
      recent={closedFulfillments.slice(0, 10).map(toRow)}
      tasks={tasks.map((t) => ({
        id: t.id,
        type: t.type,
        status: t.status,
        title: t.title,
        details: t.details,
        specimenId: t.specimenId,
        specimen: t.specimen,
        locationName: t.locationName,
        orderNumber: t.orderNumber,
        createdAt: t.createdAt,
      }))}
    />
  );
}

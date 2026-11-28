import { hasDatabase, prisma } from "@/lib/db";
import { formatDeadline } from "@/lib/business-days";
import { getAllProducts } from "@/lib/data/products";
import { getExternalSettings } from "@/lib/external-orders/settings";
import { listOffers } from "@/lib/external-orders/offers";
import { holdUrgency } from "@/lib/external-orders/pure";
import { formatCmAsInches } from "@/lib/size-inches";
import ExternalOrdersHub, { type HeldRow, type OfferRow } from "@/components/admin/ExternalOrdersHub";
import { DAY_KEYS } from "@/lib/opening-hours";

export const dynamic = "force-dynamic";

export default async function AdminExternalPage() {
  if (!hasDatabase || !prisma) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold text-cream">Special orders</h1>
        <p className="mt-4 text-sm text-muted">Connect a database to manage made-to-order specimens.</p>
      </div>
    );
  }

  const now = new Date();
  const [settings, offers, products, held, recent] = await Promise.all([
    getExternalSettings(),
    listOffers(),
    getAllProducts(),
    prisma.order.findMany({
      where: { holdStatus: "authorized" },
      include: { lines: { include: { supplierOffer: true } } },
      orderBy: { holdDeadline: "asc" },
    }),
    prisma.order.findMany({
      where: { holdStatus: { in: ["captured", "released"] } },
      include: { lines: true },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
  ]);

  const toHeld = (o: (typeof held)[number]): HeldRow => ({
    id: o.id,
    orderNumber: o.orderNumber,
    customer: `${o.name} · ${o.email}${o.phone ? ` · ${o.phone}` : ""}`,
    items: o.lines.map((l) => `${l.qty}× ${l.nameEn} (${l.sizeLabelEn}, ${l.sex ?? "unsexed"})`).join(" · "),
    supplier: o.lines[0]?.supplierOffer?.supplier ?? "Supplier",
    total: o.total,
    defaultCost: o.lines[0]?.supplierOffer?.unitCost ?? 0,
    deadline: o.holdDeadline ? formatDeadline(o.holdDeadline, "en") : "—",
    urgency: o.holdDeadline ? holdUrgency(o.holdDeadline, now) : "ok",
    extensions: o.holdExtensions,
    createdAt: o.createdAt.toISOString().slice(0, 16).replace("T", " "),
  });

  const open = DAY_KEYS.filter((d) => {
    const s = settings.supplierHours[d];
    return s && !s.closed && s.open && s.close;
  });
  const first = settings.supplierHours[open[0]];

  return (
    <ExternalOrdersHub
      settings={{
        enabled: settings.enabled,
        confirmDays: settings.confirmDays,
        authSafeDays: settings.authSafeDays,
        apologyCredit: settings.apologyCredit,
        openDays: open,
        openTime: first?.open ?? "09:30",
        closeTime: first?.close ?? "16:30",
      }}
      held={held.map(toHeld)}
      recent={recent.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        holdStatus: o.holdStatus,
        items: o.lines.map((l) => `${l.qty}× ${l.nameEn} (${l.sizeLabelEn})`).join(" · "),
        detail: o.statusDetail,
        updatedAt: o.updatedAt.toISOString().slice(0, 10),
      }))}
      offers={offers.map(
        (o): OfferRow => ({
          id: o.id,
          product: `${o.product.scientific}${o.product.commonEn ? ` — ${o.product.commonEn}` : ""}`,
          size: formatCmAsInches(o.sizeCm),
          sex: o.sex,
          price: o.price,
          unitCost: o.unitCost,
          lead: `${o.leadDaysMin}–${o.leadDaysMax}`,
          maxPerOrder: o.maxPerOrder,
          published: o.published,
          supplier: o.supplier,
        }),
      )}
      products={products.map((p) => ({ id: p.id, label: `${p.scientific}${p.common?.en ? ` — ${p.common.en}` : ""}` }))}
    />
  );
}

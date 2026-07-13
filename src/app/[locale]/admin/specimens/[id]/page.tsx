import QRCode from "qrcode";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { hasDatabase, prisma } from "@/lib/db";
import { SITE } from "@/lib/site";
import { formatCmAsInches } from "@/lib/size-inches";
import { getGrowthHistory, getMoltHistory } from "@/lib/data/growth";
import { localeHref } from "@/lib/href";
import { STATUS_LABELS, LOCATION_TYPE_LABELS } from "@/lib/inventory-labels";
import GrowthPanel from "@/components/admin/GrowthPanel";

export const dynamic = "force-dynamic";

export default async function AdminSpecimenPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";

  if (!hasDatabase || !prisma) notFound();

  const s = await prisma.specimen.findUnique({
    where: { id },
    include: {
      product: { select: { scientific: true, commonEn: true, slug: true } },
      location: true,
      order: { select: { orderNumber: true } },
      movements: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!s) notFound();

  const [growth, molts] = await Promise.all([getGrowthHistory(id), getMoltHistory(id)]);

  const qrUrl = `${SITE.url}/q/${s.qrToken}${s.location ? `?k=${s.location.partnerToken}` : ""}`;
  const qrDataUrl = await QRCode.toDataURL(qrUrl, { margin: 1, width: 200 });

  const locked = s.status === "sold" || s.status === "written_off";

  return (
    <div>
      <Link href={localeHref(loc, "/admin/inventory")} className="text-sm text-muted hover:text-gold-bright">
        ← Inventory
      </Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold italic text-cream">{s.product.scientific}</h1>
          <p className="text-sm text-muted">{s.product.commonEn}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-line px-2 py-0.5 uppercase text-bone">
              {STATUS_LABELS[s.status] ?? s.status}
            </span>
            <span className="rounded-full border border-line px-2 py-0.5 text-bone">
              {LOCATION_TYPE_LABELS[s.locationType]}
              {s.location ? ` — ${s.location.name}` : ""}
            </span>
            {s.order && (
              <span className="rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-gold-bright">
                Order {s.order.orderNumber}
              </span>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-line bg-white p-3 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt="Specimen QR" className="mx-auto h-[120px] w-[120px]" />
          <p className="mt-1 max-w-[140px] break-all text-[9px] text-neutral-500">{qrUrl}</p>
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
        {[
          ["Current size", `${formatCmAsInches(s.sizeCm)} (${s.sizeCm.toFixed(1)} cm)`],
          ["Last measured", s.lastMeasuredAt?.toISOString().slice(0, 10) ?? "—"],
          ["Sex", s.sex],
          ["Unit cost", `$${s.unitCost.toFixed(2)}`],
          ["Web price", `$${s.price.toFixed(2)}`],
          ["Settlement / MSRP", `${s.settlementPrice != null ? `$${s.settlementPrice.toFixed(0)}` : "—"} / ${s.msrp != null ? `$${s.msrp.toFixed(0)}` : "—"}`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-line bg-ink-soft/40 p-3">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="text-cream">{value}</dd>
          </div>
        ))}
      </dl>
      {s.salePrice != null && (
        <p className="mt-3 text-sm text-gold-bright">
          Sale price: ${s.salePrice.toFixed(2)}
          {s.soldAt && ` · sold ${s.soldAt.toISOString().slice(0, 10)}`}
          {s.salesChannel && ` · ${s.salesChannel}`}
        </p>
      )}

      {!locked && (
        <div className="mt-8">
          <GrowthPanel specimenId={s.id} />
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-lg font-bold text-cream">Growth history</h2>
          <div className="mt-3 overflow-hidden rounded-2xl border border-line">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-ink-soft/40 text-xs text-muted">
                  <th className="p-3">Date</th>
                  <th className="p-3">Size</th>
                  <th className="p-3">Source</th>
                  <th className="p-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                {growth.length === 0 && (
                  <tr><td colSpan={4} className="p-4 text-muted">No measurements yet.</td></tr>
                )}
                {growth.map((g) => (
                  <tr key={g.id} className="border-b border-line/50">
                    <td className="p-3 text-bone">{g.measuredAt}</td>
                    <td className="p-3 text-cream">{formatCmAsInches(g.sizeCm)} ({g.sizeCm.toFixed(1)} cm)</td>
                    <td className="p-3 text-bone">{g.source}</td>
                    <td className="p-3 text-muted">{g.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="font-display text-lg font-bold text-cream">Molt events</h2>
          <div className="mt-3 overflow-hidden rounded-2xl border border-line">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-ink-soft/40 text-xs text-muted">
                  <th className="p-3">Date</th>
                  <th className="p-3">Before</th>
                  <th className="p-3">After (est.)</th>
                  <th className="p-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                {molts.length === 0 && (
                  <tr><td colSpan={4} className="p-4 text-muted">No molts recorded.</td></tr>
                )}
                {molts.map((m) => (
                  <tr key={m.id} className="border-b border-line/50">
                    <td className="p-3 text-bone">{m.moltedAt}</td>
                    <td className="p-3 text-bone">{m.previousSizeCm.toFixed(1)} cm</td>
                    <td className="p-3 text-cream">{m.newSizeEstimateCm.toFixed(1)} cm</td>
                    <td className="p-3 text-muted">{m.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <h2 className="mt-8 font-display text-lg font-bold text-cream">Recent movements</h2>
      <div className="mt-3 overflow-hidden rounded-2xl border border-line">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-ink-soft/40 text-xs text-muted">
              <th className="p-3">Date</th>
              <th className="p-3">Type</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Notes</th>
            </tr>
          </thead>
          <tbody>
            {s.movements.map((m) => (
              <tr key={m.id} className="border-b border-line/50">
                <td className="p-3 text-bone">{m.createdAt.toISOString().slice(0, 10)}</td>
                <td className="p-3 text-cream">{m.type}</td>
                <td className="p-3 text-bone">{m.amount != null ? `$${m.amount.toFixed(2)}` : "—"}</td>
                <td className="p-3 text-muted">{m.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

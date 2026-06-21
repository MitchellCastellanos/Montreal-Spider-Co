"use client";

import { useState } from "react";
import Link from "next/link";
import { exportSalesCsvAction } from "@/app/[locale]/admin/actions";
import { localeHref } from "@/lib/href";
import type { FinanceSummary } from "@/lib/data/specimens";
import { CHANNEL_LABELS, PAYMENT_LABELS } from "@/lib/inventory-labels";
import type { Locale } from "@/i18n/config";
import { formatPrice } from "@/lib/format";

export default function FinanceDashboard({
  summary,
  locale,
}: {
  summary: FinanceSummary;
  locale: Locale;
}) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [exporting, setExporting] = useState(false);

  const downloadCsv = async () => {
    setExporting(true);
    const fd = new FormData();
    if (from) fd.set("from", from);
    if (to) fd.set("to", to);
    const result = await exportSalesCsvAction(fd);
    setExporting(false);
    if (result.csv) {
      const blob = new Blob([result.csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sales-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-cream">Finance</h1>
          <p className="text-sm text-muted">Inventory value, sales, and margins (all time for sold specimens).</p>
        </div>
        <Link href={localeHref(locale, "/admin/inventory")} className="btn btn-ghost text-sm">
          ← Inventory
        </Link>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Inventory value (warehouse)" value={formatPrice(summary.inventoryValue, locale)} sub={`${summary.inventoryCount} specimens`} />
        <StatCard label="Consignment value" value={formatPrice(summary.consignmentValue, locale)} sub={`${summary.consignmentCount} at distributors`} />
        <StatCard label="Total sales" value={formatPrice(summary.salesTotal, locale)} sub={`${summary.soldCount} sold`} />
        <StatCard
          label="Gross margin"
          value={formatPrice(summary.margin, locale)}
          sub={summary.marginPct > 0 ? `${summary.marginPct.toFixed(1)}% · COGS ${formatPrice(summary.cogs, locale)}` : "—"}
        />
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <section className="card-glow rounded-2xl p-5">
          <h2 className="mb-4 font-display text-lg font-semibold text-cream">Sales by channel</h2>
          {summary.byChannel.length === 0 ? (
            <p className="text-sm text-muted">No sales recorded yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-gold-deep">
                  <th className="pb-2">Channel</th>
                  <th className="pb-2">Units</th>
                  <th className="pb-2">Revenue</th>
                  <th className="pb-2">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-bone">
                {summary.byChannel.map((row) => (
                  <tr key={row.channel}>
                    <td className="py-2">{CHANNEL_LABELS[row.channel] ?? row.channel}</td>
                    <td className="py-2">{row.count}</td>
                    <td className="py-2">{formatPrice(row.revenue, locale)}</td>
                    <td className="py-2 text-ok">{formatPrice(row.revenue - row.cogs, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="card-glow rounded-2xl p-5">
          <h2 className="mb-4 font-display text-lg font-semibold text-cream">Sales by payment</h2>
          {summary.byPayment.length === 0 ? (
            <p className="text-sm text-muted">No sales recorded yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-gold-deep">
                  <th className="pb-2">Method</th>
                  <th className="pb-2">Units</th>
                  <th className="pb-2">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-bone">
                {summary.byPayment.map((row) => (
                  <tr key={row.method}>
                    <td className="py-2">{PAYMENT_LABELS[row.method] ?? row.method}</td>
                    <td className="py-2">{row.count}</td>
                    <td className="py-2">{formatPrice(row.revenue, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <section className="card-glow rounded-2xl p-5">
        <h2 className="mb-4 font-display text-lg font-semibold text-cream">Export sales (CSV)</h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="field">
            <span>From</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input" />
          </label>
          <label className="field">
            <span>To</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input" />
          </label>
          <button type="button" onClick={downloadCsv} disabled={exporting} className="btn btn-gold">
            {exporting ? "Exporting…" : "Download CSV"}
          </button>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="card-glow rounded-2xl p-5">
      <p className="text-xs uppercase tracking-wide text-gold-deep">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-cream">{value}</p>
      <p className="mt-1 text-xs text-muted">{sub}</p>
    </div>
  );
}

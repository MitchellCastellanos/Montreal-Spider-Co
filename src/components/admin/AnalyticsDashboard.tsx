"use client";

import { useMemo, useState } from "react";
import type { DailyPoint, RangeBreakdown } from "@/lib/data/analytics";
import AnalyticsChart from "./AnalyticsChart";

const RANGES = [
  { key: "7", label: "7 days" },
  { key: "30", label: "30 days" },
  { key: "90", label: "90 days" },
] as const;

type RangeKey = (typeof RANGES)[number]["key"];

export default function AnalyticsDashboard({
  daily,
  breakdowns,
}: {
  daily: DailyPoint[];
  breakdowns: Record<RangeKey, RangeBreakdown>;
}) {
  const [range, setRange] = useState<RangeKey>("30");

  const sliced = useMemo(() => daily.slice(-Number(range)), [daily, range]);
  const b = breakdowns[range];
  const avgViews = sliced.length ? Math.round(b.totals.views / Number(range)) : 0;
  const topPage = b.topPages[0]?.path ?? "—";

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-cream">Analytics</h1>
          <p className="text-sm text-muted">First-party pageview tracking — no cookies, no third-party scripts.</p>
        </div>
        <div className="inline-flex rounded-xl border border-line bg-ink-soft/40 p-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRange(r.key)}
              className={`rounded-lg px-3 py-1.5 text-sm transition ${
                range === r.key ? "bg-gold/15 font-medium text-gold-bright ring-1 ring-gold/40" : "text-bone hover:text-gold-bright"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pageviews" value={String(b.totals.views)} sub={`Last ${range} days`} />
        <StatCard label="Unique visitors" value={String(b.totals.uniques)} sub="Approx., daily hash" />
        <StatCard label="Avg. pageviews / day" value={String(avgViews)} sub={`Over ${range} days`} />
        <StatCard label="Top page" value={topPage} sub={`${b.topPages[0]?.views ?? 0} views`} />
      </div>

      <section className="card-glow mb-8 rounded-2xl p-5">
        <h2 className="mb-4 font-display text-lg font-semibold text-cream">Traffic over time</h2>
        <AnalyticsChart data={sliced} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <BreakdownTable title="Top pages" rows={b.topPages.map((r) => ({ label: r.path, value: r.views }))} />
        <BreakdownTable
          title="Top referrers"
          rows={b.topReferrers.map((r) => ({ label: r.referrer, value: r.views }))}
          empty="No external referrers yet — direct traffic only."
        />
        <BreakdownTable title="By device" rows={b.devices.map((r) => ({ label: capitalize(r.device), value: r.views }))} />
        <BreakdownTable title="By language" rows={b.locales.map((r) => ({ label: r.locale === "fr" ? "Français" : "English", value: r.views }))} />
      </div>
    </div>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="card-glow rounded-2xl p-5">
      <p className="text-xs uppercase tracking-wide text-gold-deep">{label}</p>
      <p className="mt-1 truncate font-display text-2xl font-bold text-cream" title={value}>
        {value}
      </p>
      <p className="mt-1 text-xs text-muted">{sub}</p>
    </div>
  );
}

function BreakdownTable({ title, rows, empty }: { title: string; rows: { label: string; value: number }[]; empty?: string }) {
  const total = rows.reduce((s, r) => s + r.value, 0) || 1;
  return (
    <section className="card-glow rounded-2xl p-5">
      <h2 className="mb-4 font-display text-lg font-semibold text-cream">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">{empty ?? "No data yet."}</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.label} className="flex items-center gap-3 text-sm">
              <span className="w-0 flex-1 truncate text-bone" title={r.label}>
                {r.label}
              </span>
              <span className="relative h-1.5 w-24 overflow-hidden rounded-full bg-ink-soft">
                <span className="absolute inset-y-0 left-0 rounded-full bg-gold" style={{ width: `${Math.max(4, (r.value / total) * 100)}%` }} />
              </span>
              <span className="w-10 text-right font-medium text-cream">{r.value}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

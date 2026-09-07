"use client";

import { useMemo, useState } from "react";
import type { DailyPoint } from "@/lib/data/analytics";

const SERIES = {
  views: { label: "Pageviews", color: "#3987e5" },
  uniques: { label: "Unique visitors", color: "#d95926" },
} as const;

const WIDTH = 720;
const HEIGHT = 260;
const PAD = { top: 16, right: 16, bottom: 28, left: 40 };

export default function AnalyticsChart({ data }: { data: DailyPoint[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [tableView, setTableView] = useState(false);

  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;

  const maxY = useMemo(() => {
    const max = Math.max(1, ...data.map((d) => Math.max(d.views, d.uniques)));
    // Round up to a friendly tick.
    const magnitude = 10 ** Math.floor(Math.log10(max || 1));
    return Math.ceil(max / magnitude) * magnitude;
  }, [data]);

  const x = (i: number) => (data.length <= 1 ? 0 : (i / (data.length - 1)) * innerW);
  const y = (v: number) => innerH - (v / maxY) * innerH;

  const linePath = (key: "views" | "uniques") =>
    data.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(d[key]).toFixed(1)}`).join(" ");

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(maxY * f));
  const xTickEvery = Math.max(1, Math.round(data.length / 6));

  if (data.every((d) => d.views === 0)) {
    return (
      <div className="flex h-[260px] items-center justify-center rounded-xl border border-dashed border-line text-sm text-muted">
        No traffic recorded yet for this range.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4 text-xs text-bone">
          {Object.entries(SERIES).map(([key, s]) => (
            <span key={key} className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
        <button type="button" onClick={() => setTableView((v) => !v)} className="text-xs font-medium text-gold-bright hover:underline">
          {tableView ? "View as chart" : "View as table"}
        </button>
      </div>

      {tableView ? (
        <div className="max-h-[300px] overflow-y-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-ink-soft">
              <tr className="text-left text-xs uppercase text-gold-deep">
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Pageviews</th>
                <th className="px-3 py-2">Unique visitors</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-bone">
              {[...data].reverse().map((d) => (
                <tr key={d.date}>
                  <td className="px-3 py-1.5">{d.date}</td>
                  <td className="px-3 py-1.5">{d.views}</td>
                  <td className="px-3 py-1.5">{d.uniques}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative">
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Pageviews and unique visitors over time">
            <g transform={`translate(${PAD.left},${PAD.top})`}>
              {yTicks.map((t) => (
                <g key={t}>
                  <line x1={0} x2={innerW} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} />
                  <text x={-8} y={y(t)} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="var(--muted)">
                    {t}
                  </text>
                </g>
              ))}

              {data.map((d, i) =>
                i % xTickEvery === 0 ? (
                  <text key={d.date} x={x(i)} y={innerH + 18} textAnchor="middle" fontSize={9} fill="var(--muted)">
                    {d.date.slice(5)}
                  </text>
                ) : null,
              )}

              <path d={linePath("views")} fill="none" stroke={SERIES.views.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              <path d={linePath("uniques")} fill="none" stroke={SERIES.uniques.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

              {hoverIndex != null && (
                <>
                  <line x1={x(hoverIndex)} x2={x(hoverIndex)} y1={0} y2={innerH} stroke="var(--bone)" strokeWidth={1} strokeDasharray="3 3" />
                  <circle cx={x(hoverIndex)} cy={y(data[hoverIndex].views)} r={4} fill={SERIES.views.color} stroke="var(--ink)" strokeWidth={1.5} />
                  <circle cx={x(hoverIndex)} cy={y(data[hoverIndex].uniques)} r={4} fill={SERIES.uniques.color} stroke="var(--ink)" strokeWidth={1.5} />
                </>
              )}

              {data.map((d, i) => (
                <rect
                  key={d.date}
                  x={x(i) - innerW / data.length / 2}
                  y={0}
                  width={Math.max(innerW / data.length, 4)}
                  height={innerH}
                  fill="transparent"
                  onMouseEnter={() => setHoverIndex(i)}
                  onMouseLeave={() => setHoverIndex(null)}
                />
              ))}
            </g>
          </svg>

          {hoverIndex != null && (
            <div
              className="pointer-events-none absolute rounded-lg border border-line bg-ink-card px-3 py-2 text-xs shadow-lg"
              style={{
                left: `${Math.min(85, Math.max(5, ((x(hoverIndex) + PAD.left) / WIDTH) * 100))}%`,
                top: 8,
                transform: "translateX(-50%)",
              }}
            >
              <p className="font-medium text-cream">{data[hoverIndex].date}</p>
              <p style={{ color: SERIES.views.color }}>Pageviews: {data[hoverIndex].views}</p>
              <p style={{ color: SERIES.uniques.color }}>Visitors: {data[hoverIndex].uniques}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

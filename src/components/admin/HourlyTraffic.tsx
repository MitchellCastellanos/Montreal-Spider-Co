const HOUR_LABELS = ["12a", "3a", "6a", "9a", "12p", "3p", "6p", "9p"];

/** Simple 24-bar traffic-by-hour chart (server times, UTC). */
export default function HourlyTraffic({ data }: { data: { hour: number; views: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.views));
  const total = data.reduce((s, d) => s + d.views, 0);

  if (total === 0) {
    return (
      <div className="flex h-[140px] items-center justify-center rounded-xl border border-dashed border-line text-sm text-muted">
        No hourly data yet for this range.
      </div>
    );
  }

  return (
    <div>
      <div className="flex h-[140px] gap-1">
        {data.map((d) => (
          <div key={d.hour} className="group relative h-full flex-1" title={`${d.hour}:00 UTC — ${d.views} views`}>
            <div
              className="absolute inset-x-0 bottom-0 rounded-t bg-gold/70 transition group-hover:bg-gold-bright"
              style={{ height: `${Math.max(3, (d.views / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-muted">
        {HOUR_LABELS.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
      <p className="mt-1 text-xs text-muted">Server time (UTC)</p>
    </div>
  );
}

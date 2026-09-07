"use client";

import { useState, useTransition } from "react";
import { runSeoAuditAction } from "@/app/[locale]/admin/actions";
import type { SeoAuditDetail, SeoAuditRunView } from "@/lib/data/seo-audits";

const SEVERITY_STYLE: Record<string, string> = {
  critical: "text-danger",
  warning: "text-gold-bright",
  info: "text-muted",
};

function scoreColor(score: number): string {
  if (score >= 90) return "text-ok";
  if (score >= 70) return "text-gold-bright";
  return "text-danger";
}

export default function SeoAuditHub({ latest, history }: { latest: SeoAuditDetail | null; history: SeoAuditRunView[] }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ error?: string; ok?: boolean } | null>(null);

  const runNow = () => {
    startTransition(async () => {
      const res = await runSeoAuditAction();
      setResult(res);
    });
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-cream">SEO audits</h1>
          <p className="text-sm text-muted">
            Automated technical &amp; on-page health check — runs every Monday and emails a summary to staff.
          </p>
        </div>
        <button type="button" onClick={runNow} disabled={pending} className="btn btn-gold">
          {pending ? "Running…" : "Run audit now"}
        </button>
      </div>
      {result?.error && <p className="mb-4 text-sm text-danger">{result.error}</p>}
      {result?.ok && <p className="mb-4 text-sm text-ok">Audit completed.</p>}

      {!latest ? (
        <p className="text-sm text-muted">No audit has run yet — click &ldquo;Run audit now&rdquo; to generate the first report.</p>
      ) : (
        <>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Score" value={`${latest.score}/100`} valueClass={scoreColor(latest.score)} sub={new Date(latest.startedAt).toLocaleString()} />
            <StatCard label="Pages checked" value={String(latest.pagesChecked)} sub="Both locales, key routes" />
            <StatCard label="Critical issues" value={String(latest.criticalCount)} valueClass={latest.criticalCount > 0 ? "text-danger" : "text-ok"} sub="Fix first" />
            <StatCard label="Warnings" value={String(latest.warningCount)} valueClass={latest.warningCount > 0 ? "text-gold-bright" : "text-ok"} sub="Improve when possible" />
          </div>

          {latest.error && (
            <p className="mb-6 rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
              Last run failed: {latest.error}
            </p>
          )}

          <section className="card-glow mb-8 rounded-2xl p-5">
            <h2 className="mb-4 font-display text-lg font-semibold text-cream">Open issues</h2>
            {latest.issues.length === 0 ? (
              <p className="text-sm text-ok">No issues found — the site is in great shape.</p>
            ) : (
              <div className="max-h-[420px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-ink-soft">
                    <tr className="text-left text-xs uppercase text-gold-deep">
                      <th className="px-3 py-2">Severity</th>
                      <th className="px-3 py-2">Path</th>
                      <th className="px-3 py-2">Issue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line text-bone">
                    {latest.issues.map((issue, i) => (
                      <tr key={i}>
                        <td className={`px-3 py-2 font-medium uppercase ${SEVERITY_STYLE[issue.severity]}`}>{issue.severity}</td>
                        <td className="px-3 py-2 font-mono text-xs">{issue.path}</td>
                        <td className="px-3 py-2">{issue.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="card-glow rounded-2xl p-5">
            <h2 className="mb-4 font-display text-lg font-semibold text-cream">History</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-gold-deep">
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Score</th>
                  <th className="pb-2">Critical</th>
                  <th className="pb-2">Warnings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-bone">
                {history.map((run) => (
                  <tr key={run.id}>
                    <td className="py-2">{new Date(run.startedAt).toLocaleDateString()}</td>
                    <td className={`py-2 font-medium ${scoreColor(run.score)}`}>{run.score}/100</td>
                    <td className="py-2">{run.criticalCount}</td>
                    <td className="py-2">{run.warningCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, valueClass }: { label: string; value: string; sub: string; valueClass?: string }) {
  return (
    <div className="card-glow rounded-2xl p-5">
      <p className="text-xs uppercase tracking-wide text-gold-deep">{label}</p>
      <p className={`mt-1 font-display text-2xl font-bold ${valueClass ?? "text-cream"}`}>{value}</p>
      <p className="mt-1 text-xs text-muted">{sub}</p>
    </div>
  );
}

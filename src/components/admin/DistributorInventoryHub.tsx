"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import { sendDistributorInventoryReportAction } from "@/app/[locale]/admin/ops-actions";
import type { ActionState } from "@/app/[locale]/admin/actions";
import { STATUS_LABELS } from "@/lib/inventory-labels";
import { SITE } from "@/lib/site";
import type { Locale } from "@/i18n/config";

export interface DistributorReportItem {
  specimenId: string;
  scientific: string;
  commonName: string;
  sizeLabel: string;
  sex: string;
  status: string;
  recommendedPrice: number;
  distributorPrice: number;
}

export interface DistributorReportRow {
  locationId: string;
  locationName: string;
  contactName: string;
  email: string;
  phone: string;
  items: DistributorReportItem[];
  itemCount: number;
  totalRecommendedValue: number;
  totalDistributorValue: number;
  outstandingOwed: number;
}

function money(n: number): string {
  return `$${n.toFixed(2)}`;
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function buildCsv(report: DistributorReportRow): string {
  const lines: string[] = [];
  lines.push(csvCell(`Distributor inventory report — ${report.locationName}`));
  lines.push(`Generated,${new Date().toLocaleDateString("en-CA")}`);
  lines.push("");
  lines.push(["Species", "Common name", "Size", "Sex", "Status", "Recommended price (CAD)", "Distributor price (CAD)"].join(","));
  for (const item of report.items) {
    lines.push(
      [
        csvCell(item.scientific),
        csvCell(item.commonName),
        csvCell(item.sizeLabel),
        item.sex,
        STATUS_LABELS[item.status] ?? item.status,
        item.recommendedPrice.toFixed(2),
        item.distributorPrice.toFixed(2),
      ].join(","),
    );
  }
  lines.push("");
  lines.push("Summary");
  lines.push(`Items on hand,${report.itemCount}`);
  lines.push(`Total value at recommended price,${report.totalRecommendedValue.toFixed(2)}`);
  lines.push(`Total owed to MSC if all sold,${report.totalDistributorValue.toFixed(2)}`);
  lines.push(`Outstanding balance already owed,${report.outstandingOwed.toFixed(2)}`);
  lines.push("");
  lines.push("Contact");
  lines.push(csvCell(`${SITE.name},${SITE.email},${SITE.url}`));
  return lines.join("\n");
}

function EmailReportButton({ locationId, locale, disabled, disabledReason }: { locationId: string; locale: Locale; disabled: boolean; disabledReason: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    sendDistributorInventoryReportAction,
    {},
  );
  return (
    <form action={formAction} className="flex items-center gap-3">
      <input type="hidden" name="locationId" value={locationId} />
      <input type="hidden" name="locale" value={locale} />
      <button
        disabled={disabled || pending}
        title={disabled ? disabledReason : undefined}
        className="btn btn-gold text-sm disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Sending…" : "Email to distributor"}
      </button>
      {disabled && <span className="text-xs text-muted">{disabledReason}</span>}
      {state.error && <span className="text-xs text-danger">{state.error}</span>}
      {state.ok && <span className="text-xs text-gold-bright">Sent.</span>}
    </form>
  );
}

export default function DistributorInventoryHub({
  reports,
  locale,
}: {
  reports: DistributorReportRow[];
  locale: Locale;
}) {
  const [selectedId, setSelectedId] = useState(reports[0]?.locationId ?? "");
  const report = useMemo(() => reports.find((r) => r.locationId === selectedId) ?? null, [reports, selectedId]);

  const downloadCsv = () => {
    if (!report) return;
    const blob = new Blob([buildCsv(report)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.locationName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-cream">Distributor inventory</h1>
      <p className="mt-1 text-sm text-muted">
        Pick a distributor to see what they currently hold on consignment — recommended (website) price alongside
        what they owe MSC — export it or email it straight to them.
      </p>

      {reports.length === 0 ? (
        <p className="mt-6 text-sm text-muted">No distributor locations yet — add one under Admin → Locations.</p>
      ) : (
        <>
          <label className="mt-6 block max-w-sm text-sm text-bone">
            Distributor
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-line bg-ink p-2.5 text-sm text-cream"
            >
              {reports.map((r) => (
                <option key={r.locationId} value={r.locationId}>
                  {r.locationName} ({r.itemCount})
                </option>
              ))}
            </select>
          </label>

          {report && (
            <>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Items on hand" value={String(report.itemCount)} />
                <StatCard label="Value at recommended price" value={money(report.totalRecommendedValue)} />
                <StatCard label="Owed to MSC if all sold" value={money(report.totalDistributorValue)} />
                <StatCard label="Outstanding balance already owed" value={money(report.outstandingOwed)} />
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-ink-soft/40 p-4">
                <div className="text-sm text-bone">
                  <p className="font-semibold text-cream">{report.locationName}</p>
                  <p className="text-muted">
                    {report.contactName || "No contact name on file"}
                    {report.email ? ` · ${report.email}` : " · No email on file"}
                    {report.phone ? ` · ${report.phone}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button type="button" onClick={downloadCsv} className="btn btn-ghost text-sm">
                    Export CSV
                  </button>
                  <EmailReportButton
                    locationId={report.locationId}
                    locale={locale}
                    disabled={!report.email.trim()}
                    disabledReason="No partner email on file"
                  />
                </div>
              </div>

              <div className="mt-6 overflow-x-auto rounded-2xl border border-line">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-line bg-ink-soft/40 text-xs text-muted">
                      <th className="p-3">Specimen</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Recommended price</th>
                      <th className="p-3">Distributor price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.items.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-4 text-muted">
                          Nothing currently on hand at this distributor.
                        </td>
                      </tr>
                    )}
                    {report.items.map((item) => (
                      <tr key={item.specimenId} className="border-b border-line/50">
                        <td className="p-3 text-bone">
                          <span className="italic text-cream">{item.scientific}</span> · {item.sizeLabel} · {item.sex}
                        </td>
                        <td className="p-3 text-muted">{STATUS_LABELS[item.status] ?? item.status}</td>
                        <td className="p-3 text-bone">{money(item.recommendedPrice)}</td>
                        <td className="p-3 text-gold-bright">{money(item.distributorPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-ink-soft/40 p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gold-bright">{value}</p>
    </div>
  );
}

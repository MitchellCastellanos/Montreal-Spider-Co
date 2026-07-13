"use client";

import { useActionState, useState } from "react";
import { createAuditAction } from "@/app/[locale]/admin/ops-actions";
import type { ActionState } from "@/app/[locale]/admin/actions";
import type { Locale } from "@/i18n/config";

export interface AuditRow {
  id: string;
  locationName: string;
  auditedAt: string;
  employee: string;
  expectedCount: number;
  foundCount: number;
  missingCount: number;
  notes: string;
}

export interface ExpectedSpecimen {
  id: string;
  scientific: string;
  commonName: string;
  sizeLabel: string;
  sizeCm: number;
  sex: string;
  status: string;
}

export interface AuditLocation {
  id: string;
  name: string;
  specimens: ExpectedSpecimen[];
}

interface ItemState {
  result: "found" | "missing";
  sizeCm: string;
  healthNotes: string;
}

export default function AuditsHub({
  audits,
  locations,
  locale,
}: {
  audits: AuditRow[];
  locations: AuditLocation[];
  locale: Locale;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createAuditAction, {});
  const [locationId, setLocationId] = useState("");
  const [items, setItems] = useState<Record<string, ItemState>>({});

  const location = locations.find((l) => l.id === locationId) ?? null;

  function startAudit(id: string) {
    setLocationId(id);
    const loc = locations.find((l) => l.id === id);
    const initial: Record<string, ItemState> = {};
    for (const s of loc?.specimens ?? []) {
      initial[s.id] = { result: "found", sizeCm: "", healthNotes: "" };
    }
    setItems(initial);
  }

  function setItem(id: string, patch: Partial<ItemState>) {
    setItems((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  const itemsJson = JSON.stringify(
    Object.entries(items).map(([specimenId, i]) => ({
      specimenId,
      result: i.result,
      sizeCm: i.sizeCm ? Number(i.sizeCm) : null,
      healthNotes: i.healthNotes,
    })),
  );

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-cream">Store audits</h1>
      <p className="mt-1 text-sm text-muted">
        Verify expected vs actual inventory at partner stores. Missing specimens create investigation
        tasks; new measurements update growth history.
      </p>

      <div className="mt-6 rounded-2xl border border-line bg-ink-soft/40 p-5">
        <h2 className="font-display text-lg font-bold text-cream">New audit visit</h2>
        <label className="mt-3 block max-w-sm text-sm text-bone">
          Partner store
          <select
            value={locationId}
            onChange={(e) => startAudit(e.target.value)}
            className="mt-1 w-full rounded-lg border border-line bg-ink p-2.5 text-sm text-cream"
          >
            <option value="">Select a store…</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} ({l.specimens.length} expected)
              </option>
            ))}
          </select>
        </label>

        {location && (
          <form action={formAction} className="mt-4 space-y-4">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="locationId" value={location.id} />
            <input type="hidden" name="items" value={itemsJson} />

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm text-bone">
                Employee
                <input
                  type="text"
                  name="employee"
                  required
                  className="mt-1 w-full rounded-lg border border-line bg-ink p-2.5 text-sm text-cream"
                />
              </label>
              <label className="block text-sm text-bone">
                Date
                <input
                  type="date"
                  name="auditedAt"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  className="mt-1 w-full rounded-lg border border-line bg-ink p-2.5 text-sm text-cream"
                />
              </label>
            </div>

            {location.specimens.length === 0 ? (
              <p className="text-sm text-muted">No specimens are expected at this store.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-line text-xs text-muted">
                      <th className="py-2 pr-3">Specimen</th>
                      <th className="py-2 pr-3">Expected size</th>
                      <th className="py-2 pr-3">Result</th>
                      <th className="py-2 pr-3">Measured (cm)</th>
                      <th className="py-2">Health / notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {location.specimens.map((s) => {
                      const item = items[s.id];
                      if (!item) return null;
                      return (
                        <tr key={s.id} className="border-b border-line/50">
                          <td className="py-2 pr-3 text-cream">
                            <span className="italic">{s.scientific}</span>
                            <span className="block text-xs text-muted">
                              {s.sex}
                              {s.status === "allocated" && " · reserved for an order"}
                            </span>
                          </td>
                          <td className="py-2 pr-3 text-bone">{s.sizeLabel}</td>
                          <td className="py-2 pr-3">
                            <select
                              value={item.result}
                              onChange={(e) => setItem(s.id, { result: e.target.value as "found" | "missing" })}
                              className={`rounded-lg border border-line bg-ink p-1.5 text-sm ${item.result === "missing" ? "text-danger" : "text-cream"}`}
                            >
                              <option value="found">Found</option>
                              <option value="missing">Missing</option>
                            </select>
                          </td>
                          <td className="py-2 pr-3">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={item.sizeCm}
                              disabled={item.result === "missing"}
                              onChange={(e) => setItem(s.id, { sizeCm: e.target.value })}
                              placeholder={s.sizeCm.toFixed(1)}
                              className="w-24 rounded-lg border border-line bg-ink p-1.5 text-sm text-cream disabled:opacity-40"
                            />
                          </td>
                          <td className="py-2">
                            <input
                              type="text"
                              value={item.healthNotes}
                              onChange={(e) => setItem(s.id, { healthNotes: e.target.value })}
                              placeholder="Healthy, in premolt…"
                              className="w-full rounded-lg border border-line bg-ink p-1.5 text-sm text-cream"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <label className="block text-sm text-bone">
              Visit notes
              <textarea
                name="notes"
                rows={2}
                className="mt-1 w-full rounded-lg border border-line bg-ink p-2.5 text-sm text-cream"
                placeholder="General observations, display condition, restock ideas…"
              />
            </label>

            {state.error && <p className="text-sm text-danger">{state.error}</p>}
            <button
              disabled={pending || location.specimens.length === 0}
              className="rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-gold-bright disabled:opacity-50"
            >
              {pending ? "Saving…" : "Complete audit (emails partner)"}
            </button>
          </form>
        )}
      </div>

      <h2 className="mt-10 font-display text-lg font-bold text-cream">Past audits</h2>
      <div className="mt-3 overflow-x-auto rounded-2xl border border-line">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-ink-soft/40 text-xs text-muted">
              <th className="p-3">Date</th>
              <th className="p-3">Store</th>
              <th className="p-3">Employee</th>
              <th className="p-3">Expected</th>
              <th className="p-3">Found</th>
              <th className="p-3">Missing</th>
              <th className="p-3">Notes</th>
            </tr>
          </thead>
          <tbody>
            {audits.length === 0 && (
              <tr>
                <td colSpan={7} className="p-4 text-muted">
                  No audits yet.
                </td>
              </tr>
            )}
            {audits.map((a) => (
              <tr key={a.id} className="border-b border-line/50">
                <td className="p-3 text-bone">{a.auditedAt}</td>
                <td className="p-3 text-cream">{a.locationName}</td>
                <td className="p-3 text-bone">{a.employee}</td>
                <td className="p-3 text-bone">{a.expectedCount}</td>
                <td className="p-3 text-emerald-300">{a.foundCount}</td>
                <td className={`p-3 ${a.missingCount > 0 ? "text-danger" : "text-bone"}`}>{a.missingCount}</td>
                <td className="p-3 text-muted">{a.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

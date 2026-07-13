"use client";

import { useActionState } from "react";
import { generateStatementAction, statementTransitionAction } from "@/app/[locale]/admin/ops-actions";
import type { ActionState } from "@/app/[locale]/admin/actions";

export interface BalanceRow {
  locationId: string;
  locationName: string;
  pendingOwed: number;
  invoicedOwed: number;
  entryCount: number;
}

export interface EntryRow {
  id: string;
  locationName: string;
  scientific: string;
  sizeLabel: string;
  soldAt: string;
  salePrice: number;
  settlementPrice: number;
  partnerMargin: number;
  paymentStatus: string;
}

export interface StatementRow {
  id: string;
  locationName: string;
  periodStart: string;
  totalSales: number;
  totalOwed: number;
  totalMargin: number;
  entryCount: number;
  status: string;
}

const PAY_BADGE: Record<string, string> = {
  pending: "bg-gold/15 text-gold-bright",
  invoiced: "bg-sky-500/15 text-sky-300",
  paid: "bg-emerald-500/15 text-emerald-300",
  draft: "bg-gold/15 text-gold-bright",
  sent: "bg-sky-500/15 text-sky-300",
};

function GenerateStatementForm({ locations }: { locations: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    generateStatementAction,
    {},
  );
  const defaultPeriod = new Date().toISOString().slice(0, 7);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <label className="block text-sm text-bone">
        Partner
        <select
          name="locationId"
          required
          className="mt-1 block rounded-lg border border-line bg-ink p-2.5 text-sm text-cream"
        >
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm text-bone">
        Period
        <input
          type="month"
          name="period"
          defaultValue={defaultPeriod}
          className="mt-1 block rounded-lg border border-line bg-ink p-2.5 text-sm text-cream"
        />
      </label>
      <button
        disabled={pending}
        className="rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-gold-bright disabled:opacity-50"
      >
        {pending ? "Generating…" : "Generate statement"}
      </button>
      {state.error && <p className="w-full text-sm text-danger">{state.error}</p>}
      {state.ok && <p className="w-full text-sm text-gold-bright">Statement generated from the ledger.</p>}
    </form>
  );
}

function StatementAction({ id, transition, label }: { id: string; transition: string; label: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    statementTransitionAction,
    {},
  );
  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="statementId" value={id} />
      <input type="hidden" name="transition" value={transition} />
      <button
        disabled={pending}
        className="rounded-lg bg-gold/15 px-3 py-1.5 text-xs text-gold-bright ring-1 ring-gold/40 transition hover:bg-gold/25 disabled:opacity-50"
      >
        {pending ? "…" : label}
      </button>
      {state.error && <span className="ml-2 text-xs text-danger">{state.error}</span>}
    </form>
  );
}

export default function SettlementsHub({
  balances,
  entries,
  statements,
  locations,
}: {
  balances: BalanceRow[];
  entries: EntryRow[];
  statements: StatementRow[];
  locations: { id: string; name: string }[];
}) {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-cream">Partner settlements</h1>
      <p className="mt-1 text-sm text-muted">
        Every partner sale creates a ledger entry. Balances and statements come from these financial
        records — never from inventory counts.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {balances.length === 0 && <p className="text-sm text-muted">No outstanding balances.</p>}
        {balances.map((b) => (
          <div key={b.locationId} className="rounded-xl border border-line bg-ink-soft/40 p-4">
            <p className="font-semibold text-cream">{b.locationName}</p>
            <p className="mt-1 text-2xl font-bold text-gold-bright">
              ${(b.pendingOwed + b.invoicedOwed).toFixed(2)}
            </p>
            <p className="text-xs text-muted">
              {b.entryCount} sales · ${b.pendingOwed.toFixed(2)} un-invoiced · ${b.invoicedOwed.toFixed(2)} invoiced
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-line bg-ink-soft/40 p-5">
        <h2 className="mb-3 font-display text-lg font-bold text-cream">Monthly statement</h2>
        <GenerateStatementForm locations={locations} />
      </div>

      <h2 className="mt-10 font-display text-lg font-bold text-cream">Statements</h2>
      <div className="mt-3 overflow-x-auto rounded-2xl border border-line">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-ink-soft/40 text-xs text-muted">
              <th className="p-3">Period</th>
              <th className="p-3">Partner</th>
              <th className="p-3">Sales</th>
              <th className="p-3">Owed to MSC</th>
              <th className="p-3">Partner margin</th>
              <th className="p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {statements.length === 0 && (
              <tr>
                <td colSpan={7} className="p-4 text-muted">No statements yet.</td>
              </tr>
            )}
            {statements.map((s) => (
              <tr key={s.id} className="border-b border-line/50">
                <td className="p-3 text-bone">{s.periodStart.slice(0, 7)}</td>
                <td className="p-3 text-cream">{s.locationName}</td>
                <td className="p-3 text-bone">{s.entryCount} · ${s.totalSales.toFixed(2)}</td>
                <td className="p-3 text-gold-bright">${s.totalOwed.toFixed(2)}</td>
                <td className="p-3 text-bone">${s.totalMargin.toFixed(2)}</td>
                <td className="p-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${PAY_BADGE[s.status] ?? "text-muted"}`}>
                    {s.status}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex gap-2">
                    {s.status === "draft" && <StatementAction id={s.id} transition="send" label="Email partner" />}
                    {s.status !== "paid" && <StatementAction id={s.id} transition="paid" label="Mark paid" />}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10 font-display text-lg font-bold text-cream">Ledger entries</h2>
      <div className="mt-3 overflow-x-auto rounded-2xl border border-line">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-ink-soft/40 text-xs text-muted">
              <th className="p-3">Sold</th>
              <th className="p-3">Partner</th>
              <th className="p-3">Specimen</th>
              <th className="p-3">Sale price</th>
              <th className="p-3">Settlement</th>
              <th className="p-3">Partner margin</th>
              <th className="p-3">Payment</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && (
              <tr>
                <td colSpan={7} className="p-4 text-muted">No partner sales recorded yet.</td>
              </tr>
            )}
            {entries.map((e) => (
              <tr key={e.id} className="border-b border-line/50">
                <td className="p-3 text-bone">{e.soldAt}</td>
                <td className="p-3 text-cream">{e.locationName}</td>
                <td className="p-3 text-bone">
                  <span className="italic">{e.scientific}</span> · {e.sizeLabel}
                </td>
                <td className="p-3 text-bone">${e.salePrice.toFixed(2)}</td>
                <td className="p-3 text-gold-bright">${e.settlementPrice.toFixed(2)}</td>
                <td className="p-3 text-bone">${e.partnerMargin.toFixed(2)}</td>
                <td className="p-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${PAY_BADGE[e.paymentStatus] ?? "text-muted"}`}>
                    {e.paymentStatus}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

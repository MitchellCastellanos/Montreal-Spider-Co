"use client";

import { useActionState, useState } from "react";
import { createProposalAction, proposalTransitionAction } from "@/app/[locale]/admin/ops-actions";
import type { ActionState } from "@/app/[locale]/admin/actions";
import type { Locale } from "@/i18n/config";

export interface ProposalRow {
  id: string;
  locationName: string;
  status: string;
  reason: string;
  preferredDate: string | null;
  partnerNotes: string;
  createdAt: string;
  items: { specimenId: string; scientific: string; sizeLabel: string; sex: string }[];
}

export interface WarehouseSpecimenOption {
  id: string;
  scientific: string;
  sizeLabel: string;
  sex: string;
  price: number;
}

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-gold/15 text-gold-bright",
  sent: "bg-sky-500/15 text-sky-300",
  confirmed: "bg-emerald-500/15 text-emerald-300",
  declined: "bg-red-500/15 text-red-300",
  in_transit: "bg-sky-500/15 text-sky-300",
  completed: "bg-emerald-500/10 text-emerald-400",
  cancelled: "bg-red-500/10 text-red-400",
};

function TransitionButton({
  proposalId,
  transition,
  label,
  danger,
}: {
  proposalId: string;
  transition: string;
  label: string;
  danger?: boolean;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    proposalTransitionAction,
    {},
  );
  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="proposalId" value={proposalId} />
      <input type="hidden" name="transition" value={transition} />
      <button
        disabled={pending}
        className={`rounded-lg px-3 py-1.5 text-xs transition disabled:opacity-50 ${
          danger
            ? "border border-line text-bone hover:text-danger"
            : "bg-gold/15 text-gold-bright ring-1 ring-gold/40 hover:bg-gold/25"
        }`}
      >
        {pending ? "…" : label}
      </button>
      {state.error && <span className="ml-2 text-xs text-danger">{state.error}</span>}
    </form>
  );
}

export default function RestockHub({
  proposals,
  locations,
  warehouseSpecimens,
  locale,
}: {
  proposals: ProposalRow[];
  locations: { id: string; name: string }[];
  warehouseSpecimens: WarehouseSpecimenOption[];
  locale: Locale;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createProposalAction, {});
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-cream">Restock proposals</h1>
      <p className="mt-1 text-sm text-muted">
        Replacement inventory is never sent automatically: propose → partner confirms → ship → delivered.
      </p>

      <div className="mt-6 rounded-2xl border border-line bg-ink-soft/40 p-5">
        <h2 className="font-display text-lg font-bold text-cream">New proposal</h2>
        <form action={formAction} className="mt-3 space-y-4">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="specimenIds" value={JSON.stringify([...selected])} />
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-sm text-bone">
              Partner store
              <select
                name="locationId"
                required
                className="mt-1 w-full rounded-lg border border-line bg-ink p-2.5 text-sm text-cream"
              >
                <option value="">Select…</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-bone">
              Preferred delivery date
              <input
                type="date"
                name="preferredDate"
                className="mt-1 w-full rounded-lg border border-line bg-ink p-2.5 text-sm text-cream"
              />
            </label>
            <label className="block text-sm text-bone">
              Reason
              <input
                type="text"
                name="reason"
                placeholder="Post-audit restock, sold through…"
                className="mt-1 w-full rounded-lg border border-line bg-ink p-2.5 text-sm text-cream"
              />
            </label>
          </div>

          <div className="max-h-64 overflow-y-auto rounded-xl border border-line">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-ink">
                <tr className="border-b border-line text-xs text-muted">
                  <th className="p-2"></th>
                  <th className="p-2">Warehouse specimen</th>
                  <th className="p-2">Size</th>
                  <th className="p-2">Sex</th>
                  <th className="p-2">Web price</th>
                </tr>
              </thead>
              <tbody>
                {warehouseSpecimens.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-3 text-muted">
                      No available warehouse specimens.
                    </td>
                  </tr>
                )}
                {warehouseSpecimens.map((s) => (
                  <tr key={s.id} className="border-b border-line/50">
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={selected.has(s.id)}
                        onChange={() => toggle(s.id)}
                      />
                    </td>
                    <td className="p-2 italic text-cream">{s.scientific}</td>
                    <td className="p-2 text-bone">{s.sizeLabel}</td>
                    <td className="p-2 text-bone">{s.sex}</td>
                    <td className="p-2 text-bone">${s.price.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {state.error && <p className="text-sm text-danger">{state.error}</p>}
          <button
            disabled={pending || selected.size === 0}
            className="rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-gold-bright disabled:opacity-50"
          >
            {pending ? "Creating…" : `Create draft (${selected.size} specimens)`}
          </button>
        </form>
      </div>

      <h2 className="mt-10 font-display text-lg font-bold text-cream">Proposals</h2>
      <div className="mt-3 space-y-3">
        {proposals.length === 0 && <p className="text-sm text-muted">No proposals yet.</p>}
        {proposals.map((p) => (
          <div key={p.id} className="rounded-xl border border-line bg-ink-soft/40 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-cream">{p.locationName}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_BADGE[p.status] ?? "text-muted"}`}>
                {p.status.replace("_", " ")}
              </span>
              <span className="text-xs text-muted">{p.createdAt}</span>
              {p.preferredDate && (
                <span className="text-xs text-muted">· delivery {p.preferredDate}</span>
              )}
            </div>
            {p.reason && <p className="mt-1 text-sm text-muted">{p.reason}</p>}
            <p className="mt-2 text-sm text-cream">
              {p.items.map((i) => `${i.scientific} (${i.sizeLabel}, ${i.sex})`).join(" · ")}
            </p>
            {p.partnerNotes && (
              <p className="mt-1 text-xs text-gold-bright">Partner: “{p.partnerNotes}”</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {p.status === "draft" && (
                <TransitionButton proposalId={p.id} transition="send" label="Send to partner" />
              )}
              {p.status === "confirmed" && (
                <TransitionButton proposalId={p.id} transition="ship" label="Ship (→ in transit)" />
              )}
              {p.status === "in_transit" && (
                <TransitionButton proposalId={p.id} transition="complete" label="Confirm delivered" />
              )}
              {!["completed", "cancelled", "declined"].includes(p.status) && (
                <TransitionButton proposalId={p.id} transition="cancel" label="Cancel" danger />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

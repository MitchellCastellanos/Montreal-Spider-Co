"use client";

import { useActionState } from "react";
import { recordMoltAction, recordMeasurementAction } from "@/app/[locale]/admin/ops-actions";
import type { ActionState } from "@/app/[locale]/admin/actions";

export default function GrowthPanel({ specimenId }: { specimenId: string }) {
  const [moltState, moltAction, moltPending] = useActionState<ActionState, FormData>(recordMoltAction, {});
  const [measureState, measureAction, measurePending] = useActionState<ActionState, FormData>(
    recordMeasurementAction,
    {},
  );

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <form action={moltAction} className="rounded-2xl border border-line bg-ink-soft/40 p-5">
        <h3 className="font-display text-base font-bold text-cream">Record molt</h3>
        <p className="mt-1 text-xs text-muted">
          A biological event — current size updates, identity and history stay.
        </p>
        <input type="hidden" name="specimenId" value={specimenId} />
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="field">
            <span>New size estimate (cm)</span>
            <input name="newSizeEstimateCm" type="number" step="0.1" min="0.1" required className="input" />
          </label>
          <label className="field">
            <span>Molt date</span>
            <input name="moltedAt" type="date" defaultValue={today} className="input" />
          </label>
          <label className="field sm:col-span-2">
            <span>Notes</span>
            <input name="notes" className="input" placeholder="Clean molt, sexed male from exuviae…" />
          </label>
        </div>
        {moltState.error && <p className="mt-2 text-sm text-danger">{moltState.error}</p>}
        {moltState.ok && <p className="mt-2 text-sm text-ok">Molt recorded.</p>}
        <button disabled={moltPending} className="btn btn-gold mt-3">
          {moltPending ? "Saving…" : "Record molt"}
        </button>
      </form>

      <form action={measureAction} className="rounded-2xl border border-line bg-ink-soft/40 p-5">
        <h3 className="font-display text-base font-bold text-cream">Record measurement</h3>
        <p className="mt-1 text-xs text-muted">Manual size check without a molt.</p>
        <input type="hidden" name="specimenId" value={specimenId} />
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="field">
            <span>Size (cm)</span>
            <input name="sizeCm" type="number" step="0.1" min="0.1" required className="input" />
          </label>
          <label className="field">
            <span>Date</span>
            <input name="measuredAt" type="date" defaultValue={today} className="input" />
          </label>
          <label className="field sm:col-span-2">
            <span>Notes</span>
            <input name="notes" className="input" />
          </label>
        </div>
        {measureState.error && <p className="mt-2 text-sm text-danger">{measureState.error}</p>}
        {measureState.ok && <p className="mt-2 text-sm text-ok">Measurement recorded.</p>}
        <button disabled={measurePending} className="btn btn-ghost mt-3">
          {measurePending ? "Saving…" : "Record measurement"}
        </button>
      </form>
    </div>
  );
}

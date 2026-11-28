"use client";

import { useActionState, useMemo, useState } from "react";
import {
  createMatchedOffersAction,
  createOfferFromItemAction,
  syncSupplierNowAction,
} from "@/app/[locale]/admin/external-actions";
import type { ActionState } from "@/app/[locale]/admin/actions";
import type { CatalogRow } from "@/lib/suppliers/catalog";

export type SyncView = {
  enabled: boolean;
  last: { status: string; startedAt: string; trigger: string; itemCount: number; newCount: number; priceChanges: number; missingCount: number; error: string } | null;
};

type Detailed = ActionState & { detail?: string };

function Result({ state }: { state: Detailed }) {
  if (state.error) return <span className="text-sm text-danger">{state.error}</span>;
  if (state.ok) return <span className="text-sm text-gold-bright">{state.detail ?? "Done."}</span>;
  return null;
}

function CreateButton({ id }: { id: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createOfferFromItemAction, {});
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="itemId" value={id} />
      <button className="btn btn-ghost text-xs" disabled={pending}>{pending ? "…" : "Create offer"}</button>
      {state.error && <span className="max-w-[16rem] text-[10px] text-danger">{state.error}</span>}
    </form>
  );
}

export default function SupplierCatalogPanel({ rows, sync }: { rows: CatalogRow[]; sync: SyncView }) {
  const [syncState, syncAction, syncPending] = useActionState<Detailed>(syncSupplierNowAction, {});
  const [bulkState, bulkAction, bulkPending] = useActionState<Detailed>(createMatchedOffersAction, {});
  const [q, setQ] = useState("");
  const [onlyMatched, setOnlyMatched] = useState(true);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows
      .filter((r) => (!onlyMatched || r.productId) && (!needle || r.rawName.toLowerCase().includes(needle)))
      .slice(0, 150);
  }, [rows, q, onlyMatched]);
  const creatable = rows.filter((r) => r.listed && r.productId && r.sizeParsed && !r.hasOffer).length;
  const last = sync.last;

  return (
    <section className="card-glow rounded-2xl p-5">
      <h2 className="mb-1 font-display text-lg font-semibold text-cream">Tarantula Canada catalog</h2>
      <p className="mb-3 text-sm text-muted">
        Read once a day from their public catalog (no stock quantities exist — being listed is the only availability signal).
        Offers created from it show only while TarCan still lists the animal, and their cost follows TarCan&apos;s price.
        Nothing is published automatically.
      </p>

      <div className="mb-3 space-y-1 text-sm text-bone">
        <p>
          Daily check: <strong className="text-cream">{sync.enabled ? "ON" : "OFF"}</strong> (switch in Settings).{" "}
          {last ? (
            <>
              Last run: <strong className={last.status === "ok" ? "text-ok" : "text-danger"}>{last.status}</strong> ({last.trigger}) {last.startedAt} UTC —{" "}
              {last.itemCount} listed · {last.newCount} new · {last.priceChanges} price changes · {last.missingCount} not listed
              {last.error && <span className="text-danger"> — {last.error}</span>}
            </>
          ) : (
            "Never run."
          )}
        </p>
        <form action={syncAction} className="flex flex-wrap items-center gap-3">
          <button className="btn btn-ghost text-xs" disabled={syncPending}>{syncPending ? "Reading catalog…" : "Check TarCan now"}</button>
          <Result state={syncState} />
        </form>
      </div>

      {rows.length > 0 && (
        <>
          <div className="mb-2 flex flex-wrap items-center gap-3">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by name…" className="input max-w-xs" />
            <label className="flex items-center gap-1 text-xs text-bone">
              <input type="checkbox" checked={onlyMatched} onChange={(e) => setOnlyMatched(e.target.checked)} className="accent-[var(--gold)]" />
              Only species I have a listing for
            </label>
            <form action={bulkAction} className="flex items-center gap-2">
              <button className="btn btn-gold text-xs" disabled={bulkPending || creatable === 0}>
                {bulkPending ? "Creating…" : `Create hidden offers for all ${creatable} matched`}
              </button>
              <Result state={bulkState} />
            </form>
          </div>
          <div className="max-h-[28rem] overflow-auto rounded-xl border border-line">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-ink-soft text-xs uppercase tracking-wide text-muted">
                <tr><th className="p-2">TarCan item</th><th className="p-2">Size · sex</th><th className="p-2">Their price</th><th className="p-2">Status</th><th className="p-2">MSC listing</th><th className="p-2" /></tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id} className="border-t border-line align-top">
                    <td className="p-2 text-cream">{r.rawName}{r.isNewArrival && <span className="ml-1 text-[10px] text-gold-bright">new</span>}
                      {r.notes && <span className="block text-[10px] text-muted">{r.notes}</span>}</td>
                    <td className="p-2 text-bone">{r.sizeRaw || "?"}{!r.sizeParsed && <span className="text-danger"> ⚠</span>} · {r.sex}</td>
                    <td className="p-2 text-bone">${r.price.toFixed(2)}{r.prevPrice != null && r.prevPrice !== r.price && <span className="block text-[10px] text-gold-deep">was ${r.prevPrice.toFixed(2)}</span>}</td>
                    <td className="p-2">{r.listed ? <span className="text-ok">Listed</span> : <span className="text-muted">Not listed ({r.missingRuns} runs)</span>}<span className="block text-[10px] text-muted">seen {r.lastSeen}</span></td>
                    <td className="p-2 text-bone">{r.productLabel ?? <span className="text-muted">— no exact match</span>}</td>
                    <td className="p-2">{r.hasOffer ? <span className="text-xs text-muted">Has offer</span> : r.productId && r.sizeParsed ? <CreateButton id={r.id} /> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-1 text-xs text-muted">Showing {shown.length} of {rows.length}. ⚠ = size text couldn&apos;t be read, create that offer by hand.</p>
        </>
      )}
    </section>
  );
}

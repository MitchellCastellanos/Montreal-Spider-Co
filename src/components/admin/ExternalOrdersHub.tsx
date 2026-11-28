"use client";

import { useActionState, type ReactNode } from "react";
import {
  confirmExternalOrderAction,
  createOfferAction,
  declineExternalOrderAction,
  deleteOfferAction,
  extendExternalOrderAction,
  saveExternalSettingsAction,
  setOfferPublishedAction,
  unpublishAllOffersAction,
} from "@/app/[locale]/admin/external-actions";
import type { ActionState } from "@/app/[locale]/admin/actions";
import { INCH_OPTIONS } from "@/lib/size-inches";

export type HeldRow = {
  id: string;
  orderNumber: string;
  customer: string;
  items: string;
  supplier: string;
  total: number;
  defaultCost: number;
  deadline: string;
  urgency: "ok" | "due_soon" | "overdue";
  extensions: number;
  createdAt: string;
};
export type OfferRow = {
  id: string;
  product: string;
  size: string;
  sex: string;
  price: number;
  unitCost: number;
  lead: string;
  maxPerOrder: number;
  published: boolean;
  supplier: string;
};
type RecentRow = { id: string; orderNumber: string; holdStatus: string; items: string; detail: string; updatedAt: string };
type SettingsView = {
  enabled: boolean;
  confirmDays: number;
  authSafeDays: number;
  apologyCredit: number;
  openDays: string[];
  openTime: string;
  closeTime: string;
};

const DAYS = [
  ["mon", "Mon"], ["tue", "Tue"], ["wed", "Wed"], ["thu", "Thu"], ["fri", "Fri"], ["sat", "Sat"], ["sun", "Sun"],
] as const;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card-glow rounded-2xl p-5">
      <h2 className="mb-3 font-display text-lg font-semibold text-cream">{title}</h2>
      {children}
    </section>
  );
}

function Msg({ state }: { state: ActionState }) {
  if (state.error) return <p className="text-sm text-danger">{state.error}</p>;
  if (state.ok) return <p className="text-sm text-gold-bright">Saved.</p>;
  return null;
}

/** A form wired to a server action, with its own pending/error state. */
function ActionForm({
  action,
  children,
  className = "",
  confirm,
}: {
  action: (prev: ActionState, f: FormData) => Promise<ActionState>;
  children: (s: { pending: boolean; state: ActionState }) => ReactNode;
  className?: string;
  confirm?: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});
  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children({ pending, state })}
    </form>
  );
}

function HeldCard({ o }: { o: HeldRow }) {
  const tone = o.urgency === "overdue" ? "border-danger/60" : o.urgency === "due_soon" ? "border-gold/60" : "border-line";
  return (
    <div className={`rounded-xl border ${tone} bg-ink-soft/40 p-4`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-cream">{o.orderNumber} · ${o.total.toFixed(2)} CAD (authorized)</p>
          <p className="text-sm text-bone">{o.items}</p>
          <p className="text-xs text-muted">{o.customer} · requested {o.createdAt}</p>
        </div>
        <div className="text-right text-sm">
          <p className={o.urgency === "overdue" ? "text-danger" : o.urgency === "due_soon" ? "text-gold-bright" : "text-bone"}>
            Confirm by {o.deadline}
          </p>
          {o.extensions > 0 && <p className="text-xs text-muted">Extended {o.extensions}×</p>}
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <ActionForm action={confirmExternalOrderAction} className="space-y-2" confirm="Capture the payment and mark this specimen as bought?">
          {({ pending, state }) => (
            <>
              <input type="hidden" name="orderId" value={o.id} />
              <label className="field">
                <span>Actual cost paid to {o.supplier} (CAD)</span>
                <input name="unitCost" type="number" step="0.01" min="0" defaultValue={o.defaultCost || ""} className="input" />
              </label>
              <button className="btn btn-gold w-full text-xs" disabled={pending}>
                {pending ? "Charging…" : "✓ I bought it — charge customer"}
              </button>
              <Msg state={state} />
            </>
          )}
        </ActionForm>

        <ActionForm action={extendExternalOrderAction} className="space-y-2">
          {({ pending, state }) => (
            <>
              <input type="hidden" name="orderId" value={o.id} />
              <label className="field">
                <span>Extend window by (supplier business days)</span>
                <input name="days" type="number" min="1" max="5" defaultValue="1" className="input" />
              </label>
              <button className="btn btn-ghost w-full text-xs" disabled={pending}>
                {pending ? "Extending…" : "Give me more time"}
              </button>
              <Msg state={state} />
            </>
          )}
        </ActionForm>

        <ActionForm action={declineExternalOrderAction} className="space-y-2" confirm="Release the hold and email the customer that the specimen is unavailable?">
          {({ pending, state }) => (
            <>
              <input type="hidden" name="orderId" value={o.id} />
              <label className="field">
                <span>Apology credit (CAD, 0 = none)</span>
                <input name="credit" type="number" step="1" min="0" defaultValue="10" className="input" />
              </label>
              <button className="btn btn-ghost w-full text-xs text-danger" disabled={pending}>
                {pending ? "Releasing…" : "✗ Can't get it — release hold"}
              </button>
              <Msg state={state} />
            </>
          )}
        </ActionForm>
      </div>
    </div>
  );
}

function OfferRowView({ o }: { o: OfferRow }) {
  return (
    <tr className="border-t border-line align-top text-sm">
      <td className="py-2 pr-3 text-cream">{o.product}</td>
      <td className="py-2 pr-3 text-bone">{o.size} · {o.sex}</td>
      <td className="py-2 pr-3 text-bone">${o.price.toFixed(2)}</td>
      <td className="py-2 pr-3 text-muted">${o.unitCost.toFixed(2)} ({o.price > 0 ? Math.round(((o.price - o.unitCost) / o.price) * 100) : 0}% gross)</td>
      <td className="py-2 pr-3 text-muted">{o.lead}d · max {o.maxPerOrder}</td>
      <td className="py-2 pr-3">
        <span className={o.published ? "text-ok" : "text-muted"}>{o.published ? "Published" : "Hidden"}</span>
      </td>
      <td className="py-2">
        <div className="flex gap-2">
          <ActionForm action={setOfferPublishedAction}>
            {({ pending }) => (
              <>
                <input type="hidden" name="id" value={o.id} />
                <input type="hidden" name="published" value={String(!o.published)} />
                <button className="btn btn-ghost text-xs" disabled={pending}>{o.published ? "Hide" : "Publish"}</button>
              </>
            )}
          </ActionForm>
          <ActionForm action={deleteOfferAction} confirm="Delete this offer? Past orders keep their lines.">
            {({ pending }) => (
              <>
                <input type="hidden" name="id" value={o.id} />
                <button className="btn btn-ghost text-xs text-danger" disabled={pending}>Delete</button>
              </>
            )}
          </ActionForm>
        </div>
      </td>
    </tr>
  );
}

export default function ExternalOrdersHub({
  settings,
  held,
  recent,
  offers,
  products,
}: {
  settings: SettingsView;
  held: HeldRow[];
  recent: RecentRow[];
  offers: OfferRow[];
  products: { id: string; label: string }[];
}) {
  const [killState, killAction, killPending] = useActionState<ActionState>(unpublishAllOffersAction, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-cream">Special orders (made to order)</h1>
        <p className="mt-1 text-sm text-muted">
          Specimens we get on request from a supplier. The customer&apos;s card is only <strong>authorized</strong> at checkout;
          it is charged when you confirm you bought the specimen, and released if you can&apos;t get it.
        </p>
        {!settings.enabled && (
          <p className="mt-3 rounded-xl border border-gold/30 bg-gold/5 p-3 text-sm text-bone">
            The feature is <strong>OFF</strong>: offers are hidden from the storefront and checkout refuses them. Turn it on in Settings below.
          </p>
        )}
      </div>

      <Section title={`Waiting for your confirmation (${held.length})`}>
        {held.length === 0 ? (
          <p className="text-sm text-muted">Nothing pending.</p>
        ) : (
          <div className="space-y-3">{held.map((o) => <HeldCard key={o.id} o={o} />)}</div>
        )}
      </Section>

      <Section title="Offers">
        {offers.length === 0 ? (
          <p className="mb-4 text-sm text-muted">No offers yet. Add one below — it stays hidden until you publish it.</p>
        ) : (
          <div className="mb-4 overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-xs uppercase tracking-wide text-muted">
                <tr><th className="pr-3">Listing</th><th className="pr-3">Size · sex</th><th className="pr-3">Price</th><th className="pr-3">Cost (private)</th><th className="pr-3">Lead · limit</th><th className="pr-3">Status</th><th /></tr>
              </thead>
              <tbody>{offers.map((o) => <OfferRowView key={o.id} o={o} />)}</tbody>
            </table>
          </div>
        )}

        <ActionForm action={createOfferAction} className="grid gap-3 rounded-xl border border-line p-4 md:grid-cols-4">
          {({ pending, state }) => (
            <>
              <label className="field md:col-span-2">
                <span>Listing (species page)</span>
                <select name="productId" className="input" required defaultValue="">
                  <option value="" disabled>Choose…</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Size (leg span)</span>
                <select name="inches" className="input" defaultValue="1">
                  {INCH_OPTIONS.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Sex</span>
                <select name="sex" className="input" defaultValue="unsexed">
                  <option value="unsexed">Unsexed</option><option value="male">Male</option><option value="female">Female</option>
                </select>
              </label>
              <label className="field"><span>Customer price (CAD)</span><input name="price" type="number" step="0.01" min="0.01" className="input" required /></label>
              <label className="field"><span>Supplier cost (private)</span><input name="unitCost" type="number" step="0.01" min="0" className="input" /></label>
              <label className="field"><span>Lead time min–max (business days)</span>
                <span className="flex gap-2"><input name="leadDaysMin" type="number" min="1" defaultValue="1" className="input" /><input name="leadDaysMax" type="number" min="1" defaultValue="3" className="input" /></span>
              </label>
              <label className="field"><span>Max per order</span><input name="maxPerOrder" type="number" min="1" max="5" defaultValue="1" className="input" /></label>
              <label className="field md:col-span-3"><span>Internal notes</span><input name="notes" className="input" placeholder="e.g. TarCan item 1297" /></label>
              <div className="flex items-end gap-3">
                <button className="btn btn-gold text-xs" disabled={pending}>{pending ? "Adding…" : "Add offer (hidden)"}</button>
                <Msg state={state} />
              </div>
            </>
          )}
        </ActionForm>

        <form action={killAction} className="mt-4 flex items-center gap-3">
          <button
            className="btn btn-ghost text-xs text-danger"
            disabled={killPending}
            onClick={(e) => {
              if (!window.confirm("Hide ALL made-to-order offers right now? Your own inventory is not affected.")) e.preventDefault();
            }}
          >
            Hide all supplier offers now
          </button>
          <Msg state={killState} />
        </form>
      </Section>

      <Section title="Settings">
        <ActionForm action={saveExternalSettingsAction} className="space-y-4">
          {({ pending, state }) => (
            <>
              <label className="flex items-center gap-2 text-sm text-cream">
                <input type="checkbox" name="enabled" defaultChecked={settings.enabled} className="accent-[var(--gold)]" />
                Made-to-order specimens enabled (storefront + checkout)
              </label>
              <div className="grid gap-3 md:grid-cols-4">
                <label className="field"><span>Confirm window (supplier business days)</span><input name="confirmDays" type="number" min="1" max="10" defaultValue={settings.confirmDays} className="input" /></label>
                <label className="field"><span>Card hold safe limit (days)</span><input name="authSafeDays" type="number" min="1" max="7" defaultValue={settings.authSafeDays} className="input" /></label>
                <label className="field"><span>Default apology credit (CAD)</span><input name="apologyCredit" type="number" min="0" step="1" defaultValue={settings.apologyCredit} className="input" /></label>
              </div>
              <div>
                <p className="mb-1 text-xs uppercase tracking-wide text-muted">Supplier opening hours (the window only counts these days)</p>
                <div className="flex flex-wrap items-center gap-3 text-sm text-bone">
                  {DAYS.map(([k, label]) => (
                    <label key={k} className="flex items-center gap-1">
                      <input type="checkbox" name="openDays" value={k} defaultChecked={settings.openDays.includes(k)} className="accent-[var(--gold)]" />
                      {label}
                    </label>
                  ))}
                  <input name="openTime" type="time" defaultValue={settings.openTime} className="input w-28" />
                  <span>to</span>
                  <input name="closeTime" type="time" defaultValue={settings.closeTime} className="input w-28" />
                </div>
                <p className="mt-1 text-xs text-muted">Placeholder hours until the supplier&apos;s real hours are confirmed. Times are Montréal time.</p>
              </div>
              <div className="flex items-center gap-3">
                <button className="btn btn-gold text-xs" disabled={pending}>{pending ? "Saving…" : "Save settings"}</button>
                <Msg state={state} />
              </div>
            </>
          )}
        </ActionForm>
      </Section>

      {recent.length > 0 && (
        <Section title="Recently resolved">
          <ul className="space-y-1 text-sm text-bone">
            {recent.map((r) => (
              <li key={r.id}>
                <span className="text-cream">{r.orderNumber}</span> · {r.items} ·{" "}
                <span className={r.holdStatus === "captured" ? "text-ok" : "text-muted"}>{r.holdStatus === "captured" ? "charged" : "released (not charged)"}</span>
                {r.detail && <span className="text-muted"> — {r.detail}</span>} · {r.updatedAt}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

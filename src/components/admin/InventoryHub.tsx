"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import {
  receiveSpecimensAction,
  sellSpecimensAction,
  transferSpecimensAction,
  updateTarantulAppIdAction,
  writeOffSpecimensAction,
  type ActionState,
} from "@/app/[locale]/admin/actions";
import { localeHref } from "@/lib/href";
import type { SpecimenView } from "@/lib/data/specimens";
import type { DistributorView } from "@/lib/data/locations";
import type { Product } from "@/lib/types";
import {
  CHANNEL_LABELS,
  PAYMENT_LABELS,
  PAYMENT_METHODS,
  SALES_CHANNELS,
  STATUS_LABELS,
} from "@/lib/inventory-labels";
import type { Locale } from "@/i18n/config";
import { formatPrice } from "@/lib/format";

type Tab = "list" | "receive" | "transfer" | "sell" | "writeoff";

export default function InventoryHub({
  specimens,
  products,
  distributors,
  locale,
}: {
  specimens: SpecimenView[];
  products: Product[];
  distributors: DistributorView[];
  locale: Locale;
}) {
  const [tab, setTab] = useState<Tab>("list");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterQ, setFilterQ] = useState("");

  const filtered = useMemo(() => {
    return specimens.filter((s) => {
      if (filterStatus && s.status !== filterStatus) return false;
      if (filterQ) {
        const q = filterQ.toLowerCase();
        const hay = `${s.tarantulAppId ?? ""} ${s.productName} ${s.scientific} ${s.notes}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [specimens, filterStatus, filterQ]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const tabs: { id: Tab; label: string }[] = [
    { id: "list", label: "All specimens" },
    { id: "receive", label: "Receive stock" },
    { id: "transfer", label: "Transfer" },
    { id: "sell", label: "Register sale" },
    { id: "writeoff", label: "Write off" },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-cream">Specimen inventory</h1>
          <p className="text-sm text-muted">
            Each spider is tracked individually. TarantulApp ID optional until you register it.
          </p>
        </div>
        <Link href={localeHref(locale, "/admin/finance")} className="btn btn-ghost text-sm">
          Finance dashboard →
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-xl border px-4 py-2 text-sm transition ${
              tab === t.id ? "border-gold bg-gold/10 text-cream" : "border-line text-bone hover:border-gold/50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "list" && (
        <>
          <div className="mb-4 flex flex-wrap gap-3">
            <input
              value={filterQ}
              onChange={(e) => setFilterQ(e.target.value)}
              placeholder="Search TarantulApp ID, species…"
              className="input min-w-[200px] flex-1"
            />
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input w-auto">
              <option value="">All statuses</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            {selected.size > 0 && (
              <span className="self-center text-sm text-gold-bright">{selected.size} selected</span>
            )}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-line">
            <table className="w-full text-left text-sm">
              <thead className="bg-ink-soft text-xs uppercase tracking-wide text-gold-deep">
                <tr>
                  <th className="px-3 py-3 w-10" />
                  <th className="px-3 py-3">TarantulApp ID</th>
                  <th className="px-3 py-3">Species</th>
                  <th className="px-3 py-3">Size</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Location</th>
                  <th className="px-3 py-3">Cost</th>
                  <th className="px-3 py-3">Purchased</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((s) => (
                  <SpecimenRow
                    key={s.id}
                    s={s}
                    locale={locale}
                    checked={selected.has(s.id)}
                    onToggle={() => toggle(s.id)}
                  />
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted">
                      No specimens match. Use &quot;Receive stock&quot; to add inventory.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "receive" && (
        <ReceiveForm products={products} distributors={distributors} locale={locale} />
      )}

      {tab === "transfer" && (
        <TransferForm
          locale={locale}
          distributors={distributors}
          selectedIds={[...selected]}
          specimens={specimens}
        />
      )}

      {tab === "sell" && (
        <SellForm locale={locale} selectedIds={[...selected]} specimens={specimens} />
      )}

      {tab === "writeoff" && (
        <WriteOffForm locale={locale} selectedIds={[...selected]} />
      )}
    </div>
  );
}

function SpecimenRow({
  s,
  locale,
  checked,
  onToggle,
}: {
  s: SpecimenView;
  locale: Locale;
  checked: boolean;
  onToggle: () => void;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateTarantulAppIdAction, {});
  const [editing, setEditing] = useState(false);
  const [taId, setTaId] = useState(s.tarantulAppId ?? "");

  const location =
    s.locationType === "warehouse" ? "Warehouse" : (s.locationName ?? "Distributor");

  return (
    <tr className="text-bone">
      <td className="px-3 py-2">
        <input type="checkbox" checked={checked} onChange={onToggle} className="accent-[var(--gold)]" />
      </td>
      <td className="px-3 py-2">
        {editing ? (
          <form action={action} className="flex gap-1">
            <input type="hidden" name="specimenId" value={s.id} />
            <input
              name="tarantulAppId"
              value={taId}
              onChange={(e) => setTaId(e.target.value)}
              className="input py-1 text-xs"
              placeholder="TarantulApp ID"
            />
            <button type="submit" disabled={pending} className="rounded border border-line px-2 text-xs text-cream">
              Save
            </button>
            <button type="button" onClick={() => setEditing(false)} className="text-xs text-muted">×</button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-left text-cream hover:text-gold-bright"
            title="Click to set TarantulApp ID"
          >
            {s.tarantulAppId || <span className="text-muted italic">— add ID —</span>}
          </button>
        )}
        {state.error && <p className="text-xs text-danger">{state.error}</p>}
        {state.ok && editing && <p className="text-xs text-ok">Saved</p>}
      </td>
      <td className="px-3 py-2">
        <p className="font-medium text-cream">{s.productName}</p>
        <p className="text-xs italic text-muted">{s.scientific}</p>
      </td>
      <td className="px-3 py-2">{s.sizeLabelEn}</td>
      <td className="px-3 py-2">
        <span className="rounded-full border border-line px-2 py-0.5 text-[10px] uppercase">
          {STATUS_LABELS[s.status] ?? s.status}
        </span>
      </td>
      <td className="px-3 py-2 text-xs">{location}</td>
      <td className="px-3 py-2">{formatPrice(s.unitCost, locale)}</td>
      <td className="px-3 py-2 text-xs text-muted">{s.purchasedAt}</td>
    </tr>
  );
}

function ReceiveForm({
  products,
  distributors,
  locale,
}: {
  products: Product[];
  distributors: DistributorView[];
  locale: Locale;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(receiveSpecimensAction, {});
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [dest, setDest] = useState<"warehouse" | "consignment">("warehouse");

  const product = products.find((p) => p.id === productId);
  const sizes = product?.sizes ?? [];

  return (
    <section className="card-glow max-w-2xl rounded-2xl p-5">
      <h2 className="mb-4 font-display text-lg font-semibold text-cream">Receive new stock</h2>
      <form action={action} className="space-y-4">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="locationType" value={dest} />

        <label className="field">
          <span>Product</span>
          <select name="productId" value={productId} onChange={(e) => setProductId(e.target.value)} className="input" required>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.common.en} — {p.scientific}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Size tier</span>
          <select name="sizeKey" className="input" required>
            {sizes.map((s) => (
              <option key={s.id} value={s.id}>{s.label.en}</option>
            ))}
          </select>
        </label>

        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm text-bone">
            <input type="radio" checked={mode === "single"} onChange={() => setMode("single")} />
            Single specimen
          </label>
          <label className="flex items-center gap-2 text-sm text-bone">
            <input type="radio" checked={mode === "bulk"} onChange={() => setMode("bulk")} />
            Bulk (multiple)
          </label>
        </div>

        {mode === "single" ? (
          <>
            <input type="hidden" name="quantity" value="1" />
            <label className="field">
              <span>TarantulApp ID (optional)</span>
              <input name="tarantulAppId" className="input" placeholder="Leave empty until registered" />
            </label>
          </>
        ) : (
          <>
            <label className="field">
              <span>Quantity</span>
              <input name="quantity" type="number" min={1} max={100} defaultValue={1} className="input" required />
            </label>
            <label className="field">
              <span>TarantulApp IDs (optional — one per line, must match quantity)</span>
              <textarea name="tarantulAppIds" className="input min-h-24 font-mono text-sm" placeholder={"ID-001\nID-002"} />
            </label>
          </>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="field">
            <span>Unit cost ($)</span>
            <input name="unitCost" type="number" step="0.01" min={0} defaultValue={0} className="input" required />
          </label>
          <label className="field">
            <span>Purchase date</span>
            <input name="purchasedAt" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="input" required />
          </label>
        </div>

        <label className="field">
          <span>Supplier / source</span>
          <input name="supplier" className="input" placeholder="Breeder name, import batch…" />
        </label>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-cream">Destination</legend>
          <label className="flex items-center gap-2 text-sm text-bone">
            <input type="radio" checked={dest === "warehouse"} onChange={() => setDest("warehouse")} />
            Warehouse (sellable online)
          </label>
          <label className="flex items-center gap-2 text-sm text-bone">
            <input type="radio" checked={dest === "consignment"} onChange={() => setDest("consignment")} />
            Direct to distributor (consignment)
          </label>
          {dest === "consignment" && (
            <select name="locationId" className="input" required>
              <option value="">Select distributor…</option>
              {distributors.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          )}
        </fieldset>

        <label className="field">
          <span>Notes</span>
          <input name="notes" className="input" />
        </label>

        {state.error && <p className="text-sm text-danger">{state.error}</p>}

        <button type="submit" disabled={pending} className="btn btn-gold">
          {pending ? "Saving…" : "Receive stock"}
        </button>
      </form>
    </section>
  );
}

function TransferForm({
  locale,
  distributors,
  selectedIds,
  specimens,
}: {
  locale: Locale;
  distributors: DistributorView[];
  selectedIds: string[];
  specimens: SpecimenView[];
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(transferSpecimensAction, {});
  const [direction, setDirection] = useState<"consignment" | "warehouse">("consignment");

  const preview = specimens.filter((s) => selectedIds.includes(s.id));

  return (
    <section className="card-glow max-w-2xl rounded-2xl p-5">
      <h2 className="mb-4 font-display text-lg font-semibold text-cream">Transfer specimens</h2>
      <p className="mb-4 text-sm text-bone">
        Select specimens in the list tab first ({selectedIds.length} selected).
      </p>
      {preview.length > 0 && (
        <ul className="mb-4 max-h-32 overflow-y-auto rounded-lg border border-line p-2 text-xs text-muted">
          {preview.map((s) => (
            <li key={s.id}>{s.tarantulAppId || s.id.slice(0, 8)} — {s.productName} ({s.sizeLabelEn})</li>
          ))}
        </ul>
      )}
      <form action={action} className="space-y-4">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="specimenIds" value={JSON.stringify(selectedIds)} />
        <input type="hidden" name="direction" value={direction} />

        <fieldset className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-bone">
            <input type="radio" checked={direction === "consignment"} onChange={() => setDirection("consignment")} />
            Warehouse → Distributor
          </label>
          <label className="flex items-center gap-2 text-sm text-bone">
            <input type="radio" checked={direction === "warehouse"} onChange={() => setDirection("warehouse")} />
            Distributor → Warehouse
          </label>
        </fieldset>

        {direction === "consignment" && (
          <label className="field">
            <span>Distributor</span>
            <select name="locationId" className="input" required>
              <option value="">Select…</option>
              {distributors.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </label>
        )}

        <label className="field">
          <span>Notes</span>
          <input name="notes" className="input" />
        </label>

        {state.error && <p className="text-sm text-danger">{state.error}</p>}

        <button type="submit" disabled={pending || selectedIds.length === 0} className="btn btn-gold">
          {pending ? "Transferring…" : "Transfer"}
        </button>
      </form>
    </section>
  );
}

function SellForm({
  locale,
  selectedIds,
  specimens,
}: {
  locale: Locale;
  selectedIds: string[];
  specimens: SpecimenView[];
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(sellSpecimensAction, {});
  const preview = specimens.filter((s) => selectedIds.includes(s.id));

  return (
    <section className="card-glow max-w-2xl rounded-2xl p-5">
      <h2 className="mb-4 font-display text-lg font-semibold text-cream">Register sale (manual)</h2>
      <p className="mb-4 text-sm text-bone">
        For Kijiji, ferias, ventas en distribuidor, etc. Select specimens in the list tab ({selectedIds.length} selected).
      </p>
      {preview.length > 0 && (
        <ul className="mb-4 max-h-32 overflow-y-auto rounded-lg border border-line p-2 text-xs text-muted">
          {preview.map((s) => (
            <li key={s.id}>
              {s.tarantulAppId || "no ID"} — {s.productName} · cost {formatPrice(s.unitCost, locale)}
            </li>
          ))}
        </ul>
      )}
      <form action={action} className="space-y-4">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="specimenIds" value={JSON.stringify(selectedIds)} />

        <label className="field">
          <span>Total sale price ($)</span>
          <input name="salePrice" type="number" step="0.01" min={0} className="input" required />
          <span className="text-xs text-muted">Split evenly if multiple specimens selected.</span>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="field">
            <span>Sales channel</span>
            <select name="salesChannel" className="input" defaultValue="kijiji">
              {SALES_CHANNELS.map((c) => (
                <option key={c} value={c}>{CHANNEL_LABELS[c]}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Payment method</span>
            <select name="paymentMethod" className="input" defaultValue="cash">
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>{PAYMENT_LABELS[m]}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="field">
          <span>Notes</span>
          <input name="notes" className="input" placeholder="Buyer, Kijiji ad link…" />
        </label>

        {state.error && <p className="text-sm text-danger">{state.error}</p>}

        <button type="submit" disabled={pending || selectedIds.length === 0} className="btn btn-gold">
          {pending ? "Recording…" : "Record sale"}
        </button>
      </form>
    </section>
  );
}

function WriteOffForm({ locale, selectedIds }: { locale: Locale; selectedIds: string[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(writeOffSpecimensAction, {});

  return (
    <section className="card-glow max-w-2xl rounded-2xl p-5">
      <h2 className="mb-4 font-display text-lg font-semibold text-cream">Write off</h2>
      <p className="mb-4 text-sm text-bone">Death, gift, counting error — {selectedIds.length} selected.</p>
      <form action={action} className="space-y-4">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="specimenIds" value={JSON.stringify(selectedIds)} />
        <label className="field">
          <span>Reason</span>
          <input name="notes" className="input" required placeholder="Molt death, donated to…" />
        </label>
        {state.error && <p className="text-sm text-danger">{state.error}</p>}
        <button type="submit" disabled={pending || selectedIds.length === 0} className="btn btn-ghost border border-danger text-danger">
          {pending ? "Processing…" : "Write off selected"}
        </button>
      </form>
    </section>
  );
}

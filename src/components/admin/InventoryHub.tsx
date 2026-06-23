"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import {
  receiveBatchAction,
  sellSpecimensAction,
  transferSpecimensAction,
  deleteSpecimensAction,
  updateTarantulAppIdAction,
  updateSpecimenAction,
  writeOffSpecimensAction,
  type ActionState,
} from "@/app/[locale]/admin/actions";
import { localeHref } from "@/lib/href";
import type { SpecimenView } from "@/lib/data/specimens";
import type { DistributorView } from "@/lib/data/locations";
import type { LibraryImage } from "@/lib/data/species-library";
import type { Product } from "@/lib/types";
import { formatCmAsInches } from "@/lib/size-inches";
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
  libraryImages,
  locale,
}: {
  specimens: SpecimenView[];
  products: Product[];
  distributors: DistributorView[];
  libraryImages: LibraryImage[];
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

  const toggleAllFiltered = () => {
    const ids = filtered.map((s) => s.id);
    const allSelected = ids.length > 0 && ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  };

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
              <>
                <span className="self-center text-sm text-gold-bright">{selected.size} selected</span>
                <DeleteSelectedButton locale={locale} selectedIds={[...selected]} />
              </>
            )}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-line">
            <table className="w-full text-left text-sm">
              <thead className="bg-ink-soft text-xs uppercase tracking-wide text-gold-deep">
                <tr>
                  <th className="px-3 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && filtered.every((s) => selected.has(s.id))}
                      onChange={toggleAllFiltered}
                      className="accent-[var(--gold)]"
                      aria-label="Select all visible"
                    />
                  </th>
                  <th className="px-3 py-3">TarantulApp ID</th>
                  <th className="px-3 py-3">Species</th>
                  <th className="px-3 py-3">Size</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Location</th>
                  <th className="px-3 py-3">Cost</th>
                  <th className="px-3 py-3">Price</th>
                  <th className="px-3 py-3">Purchased</th>
                  <th className="px-3 py-3" />
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
                    distributors={distributors}
                  />
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-muted">
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
        <ReceiveBatchForm
          products={products}
          distributors={distributors}
          libraryImages={libraryImages}
          locale={locale}
        />
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

function DeleteSelectedButton({
  locale,
  selectedIds,
}: {
  locale: Locale;
  selectedIds: string[];
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(deleteSpecimensAction, {});

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!confirm(`Delete ${selectedIds.length} specimen(s)? This cannot be undone.`)) {
      e.preventDefault();
    }
  };

  return (
    <form action={action} onSubmit={handleSubmit}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="specimenIds" value={JSON.stringify(selectedIds)} />
      <button
        type="submit"
        disabled={pending || selectedIds.length === 0}
        className="rounded-xl border border-danger/50 px-3 py-2 text-sm text-danger hover:bg-danger/10 disabled:opacity-50"
      >
        {pending ? "Deleting…" : "Delete selected"}
      </button>
      {state.error && <span className="ml-2 text-xs text-danger">{state.error}</span>}
    </form>
  );
}

function SpecimenRow({
  s,
  locale,
  checked,
  onToggle,
  distributors,
}: {
  s: SpecimenView;
  locale: Locale;
  checked: boolean;
  onToggle: () => void;
  distributors: DistributorView[];
}) {
  const [taState, taAction, taPending] = useActionState<ActionState, FormData>(updateTarantulAppIdAction, {});
  const [taEditing, setTaEditing] = useState(false);
  const [taId, setTaId] = useState(s.tarantulAppId ?? "");

  const [editState, editAction, editPending] = useActionState<ActionState, FormData>(updateSpecimenAction, {});
  const [editing, setEditing] = useState(false);
  const [sizeCm, setSizeCm] = useState(s.sizeCm);
  const [sex, setSex] = useState(s.sex);
  const [unitCost, setUnitCost] = useState(s.unitCost);
  const [price, setPrice] = useState(s.price);
  const [locationType, setLocationType] = useState(s.locationType);
  const [locationId, setLocationId] = useState(s.locationId ?? "");
  const [notes, setNotes] = useState(s.notes ?? "");

  const locked = s.status === "sold" || s.status === "written_off";
  const location =
    s.locationType === "warehouse" ? "Warehouse" : (s.locationName ?? "Distributor");

  return (
    <>
      <tr className="text-bone">
        <td className="px-3 py-2">
          <input type="checkbox" checked={checked} onChange={onToggle} className="accent-[var(--gold)]" />
        </td>
        <td className="px-3 py-2">
          {taEditing ? (
            <form action={taAction} className="flex gap-1">
              <input type="hidden" name="specimenId" value={s.id} />
              <input
                name="tarantulAppId"
                value={taId}
                onChange={(e) => setTaId(e.target.value)}
                className="input py-1 text-xs"
                placeholder="TarantulApp ID"
              />
              <button type="submit" disabled={taPending} className="rounded border border-line px-2 text-xs text-cream">
                Save
              </button>
              <button type="button" onClick={() => setTaEditing(false)} className="text-xs text-muted">×</button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setTaEditing(true)}
              className="text-left text-cream hover:text-gold-bright"
              title="Click to set TarantulApp ID"
            >
              {s.tarantulAppId || <span className="text-muted italic">— add ID —</span>}
            </button>
          )}
          {taState.error && <p className="text-xs text-danger">{taState.error}</p>}
          {taState.ok && taEditing && <p className="text-xs text-ok">Saved</p>}
        </td>
        <td className="px-3 py-2">
          <p className="font-medium text-cream">{s.productName}</p>
          <p className="text-xs italic text-muted">{s.scientific}</p>
        </td>
        <td className="px-3 py-2">{s.sizeLabel}</td>
        <td className="px-3 py-2">
          <span className="rounded-full border border-line px-2 py-0.5 text-[10px] uppercase">
            {STATUS_LABELS[s.status] ?? s.status}
          </span>
        </td>
        <td className="px-3 py-2 text-xs">{location}</td>
        <td className="px-3 py-2">{formatPrice(s.unitCost, locale)}</td>
        <td className="px-3 py-2">{formatPrice(s.price, locale)}</td>
        <td className="px-3 py-2 text-xs text-muted">{s.purchasedAt}</td>
        <td className="px-3 py-2">
          {!locked && (
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              className="rounded border border-line px-2 py-1 text-xs text-cream hover:bg-ink-soft"
            >
              {editing ? "Close" : "Edit"}
            </button>
          )}
        </td>
      </tr>
      {editing && !locked && (
        <tr className="bg-ink-soft/30">
          <td colSpan={10} className="px-4 py-4">
            <form action={editAction} className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <input type="hidden" name="specimenId" value={s.id} />
              <label className="field">
                <span>Size (cm)</span>
                <input
                  name="sizeCm"
                  type="number"
                  step="0.1"
                  min={0}
                  value={sizeCm}
                  onChange={(e) => setSizeCm(Number(e.target.value))}
                  className="input"
                  required
                />
              </label>
              <label className="field">
                <span>Sex</span>
                <select name="sex" value={sex} onChange={(e) => setSex(e.target.value as typeof sex)} className="input">
                  <option value="unsexed">Unsexed</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </label>
              <label className="field">
                <span>Cost ($)</span>
                <input
                  name="unitCost"
                  type="number"
                  step="0.01"
                  min={0}
                  value={unitCost}
                  onChange={(e) => setUnitCost(Number(e.target.value))}
                  className="input"
                />
              </label>
              <label className="field">
                <span>Price ($)</span>
                <input
                  name="price"
                  type="number"
                  step="0.01"
                  min={0}
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="input"
                />
              </label>
              <label className="field">
                <span>Location</span>
                <select
                  name="locationType"
                  value={locationType}
                  onChange={(e) => {
                    setLocationType(e.target.value as typeof locationType);
                    setLocationId("");
                  }}
                  className="input"
                >
                  <option value="warehouse">Warehouse</option>
                  <option value="consignment">Distributor</option>
                </select>
              </label>
              {locationType === "consignment" && (
                <label className="field">
                  <span>Distributor</span>
                  <select
                    name="locationId"
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                    className="input"
                    required
                  >
                    <option value="">Select…</option>
                    {distributors.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </label>
              )}
              <label className="field sm:col-span-3 lg:col-span-6">
                <span>Notes</span>
                <input
                  name="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input"
                />
              </label>
              <div className="flex items-center gap-3 sm:col-span-3 lg:col-span-6">
                <button type="submit" disabled={editPending} className="btn btn-gold">
                  {editPending ? "Saving…" : "Save"}
                </button>
                <button type="button" onClick={() => setEditing(false)} className="text-sm text-muted">
                  Cancel
                </button>
                {editState.error && <p className="text-sm text-danger">{editState.error}</p>}
                {editState.ok && <p className="text-sm text-ok">Saved</p>}
              </div>
            </form>
          </td>
        </tr>
      )}
    </>
  );
}

function InfoHint({ text }: { text: string }) {
  return (
    <span className="group/hint relative inline-flex align-middle">
      <span
        tabIndex={0}
        className="inline-flex h-3.5 w-3.5 cursor-help items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-[9px] font-bold leading-none text-gold-bright"
        aria-label={text}
      >
        i
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-48 -translate-x-1/2 rounded-lg border border-line bg-ink-soft px-3 py-2 text-left text-xs font-normal leading-relaxed text-bone opacity-0 shadow-lg transition-opacity group-hover/hint:opacity-100 group-focus-within/hint:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}

type PhotoMode = "default" | "upload" | "library";

interface RowState {
  key: string;
  sizeCm: string;
  sex: "" | "male" | "female";
  unitCost: string;
  price: string;
  quantity: string;
  photoMode: PhotoMode;
  photoPreview: string | null;
  libraryUrl: string;
  fileResetKey: number;
  locationType: "warehouse" | "consignment";
  locationId: string;
  tarantulAppIds: string;
}

interface SpeciesBlock {
  key: string;
  productId: string;
  batchCount: string;
  purchasedAt: string;
  supplier: string;
  notes: string;
  rows: RowState[];
}

let batchUidCounter = 0;
function batchUid(prefix: string): string {
  batchUidCounter += 1;
  return `${prefix}-${batchUidCounter}`;
}

function blankRow(): RowState {
  return {
    key: batchUid("row"),
    sizeCm: "",
    sex: "",
    unitCost: "",
    price: "",
    quantity: "1",
    photoMode: "default",
    photoPreview: null,
    libraryUrl: "",
    fileResetKey: 0,
    locationType: "warehouse",
    locationId: "",
    tarantulAppIds: "",
  };
}

function blankBlock(productId: string): SpeciesBlock {
  return {
    key: batchUid("block"),
    productId,
    batchCount: "1",
    purchasedAt: new Date().toISOString().slice(0, 10),
    supplier: "",
    notes: "",
    rows: [blankRow()],
  };
}

function LibraryPickerPanel({
  images,
  onPick,
  onClose,
}: {
  images: LibraryImage[];
  onPick: (url: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return images;
    return images.filter(
      (img) =>
        img.label.toLowerCase().includes(q) ||
        img.scientific.toLowerCase().includes(q) ||
        img.genus.toLowerCase().includes(q),
    );
  }, [images, search]);

  return (
    <div className="rounded-xl border border-line bg-ink-soft/60 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className="text-xs font-semibold text-cream">Species library</h4>
        <button type="button" className="text-xs text-muted hover:text-cream" onClick={onClose}>
          Close
        </button>
      </div>
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search…"
        className="input mb-2 py-1.5 text-sm"
      />
      {filtered.length === 0 ? (
        <p className="text-xs text-muted">No library photos found.</p>
      ) : (
        <div className="grid max-h-48 grid-cols-4 gap-1.5 overflow-y-auto sm:grid-cols-6">
          {filtered.map((img) => (
            <button
              key={img.id}
              type="button"
              onClick={() => onPick(img.url)}
              className="overflow-hidden rounded-lg border border-line text-left transition hover:border-gold"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="aspect-square w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ReceiveBatchForm({
  products,
  distributors,
  libraryImages,
  locale,
}: {
  products: Product[];
  distributors: DistributorView[];
  libraryImages: LibraryImage[];
  locale: Locale;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(receiveBatchAction, {});
  const [blocks, setBlocks] = useState<SpeciesBlock[]>(() => [blankBlock(products[0]?.id ?? "")]);
  const [libraryPickerRow, setLibraryPickerRow] = useState<string | null>(null);

  const updateBlock = (blockKey: string, patch: Partial<SpeciesBlock>) =>
    setBlocks((prev) => prev.map((b) => (b.key === blockKey ? { ...b, ...patch } : b)));

  const updateRow = (blockKey: string, rowKey: string, patch: Partial<RowState>) =>
    setBlocks((prev) =>
      prev.map((b) =>
        b.key !== blockKey ? b : { ...b, rows: b.rows.map((r) => (r.key === rowKey ? { ...r, ...patch } : r)) },
      ),
    );

  const addRow = (blockKey: string) =>
    setBlocks((prev) => prev.map((b) => (b.key === blockKey ? { ...b, rows: [...b.rows, blankRow()] } : b)));

  const removeRow = (blockKey: string, rowKey: string) =>
    setBlocks((prev) =>
      prev.map((b) => (b.key !== blockKey ? b : { ...b, rows: b.rows.filter((r) => r.key !== rowKey) })),
    );

  const generateRows = (blockKey: string) =>
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.key !== blockKey) return b;
        const count = Math.max(1, Math.min(200, Math.round(Number(b.batchCount) || 1)));
        return { ...b, rows: Array.from({ length: count }, () => blankRow()) };
      }),
    );

  const addBlock = () => setBlocks((prev) => [...prev, blankBlock(products[0]?.id ?? "")]);
  const removeBlock = (blockKey: string) => setBlocks((prev) => prev.filter((b) => b.key !== blockKey));

  const resetPhoto = (blockKey: string, rowKey: string) =>
    updateRow(blockKey, rowKey, {
      photoMode: "default",
      photoPreview: null,
      libraryUrl: "",
      fileResetKey: (blocks.find((b) => b.key === blockKey)?.rows.find((r) => r.key === rowKey)?.fileResetKey ?? 0) + 1,
    });

  const pickLibrary = (blockKey: string, rowKey: string, url: string) => {
    const current = blocks.find((b) => b.key === blockKey)?.rows.find((r) => r.key === rowKey);
    updateRow(blockKey, rowKey, {
      photoMode: "library",
      libraryUrl: url,
      photoPreview: null,
      fileResetKey: (current?.fileResetKey ?? 0) + 1,
    });
    setLibraryPickerRow(null);
  };

  const rowsJson = useMemo(
    () =>
      JSON.stringify(
        blocks.flatMap((b) =>
          b.rows.map((r) => ({
            productId: b.productId,
            sizeCm: Number(r.sizeCm) || 0,
            sex: r.sex || "unsexed",
            unitCost: Number(r.unitCost) || 0,
            price: Number(r.price) || 0,
            photoUrl: r.photoMode === "library" ? r.libraryUrl : null,
            quantity: Math.max(1, Math.round(Number(r.quantity) || 1)),
            purchasedAt: b.purchasedAt,
            supplier: b.supplier,
            notes: b.notes,
            locationType: r.locationType,
            locationId: r.locationType === "consignment" ? r.locationId : undefined,
            tarantulAppIds: r.tarantulAppIds
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean),
          })),
        ),
      ),
    [blocks],
  );

  const blockStartIndices = useMemo(() => {
    const starts: Record<string, number> = {};
    let running = 0;
    for (const b of blocks) {
      starts[b.key] = running;
      running += b.rows.length;
    }
    return starts;
  }, [blocks]);

  return (
    <section className="card-glow max-w-5xl rounded-2xl p-5">
      <h2 className="mb-1 font-display text-lg font-semibold text-cream">Receive a batch</h2>
      <p className="mb-4 text-sm text-muted">
        Add one species at a time. Set how many specimens arrived to generate a row per spider, then adjust size,
        sex, cost and price per row — collapse identical specimens with the row quantity field.
      </p>
      <form action={action} className="space-y-5">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="rows" value={rowsJson} />

        {blocks.map((block) => {
          const product = products.find((p) => p.id === block.productId);
          const blockStartIndex = blockStartIndices[block.key];

          return (
            <div key={block.key} className="space-y-4 rounded-2xl border border-line p-4">
              <div className="flex flex-wrap items-end gap-3">
                <label className="field min-w-[220px] flex-1">
                  <span>Species</span>
                  <select
                    value={block.productId}
                    onChange={(e) => updateBlock(block.key, { productId: e.target.value })}
                    className="input"
                    required
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.common.en} — {p.scientific}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field w-40">
                  <span>Purchase date</span>
                  <input
                    type="date"
                    value={block.purchasedAt}
                    onChange={(e) => updateBlock(block.key, { purchasedAt: e.target.value })}
                    className="input"
                    required
                  />
                </label>
                <label className="field min-w-[180px] flex-1">
                  <span>Supplier / source</span>
                  <input
                    value={block.supplier}
                    onChange={(e) => updateBlock(block.key, { supplier: e.target.value })}
                    className="input"
                    placeholder="Breeder, import batch…"
                  />
                </label>
                {blocks.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeBlock(block.key)}
                    className="btn btn-ghost text-xs text-danger"
                  >
                    Remove species
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-ink-soft/40 p-3">
                <label className="flex items-center gap-2 text-sm text-bone">
                  Specimens in this batch
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={block.batchCount}
                    onChange={(e) => updateBlock(block.key, { batchCount: e.target.value })}
                    className="input w-20 py-1.5"
                  />
                </label>
                <button type="button" className="btn btn-ghost text-xs" onClick={() => generateRows(block.key)}>
                  Generate rows
                </button>
                <span className="text-xs text-muted">
                  Creates one row per specimen — raise a row&apos;s qty and delete the rest to collapse duplicates.
                </span>
              </div>

              <div className="space-y-3">
                {block.rows.map((row, i) => {
                  const rowIndex = blockStartIndex + i;
                  const photoSrc =
                    row.photoMode === "upload" && row.photoPreview
                      ? row.photoPreview
                      : row.photoMode === "library" && row.libraryUrl
                        ? row.libraryUrl
                        : product?.image ?? null;
                  const photoCaption =
                    row.photoMode === "upload"
                      ? "New upload for this row."
                      : row.photoMode === "library"
                        ? "Library photo for this row."
                        : product?.image
                          ? "Using the species' default photo."
                          : "No species photo yet.";

                  return (
                    <div key={row.key} className="rounded-xl border border-line p-3">
                      <div className="flex flex-wrap items-start gap-3">
                        <div className="flex shrink-0 flex-col items-center gap-1.5">
                          <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-line bg-ink">
                            {photoSrc ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={photoSrc} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <span className="flex h-full items-center justify-center px-1 text-center text-[9px] text-muted">
                                No photo
                              </span>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <label className="btn btn-ghost cursor-pointer px-1.5 py-1 text-[10px]">
                              Upload
                              <input
                                key={`file-${row.key}-${row.fileResetKey}`}
                                type="file"
                                name={`photoFile-${rowIndex}`}
                                accept="image/*"
                                className="sr-only"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) {
                                    updateRow(block.key, row.key, {
                                      photoMode: "upload",
                                      photoPreview: URL.createObjectURL(f),
                                      libraryUrl: "",
                                    });
                                  }
                                }}
                              />
                            </label>
                            <button
                              type="button"
                              className="btn btn-ghost px-1.5 py-1 text-[10px]"
                              onClick={() => setLibraryPickerRow(libraryPickerRow === row.key ? null : row.key)}
                            >
                              Library
                            </button>
                          </div>
                          {row.photoMode !== "default" && (
                            <button
                              type="button"
                              className="text-[10px] text-muted hover:text-danger"
                              onClick={() => resetPhoto(block.key, row.key)}
                            >
                              Use default
                            </button>
                          )}
                          <span className="max-w-[5.5rem] text-center text-[9px] leading-tight text-muted">
                            {photoCaption}
                          </span>
                        </div>

                        <label className="field w-28">
                          <span>Size (cm)</span>
                          <input
                            type="number"
                            step="0.1"
                            min={0}
                            value={row.sizeCm}
                            onChange={(e) => updateRow(block.key, row.key, { sizeCm: e.target.value })}
                            className="input"
                            required
                          />
                          <span className="mt-1 block text-[11px] text-muted">
                            {row.sizeCm ? formatCmAsInches(Number(row.sizeCm)) : "—"}
                          </span>
                        </label>

                        <label className="field w-32">
                          <span className="inline-flex items-center gap-1.5">
                            Sex <InfoHint text="Unsexed means the spider hasn't been sexed yet — normal for juveniles. Update it later once it molts and is sexed." />
                          </span>
                          <select
                            value={row.sex}
                            onChange={(e) => updateRow(block.key, row.key, { sex: e.target.value as RowState["sex"] })}
                            className="input"
                          >
                            <option value="">Unsexed</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                          </select>
                        </label>

                        <label className="field w-24">
                          <span>Cost ($)</span>
                          <input
                            type="number"
                            step="0.01"
                            min={0}
                            value={row.unitCost}
                            onChange={(e) => updateRow(block.key, row.key, { unitCost: e.target.value })}
                            className="input"
                            required
                          />
                        </label>

                        <label className="field w-24">
                          <span>Price ($)</span>
                          <input
                            type="number"
                            step="0.01"
                            min={0}
                            value={row.price}
                            onChange={(e) => updateRow(block.key, row.key, { price: e.target.value })}
                            className="input"
                            required
                          />
                        </label>

                        <label className="field w-20">
                          <span>Qty</span>
                          <input
                            type="number"
                            min={1}
                            max={200}
                            value={row.quantity}
                            onChange={(e) => updateRow(block.key, row.key, { quantity: e.target.value })}
                            className="input"
                            required
                          />
                        </label>

                        <label className="field w-36">
                          <span>Destination</span>
                          <select
                            value={row.locationType}
                            onChange={(e) =>
                              updateRow(block.key, row.key, {
                                locationType: e.target.value as RowState["locationType"],
                                locationId: "",
                              })
                            }
                            className="input"
                          >
                            <option value="warehouse">Warehouse</option>
                            <option value="consignment">Distributor</option>
                          </select>
                        </label>

                        {row.locationType === "consignment" && (
                          <label className="field w-40">
                            <span>Distributor</span>
                            <select
                              value={row.locationId}
                              onChange={(e) => updateRow(block.key, row.key, { locationId: e.target.value })}
                              className="input"
                              required
                            >
                              <option value="">Select…</option>
                              {distributors.map((d) => (
                                <option key={d.id} value={d.id}>
                                  {d.name}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}

                        <button
                          type="button"
                          onClick={() => removeRow(block.key, row.key)}
                          disabled={block.rows.length === 1}
                          className="ml-auto self-center text-xs text-danger hover:underline disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          Remove row
                        </button>
                      </div>

                      {libraryPickerRow === row.key && (
                        <div className="mt-3">
                          <LibraryPickerPanel
                            images={libraryImages}
                            onPick={(url) => pickLibrary(block.key, row.key, url)}
                            onClose={() => setLibraryPickerRow(null)}
                          />
                        </div>
                      )}

                      <details className="mt-2">
                        <summary className="cursor-pointer select-none text-xs text-muted">
                          TarantulApp IDs (optional)
                        </summary>
                        <textarea
                          value={row.tarantulAppIds}
                          onChange={(e) => updateRow(block.key, row.key, { tarantulAppIds: e.target.value })}
                          className="input mt-2 min-h-16 font-mono text-xs"
                          placeholder={"One ID per line — must match this row's quantity if provided"}
                        />
                      </details>
                    </div>
                  );
                })}
              </div>

              <button type="button" onClick={() => addRow(block.key)} className="btn btn-ghost text-xs">
                + Add row
              </button>
            </div>
          );
        })}

        <button type="button" onClick={addBlock} className="btn btn-ghost text-sm">
          + Add another species
        </button>

        {state.error && <p className="text-sm text-danger">{state.error}</p>}

        <div>
          <button type="submit" disabled={pending} className="btn btn-gold">
            {pending ? "Saving…" : "Receive batch"}
          </button>
        </div>
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
            <li key={s.id}>{s.tarantulAppId || s.id.slice(0, 8)} — {s.productName} ({s.sizeLabel})</li>
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

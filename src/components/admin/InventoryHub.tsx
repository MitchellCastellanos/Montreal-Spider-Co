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
import type { SpecimenView, SalesChannel } from "@/lib/data/specimens";
import type { DistributorView } from "@/lib/data/locations";
import type { LibraryImage } from "@/lib/data/species-library";
import type { SpeciesProfile } from "@/lib/data/species";
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
import { type InventoryTab } from "@/lib/inventory-tab";
import SortableTh, { cmpNum, cmpStr, toggleSortKey, type SortDir } from "./SortableTh";

type Tab = InventoryTab;

type SpecimenSortKey =
  | "tarantulAppId"
  | "species"
  | "size"
  | "status"
  | "location"
  | "cost"
  | "price"
  | "purchased";

type ReceiveHints = { price: string; unitCost: string };

/** Last received cost/price per species — used to pre-fill Receive batch rows. */
function receiveHintsBySpecies(
  specimens: SpecimenView[],
  products: Product[],
  speciesList: SpeciesProfile[],
): Map<string, ReceiveHints> {
  const sciToSpeciesId = new Map(speciesList.map((s) => [s.scientific.toLowerCase(), s.id]));
  const productToSpecies = new Map<string, string>();
  for (const p of products) {
    const sid =
      sciToSpeciesId.get(p.scientific.toLowerCase()) ??
      speciesList.find((s) => s.scientific.toLowerCase() === p.scientific.toLowerCase())?.id ??
      `legacy:${p.id}`;
    productToSpecies.set(p.id, sid);
  }

  const latest = new Map<string, ReceiveHints & { purchasedAt: string }>();
  for (const s of specimens) {
    const speciesId = productToSpecies.get(s.productId);
    if (!speciesId) continue;
    const cur = latest.get(speciesId);
    if (!cur || s.purchasedAt > cur.purchasedAt) {
      latest.set(speciesId, {
        price: String(s.price),
        unitCost: String(s.unitCost),
        purchasedAt: s.purchasedAt,
      });
    }
  }
  const out = new Map<string, ReceiveHints>();
  for (const [id, v] of latest) {
    out.set(id, { price: v.price, unitCost: v.unitCost });
  }
  for (const sp of speciesList) {
    if (out.has(sp.id)) continue;
    const p = products.find((pr) => pr.scientific.toLowerCase() === sp.scientific.toLowerCase());
    if (p?.availability.length) {
      const cheapest = p.availability.reduce((a, b) => (a.price <= b.price ? a : b));
      out.set(sp.id, { price: String(cheapest.price), unitCost: "" });
    }
  }
  return out;
}

function receiveSpeciesOptions(speciesList: SpeciesProfile[], products: Product[]): SpeciesProfile[] {
  const covered = new Set(speciesList.map((s) => s.scientific.toLowerCase()));
  const legacyFromProducts: SpeciesProfile[] = products
    .filter((p) => !covered.has(p.scientific.toLowerCase()))
    .map((p) => ({
      id: `legacy:${p.id}`,
      scientific: p.scientific,
      commonEn: p.common.en,
      commonFr: p.common.fr,
      genus: p.genus,
      experience: p.experience,
      type: p.type,
      temperament: p.temperament,
      hue: p.hue,
      accent: p.accent,
      image: p.image ?? null,
      adultSizeEn: p.adultSize.en,
      adultSizeFr: p.adultSize.fr,
      growthEn: p.growth.en,
      growthFr: p.growth.fr,
      originEn: p.origin.en,
      originFr: p.origin.fr,
      lifespanEn: p.lifespan.en,
      lifespanFr: p.lifespan.fr,
      humidity: p.humidity,
      temperature: p.temperature,
      enclosureEn: p.enclosure.en,
      enclosureFr: p.enclosure.fr,
      dietEn: p.diet.en,
      dietFr: p.diet.fr,
      descriptionEn: p.description.en,
      descriptionFr: p.description.fr,
      careGuide: p.careGuide ?? null,
    }));
  return [...speciesList, ...legacyFromProducts];
}

function hasStoreListing(speciesId: string, speciesList: SpeciesProfile[], products: Product[]): boolean {
  if (speciesId.startsWith("legacy:")) return true;
  const species = speciesList.find((s) => s.id === speciesId);
  if (!species) return false;
  return products.some((p) => p.scientific.toLowerCase() === species.scientific.toLowerCase());
}

function speciesDefaultImage(
  speciesId: string,
  speciesList: SpeciesProfile[],
  products: Product[],
): string | null {
  if (speciesId.startsWith("legacy:")) {
    return products.find((p) => p.id === speciesId.slice("legacy:".length))?.image ?? null;
  }
  const species = speciesList.find((s) => s.id === speciesId);
  if (!species) return null;
  if (species.image) return species.image;
  const product = products.find((p) => p.scientific.toLowerCase() === species.scientific.toLowerCase());
  return product?.image ?? null;
}

function specimenLocationLabel(s: SpecimenView): string {
  return s.locationType === "warehouse" ? "Warehouse" : (s.locationName ?? "Distributor");
}

export default function InventoryHub({
  specimens,
  products,
  speciesList,
  distributors,
  libraryImages,
  locale,
  initialTab = "list",
}: {
  specimens: SpecimenView[];
  products: Product[];
  speciesList: SpeciesProfile[];
  distributors: DistributorView[];
  libraryImages: LibraryImage[];
  locale: Locale;
  initialTab?: Tab;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterQ, setFilterQ] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [sortKey, setSortKey] = useState<SpecimenSortKey>("purchased");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const onSort = (key: string) => {
    const [k, d] = toggleSortKey(key, sortKey, sortDir);
    setSortKey(k as SpecimenSortKey);
    setSortDir(d);
  };

  const filtered = useMemo(() => {
    const matched = specimens.filter((s) => {
      if (filterStatus && s.status !== filterStatus) return false;
      if (filterLocation) {
        if (filterLocation === "warehouse" && s.locationType !== "warehouse") return false;
        if (filterLocation === "consignment" && s.locationType !== "consignment") return false;
        if (filterLocation !== "warehouse" && filterLocation !== "consignment" && s.locationId !== filterLocation) {
          return false;
        }
      }
      if (filterQ) {
        const q = filterQ.toLowerCase();
        const hay = `${s.tarantulAppId ?? ""} ${s.productName} ${s.scientific} ${s.commonName} ${s.notes}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return [...matched].sort((a, b) => {
      switch (sortKey) {
        case "tarantulAppId":
          return cmpStr(a.tarantulAppId ?? "", b.tarantulAppId ?? "", sortDir);
        case "species":
          return cmpStr(a.productName, b.productName, sortDir);
        case "size":
          return cmpNum(a.sizeCm, b.sizeCm, sortDir);
        case "status":
          return cmpStr(a.status, b.status, sortDir);
        case "location":
          return cmpStr(specimenLocationLabel(a), specimenLocationLabel(b), sortDir);
        case "cost":
          return cmpNum(a.unitCost, b.unitCost, sortDir);
        case "price":
          return cmpNum(a.price, b.price, sortDir);
        case "purchased":
          return cmpStr(a.purchasedAt, b.purchasedAt, sortDir);
        default:
          return 0;
      }
    });
  }, [specimens, filterStatus, filterQ, filterLocation, sortKey, sortDir]);

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
            Receive stock here — each spider gets a storefront listing automatically. Finance tracks cost and sales
            from these specimens.
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
            <select value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)} className="input w-auto">
              <option value="">All locations</option>
              <option value="warehouse">Warehouse</option>
              <option value="consignment">Any partner store</option>
              {distributors.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <span className="self-center text-sm text-muted">
              {filtered.length} of {specimens.length}
            </span>
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
                  <SortableTh
                    label="TarantulApp ID"
                    sortKey="tarantulAppId"
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={onSort}
                    className="px-3 py-3"
                  />
                  <SortableTh
                    label="Species"
                    sortKey="species"
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={onSort}
                    className="px-3 py-3"
                  />
                  <SortableTh
                    label="Size"
                    sortKey="size"
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={onSort}
                    className="px-3 py-3"
                  />
                  <SortableTh
                    label="Status"
                    sortKey="status"
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={onSort}
                    className="px-3 py-3"
                  />
                  <SortableTh
                    label="Location"
                    sortKey="location"
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={onSort}
                    className="px-3 py-3"
                  />
                  <SortableTh
                    label="Cost"
                    sortKey="cost"
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={onSort}
                    className="px-3 py-3"
                  />
                  <SortableTh
                    label="Price"
                    sortKey="price"
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={onSort}
                    className="px-3 py-3"
                  />
                  <SortableTh
                    label="Purchased"
                    sortKey="purchased"
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={onSort}
                    className="px-3 py-3"
                  />
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
          specimens={specimens}
          products={products}
          speciesList={speciesList}
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
  const [settlementPrice, setSettlementPrice] = useState(s.settlementPrice != null ? String(s.settlementPrice) : "");
  const [msrp, setMsrp] = useState(s.msrp != null ? String(s.msrp) : "");
  const [locationType, setLocationType] = useState(s.locationType);
  const [locationId, setLocationId] = useState(s.locationId ?? "");
  const [notes, setNotes] = useState(s.notes ?? "");

  const locked = s.status === "sold" || s.status === "written_off" || s.status === "allocated";
  const location =
    s.locationType === "warehouse"
      ? "Warehouse"
      : s.locationType === "transit"
        ? `In transit${s.locationName ? ` → ${s.locationName}` : ""}`
        : (s.locationName ?? "Partner store");

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
          <p className="font-medium italic text-cream">{s.productName}</p>
          {s.commonName && <p className="text-xs text-muted">{s.commonName}</p>}
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
          <div className="flex gap-1">
            {!locked && (
              <button
                type="button"
                onClick={() => setEditing((v) => !v)}
                className="rounded border border-line px-2 py-1 text-xs text-cream hover:bg-ink-soft"
              >
                {editing ? "Close" : "Edit"}
              </button>
            )}
            <Link
              href={localeHref(locale, `/admin/specimens/${s.id}`)}
              className="rounded border border-line px-2 py-1 text-xs text-muted hover:text-gold-bright"
              title="Growth, molts, QR label & movements"
            >
              Details
            </Link>
          </div>
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
                <span>Web price ($)</span>
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
                <span>Settlement ($) <InfoHint text="Owed to MSC when a partner sells this specimen. Internal only." /></span>
                <input
                  name="settlementPrice"
                  type="number"
                  step="0.01"
                  min={0}
                  value={settlementPrice}
                  onChange={(e) => setSettlementPrice(e.target.value)}
                  className="input"
                  placeholder="—"
                />
              </label>
              <label className="field">
                <span>MSRP ($) <InfoHint text="Suggested retail for partners. Shown on the QR label." /></span>
                <input
                  name="msrp"
                  type="number"
                  step="0.01"
                  min={0}
                  value={msrp}
                  onChange={(e) => setMsrp(e.target.value)}
                  className="input"
                  placeholder="—"
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
  distributorPrice: string;
  tarantulAppIds: string;
}

interface SpeciesBlock {
  key: string;
  speciesId: string;
  isNewSpecies: boolean;
  newScientific: string;
  newCommonEn: string;
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

function blankRow(hints?: ReceiveHints): RowState {
  return {
    key: batchUid("row"),
    sizeCm: "",
    sex: "",
    unitCost: hints?.unitCost ?? "",
    price: hints?.price ?? "",
    quantity: "1",
    photoMode: "default",
    photoPreview: null,
    libraryUrl: "",
    fileResetKey: 0,
    locationType: "warehouse",
    locationId: "",
    distributorPrice: "",
    tarantulAppIds: "",
  };
}

function blankBlock(speciesId: string, hints?: ReceiveHints, isNewSpecies = false): SpeciesBlock {
  return {
    key: batchUid("block"),
    speciesId,
    isNewSpecies,
    newScientific: "",
    newCommonEn: "",
    batchCount: "1",
    purchasedAt: new Date().toISOString().slice(0, 10),
    supplier: "",
    notes: "",
    rows: [blankRow(hints)],
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
  specimens,
  products,
  speciesList,
  distributors,
  libraryImages,
  locale,
}: {
  specimens: SpecimenView[];
  products: Product[];
  speciesList: SpeciesProfile[];
  distributors: DistributorView[];
  libraryImages: LibraryImage[];
  locale: Locale;
}) {
  const priceHints = useMemo(
    () => receiveHintsBySpecies(specimens, products, receiveSpeciesOptions(speciesList, products)),
    [specimens, products, speciesList],
  );
  const catalogSpecies = useMemo(
    () => receiveSpeciesOptions(speciesList, products),
    [speciesList, products],
  );
  const [state, action, pending] = useActionState<ActionState, FormData>(receiveBatchAction, {});
  const [blocks, setBlocks] = useState<SpeciesBlock[]>(() => {
    const firstId = catalogSpecies[0]?.id ?? "";
    const isNew = catalogSpecies.length === 0;
    return [blankBlock(firstId, isNew ? undefined : priceHints.get(firstId), isNew)];
  });
  const [libraryPickerRow, setLibraryPickerRow] = useState<string | null>(null);

  const updateBlock = (blockKey: string, patch: Partial<SpeciesBlock>) =>
    setBlocks((prev) => prev.map((b) => (b.key === blockKey ? { ...b, ...patch } : b)));

  const onSpeciesSelect = (blockKey: string, value: string) => {
    if (value === "__new__") {
      setBlocks((prev) =>
        prev.map((b) =>
          b.key === blockKey ? { ...b, isNewSpecies: true, speciesId: "", newScientific: "", newCommonEn: "" } : b,
        ),
      );
      return;
    }
    const hints = priceHints.get(value);
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.key !== blockKey) return b;
        return {
          ...b,
          isNewSpecies: false,
          speciesId: value,
          newScientific: "",
          newCommonEn: "",
          rows: b.rows.map((r) => ({
            ...r,
            price: r.price.trim() === "" ? (hints?.price ?? "") : r.price,
            unitCost: r.unitCost.trim() === "" ? (hints?.unitCost ?? "") : r.unitCost,
          })),
        };
      }),
    );
  };

  const hintKeyForBlock = (block: SpeciesBlock): string | undefined =>
    block.isNewSpecies ? undefined : block.speciesId || undefined;

  const updateRow = (blockKey: string, rowKey: string, patch: Partial<RowState>) =>
    setBlocks((prev) =>
      prev.map((b) =>
        b.key !== blockKey ? b : { ...b, rows: b.rows.map((r) => (r.key === rowKey ? { ...r, ...patch } : r)) },
      ),
    );

  const addRow = (blockKey: string) =>
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.key !== blockKey) return b;
        const key = hintKeyForBlock(b);
        return { ...b, rows: [...b.rows, blankRow(key ? priceHints.get(key) : undefined)] };
      }),
    );

  const removeRow = (blockKey: string, rowKey: string) =>
    setBlocks((prev) =>
      prev.map((b) => (b.key !== blockKey ? b : { ...b, rows: b.rows.filter((r) => r.key !== rowKey) })),
    );

  const generateRows = (blockKey: string) =>
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.key !== blockKey) return b;
        const count = Math.max(1, Math.min(200, Math.round(Number(b.batchCount) || 1)));
        const key = hintKeyForBlock(b);
        const hints = key ? priceHints.get(key) : undefined;
        return { ...b, rows: Array.from({ length: count }, () => blankRow(hints)) };
      }),
    );

  const addBlock = () => {
    const firstId = catalogSpecies[0]?.id ?? "";
    const isNew = catalogSpecies.length === 0;
    setBlocks((prev) => [...prev, blankBlock(firstId, isNew ? undefined : priceHints.get(firstId), isNew)]);
  };
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
            ...(b.isNewSpecies
              ? {
                  newSpecies: {
                    scientific: b.newScientific.trim(),
                    commonEn: b.newCommonEn.trim(),
                  },
                }
              : { speciesId: b.speciesId }),
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
            distributorPrice:
              r.locationType === "consignment" && r.distributorPrice.trim() !== ""
                ? Number(r.distributorPrice) || null
                : undefined,
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
        Pick a species (or add a new one) — the storefront listing is created automatically on receive. Set size,
        sex, cost and store price per row; identical spiders can share one row via quantity. Finance picks up cost
        and margin from these specimens.
      </p>
      <form action={action} className="space-y-5">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="rows" value={rowsJson} />

        {blocks.map((block) => {
          const blockStartIndex = blockStartIndices[block.key];
          const hintKey = hintKeyForBlock(block);
          const hints = hintKey ? priceHints.get(hintKey) : undefined;
          const defaultPhoto = block.isNewSpecies
            ? null
            : speciesDefaultImage(block.speciesId, catalogSpecies, products);
          const listingExists =
            !block.isNewSpecies && block.speciesId
              ? hasStoreListing(block.speciesId, catalogSpecies, products)
              : false;

          return (
            <div key={block.key} className="space-y-4 rounded-2xl border border-line p-4">
              <div className="flex flex-wrap items-end gap-3">
                <label className="field min-w-[220px] flex-1">
                  <span>Species</span>
                  <select
                    value={block.isNewSpecies ? "__new__" : block.speciesId}
                    onChange={(e) => onSpeciesSelect(block.key, e.target.value)}
                    className="input"
                    required={!block.isNewSpecies}
                  >
                    <option value="__new__">+ New species (creates listing)</option>
                    {catalogSpecies.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.scientific}
                        {s.commonEn ? ` — ${s.commonEn}` : ""}
                      </option>
                    ))}
                  </select>
                  {block.isNewSpecies ? (
                    <span className="mt-1 block text-[11px] text-gold-bright">
                      New listing + species profile created when you save.
                    </span>
                  ) : listingExists ? (
                    hints?.price && (
                      <span className="mt-1 block text-[11px] text-muted">
                        Suggested from last receive
                        {hints.unitCost ? ` (cost ${formatPrice(Number(hints.unitCost), locale)}, ` : " ("}
                        price {formatPrice(Number(hints.price), locale)})
                      </span>
                    )
                  ) : (
                    <span className="mt-1 block text-[11px] text-gold-bright">
                      No listing yet — one will be created on receive.
                    </span>
                  )}
                </label>
                {block.isNewSpecies && (
                  <>
                    <label className="field min-w-[180px] flex-1">
                      <span>Scientific name *</span>
                      <input
                        value={block.newScientific}
                        onChange={(e) => updateBlock(block.key, { newScientific: e.target.value })}
                        className="input"
                        placeholder="Brachypelma hamorii"
                        required
                      />
                    </label>
                    <label className="field min-w-[160px] flex-1">
                      <span>Common name (EN)</span>
                      <input
                        value={block.newCommonEn}
                        onChange={(e) => updateBlock(block.key, { newCommonEn: e.target.value })}
                        className="input"
                        placeholder="Mexican Red Knee"
                      />
                    </label>
                  </>
                )}
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
                        : defaultPhoto;
                  const photoCaption =
                    row.photoMode === "upload"
                      ? "New upload for this row."
                      : row.photoMode === "library"
                        ? "Library photo for this row."
                        : defaultPhoto
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
                          <span>Store price ($)</span>
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

                        {row.locationType === "consignment" && (
                          <label className="field w-32">
                            <span className="inline-flex items-center gap-1.5">
                              Dist. price ($)
                              <InfoHint text="Internal only — your wholesale or reminder price at this distributor. Never shown on the website." />
                            </span>
                            <input
                              type="number"
                              step="0.01"
                              min={0}
                              value={row.distributorPrice}
                              onChange={(e) => updateRow(block.key, row.key, { distributorPrice: e.target.value })}
                              className="input"
                              placeholder="Optional"
                            />
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

        {direction === "consignment" && (
          <label className="field">
            <span className="inline-flex items-center gap-1.5">
              Dist. price ($) — internal
              <InfoHint text="Optional reminder/wholesale price for these listings at the distributor. Admin only — not shown on the storefront." />
            </span>
            <input
              name="distributorPrice"
              type="number"
              step="0.01"
              min={0}
              className="input"
              placeholder="Leave blank to keep current"
            />
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

/** What we already stipulated for this specimen — same logic as the walk-in / audit sale flows. */
function suggestedSalePrice(s: SpecimenView, channel: SalesChannel): number {
  if (channel === "distributor") return s.settlementPrice ?? s.msrp ?? s.price;
  return s.price;
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
  const selectionKey = selectedIds.join(",");

  const [salesChannel, setSalesChannel] = useState<SalesChannel>("kijiji");
  const [manualPrice, setManualPrice] = useState("");
  const [priceTouched, setPriceTouched] = useState(false);
  const [prevSelectionKey, setPrevSelectionKey] = useState(selectionKey);

  // New selection — drop any manual edit so the suggested total takes over again.
  // (Adjusting state during render when a prop changes, per React's guidance;
  // no effect needed since this doesn't reach outside React.)
  if (selectionKey !== prevSelectionKey) {
    setPrevSelectionKey(selectionKey);
    setPriceTouched(false);
    setManualPrice("");
  }

  const suggestedTotal = preview.reduce((sum, s) => sum + suggestedSalePrice(s, salesChannel), 0);
  const salePrice = priceTouched ? manualPrice : suggestedTotal > 0 ? suggestedTotal.toFixed(2) : "";
  const distributorPrices = preview.map((s) => suggestedSalePrice(s, "distributor"));
  const unevenDistributorPrices =
    salesChannel === "distributor" && distributorPrices.length > 1 && new Set(distributorPrices).size > 1;

  return (
    <section className="card-glow max-w-2xl rounded-2xl p-5">
      <h2 className="mb-4 font-display text-lg font-semibold text-cream">Register sale (manual)</h2>
      <p className="mb-4 text-sm text-bone">
        For Kijiji, ferias, ventas en distribuidor, etc. Select specimens in the list tab ({selectedIds.length}{" "}
        selected). Revenue and margin show up in{" "}
        <Link href={localeHref(locale, "/admin/finance")} className="text-gold-bright hover:underline">
          Finance
        </Link>
        .
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
          <input
            name="salePrice"
            type="number"
            step="0.01"
            min={0}
            className="input"
            required
            value={salePrice}
            onChange={(e) => {
              setPriceTouched(true);
              setManualPrice(e.target.value);
            }}
          />
          <span className="text-xs text-muted">
            {salesChannel === "distributor"
              ? "Prefilled from each specimen's stipulated settlement price / MSRP — adjust if the partner charged differently."
              : "Prefilled from the listed price."}{" "}
            Split evenly if multiple specimens selected.
          </span>
          {unevenDistributorPrices && (
            <span className="text-xs text-gold-bright">
              These specimens have different stipulated prices — an even split across all of them won&rsquo;t
              match each one&rsquo;s settlement price. Consider recording them one at a time, or via the store
              audit / walk-in sale flow instead.
            </span>
          )}
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="field">
            <span>Sales channel</span>
            <select
              name="salesChannel"
              className="input"
              value={salesChannel}
              onChange={(e) => setSalesChannel(e.target.value as SalesChannel)}
            >
              {SALES_CHANNELS.map((c) => (
                <option key={c} value={c}>{CHANNEL_LABELS[c]}</option>
              ))}
            </select>
            {salesChannel === "distributor" && preview.some((s) => s.locationType !== "consignment") && (
              <span className="text-xs text-danger">
                At least one selected specimen isn&rsquo;t at a partner store — transfer it to a distributor
                location first, or this will be rejected.
              </span>
            )}
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

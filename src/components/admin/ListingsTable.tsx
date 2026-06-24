"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { deleteProductAction, updateDistributorPriceAction, type ActionState } from "@/app/[locale]/admin/actions";
import type { Locale } from "@/i18n/config";
import { formatPrice } from "@/lib/format";
import { localeHref } from "@/lib/href";
import { productDisplaySubtitle, productDisplayTitle } from "@/lib/product-display";
import { basePrice, distributorStockTotal, t, warehouseStock, type Product } from "@/lib/types";
import SortableTh, { cmpNum, cmpStr, toggleSortKey, type SortDir } from "./SortableTh";

type ChannelFilter = "" | "pickup" | "distributor" | "warehouse";
type StockFilter = "" | "in" | "out";

type ListingSortKey = "species" | "channels" | "warehouse" | "distributors";

function channelBadges(p: Product) {
  const badges: string[] = [];
  if (p.availableAtPickup !== false) badges.push("Pickup");
  if (p.availableAtDistributor) badges.push("Distributor");
  if (badges.length === 0) badges.push("Warehouse only");
  return badges;
}

function channelSortLabel(p: Product): string {
  return channelBadges(p).join(", ");
}

function matchesChannel(p: Product, filter: ChannelFilter): boolean {
  if (!filter) return true;
  if (filter === "pickup") return p.availableAtPickup !== false;
  if (filter === "distributor") return Boolean(p.availableAtDistributor);
  return p.availableAtPickup === false && !p.availableAtDistributor;
}

type DistLine = {
  distributorId: string;
  name: string;
  stock: number;
  distributorPrice?: number;
};

function distributorBreakdown(p: Product, nameById: Map<string, string>): { total: number; lines: DistLine[] } {
  if (!p.availableAtDistributor) return { total: 0, lines: [] };
  const lines = (p.distributorStocks ?? [])
    .filter((s) => s.stock > 0)
    .map((s) => ({
      distributorId: s.distributorId,
      name: nameById.get(s.distributorId) ?? s.distributorId,
      stock: s.stock,
      distributorPrice: s.distributorPrice,
    }));
  return { total: distributorStockTotal(p), lines };
}

function DistributorStockLine({
  productId,
  line,
  locale,
  editable,
}: {
  productId: string;
  line: DistLine;
  locale: Locale;
  editable: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(line.distributorPrice != null ? String(line.distributorPrice) : "");
  const [state, action, pending] = useActionState<ActionState, FormData>(updateDistributorPriceAction, {});

  if (!editable) {
    return (
      <li>
        {line.name}: {line.stock}
        {line.distributorPrice != null && (
          <span className="text-muted"> · dist. {formatPrice(line.distributorPrice, locale)}</span>
        )}
      </li>
    );
  }

  if (editing) {
    return (
      <li className="flex flex-wrap items-center gap-1">
        <span>{line.name}: {line.stock}</span>
        <form
          action={action}
          className="inline-flex items-center gap-1"
          onSubmit={() => setEditing(false)}
        >
          <input type="hidden" name="productId" value={productId} />
          <input type="hidden" name="locationId" value={line.distributorId} />
          <span className="text-muted">dist.</span>
          <input
            name="distributorPrice"
            type="number"
            step="0.01"
            min={0}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="0.00"
            className="input w-20 py-0.5 text-xs"
            autoFocus
          />
          <button type="submit" disabled={pending} className="text-xs text-gold-bright hover:underline">
            {pending ? "…" : "Save"}
          </button>
          <button type="button" onClick={() => setEditing(false)} className="text-xs text-muted">
            ×
          </button>
        </form>
        {state.error && <span className="text-xs text-danger">{state.error}</span>}
      </li>
    );
  }

  return (
    <li>
      {line.name}: {line.stock}
      {line.distributorPrice != null ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-muted hover:text-gold-bright"
          title="Internal distributor price — click to edit"
        >
          {" "}
          · dist. {formatPrice(line.distributorPrice, locale)}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="ml-1 text-xs italic text-muted hover:text-gold-bright"
          title="Set internal distributor price"
        >
          + dist. price
        </button>
      )}
    </li>
  );
}

export default function ListingsTable({
  products,
  distributorNames,
  locale,
  hasDatabase,
}: {
  products: Product[];
  distributorNames: { id: string; name: string }[];
  locale: Locale;
  hasDatabase: boolean;
}) {
  const [filterQ, setFilterQ] = useState("");
  const [filterChannel, setFilterChannel] = useState<ChannelFilter>("");
  const [filterStock, setFilterStock] = useState<StockFilter>("");
  const [sortKey, setSortKey] = useState<ListingSortKey>("species");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const nameById = useMemo(() => new Map(distributorNames.map((d) => [d.id, d.name])), [distributorNames]);

  const onSort = (key: string) => {
    const [k, d] = toggleSortKey(key, sortKey, sortDir);
    setSortKey(k as ListingSortKey);
    setSortDir(d);
  };

  const rows = useMemo(() => {
    const q = filterQ.trim().toLowerCase();
    const filtered = products.filter((p) => {
      if (q) {
        const hay = `${t(p.common, locale)} ${p.scientific}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (!matchesChannel(p, filterChannel)) return false;
      const wh = warehouseStock(p);
      if (filterStock === "in" && wh === 0) return false;
      if (filterStock === "out" && wh > 0) return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "species":
          return cmpStr(a.scientific, b.scientific, sortDir);
        case "channels":
          return cmpStr(channelSortLabel(a), channelSortLabel(b), sortDir);
        case "warehouse":
          return cmpNum(warehouseStock(a), warehouseStock(b), sortDir);
        case "distributors":
          return cmpNum(distributorStockTotal(a), distributorStockTotal(b), sortDir);
        default:
          return 0;
      }
    });
  }, [products, filterQ, filterChannel, filterStock, sortKey, sortDir, locale]);

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-3">
        <input
          value={filterQ}
          onChange={(e) => setFilterQ(e.target.value)}
          placeholder="Search species…"
          className="input min-w-[200px] flex-1"
        />
        <select
          value={filterChannel}
          onChange={(e) => setFilterChannel(e.target.value as ChannelFilter)}
          className="input w-auto"
        >
          <option value="">All channels</option>
          <option value="pickup">Pickup</option>
          <option value="distributor">Distributor</option>
          <option value="warehouse">Warehouse only</option>
        </select>
        <select
          value={filterStock}
          onChange={(e) => setFilterStock(e.target.value as StockFilter)}
          className="input w-auto"
        >
          <option value="">All stock levels</option>
          <option value="in">In stock (warehouse)</option>
          <option value="out">Out of stock (warehouse)</option>
        </select>
        <span className="self-center text-sm text-muted">
          {rows.length} of {products.length}
        </span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink-soft text-xs uppercase tracking-wide text-gold-deep">
            <tr>
              <SortableTh
                label="Species"
                sortKey="species"
                activeKey={sortKey}
                dir={sortDir}
                onSort={onSort}
                className="px-4 py-3"
              />
              <SortableTh
                label="Channels"
                sortKey="channels"
                activeKey={sortKey}
                dir={sortDir}
                onSort={onSort}
                className="px-4 py-3"
              />
              <SortableTh
                label="Warehouse (live)"
                sortKey="warehouse"
                activeKey={sortKey}
                dir={sortDir}
                onSort={onSort}
                className="px-4 py-3"
              />
              <SortableTh
                label="At distributors"
                sortKey="distributors"
                activeKey={sortKey}
                dir={sortDir}
                onSort={onSort}
                className="px-4 py-3"
              />
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((p) => {
              const wh = warehouseStock(p);
              const dist = distributorBreakdown(p, nameById);
              return (
                <tr key={p.id} className="text-bone">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.image || "/images/species/_placeholder.png"}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-lg border border-line object-cover"
                        style={{ background: `hsl(${p.hue} 30% 16%)` }}
                      />
                      <div className="min-w-0">
                        <p className="truncate font-medium italic text-cream">{productDisplayTitle(p)}</p>
                        {productDisplaySubtitle(p, locale) && (
                          <p className="truncate text-xs text-muted">{productDisplaySubtitle(p, locale)}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {channelBadges(p).map((b) => (
                        <span
                          key={b}
                          className="rounded-full border border-line px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted"
                        >
                          {b}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className={`px-4 py-3 ${wh === 0 ? "text-muted" : "text-cream"}`}>
                    <p className={`font-medium ${wh === 0 ? "" : wh <= 5 ? "text-gold-deep" : ""}`}>{wh}</p>
                    {wh > 0 && (
                      <p className="mt-0.5 text-xs text-muted">from {formatPrice(basePrice(p), locale)}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {!p.availableAtDistributor ? (
                      <span className="text-muted">—</span>
                    ) : dist.lines.length > 0 ? (
                      <div>
                        <p className="font-medium text-cream">{dist.total} total</p>
                        <ul className="mt-1 space-y-0.5 text-xs text-bone">
                          {dist.lines.map((line) => (
                            <DistributorStockLine
                              key={line.distributorId}
                              productId={p.id}
                              line={line}
                              locale={locale}
                              editable={hasDatabase}
                            />
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <span className="text-muted">0 — none in stock</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {hasDatabase ? (
                        <>
                          <Link
                            href={localeHref(locale, `/admin/products/${p.id}`)}
                            className="rounded-md border border-line px-3 py-1.5 text-xs text-cream hover:border-gold hover:text-gold-bright"
                          >
                            Edit
                          </Link>
                          <form action={deleteProductAction}>
                            <input type="hidden" name="id" value={p.id} />
                            <input type="hidden" name="locale" value={locale} />
                            <button className="rounded-md border border-line px-3 py-1.5 text-xs text-muted hover:border-danger hover:text-danger">
                              Delete
                            </button>
                          </form>
                        </>
                      ) : (
                        <span className="text-xs text-muted">read-only</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  No listings match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

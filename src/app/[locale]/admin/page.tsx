import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { getAllProducts } from "@/lib/data/products";
import { getDistributorLocations } from "@/lib/data/locations";
import { hasDatabase } from "@/lib/db";
import { t, basePrice, warehouseStock, distributorStockTotal, type Product } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { localeHref } from "@/lib/href";
import { deleteProductAction } from "./actions";

function channelBadges(p: Product) {
  const badges: string[] = [];
  if (p.availableAtPickup !== false) badges.push("Pickup");
  if (p.availableAtDistributor) badges.push("Distributor");
  if (badges.length === 0) badges.push("Warehouse only");
  return badges;
}

function distributorBreakdown(p: Product, nameById: Map<string, string>): { total: number; lines: string[] } {
  if (!p.availableAtDistributor) return { total: 0, lines: [] };
  const stocks = p.distributorStocks ?? [];
  const lines = stocks
    .filter((s) => s.stock > 0)
    .map((s) => `${nameById.get(s.distributorId) ?? s.distributorId}: ${s.stock}`);
  return { total: distributorStockTotal(p), lines };
}

export default async function AdminProductsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const [products, distributorLocs] = await Promise.all([getAllProducts(), getDistributorLocations()]);
  const nameById = new Map(distributorLocs.map((d) => [d.id, d.name]));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-cream">Store listings</h1>
          <p className="text-sm text-muted">
            {products.length} listings — stock and prices come from{" "}
            <Link href={localeHref(loc, "/admin/inventory")} className="text-gold-bright hover:underline">
              Inventory
            </Link>
            . Receive stock there to create listings automatically.
          </p>
        </div>
        {hasDatabase && (
          <div className="flex flex-wrap gap-2">
            <Link href={localeHref(loc, "/admin/inventory?tab=receive")} className="btn btn-gold">
              + Receive stock
            </Link>
            <Link href={localeHref(loc, "/admin/products/new")} className="btn btn-ghost text-sm">
              Edit listing details
            </Link>
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink-soft text-xs uppercase tracking-wide text-gold-deep">
            <tr>
              <th className="px-4 py-3">Species</th>
              <th className="px-4 py-3">Channels</th>
              <th className="px-4 py-3">Warehouse (live)</th>
              <th className="px-4 py-3">At distributors</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {products.map((p) => {
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
                        <p className="truncate font-medium text-cream">{t(p.common, loc)}</p>
                        <p className="truncate text-xs italic text-muted">{p.scientific}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {channelBadges(p).map((b) => (
                        <span key={b} className="rounded-full border border-line px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted">
                          {b}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className={`px-4 py-3 ${wh === 0 ? "text-muted" : "text-cream"}`}>
                    <p className={`font-medium ${wh === 0 ? "" : wh <= 5 ? "text-gold-deep" : ""}`}>{wh}</p>
                    {wh > 0 && (
                      <p className="mt-0.5 text-xs text-muted">from {formatPrice(basePrice(p), loc)}</p>
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
                            <li key={line}>{line}</li>
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
                          <Link href={localeHref(loc, `/admin/products/${p.id}`)} className="rounded-md border border-line px-3 py-1.5 text-xs text-cream hover:border-gold hover:text-gold-bright">
                            Edit
                          </Link>
                          <form action={deleteProductAction}>
                            <input type="hidden" name="id" value={p.id} />
                            <input type="hidden" name="locale" value={loc} />
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
          </tbody>
        </table>
      </div>

      {!hasDatabase && (
        <p className="mt-4 text-sm text-muted">
          Connect a database (see <code className="text-cream">SETUP_DATABASE.md</code>) to add, edit and delete products.
        </p>
      )}
    </div>
  );
}

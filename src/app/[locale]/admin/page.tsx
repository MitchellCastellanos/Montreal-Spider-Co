import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { getAllProducts } from "@/lib/data/products";
import { hasDatabase } from "@/lib/db";
import { t, basePrice, warehouseStock, distributorStockTotal } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { localeHref } from "@/lib/href";
import { deleteProductAction } from "./actions";

function channelBadges(p: Awaited<ReturnType<typeof getAllProducts>>[number]) {
  const badges: string[] = [];
  if (p.availableAtPickup !== false) badges.push("Pickup");
  if (p.availableAtDistributor) badges.push("Distributor");
  if (badges.length === 0) badges.push("Warehouse only");
  return badges;
}

export default async function AdminProductsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const products = await getAllProducts();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-cream">Products & inventory</h1>
          <p className="text-sm text-muted">{products.length} in catalog — warehouse and distributor stock</p>
        </div>
        {hasDatabase && (
          <Link href={localeHref(loc, "/admin/products/new")} className="btn btn-gold">
            + New product
          </Link>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink-soft text-xs uppercase tracking-wide text-gold-deep">
            <tr>
              <th className="px-4 py-3">Species</th>
              <th className="px-4 py-3">Channels</th>
              <th className="px-4 py-3">Warehouse</th>
              <th className="px-4 py-3">Distributors</th>
              <th className="px-4 py-3">From</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {products.map((p) => {
              const wh = warehouseStock(p);
              const dist = distributorStockTotal(p);
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
                <td className={`px-4 py-3 font-medium ${wh === 0 ? "text-muted" : wh <= 5 ? "text-gold-deep" : "text-cream"}`}>
                  {wh}
                </td>
                <td className={`px-4 py-3 font-medium ${!p.availableAtDistributor ? "text-muted" : dist === 0 ? "text-muted" : "text-cream"}`}>
                  {p.availableAtDistributor ? dist : "—"}
                </td>
                <td className="px-4 py-3 text-gold-bright">{formatPrice(basePrice(p), loc)}</td>
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

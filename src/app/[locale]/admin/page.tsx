import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { getAllProducts } from "@/lib/data/products";
import { getDistributorLocations } from "@/lib/data/locations";
import { syncAggregateStock } from "@/lib/data/specimens";
import { hasDatabase } from "@/lib/db";
import { localeHref } from "@/lib/href";
import ListingsTable from "@/components/admin/ListingsTable";

export default async function AdminProductsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";

  if (hasDatabase) {
    await syncAggregateStock();
  }

  const [products, distributorLocs] = await Promise.all([getAllProducts(), getDistributorLocations()]);

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

      <ListingsTable
        products={products}
        distributorNames={distributorLocs.map((d) => ({ id: d.id, name: d.name }))}
        locale={loc}
        hasDatabase={hasDatabase}
      />

      {!hasDatabase && (
        <p className="mt-4 text-sm text-muted">
          Connect a database (see <code className="text-cream">SETUP_DATABASE.md</code>) to add, edit and delete products.
        </p>
      )}
    </div>
  );
}

import { isLocale, type Locale } from "@/i18n/config";
import { getAllProducts } from "@/lib/data/products";
import { getDistributorLocations } from "@/lib/data/locations";
import { listSpecimens } from "@/lib/data/specimens";
import { hasDatabase } from "@/lib/db";
import InventoryHub from "@/components/admin/InventoryHub";

export default async function AdminInventoryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";

  if (!hasDatabase) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold text-cream">Specimen inventory</h1>
        <p className="mt-4 text-sm text-muted">Connect a database to manage specimens.</p>
      </div>
    );
  }

  const [specimens, products, distributors] = await Promise.all([
    listSpecimens(),
    getAllProducts(),
    getDistributorLocations(),
  ]);

  return (
    <InventoryHub
      specimens={specimens}
      products={products}
      distributors={distributors}
      locale={loc}
    />
  );
}

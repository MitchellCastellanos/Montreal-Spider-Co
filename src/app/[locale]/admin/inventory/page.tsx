import { isLocale, type Locale } from "@/i18n/config";
import { getAllProducts } from "@/lib/data/products";
import { getDistributorLocations } from "@/lib/data/locations";
import { listSpecimens } from "@/lib/data/specimens";
import { listLibraryImages } from "@/lib/data/species-library";
import { listSpecies } from "@/lib/data/species";
import { hasDatabase } from "@/lib/db";
import InventoryHub from "@/components/admin/InventoryHub";
import { type InventoryTab } from "@/lib/inventory-tab";

const INVENTORY_TABS: InventoryTab[] = ["list", "receive", "transfer", "sell", "writeoff"];

function parseInventoryTab(tab?: string): InventoryTab {
  return INVENTORY_TABS.includes(tab as InventoryTab) ? (tab as InventoryTab) : "list";
}

export default async function AdminInventoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { locale } = await params;
  const { tab } = await searchParams;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const initialTab = parseInventoryTab(tab);

  if (!hasDatabase) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold text-cream">Specimen inventory</h1>
        <p className="mt-4 text-sm text-muted">Connect a database to manage specimens.</p>
      </div>
    );
  }

  const [specimens, products, speciesList, distributors, libraryImages] = await Promise.all([
    listSpecimens(),
    getAllProducts(),
    listSpecies(),
    getDistributorLocations(),
    listLibraryImages(),
  ]);

  return (
    <InventoryHub
      specimens={specimens}
      products={products}
      speciesList={speciesList}
      distributors={distributors}
      libraryImages={libraryImages}
      locale={loc}
      initialTab={initialTab}
    />
  );
}

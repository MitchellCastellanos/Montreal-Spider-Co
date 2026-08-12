import { isLocale, type Locale } from "@/i18n/config";
import { hasDatabase } from "@/lib/db";
import { getDistributorLocations } from "@/lib/data/locations";
import { getDistributorInventoryReport } from "@/lib/data/distributor-report";
import DistributorInventoryHub from "@/components/admin/DistributorInventoryHub";

export const dynamic = "force-dynamic";

export default async function AdminDistributorsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";

  if (!hasDatabase) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold text-cream">Distributor inventory</h1>
        <p className="mt-4 text-sm text-muted">Connect a database to view distributor inventory.</p>
      </div>
    );
  }

  const locations = await getDistributorLocations();
  const reports = await Promise.all(locations.map((l) => getDistributorInventoryReport(l.id)));

  return <DistributorInventoryHub reports={reports} locale={loc} />;
}

import { isLocale, type Locale } from "@/i18n/config";
import { hasDatabase } from "@/lib/db";
import { listProposals } from "@/lib/data/restock";
import { getDistributorLocations } from "@/lib/data/locations";
import { listSpecimens } from "@/lib/data/specimens";
import RestockHub from "@/components/admin/RestockHub";

export const dynamic = "force-dynamic";

export default async function AdminRestockPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";

  if (!hasDatabase) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold text-cream">Restock proposals</h1>
        <p className="mt-4 text-sm text-muted">Connect a database to manage restocks.</p>
      </div>
    );
  }

  const [proposals, locations, warehouse] = await Promise.all([
    listProposals(),
    getDistributorLocations(),
    listSpecimens({ status: "available", locationType: "warehouse" }),
  ]);

  return (
    <RestockHub
      proposals={proposals.map((p) => ({
        id: p.id,
        locationName: p.locationName,
        status: p.status,
        reason: p.reason,
        preferredDate: p.preferredDate,
        partnerNotes: p.partnerNotes,
        createdAt: p.createdAt,
        items: p.items,
      }))}
      locations={locations.filter((l) => l.active).map((l) => ({ id: l.id, name: l.name }))}
      warehouseSpecimens={warehouse.map((s) => ({
        id: s.id,
        scientific: s.scientific,
        sizeLabel: s.sizeLabel,
        sex: s.sex,
        price: s.price,
      }))}
      locale={loc}
    />
  );
}

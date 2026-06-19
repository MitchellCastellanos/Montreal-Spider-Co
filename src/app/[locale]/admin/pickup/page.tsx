import { isLocale, type Locale } from "@/i18n/config";
import { getAllLocations } from "@/lib/data/locations";
import { hasDatabase } from "@/lib/db";
import LocationsEditor from "@/components/admin/LocationsEditor";

export default async function AdminLocationsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const locations = await getAllLocations();

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-cream">Locations</h1>
        <p className="text-sm text-muted">
          {locations.length} location(s) — mark each as pickup point, authorized distributor, or both. Edit inline and save all at once.
        </p>
      </div>

      {hasDatabase ? (
        <LocationsEditor locations={locations} locale={loc} />
      ) : (
        <p className="text-sm text-muted">
          Connect a database (see <code className="text-cream">SETUP_DATABASE.md</code>) to manage locations.
        </p>
      )}
    </div>
  );
}

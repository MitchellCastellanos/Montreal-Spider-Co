import { Suspense } from "react";
import { isLocale, type Locale } from "@/i18n/config";
import { getAllPickupPoints } from "@/lib/data/locations";
import { getAllDistributors } from "@/lib/data/distributors";
import { hasDatabase } from "@/lib/db";
import LocationsHub from "@/components/admin/LocationsHub";

export default async function AdminPickupPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const [points, distributors] = await Promise.all([getAllPickupPoints(), getAllDistributors()]);

  if (!hasDatabase) {
    return (
      <div>
        <h1 className="mb-4 font-display text-2xl font-bold text-cream">Locations</h1>
        <p className="text-sm text-muted">
          Connect a database (see <code className="text-cream">SETUP_DATABASE.md</code>) to manage pickup points and distributors.
        </p>
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="text-muted">Loading…</div>}>
      <LocationsHub pickups={points} distributors={distributors} locale={loc} />
    </Suspense>
  );
}

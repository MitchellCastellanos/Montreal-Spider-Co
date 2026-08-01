import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { hasDatabase, prisma } from "@/lib/db";
import {
  fetchTerrariumLabels,
  terrariumLabelQrDataUrl,
} from "@/lib/data/terrarium-labels";
import { localeHref } from "@/lib/href";
import TerrariumLabelsPicker from "@/components/admin/TerrariumLabelsPicker";
import "@/components/admin/specimen-labels.css";

export const dynamic = "force-dynamic";

/**
 * Printable terrarium labels (6 cm × 4 cm). Each label carries a compact QR that
 * opens the specimen hub for partner scans, audits and issue reports.
 */
export default async function AdminLabelsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ location?: string }>;
}) {
  const { locale } = await params;
  const { location: locationFilter } = await searchParams;
  const loc: Locale = isLocale(locale) ? locale : "en";

  if (!hasDatabase || !prisma) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold text-cream">Terrarium labels</h1>
        <p className="mt-4 text-sm text-muted">Connect a database to print labels.</p>
      </div>
    );
  }

  const locations = await prisma.storeLocation.findMany({
    where: { isDistributor: true },
    orderBy: { position: "asc" },
  });

  const records = await fetchTerrariumLabels({ locationFilter });

  const labels = await Promise.all(
    records.map(async (record) => ({
      ...record,
      qrDataUrl: await terrariumLabelQrDataUrl(record.qrUrl),
    })),
  );

  return (
    <div>
      <div className="print:hidden">
        <h1 className="font-display text-2xl font-bold text-cream">Terrarium labels</h1>
        <p className="mt-1 text-sm text-muted">
          <strong className="text-bone">6 cm wide × 4 cm tall</strong> labels for enclosure glass.
          Select the specimens you need, then download PDF or print.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={localeHref(loc, "/admin/labels")}
            className={`rounded-lg px-3 py-1.5 text-xs ${!locationFilter ? "bg-gold/15 text-gold-bright ring-1 ring-gold/40" : "border border-line text-bone"}`}
          >
            All
          </Link>
          <Link
            href={localeHref(loc, "/admin/labels?location=warehouse")}
            className={`rounded-lg px-3 py-1.5 text-xs ${locationFilter === "warehouse" ? "bg-gold/15 text-gold-bright ring-1 ring-gold/40" : "border border-line text-bone"}`}
          >
            Warehouse
          </Link>
          {locations.map((l) => (
            <Link
              key={l.id}
              href={localeHref(loc, `/admin/labels?location=${l.id}`)}
              className={`rounded-lg px-3 py-1.5 text-xs ${locationFilter === l.id ? "bg-gold/15 text-gold-bright ring-1 ring-gold/40" : "border border-line text-bone"}`}
            >
              {l.name}
            </Link>
          ))}
        </div>
      </div>

      <TerrariumLabelsPicker labels={labels} locationFilter={locationFilter} />
    </div>
  );
}

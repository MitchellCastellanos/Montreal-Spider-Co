import QRCode from "qrcode";
import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { hasDatabase, prisma } from "@/lib/db";
import { SITE } from "@/lib/site";
import { formatCmAsInches } from "@/lib/size-inches";
import { localeHref } from "@/lib/href";
import SpecimenTerrariumLabel from "@/components/admin/SpecimenTerrariumLabel";
import "@/components/admin/specimen-labels.css";

export const dynamic = "force-dynamic";

const QR_OPTS = {
  margin: 0,
  width: 160,
  errorCorrectionLevel: "H" as const,
  color: { dark: "#0a0a0c", light: "#ffffff" },
};

/**
 * Printable terrarium labels (60 × 40 mm). Each label carries a compact QR that
 * opens the specimen hub — partner stock embeds the store key so walk-in sales
 * work from the terrarium without any partner account.
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

  const specimens = await prisma.specimen.findMany({
    where: {
      status: { in: ["available", "consignment", "allocated"] },
      ...(locationFilter === "warehouse"
        ? { locationType: "warehouse" }
        : locationFilter
          ? { locationId: locationFilter }
          : {}),
    },
    include: {
      product: {
        select: {
          scientific: true,
          commonEn: true,
          type: true,
          temperament: true,
          experience: true,
          humidity: true,
          temperature: true,
          originEn: true,
        },
      },
      location: { select: { name: true } },
    },
    orderBy: { purchasedAt: "asc" },
    take: 200,
  });

  const labels = await Promise.all(
    specimens.map(async (s) => {
      const url = `${SITE.url}/q/${s.qrToken}`;
      const qrDataUrl = await QRCode.toDataURL(url, QR_OPTS);
      return {
        id: s.id,
        scientific: s.product.scientific,
        commonName: s.product.commonEn,
        sizeLabel: formatCmAsInches(s.sizeCm),
        sex: s.sex,
        type: s.product.type,
        temperament: s.product.temperament,
        experience: s.product.experience,
        humidity: s.product.humidity,
        temperature: s.product.temperature,
        originEn: s.product.originEn,
        tarantulAppId: s.tarantulAppId,
        qrDataUrl,
      };
    }),
  );

  return (
    <div>
      <div className="print:hidden">
        <h1 className="font-display text-2xl font-bold text-cream">Terrarium labels</h1>
        <p className="mt-1 text-sm text-muted">
          60 × 40 mm labels for enclosure glass. Stick one per terrarium — partners scan the QR
          to register walk-in sales, run audits or report issues.
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
        <p className="mt-3 text-xs text-muted">
          {labels.length} label(s) · Print at <strong className="text-bone">100% scale</strong> (Ctrl/Cmd+P).
          White vinyl recommended for humid terrariums.
        </p>
      </div>

      <div className="labels-print-sheet mt-6 print:mt-0">
        {labels.map((label) => (
          <SpecimenTerrariumLabel key={label.id} {...label} />
        ))}
      </div>

      {labels.length === 0 && (
        <p className="mt-6 text-sm text-muted print:hidden">No specimens for this filter.</p>
      )}
    </div>
  );
}

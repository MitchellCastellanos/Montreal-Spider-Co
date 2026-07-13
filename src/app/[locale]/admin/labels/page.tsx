import QRCode from "qrcode";
import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { hasDatabase, prisma } from "@/lib/db";
import { SITE } from "@/lib/site";
import { formatCmAsInches } from "@/lib/size-inches";
import { localeHref } from "@/lib/href";

export const dynamic = "force-dynamic";

/**
 * Printable specimen QR labels. Scanning opens the specimen QR hub; labels for
 * partner stock embed the store's partner key so the walk-in sale action works
 * without any partner account.
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
        <h1 className="font-display text-2xl font-bold text-cream">QR labels</h1>
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
      product: { select: { scientific: true, commonEn: true } },
      location: { select: { name: true, partnerToken: true } },
    },
    orderBy: { purchasedAt: "asc" },
    take: 200,
  });

  const labels = await Promise.all(
    specimens.map(async (s) => {
      const url = `${SITE.url}/q/${s.qrToken}${s.location ? `?k=${s.location.partnerToken}` : ""}`;
      const dataUrl = await QRCode.toDataURL(url, { margin: 1, width: 220 });
      return {
        id: s.id,
        scientific: s.product.scientific,
        commonName: s.product.commonEn,
        sizeLabel: formatCmAsInches(s.sizeCm),
        sex: s.sex,
        msrp: s.msrp,
        locationName: s.location?.name ?? "Warehouse",
        tarantulAppId: s.tarantulAppId,
        dataUrl,
      };
    }),
  );

  return (
    <div>
      <div className="print:hidden">
        <h1 className="font-display text-2xl font-bold text-cream">QR labels</h1>
        <p className="mt-1 text-sm text-muted">
          Print and attach one label per enclosure. Scanning opens the specimen page — partners can
          register walk-in sales, verify audits and report issues from it.
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
          {labels.length} label(s) — use your browser&apos;s Print dialog (Ctrl/Cmd+P).
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 print:mt-0 print:grid-cols-3 print:gap-2">
        {labels.map((label) => (
          <div
            key={label.id}
            className="break-inside-avoid rounded-xl border border-line bg-white p-3 text-center text-black print:rounded-none print:border-neutral-300"
          >
            {/* QR data URLs are self-contained; next/image adds nothing here. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={label.dataUrl} alt="Specimen QR" className="mx-auto h-auto w-full max-w-[160px]" />
            <p className="mt-1 text-sm font-semibold italic leading-tight">{label.scientific}</p>
            <p className="text-xs leading-tight text-neutral-600">{label.commonName}</p>
            <p className="mt-1 text-xs text-neutral-800">
              {label.sizeLabel} · {label.sex}
              {label.msrp != null && ` · MSRP $${label.msrp.toFixed(0)}`}
            </p>
            <p className="text-[10px] text-neutral-500">
              {label.locationName}
              {label.tarantulAppId && ` · ${label.tarantulAppId}`}
            </p>
          </div>
        ))}
        {labels.length === 0 && (
          <p className="col-span-full text-sm text-muted">No specimens for this filter.</p>
        )}
      </div>
    </div>
  );
}

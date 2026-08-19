import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { hasDatabase } from "@/lib/db";
import { getScanTarget } from "@/lib/data/audits";
import { localeHref } from "@/lib/href";
import ScanAuditForm from "@/components/admin/ScanAuditForm";

export const dynamic = "force-dynamic";

/**
 * Landing screen for an admin who scanned a specimen's QR label while
 * visiting a partner store (see `/q/[token]`). Only makes sense for
 * consignment specimens still in play — anything else sends them to the
 * regular specimen detail/inventory screens instead.
 */
export default async function ScanAuditPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  if (!hasDatabase) notFound();

  const target = await getScanTarget(token);
  if (!target) notFound();

  if (target.locationType !== "consignment") {
    return (
      <div className="mx-auto max-w-lg">
        <h1 className="font-display text-2xl font-bold text-cream">Not at a partner store</h1>
        <p className="mt-2 text-sm text-muted">
          <span className="italic">{target.scientific}</span> is currently at the {target.locationName} — audit
          scans only apply to specimens on consignment at a partner store. Edit it directly instead.
        </p>
        <Link
          href={localeHref(loc, `/admin/specimens/${target.specimenId}`)}
          className="mt-4 inline-block text-sm text-gold-bright hover:underline"
        >
          Open specimen →
        </Link>
      </div>
    );
  }

  if (target.status === "sold" || target.status === "written_off") {
    return (
      <div className="mx-auto max-w-lg">
        <h1 className="font-display text-2xl font-bold text-cream">Already {target.status}</h1>
        <p className="mt-2 text-sm text-muted">
          <span className="italic">{target.scientific}</span> is {target.status} and can no longer be audited.
        </p>
      </div>
    );
  }

  return (
    <ScanAuditForm
      target={{
        specimenId: target.specimenId,
        qrToken: target.qrToken,
        scientific: target.scientific,
        commonName: target.commonName,
        sizeCm: target.sizeCm,
        sizeLabel: target.sizeLabel,
        sex: target.sex,
        price: target.price,
        msrp: target.msrp,
        settlementPrice: target.settlementPrice,
        status: target.status,
        locationName: target.locationName,
      }}
      locale={loc}
    />
  );
}

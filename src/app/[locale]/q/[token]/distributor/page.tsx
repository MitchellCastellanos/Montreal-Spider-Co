import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasDatabase } from "@/lib/db";
import { getSpecimenByQrToken } from "@/lib/partner/walk-in";
import { formatCmAsInches } from "@/lib/size-inches";
import PartnerCard from "@/components/partner/PartnerCard";
import SpecimenQrActions from "@/components/partner/SpecimenQrActions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Specimen — Distributor",
  robots: { index: false, follow: false },
};

const STATUS_NOTE: Record<string, string> = {
  allocated: "Reserved for a paid web order — do NOT sell this animal in-store.",
  sold: "This specimen has been sold.",
  written_off: "This specimen is no longer in inventory.",
};

/**
 * Distributor screen for a specimen: partner employees register walk-in
 * sales or report issues here. Reached via the "Distributor" link on the
 * specimen's public product page (which carries the store's partner key).
 */
export default async function SpecimenDistributorPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ k?: string }>;
}) {
  const { token } = await params;
  const { k } = await searchParams;
  if (!hasDatabase) notFound();

  const specimen = await getSpecimenByQrToken(token);
  if (!specimen) notFound();

  const partnerToken = k ?? null;
  const atPartner = specimen.locationType === "consignment" && specimen.location != null;
  const keyMatches = atPartner && partnerToken === specimen.location!.partnerToken;
  const canSell = keyMatches && specimen.status === "available";
  const suggestedPrice = specimen.msrp ?? (specimen.price > 0 ? specimen.price : null);

  const sexLabel = specimen.sex === "unsexed" ? "Unsexed" : specimen.sex === "male" ? "Male" : "Female";

  return (
    <PartnerCard
      title={specimen.product.scientific}
      subtitle={specimen.product.commonEn}
    >
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg border border-line bg-ink p-3">
          <dt className="text-xs text-muted">Current size</dt>
          <dd className="text-cream">{formatCmAsInches(specimen.sizeCm)} ({specimen.sizeCm.toFixed(1)} cm)</dd>
        </div>
        <div className="rounded-lg border border-line bg-ink p-3">
          <dt className="text-xs text-muted">Sex</dt>
          <dd className="text-cream">{sexLabel}</dd>
        </div>
        <div className="rounded-lg border border-line bg-ink p-3">
          <dt className="text-xs text-muted">Last measured</dt>
          <dd className="text-cream">{specimen.lastMeasuredAt?.toISOString().slice(0, 10) ?? "—"}</dd>
        </div>
        <div className="rounded-lg border border-line bg-ink p-3">
          <dt className="text-xs text-muted">Location</dt>
          <dd className="text-cream">{specimen.location?.name ?? "MSC warehouse"}</dd>
        </div>
        {keyMatches && specimen.msrp != null && (
          <div className="rounded-lg border border-line bg-ink p-3">
            <dt className="text-xs text-muted">Suggested retail (MSRP)</dt>
            <dd className="text-cream">${specimen.msrp.toFixed(2)}</dd>
          </div>
        )}
        {specimen.tarantulAppId && (
          <div className="rounded-lg border border-line bg-ink p-3">
            <dt className="text-xs text-muted">Verified Origin</dt>
            <dd className="text-cream">{specimen.tarantulAppId}</dd>
          </div>
        )}
      </dl>

      {STATUS_NOTE[specimen.status] && (
        <p className="mt-4 rounded-xl border border-gold/30 bg-gold/5 p-3 text-sm text-cream">
          {STATUS_NOTE[specimen.status]}
        </p>
      )}

      <div className="mt-6">
        <SpecimenQrActions
          qrToken={token}
          partnerToken={partnerToken}
          canSell={canSell}
          suggestedPrice={suggestedPrice}
        />
      </div>
    </PartnerCard>
  );
}

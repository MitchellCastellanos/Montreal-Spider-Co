"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";

/** Link to the walk-in sale / report-issue screen, shown only when reached via a specimen QR scan. */
export default function SpecimenDistributorLink() {
  const searchParams = useSearchParams();
  const token = searchParams.get("specimen");
  const k = searchParams.get("k");
  const { locale, dict } = useI18n();

  if (!token) return null;
  const href = `/${locale}/q/${token}/distributor${k ? `?k=${k}` : ""}`;

  return (
    <div className="mt-6 text-center">
      <Link href={href} className="text-xs text-muted underline hover:text-gold-bright">
        {dict.product.specimenDistributorCta} →
      </Link>
    </div>
  );
}

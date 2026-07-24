import { notFound, redirect } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { hasDatabase } from "@/lib/db";
import { getSpecimenByQrToken } from "@/lib/partner/walk-in";
import { localeHref } from "@/lib/href";

export const dynamic = "force-dynamic";

/**
 * Specimen QR entry point. Scanning a specimen's label lands here and is
 * forwarded straight to that specimen's product page — the customer-facing
 * article with the care guide and this specimen's facts. The "Distributor"
 * link on that page is gated behind the store's own admin-set code, so
 * nothing partner-specific needs to ride along in this redirect.
 */
export default async function SpecimenQrPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  if (!hasDatabase) notFound();

  const specimen = await getSpecimenByQrToken(token);
  if (!specimen) notFound();

  redirect(localeHref(loc, `/product/${specimen.product.slug}?specimen=${token}`));
}

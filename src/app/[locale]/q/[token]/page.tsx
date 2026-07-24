import { notFound, redirect } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { hasDatabase } from "@/lib/db";
import { getSpecimenByQrToken } from "@/lib/partner/walk-in";
import { localeHref } from "@/lib/href";

export const dynamic = "force-dynamic";

/**
 * Specimen QR entry point. Scanning a specimen's label lands here and is
 * forwarded straight to that specimen's product page — the customer-facing
 * article with the care guide and this specimen's facts. The store's partner
 * key (?k=…) rides along in the query string so the "Distributor" link on
 * that page can lead back to the walk-in sale / report-issue screen.
 */
export default async function SpecimenQrPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; token: string }>;
  searchParams: Promise<{ k?: string }>;
}) {
  const { locale, token } = await params;
  const { k } = await searchParams;
  const loc: Locale = isLocale(locale) ? locale : "en";
  if (!hasDatabase) notFound();

  const specimen = await getSpecimenByQrToken(token);
  if (!specimen) notFound();

  const query = new URLSearchParams({ specimen: token });
  if (k) query.set("k", k);
  redirect(localeHref(loc, `/product/${specimen.product.slug}?${query.toString()}`));
}

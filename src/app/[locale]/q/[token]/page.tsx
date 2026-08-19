import { notFound, redirect } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { hasDatabase } from "@/lib/db";
import { isAdminAuthed } from "@/lib/auth";
import { getSpecimenByQrToken } from "@/lib/partner/walk-in";
import { localeHref } from "@/lib/href";

export const dynamic = "force-dynamic";

/**
 * Specimen QR entry point. What scanning a label does next depends on who's
 * holding the phone:
 *  - MSC staff logged into /admin (visiting a partner store to audit) land
 *    straight on the scan-audit screen for that one specimen — see it,
 *    measure/re-sex/re-price it, and the change ships immediately.
 *  - Everyone else (customers, and partner staff — who never hold the admin
 *    cookie, they authenticate separately via the store's distributor code)
 *    is forwarded to the specimen's product page, same as before. The
 *    "Distributor" link on that page is gated behind the store's own
 *    admin-set code, so nothing partner-specific needs to ride along here.
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

  if (await isAdminAuthed()) {
    if (specimen.locationType === "consignment") {
      redirect(localeHref(loc, `/admin/audits/scan/${token}`));
    }
    redirect(localeHref(loc, `/admin/specimens/${specimen.id}`));
  }

  redirect(localeHref(loc, `/product/${specimen.product.slug}?specimen=${token}`));
}

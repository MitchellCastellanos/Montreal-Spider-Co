import type { Metadata } from "next";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { pageMeta } from "@/lib/pageMeta";
import { getSettings, resolvePickupTerms } from "@/lib/data/settings";
import { t } from "@/lib/types";
import PageHero from "@/components/PageHero";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const dict = await getDictionary(loc);
  return pageMeta(loc, "/terms", dict.terms.title, dict.meta.defaultDescription);
}

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const dict = await getDictionary(loc);
  const settings = await getSettings();

  return (
    <>
      <PageHero kicker={dict.terms.kicker} title={dict.terms.title} />
      <section className="container-x py-14">
        <div className="mx-auto max-w-2xl space-y-8">
          <div className="whitespace-pre-line leading-relaxed text-bone">{t(settings.terms, loc)}</div>

          <div className="rounded-2xl border border-gold/25 bg-gold/5 p-5">
            <h2 className="font-display text-lg font-semibold text-cream">{dict.delivery.pickupPolicy}</h2>
            <p className="mt-2 leading-relaxed text-bone">{resolvePickupTerms(settings, loc)}</p>
          </div>
        </div>
      </section>
    </>
  );
}

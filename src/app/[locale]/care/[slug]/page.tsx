import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { isLocale, locales, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { CARE_GUIDES, getCareGuide } from "@/lib/care";
import { PRODUCTS } from "@/lib/products";
import { t } from "@/lib/types";
import { localeHref } from "@/lib/href";
import { breadcrumbSchema } from "@/lib/seo";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";
import ProductCard from "@/components/ProductCard";
import JsonLd from "@/components/JsonLd";

export function generateStaticParams() {
  return locales.flatMap((locale) => CARE_GUIDES.map((g) => ({ locale, slug: g.slug })));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const guide = getCareGuide(slug);
  if (!guide) return {};
  return {
    title: t(guide.title, loc),
    description: t(guide.summary, loc),
    alternates: {
      canonical: localeHref(loc, `/care/${slug}`),
      languages: { en: `/en/care/${slug}`, fr: `/fr/care/${slug}`, "x-default": `/en/care/${slug}` },
    },
  };
}

export default async function CareGuidePage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const loc: Locale = locale;
  const guide = getCareGuide(slug);
  if (!guide) notFound();
  const dict = await getDictionary(loc);

  const beginnerSpecies = PRODUCTS.filter((p) => p.experience === "beginner").slice(0, 3);

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: dict.meta.siteName, url: `/${loc}` },
          { name: dict.care.title, url: `/${loc}/care` },
          { name: t(guide.title, loc), url: `/${loc}/care/${slug}` },
        ])}
      />
      <PageHero kicker={`${dict.filters[guide.level]} · ${guide.minRead} ${dict.care.minRead}`} title={t(guide.title, loc)} subtitle={t(guide.summary, loc)} />

      <article className="container-x py-16">
        <Link href={localeHref(loc, "/care")} className="mb-8 inline-block text-sm text-gold-deep hover:text-gold-bright">
          ← {dict.care.backToGuides}
        </Link>
        <div className="mx-auto max-w-2xl space-y-10">
          {guide.sections.map((section, i) => (
            <Reveal key={i} as="section">
              <h2 className="mb-3 font-display text-2xl font-bold text-cream">{t(section.heading, loc)}</h2>
              <div className="space-y-4">
                {section.body.map((para, j) => (
                  <p key={j} className="leading-relaxed text-bone">{t(para, loc)}</p>
                ))}
              </div>
            </Reveal>
          ))}
        </div>
      </article>

      <section className="border-t border-line bg-ink-soft/40">
        <div className="container-x py-16">
          <Reveal className="mb-8">
            <h2 className="font-display text-2xl font-bold text-cream">{dict.care.relatedSpecies}</h2>
          </Reveal>
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
            {beginnerSpecies.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

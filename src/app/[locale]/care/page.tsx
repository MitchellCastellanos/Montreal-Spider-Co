import type { Metadata } from "next";
import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { pageMeta } from "@/lib/pageMeta";
import { localeHref } from "@/lib/href";
import { CARE_GUIDES } from "@/lib/care";
import { t } from "@/lib/types";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";
import SpiderGraphic from "@/components/SpiderGraphic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const dict = await getDictionary(loc);
  return pageMeta(loc, "/care", dict.care.title, dict.care.subtitle);
}

export default async function CarePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const dict = await getDictionary(loc);

  return (
    <>
      <PageHero kicker={dict.care.kicker} title={dict.care.title} subtitle={dict.care.subtitle} />
      <section className="container-x py-16">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {CARE_GUIDES.map((g, i) => (
            <Reveal key={g.slug} delay={i * 0.07}>
              <Link href={localeHref(loc, `/care/${g.slug}`)} className="card-glow group flex h-full flex-col overflow-hidden rounded-2xl">
                <div className="relative aspect-[16/9] overflow-hidden" style={{ background: `radial-gradient(120% 120% at 50% 20%, hsl(${g.hue} 30% 16%), var(--ink))` }}>
                  <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-110">
                    <SpiderGraphic hue={g.hue} animate={false} className="h-full w-full p-4" />
                  </div>
                  <span className="absolute left-3 top-3 badge">{dict.filters[g.level]}</span>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h2 className="font-display text-xl font-semibold text-cream group-hover:text-gold-bright">{t(g.title, loc)}</h2>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-bone">{t(g.summary, loc)}</p>
                  <div className="mt-4 flex items-center justify-between text-xs text-muted">
                    <span>{g.minRead} {dict.care.minRead}</span>
                    <span className="font-semibold text-gold-bright">{dict.care.readGuide} →</span>
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}

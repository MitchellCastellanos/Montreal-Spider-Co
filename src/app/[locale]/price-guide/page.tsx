import type { Metadata } from "next";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { pageMeta } from "@/lib/pageMeta";
import { localeHref } from "@/lib/href";
import { getStorefrontProducts } from "@/lib/data/products";
import type { Experience } from "@/lib/types";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";
import Link from "next/link";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const dict = await getDictionary(loc);
  return pageMeta(loc, "/price-guide", dict.priceGuide.title, dict.priceGuide.subtitle);
}

const LEVELS: Experience[] = ["beginner", "intermediate", "advanced"];

function formatCad(n: number): string {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);
}

export default async function PriceGuidePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const dict = await getDictionary(loc);
  const pg = dict.priceGuide;
  const products = await getStorefrontProducts();

  const ranges = LEVELS.map((level) => {
    const prices = products
      .filter((p) => p.experience === level)
      .flatMap((p) => p.availability.filter((a) => a.stock > 0).map((a) => a.price));
    if (prices.length === 0) return { level, min: null, max: null, count: 0 };
    return { level, min: Math.min(...prices), max: Math.max(...prices), count: prices.length };
  });

  const levelLabel: Record<Experience, string> = {
    beginner: dict.home.beginnerName,
    intermediate: dict.home.intermediateName,
    advanced: dict.home.advancedName,
  };
  const levelNote: Record<Experience, string> = {
    beginner: pg.beginnerNote,
    intermediate: pg.intermediateNote,
    advanced: pg.advancedNote,
  };

  const factors = [
    { t: pg.factor1Title, b: pg.factor1Body },
    { t: pg.factor2Title, b: pg.factor2Body },
    { t: pg.factor3Title, b: pg.factor3Body },
    { t: pg.factor4Title, b: pg.factor4Body },
  ];

  return (
    <>
      <PageHero kicker={pg.kicker} title={pg.title} subtitle={pg.subtitle} />

      <section className="container-x py-16">
        <Reveal className="mb-8 text-center">
          <h2 className="font-display text-2xl font-bold text-cream">{pg.byLevelTitle}</h2>
        </Reveal>

        <div className="mb-14 grid gap-6 md:grid-cols-3">
          {ranges.map((r, i) => (
            <Reveal key={r.level} delay={i * 0.08}>
              <div className="card-glow h-full rounded-2xl p-6 text-center">
                <p className="badge mb-3">{levelLabel[r.level]}</p>
                {r.min != null ? (
                  <p className="font-display text-3xl font-bold text-gold-bright">
                    {formatCad(r.min)}
                    {r.max !== r.min && <> – {formatCad(r.max)}</>}
                  </p>
                ) : (
                  <p className="text-sm text-muted">{pg.noStock}</p>
                )}
                <p className="mt-3 text-sm leading-relaxed text-bone">{levelNote[r.level]}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="mb-8 text-center">
          <h2 className="font-display text-2xl font-bold text-cream">{pg.whatAffects}</h2>
        </Reveal>
        <div className="mx-auto grid max-w-4xl gap-5 sm:grid-cols-2">
          {factors.map((f, i) => (
            <Reveal key={f.t} delay={i * 0.06}>
              <div className="rounded-2xl border border-line bg-ink-soft/40 p-5">
                <h3 className="font-display text-base font-semibold text-cream">{f.t}</h3>
                <p className="mt-1.5 text-sm text-bone">{f.b}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-12 text-center">
          <Link href={localeHref(loc, "/shop")} className="btn btn-gold">
            {pg.cta} →
          </Link>
        </Reveal>
      </section>
    </>
  );
}

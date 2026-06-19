import type { Metadata } from "next";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { pageMeta } from "@/lib/pageMeta";
import { localeHref } from "@/lib/href";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";
import Link from "next/link";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const dict = await getDictionary(loc);
  return pageMeta(loc, "/pickup-points", dict.pickupPoints.title, dict.pickupPoints.subtitle);
}

export default async function PickupPointsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const dict = await getDictionary(loc);
  const p = dict.pickupPoints;

  return (
    <>
      <PageHero kicker={p.kicker} title={p.title} subtitle={p.subtitle} />
      <section className="container-x py-16">
        <Reveal>
          <div className="card-glow mx-auto max-w-3xl space-y-5 rounded-2xl p-8">
            <p className="leading-relaxed text-bone">{p.body1}</p>
            <p className="leading-relaxed text-bone">{p.body2}</p>
            <Link href={localeHref(loc, p.ctaHref)} className="btn btn-gold mt-4 inline-flex">
              {p.cta} →
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}

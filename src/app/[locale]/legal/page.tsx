import type { Metadata } from "next";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { pageMeta } from "@/lib/pageMeta";
import { localeHref } from "@/lib/href";
import { faqSchema } from "@/lib/seo";
import PageHero from "@/components/PageHero";
import FaqAccordion from "@/components/FaqAccordion";
import JsonLd from "@/components/JsonLd";
import Reveal from "@/components/Reveal";
import Link from "next/link";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const dict = await getDictionary(loc);
  return pageMeta(loc, "/legal", dict.legal.title, dict.legal.subtitle);
}

export default async function LegalPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const dict = await getDictionary(loc);
  const l = dict.legal;

  const items = [
    { q: l.q1, a: l.a1 },
    { q: l.q2, a: l.a2 },
    { q: l.q3, a: l.a3 },
    { q: l.q4, a: l.a4 },
    { q: l.q5, a: l.a5 },
  ];

  return (
    <>
      <JsonLd data={faqSchema(items)} />
      <PageHero kicker={l.kicker} title={l.title} subtitle={l.subtitle} />

      <section className="container-x py-16">
        <Reveal className="mx-auto mb-12 max-w-3xl rounded-2xl border border-gold/25 bg-gold/5 p-6">
          <h2 className="font-display text-lg font-bold text-cream">{l.introTitle}</h2>
          <p className="mt-2 text-sm leading-relaxed text-bone">{l.introBody}</p>
        </Reveal>

        <FaqAccordion items={items} />

        <Reveal className="mx-auto mt-12 max-w-3xl">
          <p className="text-xs leading-relaxed text-muted">{l.disclaimer}</p>
        </Reveal>

        <div className="mx-auto mt-10 max-w-3xl text-center">
          <Link href={localeHref(loc, "/faq")} className="btn btn-ghost">
            {dict.nav.faq} →
          </Link>
        </div>
      </section>
    </>
  );
}

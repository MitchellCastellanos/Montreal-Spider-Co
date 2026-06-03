import type { Metadata } from "next";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { pageMeta } from "@/lib/pageMeta";
import { localeHref } from "@/lib/href";
import { faqSchema } from "@/lib/seo";
import PageHero from "@/components/PageHero";
import FaqAccordion from "@/components/FaqAccordion";
import JsonLd from "@/components/JsonLd";
import Link from "next/link";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const dict = await getDictionary(loc);
  return pageMeta(loc, "/faq", dict.faq.title, dict.faq.subtitle);
}

export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const dict = await getDictionary(loc);
  const f = dict.faq;

  const items = [
    { q: f.q1, a: f.a1 },
    { q: f.q2, a: f.a2 },
    { q: f.q3, a: f.a3 },
    { q: f.q4, a: f.a4 },
    { q: f.q5, a: f.a5 },
    { q: f.q6, a: f.a6 },
    { q: f.q7, a: f.a7 },
    { q: f.q8, a: f.a8 },
  ];

  return (
    <>
      <JsonLd data={faqSchema(items)} />
      <PageHero kicker={f.kicker} title={f.title} subtitle={f.subtitle} />
      <section className="container-x py-16">
        <FaqAccordion items={items} />
        <div className="mt-12 text-center">
          <p className="text-bone">{dict.contact.subtitle}</p>
          <Link href={localeHref(loc, "/contact")} className="btn btn-ghost mt-4">{dict.nav.contact} →</Link>
        </div>
      </section>
    </>
  );
}

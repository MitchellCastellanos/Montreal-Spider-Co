import type { Metadata } from "next";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { pageMeta } from "@/lib/pageMeta";
import { localeHref } from "@/lib/href";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";
import VerifiedBadge from "@/components/VerifiedBadge";
import { withVerifiedOriginLinks } from "@/lib/verified-origin-links";
import Image from "next/image";
import Link from "next/link";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const dict = await getDictionary(loc);
  return pageMeta(loc, "/about", dict.about.title, dict.about.lead);
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const dict = await getDictionary(loc);
  const a = dict.about;

  const values = [
    { t: a.value1Title, b: a.value1Body, hue: 175 },
    { t: a.value2Title, b: a.value2Body, hue: 42 },
    { t: a.value3Title, b: a.value3Body, hue: 265 },
  ];
  const myths = [
    { m: a.myth1, f: a.fact1 },
    { m: a.myth2, f: a.fact2 },
    { m: a.myth3, f: a.fact3 },
  ];
  const stats = [
    { v: "18+", l: dict.home.statSpecies },
    { v: "100%", l: loc === "fr" ? "Nées en captivité" : "Captive-bred" },
    { v: "100%", l: dict.home.statVerified },
    { v: "2026", l: loc === "fr" ? "Fondée" : "Established" },
  ];

  return (
    <>
      <PageHero kicker={a.kicker} title={a.title} subtitle={a.lead} />

      <section className="container-x py-16">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <Reveal>
            <div className="relative aspect-square overflow-hidden rounded-3xl border border-line">
              <Image
                src="/images/about-studio.png"
                alt={a.title}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/60 to-transparent" />
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="leading-relaxed text-bone">{a.body1}</p>
            <p className="mt-4 leading-relaxed text-bone">{withVerifiedOriginLinks(a.body2, loc)}</p>
            <div className="mt-6">
              <VerifiedBadge label={dict.footer.verifiedBadge} size="lg" />
            </div>
            <div className="mt-8 grid grid-cols-4 gap-4 border-t border-line pt-6">
              {stats.map((s) => (
                <div key={s.l}>
                  <p className="font-display text-2xl font-bold text-gold-bright sm:text-3xl">{s.v}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-wide text-muted">{s.l}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="container-x pb-4">
        <Reveal>
          <div className="relative aspect-[16/7] w-full overflow-hidden rounded-3xl border border-line">
            <Image
              src="/images/about-enclosures.png"
              alt={a.value1Title}
              fill
              sizes="100vw"
              className="object-cover"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
          </div>
        </Reveal>
      </section>

      <section className="border-y border-line bg-ink-soft/40">
        <div className="container-x py-16">
          <Reveal className="mb-10 text-center">
            <h2 className="font-display text-3xl font-bold text-cream">{a.valuesTitle}</h2>
          </Reveal>
          <div className="grid gap-6 md:grid-cols-3">
            {values.map((val, i) => (
              <Reveal key={val.t} delay={i * 0.1}>
                <div className="card-glow h-full rounded-2xl p-7" style={{ background: `radial-gradient(120% 100% at 20% 0%, hsl(${val.hue} 28% 13%), var(--ink-card))` }}>
                  <h3 className="font-display text-xl font-semibold text-cream">{val.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-bone">{withVerifiedOriginLinks(val.b, loc)}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="container-x py-16">
        <Reveal className="mb-10 text-center">
          <h2 className="font-display text-3xl font-bold text-cream">{a.factsTitle}</h2>
        </Reveal>
        <div className="mx-auto max-w-3xl space-y-4">
          {myths.map((item, i) => (
            <Reveal key={i} delay={i * 0.08}>
              <div className="rounded-2xl border border-line bg-ink-soft/40 p-6">
                <p className="font-display text-lg text-danger/90">{item.m}</p>
                <p className="mt-2 text-bone"><span className="font-semibold text-ok">✓ </span>{item.f}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link href={localeHref(loc, "/shop")} className="btn btn-gold">{dict.common.shopNow} →</Link>
        </div>
      </section>
    </>
  );
}

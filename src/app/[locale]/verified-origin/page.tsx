import type { Metadata } from "next";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { pageMeta } from "@/lib/pageMeta";
import { localeHref } from "@/lib/href";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";
import VerifiedBadge from "@/components/VerifiedBadge";
import Link from "next/link";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const dict = await getDictionary(loc);
  return pageMeta(loc, "/verified-origin", dict.verified.title, dict.verified.subtitle);
}

export default async function VerifiedPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const dict = await getDictionary(loc);
  const v = dict.verified;

  const points = [
    { t: v.point1Title, b: v.point1Body },
    { t: v.point2Title, b: v.point2Body },
    { t: v.point3Title, b: v.point3Body },
    { t: v.point4Title, b: v.point4Body },
  ];
  const steps = [v.step1, v.step2, v.step3];

  return (
    <>
      <PageHero kicker={v.kicker} title={v.title} subtitle={v.subtitle} />

      <section className="container-x py-16">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <Reveal>
            <div className="relative mx-auto flex aspect-square max-w-sm items-center justify-center rounded-full border border-gold/30 bg-gradient-to-br from-gold/10 to-transparent">
              <div className="absolute inset-6 rounded-full border border-gold/20 animate-spin-slow" />
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full border-2 border-gold text-gold-bright pulse-ring">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M12 2l2.4 1.7 2.9-.2 1 2.8 2.4 1.7-.8 2.8.8 2.8-2.4 1.7-1 2.8-2.9-.2L12 22l-2.4-1.7-2.9.2-1-2.8L3.3 16l.8-2.8L3.3 10.4 5.7 8.7l1-2.8 2.9.2L12 2z" />
                    <path d="M8.5 12.2l2.4 2.4 4.6-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="font-display text-lg font-bold text-cream">TarantulApp</p>
                <p className="text-sm uppercase tracking-[0.25em] text-gold-bright">Verified Origin</p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <h2 className="font-display text-3xl font-bold text-cream">{v.what}</h2>
            <p className="mt-4 leading-relaxed text-bone">{v.whatBody}</p>
            <div className="mt-6">
              <VerifiedBadge label={dict.footer.verifiedBadge} size="lg" />
            </div>
          </Reveal>
        </div>
      </section>

      <section className="border-y border-line bg-ink-soft/40">
        <div className="container-x py-16">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {points.map((pt, i) => (
              <Reveal key={pt.t} delay={i * 0.08}>
                <div className="card-glow h-full rounded-2xl p-6">
                  <span className="font-display text-3xl font-black text-gold/30">0{i + 1}</span>
                  <h3 className="mt-2 font-display text-lg font-semibold text-cream">{pt.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-bone">{pt.b}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="container-x py-16">
        <Reveal className="mb-8 text-center">
          <h2 className="font-display text-3xl font-bold text-cream">{v.howTitle}</h2>
        </Reveal>
        <ol className="mx-auto max-w-2xl space-y-4">
          {steps.map((step, i) => (
            <Reveal key={i} as="li" delay={i * 0.1}>
              <div className="flex items-start gap-4 rounded-2xl border border-line bg-ink-soft/40 p-5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold font-bold text-ink">{i + 1}</span>
                <p className="text-bone">{step}</p>
              </div>
            </Reveal>
          ))}
        </ol>
        <div className="mt-10 text-center">
          <Link href={localeHref(loc, "/shop")} className="btn btn-gold">{v.cta} →</Link>
        </div>
      </section>
    </>
  );
}

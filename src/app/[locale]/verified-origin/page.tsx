import type { Metadata } from "next";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { pageMeta } from "@/lib/pageMeta";
import { localeHref } from "@/lib/href";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";
import VerifiedBadge from "@/components/VerifiedBadge";
import Image from "next/image";
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
            <div className="relative aspect-[7/5] overflow-hidden rounded-3xl border border-line">
              <Image
                src="/images/verified-origin.png"
                alt={v.title}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/50 to-transparent" />
              <div className="absolute bottom-4 left-4">
                <VerifiedBadge label={v.kicker} />
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

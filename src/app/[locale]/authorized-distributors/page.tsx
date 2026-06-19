import type { Metadata } from "next";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { pageMeta } from "@/lib/pageMeta";
import { localeHref } from "@/lib/href";
import { getDistributors } from "@/lib/data/distributors";
import { formatWeeklyHoursLines } from "@/lib/opening-hours";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";
import Link from "next/link";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const dict = await getDictionary(loc);
  return pageMeta(loc, "/authorized-distributors", dict.authorizedDistributors.title, dict.authorizedDistributors.subtitle);
}

export default async function AuthorizedDistributorsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const dict = await getDictionary(loc);
  const d = dict.authorizedDistributors;
  const distributors = await getDistributors();

  return (
    <>
      <PageHero kicker={d.kicker} title={d.title} subtitle={d.subtitle} />
      <section className="container-x py-16">
        <Reveal>
          <div className="card-glow mx-auto mb-12 max-w-3xl space-y-5 rounded-2xl p-8">
            <p className="leading-relaxed text-bone">{d.body1}</p>
            <p className="leading-relaxed text-bone">{d.body2}</p>
            <Link href={localeHref(loc, d.ctaHref)} className="btn btn-gold mt-4 inline-flex">
              {d.cta} →
            </Link>
          </div>
        </Reveal>

        {distributors.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {distributors.map((dist, i) => (
              <Reveal key={dist.id} delay={i * 0.06}>
                <div className="card-glow h-full rounded-2xl p-5">
                  <h3 className="font-display text-lg font-semibold text-cream">{dist.name}</h3>
                  <p className="mt-1 text-sm text-bone">{dist.address}</p>
                  {dist.phone && (
                    <p className="mt-2 text-sm">
                      <a href={`tel:${dist.phone.replace(/\s/g, "")}`} className="text-gold-bright hover:underline">{dist.phone}</a>
                    </p>
                  )}
                  <p className="mt-3 text-xs uppercase tracking-wide text-muted">{dict.delivery.hours}</p>
                  <ul className="mt-1 space-y-0.5">
                    {formatWeeklyHoursLines(dist.hours, loc).map((row) => (
                      <li key={row.day} className="flex justify-between gap-3 text-sm text-bone">
                        <span className="text-muted">{row.day}</span>
                        <span>{row.hours}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

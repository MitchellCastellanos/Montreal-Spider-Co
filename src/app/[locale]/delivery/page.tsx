import type { Metadata } from "next";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { pageMeta } from "@/lib/pageMeta";
import { localeHref } from "@/lib/href";
import { MEETUP_ZONES } from "@/lib/metro-meetup";
import { getPickupPoints } from "@/lib/data/locations";
import { getDistributors } from "@/lib/data/distributors";
import { getSettings, resolvePickupTerms } from "@/lib/data/settings";
import { formatWeeklyHoursLines } from "@/lib/opening-hours";
import { t } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";
import ConceptInfo from "@/components/ConceptInfo";
import Image from "next/image";
import Link from "next/link";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const dict = await getDictionary(loc);
  return pageMeta(loc, "/delivery", dict.delivery.title, dict.delivery.subtitle);
}

export default async function DeliveryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const dict = await getDictionary(loc);
  const d = dict.delivery;
  const [pickups, distributors, settings] = await Promise.all([getPickupPoints(), getDistributors(), getSettings()]);
  const pickupPolicy = resolvePickupTerms(settings, loc);

  return (
    <>
      <PageHero kicker={d.kicker} title={d.title} subtitle={d.subtitle} />

      <section className="container-x pt-12">
        <Reveal>
          <div className="relative aspect-[16/8] w-full overflow-hidden rounded-3xl border border-line">
            <Image
              src="/images/delivery.png"
              alt={d.pickupMeetupTitle}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
          </div>
        </Reveal>
      </section>

      <section className="border-t border-line bg-ink-soft/40">
        <div className="container-x py-16">
          <Reveal className="mb-10">
            <div className="card-glow rounded-2xl border-gold/25 bg-gradient-to-br from-gold/10 to-transparent p-7">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-gold/30 bg-gold/10 text-gold-bright text-xl">
                ✓
              </div>
              <h2 className="font-display text-xl font-bold text-cream">{d.liveArrivalTitle}</h2>
              <p className="mt-3 text-sm leading-relaxed text-bone">{d.liveArrivalBody}</p>
            </div>
          </Reveal>

          <Reveal className="mb-8">
            <h2 className="font-display text-3xl font-bold text-cream">
              {d.pickupMeetupTitle} <ConceptInfo concept="pickup" className="ml-2" />
            </h2>
            <p className="mt-2 max-w-3xl text-bone">{d.pickupMeetupBody}</p>
            <ul className="mt-4 max-w-3xl space-y-2 text-sm text-bone">
              <li className="flex gap-2"><span className="text-gold-bright">•</span>{d.pickupOptionPoint}</li>
              <li className="flex gap-2"><span className="text-gold-bright">•</span>{d.pickupOptionMetro}</li>
              <li className="flex gap-2"><span className="text-gold-bright">•</span>{d.pickupOptionCustom}</li>
            </ul>
          </Reveal>

          <Reveal className="mb-10">
            <div className="flex items-start gap-3 rounded-2xl border border-line bg-ink-soft/40 p-5">
              <span className="mt-0.5 text-gold-bright">📍</span>
              <p className="text-sm leading-relaxed text-bone">{d.pickupMeetupCoordination}</p>
            </div>
          </Reveal>

          <Reveal className="mb-10">
            <div className="card-glow rounded-2xl p-7">
              <h3 className="font-display text-xl font-bold text-cream">{d.metroTitle}</h3>
              <p className="mt-2 text-sm leading-relaxed text-bone">{d.metroBody}</p>
              <div className="mt-5 overflow-hidden rounded-xl border border-line">
                <table className="w-full text-left text-sm">
                  <thead className="bg-ink-soft text-xs uppercase tracking-wide text-gold-deep">
                    <tr>
                      <th className="px-4 py-3">{d.zoneCol}</th>
                      <th className="px-4 py-3">{d.feeCol}</th>
                      <th className="px-4 py-3">{d.metroFreeCol}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {MEETUP_ZONES.map((z) => (
                      <tr key={z.id} className="text-bone">
                        <td className="px-4 py-3 font-medium text-cream">{t(z.name, loc)}</td>
                        <td className="px-4 py-3 text-gold-bright">{formatPrice(z.fee, loc)}</td>
                        <td className="px-4 py-3">{formatPrice(z.freeMeetupThreshold, loc)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Reveal>

          <Reveal className="mb-8">
            <h3 className="font-display text-2xl font-bold text-cream">{d.pickupPointsTitle}</h3>
            <p className="mt-2 max-w-2xl text-bone">{d.pickupPointsBody}</p>
          </Reveal>

          <Reveal className="mb-8">
            <div className="flex items-start gap-3 rounded-2xl border border-gold/25 bg-gold/5 p-5">
              <span className="mt-0.5 text-gold-bright">⏳</span>
              <div>
                <p className="font-display text-sm font-semibold uppercase tracking-wide text-gold-bright">{d.pickupPolicy}</p>
                <p className="mt-1 text-sm leading-relaxed text-bone">{pickupPolicy}</p>
              </div>
            </div>
          </Reveal>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {pickups.map((pt, i) => (
              <Reveal key={pt.id} delay={i * 0.06}>
                <div className="card-glow h-full rounded-2xl p-5">
                  <div className="mb-3 flex items-center gap-2 text-gold-bright">
                    <PinIcon />
                    <span className="badge">{dict.common.free}</span>
                  </div>
                  <h3 className="font-display text-lg font-semibold text-cream">{pt.name}</h3>
                  <p className="mt-1 text-sm text-bone">{pt.address}</p>
                  {pt.phone && (
                    <p className="mt-2 text-sm">
                      <a href={`tel:${pt.phone.replace(/\s/g, "")}`} className="text-gold-bright hover:underline">{pt.phone}</a>
                    </p>
                  )}
                  {pt.mapsUrl && (
                    <p className="mt-1 text-sm">
                      <a href={pt.mapsUrl} target="_blank" rel="noopener noreferrer" className="text-gold-deep hover:text-gold-bright hover:underline">
                        {loc === "fr" ? "Voir sur Google Maps" : "View on Google Maps"} →
                      </a>
                    </p>
                  )}
                  <p className="mt-3 text-xs uppercase tracking-wide text-muted">{d.hours}</p>
                  <ul className="mt-1 space-y-0.5">
                    {formatWeeklyHoursLines(pt.hours, loc).map((row) => (
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
        </div>
      </section>

      {distributors.length > 0 && (
        <section className="border-t border-line">
          <div className="container-x py-16">
            <Reveal className="mb-8">
              <h2 className="font-display text-3xl font-bold text-cream">
                {d.distributorsTitle} <ConceptInfo concept="distributor" className="ml-2" />
              </h2>
              <p className="mt-2 max-w-2xl text-bone">{d.distributorsBody}</p>
            </Reveal>
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
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="container-x py-16">
        <Reveal>
          <div className="flex flex-col items-center justify-between gap-5 rounded-2xl border border-line bg-ink-soft/40 p-8 text-center md:flex-row md:text-left">
            <div>
              <h2 className="font-display text-2xl font-bold text-cream">{d.outsideTitle}</h2>
              <p className="mt-2 text-bone">{d.outsideBody}</p>
            </div>
            <Link href={localeHref(loc, "/contact")} className="btn btn-gold shrink-0">{dict.nav.contact} →</Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}

function PinIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

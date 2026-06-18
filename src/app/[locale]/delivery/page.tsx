import type { Metadata } from "next";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { pageMeta } from "@/lib/pageMeta";
import { localeHref } from "@/lib/href";
import { DELIVERY_ZONES, FREE_DELIVERY_THRESHOLD } from "@/lib/locations";
import { getPickupPoints } from "@/lib/data/locations";
import { getSettings, resolvePickupTerms } from "@/lib/data/settings";
import { t } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";
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
  const [pickups, settings] = await Promise.all([getPickupPoints(), getSettings()]);
  const pickupPolicy = resolvePickupTerms(settings, loc);

  return (
    <>
      <PageHero kicker={d.kicker} title={d.title} subtitle={d.subtitle} />

      <section className="container-x pt-12">
        <Reveal>
          <div className="relative aspect-[16/8] w-full overflow-hidden rounded-3xl border border-line">
            <Image
              src="/images/delivery.png"
              alt={d.localTitle}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
          </div>
        </Reveal>
      </section>

      <section className="container-x py-16">
        <div className="grid gap-8 lg:grid-cols-3">
          <Reveal className="lg:col-span-2">
            <div className="card-glow rounded-2xl p-7">
              <h2 className="font-display text-2xl font-bold text-cream">{d.localTitle}</h2>
              <p className="mt-3 leading-relaxed text-bone">{d.localBody}</p>

              <h3 className="mt-8 mb-3 font-display text-lg font-semibold text-cream">{d.zonesTitle}</h3>
              <div className="overflow-hidden rounded-xl border border-line">
                <table className="w-full text-left text-sm">
                  <thead className="bg-ink-soft text-xs uppercase tracking-wide text-gold-deep">
                    <tr>
                      <th className="px-4 py-3">{d.zoneCol}</th>
                      <th className="px-4 py-3">{d.feeCol}</th>
                      <th className="px-4 py-3">{d.etaCol}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {DELIVERY_ZONES.map((z) => (
                      <tr key={z.id} className="text-bone">
                        <td className="px-4 py-3 font-medium text-cream">{t(z.name, loc)}</td>
                        <td className="px-4 py-3 text-gold-bright">{formatPrice(z.fee, loc)}</td>
                        <td className="px-4 py-3">{t(z.eta, loc)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-sm text-gold-deep">
                ✦ {loc === "fr"
                  ? `Livraison gratuite pour les commandes de ${formatPrice(FREE_DELIVERY_THRESHOLD, loc)} et plus.`
                  : `Free delivery on orders over ${formatPrice(FREE_DELIVERY_THRESHOLD, loc)}.`}
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="card-glow h-full rounded-2xl border-gold/25 bg-gradient-to-br from-gold/10 to-transparent p-7">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-gold/30 bg-gold/10 text-gold-bright text-xl">
                ✓
              </div>
              <h2 className="font-display text-xl font-bold text-cream">{d.liveArrivalTitle}</h2>
              <p className="mt-3 text-sm leading-relaxed text-bone">{d.liveArrivalBody}</p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="border-t border-line bg-ink-soft/40">
        <div className="container-x py-16">
          <Reveal className="mb-8">
            <h2 className="font-display text-3xl font-bold text-cream">{d.pickupTitle}</h2>
            <p className="mt-2 max-w-2xl text-bone">{d.pickupBody}</p>
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
                  <p className="mt-1 text-sm text-bone">{t(pt.address, loc)}</p>
                  <p className="mt-3 text-xs uppercase tracking-wide text-muted">{d.hours}</p>
                  <p className="text-sm text-bone">{t(pt.hours, loc)}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

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

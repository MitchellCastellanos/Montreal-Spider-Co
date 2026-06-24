import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getFeatured } from "@/lib/data/products";
import { localeHref } from "@/lib/href";
import Hero from "@/components/home/Hero";
import HeroStats from "@/components/home/HeroStats";
import ProductCard from "@/components/ProductCard";
import Reveal from "@/components/Reveal";
import Newsletter from "@/components/Newsletter";
import VerifiedBadge from "@/components/VerifiedBadge";
import { withVerifiedOriginLinks } from "@/lib/verified-origin-links";
import { SITE } from "@/lib/site";
import Image from "next/image";
import Link from "next/link";

const testimonials = [
  {
    name: "Camille R.",
    city: "Le Plateau",
    text: {
      en: "My Brazilian Black arrived in perfect health with its Verified Origin certificate. The care sheet made me feel confident from day one.",
      fr: "Ma mygale noire du Brésil est arrivée en pleine santé avec son certificat Origine Vérifiée. La fiche de soins m'a rassurée dès le premier jour.",
    },
  },
  {
    name: "Jonathan T.",
    city: "Verdun",
    text: {
      en: "Pickup / meetup was effortless and they answered every beginner question I had. Easily the best tarantula shop in Montreal.",
      fr: "La cueillette / rencontre a été simplissime et ils ont répondu à toutes mes questions de débutant. La meilleure boutique de mygales à Montréal, sans hésiter.",
    },
  },
  {
    name: "Priya S.",
    city: "Rosemont",
    text: {
      en: "The GBB I ordered is stunning and clearly thriving. You can tell these spiders are raised with real care.",
      fr: "Le GBB que j'ai commandé est magnifique et visiblement épanoui. On sent que ces mygales sont élevées avec un vrai soin.",
    },
  },
];

export const revalidate = 60;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const dict = await getDictionary(loc);
  const h = dict.home;

  const featured = await getFeatured(4);

  const why = [
    { t: h.why1Title, b: h.why1Body },
    { t: h.why2Title, b: h.why2Body },
    { t: h.why3Title, b: h.why3Body },
    { t: h.why4Title, b: h.why4Body },
  ];

  const categories = [
    { key: "beginner", name: h.beginnerName, body: h.beginnerBody, hue: 42 },
    { key: "intermediate", name: h.intermediateName, body: h.intermediateBody, hue: 265 },
    { key: "advanced", name: h.advancedName, body: h.advancedBody, hue: 210 },
  ];

  const pay = dict.payments;
  const klarnaPoints = [
    { t: pay.homePoint1Title, b: pay.homePoint1Body },
    { t: pay.homePoint2Title, b: pay.homePoint2Body },
    { t: pay.homePoint3Title, b: pay.homePoint3Body },
  ];

  return (
    <>
      <Hero />
      <HeroStats />

      {/* Featured */}
      <section className="container-x py-16 md:py-24">
        <Reveal className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="badge mb-3">{h.featuredKicker}</p>
            <h2 className="font-display text-3xl font-bold text-cream sm:text-4xl">{h.featuredTitle}</h2>
            <p className="mt-2 max-w-xl text-bone">{h.featuredSub}</p>
          </div>
          <Link href={localeHref(loc, "/shop")} className="btn btn-ghost">
            {h.viewAll} →
          </Link>
        </Reveal>

        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {featured.map((p, i) => (
            <Reveal key={p.id} delay={i * 0.08}>
              <ProductCard product={p} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* Why */}
      <section className="border-y border-line bg-ink-soft/40">
        <div className="container-x py-16 md:py-24">
          <Reveal className="mb-12 text-center">
            <p className="badge mb-3">{h.whyKicker}</p>
            <h2 className="font-display text-3xl font-bold text-cream sm:text-4xl">{h.whyTitle}</h2>
          </Reveal>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {why.map((item, i) => (
              <Reveal key={item.t} delay={i * 0.08}>
                <div className="card-glow h-full rounded-2xl p-6">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-gold/30 bg-gold/10 text-gold-bright">
                    {i === 1 ? <CheckSeal /> : <Dot index={i} />}
                  </div>
                  <h3 className="mb-2 font-display text-lg font-semibold text-cream">
                    {i === 1 ? withVerifiedOriginLinks(item.t, loc) : item.t}
                  </h3>
                  <p className="text-sm leading-relaxed text-bone">{item.b}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Shop by experience */}
      <section className="container-x py-16 md:py-24">
        <Reveal className="mb-10 text-center">
          <p className="badge mb-3">{h.catKicker}</p>
          <h2 className="font-display text-3xl font-bold text-cream sm:text-4xl">{h.catTitle}</h2>
        </Reveal>
        <div className="grid gap-6 md:grid-cols-3">
          {categories.map((cat, i) => (
            <Reveal key={cat.key} delay={i * 0.1}>
              <Link
                href={localeHref(loc, `/shop?experience=${cat.key}`)}
                className="card-glow group relative block overflow-hidden rounded-2xl p-8"
                style={{ background: `radial-gradient(130% 100% at 20% 0%, hsl(${cat.hue} 30% 14%), var(--ink-card))` }}
              >
                <h3 className="font-display text-2xl font-bold text-cream">{cat.name}</h3>
                <p className="mt-2 text-sm text-bone">{cat.body}</p>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-gold-bright transition group-hover:gap-3">
                  {dict.common.shopNow} →
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Flexible payment / Klarna */}
      <section className="border-y border-line bg-ink-soft/40">
        <div className="container-x py-16 md:py-24">
          <Reveal className="mx-auto max-w-3xl text-center">
            <p className="badge mb-3">{pay.homeKicker}</p>
            <h2 className="font-display text-3xl font-bold text-cream sm:text-4xl">{pay.homeTitle}</h2>
            <p className="mt-3 text-bone">{pay.homeBody}</p>
            <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-line bg-ink px-4 py-2 text-sm text-bone">
              <span className="inline-flex items-center rounded bg-[#FFB3C7] px-2 py-0.5 text-xs font-extrabold tracking-tight text-black">
                Klarna
              </span>
              {pay.klarnaPay4}
            </span>
          </Reveal>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {klarnaPoints.map((pt, i) => (
              <Reveal key={pt.t} delay={i * 0.08}>
                <div className="card-glow h-full rounded-2xl p-6">
                  <h3 className="mb-2 font-display text-lg font-semibold text-cream">{pt.t}</h3>
                  <p className="text-sm leading-relaxed text-bone">{pt.b}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-8 text-center">
            <Link href={localeHref(loc, "/shop")} className="btn btn-gold">
              {pay.homeCta} →
            </Link>
            <p className="mt-3 text-xs text-muted">{pay.disclaimer}</p>
          </Reveal>
        </div>
      </section>

      {/* Verified band */}
      <section className="border-y border-line bg-gradient-to-r from-ink via-ink-soft to-ink">
        <div className="container-x flex flex-col items-center gap-6 py-14 text-center md:flex-row md:justify-between md:text-left">
          <div className="max-w-2xl">
            <VerifiedBadge label={dict.verified.kicker} size="lg" className="mb-3" />
            <h2 className="font-display text-2xl font-bold text-cream sm:text-3xl">{withVerifiedOriginLinks(dict.verified.title, loc)}</h2>
            <p className="mt-2 text-bone">{withVerifiedOriginLinks(dict.verified.subtitle, loc)}</p>
          </div>
          <a href={SITE.verifiedOriginUrl} target="_blank" rel="noopener noreferrer" className="btn btn-gold shrink-0">
            {dict.common.learnMore} →
          </a>
        </div>
      </section>

      {/* Testimonials */}
      <section className="container-x py-16 md:py-24">
        <Reveal className="mb-10 text-center">
          <h2 className="font-display text-3xl font-bold text-cream sm:text-4xl">{h.testimonialsTitle}</h2>
        </Reveal>
        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((tst, i) => (
            <Reveal key={tst.name} delay={i * 0.1}>
              <figure className="card-glow h-full rounded-2xl p-6">
                <div className="mb-3 text-gold-bright">★★★★★</div>
                <blockquote className="text-sm leading-relaxed text-cream">“{withVerifiedOriginLinks(tst.text[loc], loc)}”</blockquote>
                <figcaption className="mt-4 text-sm text-muted">
                  <span className="font-semibold text-bone">{tst.name}</span> · {tst.city}
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container-x pb-16 md:pb-24">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-gold/30 bg-gradient-to-br from-ink-soft to-ink p-10 text-center md:p-16">
            <Image
              src="/images/cta-texture.png"
              alt=""
              fill
              sizes="100vw"
              className="pointer-events-none absolute inset-0 object-cover opacity-50"
            />
            <div className="web-grid pointer-events-none absolute inset-0 opacity-20" />
            <div className="relative">
              <h2 className="mx-auto max-w-2xl font-display text-3xl font-bold text-cream sm:text-4xl">{h.ctaTitle}</h2>
              <p className="mx-auto mt-3 max-w-xl text-bone">{h.ctaBody}</p>
              <Link href={localeHref(loc, "/shop")} className="btn btn-gold mt-7 text-base">
                {h.ctaButton} →
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Newsletter */}
      <section className="container-x pb-20">
        <Reveal>
          <Newsletter />
        </Reveal>
      </section>
    </>
  );
}

function Dot({ index }: { index: number }) {
  const icons = ["🕷", "✓", "📍", "💬"];
  return <span className="text-lg">{icons[index] ?? "•"}</span>;
}
function CheckSeal() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 2l2.4 1.7 2.9-.2 1 2.8 2.4 1.7-.8 2.8.8 2.8-2.4 1.7-1 2.8-2.9-.2L12 22l-2.4-1.7-2.9.2-1-2.8L3.3 16l.8-2.8L3.3 10.4 5.7 8.7l1-2.8 2.9.2L12 2z" />
      <path d="M8.5 12.2l2.4 2.4 4.6-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

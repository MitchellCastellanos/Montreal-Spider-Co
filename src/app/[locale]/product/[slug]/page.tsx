import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { isLocale, locales, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getProductBySlug, getRelated, getStorefrontProducts } from "@/lib/data/products";
import { productDisplaySubtitle, productDisplayTitle, productImageAlt, productSeoName } from "@/lib/product-display";
import { t } from "@/lib/types";
import { localeHref } from "@/lib/href";
import { formatPrice } from "@/lib/format";
import { breadcrumbSchema, productSchema } from "@/lib/seo";
import SpeciesImage from "@/components/SpeciesImage";
import AddToCart from "@/components/AddToCart";
import { SITE } from "@/lib/site";
import { withVerifiedOriginLinks } from "@/lib/verified-origin-links";
import { basePrice } from "@/lib/types";
import ProductCard from "@/components/ProductCard";
import JsonLd from "@/components/JsonLd";
import Reveal from "@/components/Reveal";

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  const products = await getStorefrontProducts();
  return locales.flatMap((locale) => products.map((p) => ({ locale, slug: p.slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const product = await getProductBySlug(slug);
  if (!product) return {};
  const dict = await getDictionary(loc);
  const name = productSeoName(product, loc);
  return {
    title: name,
    description: t(product.description, loc),
    alternates: {
      canonical: localeHref(loc, `/product/${slug}`),
      languages: {
        en: `/en/product/${slug}`,
        fr: `/fr/product/${slug}`,
        "x-default": `/en/product/${slug}`,
      },
    },
    openGraph: {
      title: `${name} · ${dict.meta.siteName}`,
      description: t(product.description, loc),
      type: "website",
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const loc: Locale = locale;
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  const dict = await getDictionary(loc);
  const p = dict.product;
  const related = await getRelated(product);

  const specs = [
    { label: p.adultSize, value: t(product.adultSize, loc) },
    { label: p.growth, value: t(product.growth, loc) },
    { label: p.temperament, value: dict.filters[product.temperament] },
    { label: p.type, value: dict.filters[product.type] },
    { label: p.origin, value: t(product.origin, loc) },
    { label: p.lifespanF, value: t(product.lifespan, loc) },
  ];

  const care = [
    { label: p.humidity, value: product.humidity },
    { label: p.temperature, value: product.temperature },
    { label: p.enclosure, value: t(product.enclosure, loc) },
    { label: p.diet, value: t(product.diet, loc) },
  ];

  const guarantees = [p.guaranteeLive, p.guaranteeLocal, p.guaranteeSupport];
  const displayTitle = productDisplayTitle(product);
  const displaySubtitle = productDisplaySubtitle(product, loc);

  return (
    <>
      <JsonLd data={productSchema(product, loc)} />
      <JsonLd
        data={breadcrumbSchema([
          { name: dict.meta.siteName, url: `/${loc}` },
          { name: p.breadcrumb, url: `/${loc}/shop` },
          { name: displayTitle, url: `/${loc}/product/${slug}` },
        ])}
      />

      <div className="container-x py-8 md:py-12">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-muted">
          <Link href={localeHref(loc, "/")} className="hover:text-gold-bright">{dict.meta.siteName}</Link>
          <span>/</span>
          <Link href={localeHref(loc, "/shop")} className="hover:text-gold-bright">{p.breadcrumb}</Link>
          <span>/</span>
          <span className="text-bone">{displayTitle}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-2">
          {/* Visual */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div
              className="relative aspect-square overflow-hidden rounded-3xl border border-line"
              style={{ background: `radial-gradient(130% 130% at 50% 20%, hsl(${product.hue} 32% 18%), var(--ink))` }}
            >
              <SpeciesImage
                image={product.image}
                hue={product.hue}
                accent={product.accent}
                alt={productImageAlt(product, loc)}
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {guarantees.map((g) => (
                <div key={g} className="rounded-xl border border-line bg-ink-soft/40 p-3 text-center text-xs text-bone">
                  {g}
                </div>
              ))}
            </div>
          </div>

          {/* Info */}
          <div>
            <span className="text-sm font-semibold uppercase tracking-wider text-gold-deep">{product.genus}</span>
            <h1 className="mt-1 font-display text-4xl font-bold italic leading-tight text-cream md:text-5xl">
              {displayTitle}
            </h1>
            {displaySubtitle && <p className="mt-1 text-lg text-muted">{displaySubtitle}</p>}

            <p className="mt-3 text-2xl font-bold text-cream">
              <span className="text-sm font-normal text-muted">{dict.common.from} </span>
              {formatPrice(basePrice(product), loc)}{" "}
              <span className="text-sm font-normal text-muted">{dict.common.plusTaxes}</span>
            </p>

            <div className="my-6 h-px bg-line" />

            <AddToCart product={product} />

            <p className="mt-4 rounded-xl border border-gold/20 bg-gold/5 p-3 text-center text-sm text-bone">
              ✦ {p.shippingNote}
            </p>

            <section className="mt-8">
              <h2 className="mb-3 font-display text-xl font-semibold text-cream">{p.description}</h2>
              <p className="leading-relaxed text-bone">{t(product.description, loc)}</p>
            </section>

            <section className="mt-8">
              <h2 className="mb-3 font-display text-xl font-semibold text-cream">{p.specs}</h2>
              <dl className="grid grid-cols-2 gap-3">
                {specs.map((spec) => (
                  <div key={spec.label} className="rounded-xl border border-line bg-ink-soft/40 p-3">
                    <dt className="text-xs uppercase tracking-wide text-muted">{spec.label}</dt>
                    <dd className="mt-0.5 text-sm font-medium text-cream">{spec.value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="mt-8">
              <h2 className="mb-3 font-display text-xl font-semibold text-cream">{p.careTitle}</h2>
              <dl className="grid grid-cols-2 gap-3">
                {care.map((spec) => (
                  <div key={spec.label} className="rounded-xl border border-line bg-ink-soft/40 p-3">
                    <dt className="text-xs uppercase tracking-wide text-muted">{spec.label}</dt>
                    <dd className="mt-0.5 text-sm font-medium text-cream">{spec.value}</dd>
                  </div>
                ))}
              </dl>
              {product.careGuide && (
                <Link href={localeHref(loc, `/care/${product.careGuide}`)} className="mt-4 inline-block text-sm font-semibold text-gold-bright hover:underline">
                  {p.fullGuide} →
                </Link>
              )}
            </section>

            <section className="mt-8 rounded-2xl border border-gold/25 bg-gradient-to-br from-gold/10 to-transparent p-5">
              <h2 className="font-display text-lg font-semibold text-cream">{withVerifiedOriginLinks(p.verifiedTitle, loc)}</h2>
              <p className="mt-3 text-sm leading-relaxed text-bone">{withVerifiedOriginLinks(p.verifiedBody, loc)}</p>
              <a
                href={SITE.verifiedOriginUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-sm font-semibold text-gold-bright hover:underline"
              >
                {dict.common.learnMore} →
              </a>
            </section>
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <section className="mt-20">
            <Reveal className="mb-6">
              <h2 className="font-display text-2xl font-bold text-cream">{p.related}</h2>
            </Reveal>
            <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
              {related.map((rp) => (
                <ProductCard key={rp.id} product={rp} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}

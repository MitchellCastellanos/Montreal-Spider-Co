import type enDict from "@/i18n/dictionaries/en.json";
import type { Locale } from "@/i18n/config";
import { SITE } from "./site";
import type { Product } from "./types";
import { t } from "./types";
import { basePrice, totalStock } from "./types";

type Dict = typeof enDict;

export function organizationSchema(dict: Dict) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: dict.meta.siteName,
    url: SITE.url,
    email: SITE.email,
    description: dict.meta.defaultDescription,
    logo: `${SITE.url}/brand/logo-circle.png`,
    foundingDate: String(SITE.established),
    address: {
      "@type": "PostalAddress",
      addressLocality: "Montréal",
      addressRegion: "QC",
      addressCountry: "CA",
    },
    areaServed: "Montréal, QC and surrounding areas",
    sameAs: [SITE.social.instagram, SITE.social.facebook, SITE.social.tiktok],
  };
}

export function websiteSchema(dict: Dict) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: dict.meta.siteName,
    url: SITE.url,
    inLanguage: ["en-CA", "fr-CA"],
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE.url}/en/shop?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function productSchema(product: Product, locale: Locale) {
  const stock = totalStock(product);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${t(product.common, locale)} (${product.scientific})`,
    description: t(product.description, locale),
    category: "Tarantula",
    brand: { "@type": "Brand", name: SITE.name },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: product.rating,
      reviewCount: product.reviews,
    },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: SITE.currency,
      lowPrice: basePrice(product),
      highPrice: Math.max(...product.sizes.map((s) => s.price)),
      offerCount: product.sizes.length,
      availability: stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${SITE.url}/${locale}/product/${product.slug}`,
    },
  };
}

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SITE.url}${item.url}`,
    })),
  };
}

export function faqSchema(qa: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: qa.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}

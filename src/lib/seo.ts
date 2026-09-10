import type enDict from "@/i18n/dictionaries/en.json";
import type { Locale } from "@/i18n/config";
import { SITE } from "./site";
import type { Product } from "./types";
import type { BlogPost } from "./blog";
import { productSeoName } from "@/lib/product-display";
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

/**
 * PetStore/LocalBusiness markup — the single highest-leverage schema for
 * ranking in the Google local pack for queries like "tarantula for sale
 * Montreal". Kept city-level (no storefront address) since MSC fulfills via
 * pickup points and metro meetups rather than one retail location.
 */
export function localBusinessSchema(dict: Dict) {
  return {
    "@context": "https://schema.org",
    "@type": "PetStore",
    name: dict.meta.siteName,
    url: SITE.url,
    email: SITE.email,
    image: `${SITE.url}/og/og-image.png`,
    description: dict.meta.defaultDescription,
    priceRange: "$$",
    areaServed: {
      "@type": "City",
      name: "Montréal",
      containedInPlace: { "@type": "AdministrativeArea", name: "Québec" },
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: "Montréal",
      addressRegion: "QC",
      addressCountry: "CA",
    },
    geo: { "@type": "GeoCoordinates", latitude: 45.5019, longitude: -73.5674 },
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
    name: productSeoName(product, locale),
    description: t(product.description, locale),
    category: "Tarantula",
    brand: { "@type": "Brand", name: SITE.name },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: SITE.currency,
      lowPrice: basePrice(product),
      highPrice: product.availability.length ? Math.max(...product.availability.map((s) => s.price)) : 0,
      offerCount: product.availability.length,
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

export function blogPostingSchema(post: BlogPost, locale: Locale, dict: Dict) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: t(post.title, locale),
    description: t(post.summary, locale),
    image: `${SITE.url}/og/og-image.png`,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: { "@type": "Organization", name: dict.meta.siteName },
    publisher: {
      "@type": "Organization",
      name: dict.meta.siteName,
      logo: { "@type": "ImageObject", url: `${SITE.url}/brand/logo-circle.png` },
    },
    mainEntityOfPage: `${SITE.url}/${locale}/blog/${post.slug}`,
    inLanguage: locale === "fr" ? "fr-CA" : "en-CA",
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

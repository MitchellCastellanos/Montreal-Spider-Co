import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";
import { locales } from "@/i18n/config";
import { getStorefrontProducts } from "@/lib/data/products";
import { CARE_GUIDES } from "@/lib/care";

const STATIC_PATHS = ["", "/shop", "/care", "/verified-origin", "/delivery", "/about", "/faq", "/contact"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];
  const products = await getStorefrontProducts();

  const add = (path: string, priority: number, changeFrequency: "weekly" | "monthly" | "daily") => {
    for (const locale of locales) {
      const url = `${SITE.url}/${locale}${path}`;
      entries.push({
        url,
        lastModified: new Date(),
        changeFrequency,
        priority,
        alternates: {
          languages: Object.fromEntries(locales.map((l) => [l, `${SITE.url}/${l}${path}`])),
        },
      });
    }
  };

  STATIC_PATHS.forEach((p) => add(p, p === "" ? 1 : 0.8, "weekly"));
  products.forEach((p) => add(`/product/${p.slug}`, 0.7, "daily"));
  CARE_GUIDES.forEach((g) => add(`/care/${g.slug}`, 0.6, "monthly"));

  return entries;
}

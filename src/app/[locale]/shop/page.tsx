import { Suspense } from "react";
import type { Metadata } from "next";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getStorefrontProducts, getGenera } from "@/lib/data/products";
import { localeHref } from "@/lib/href";
import ShopClient from "@/components/shop/ShopClient";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const dict = await getDictionary(loc);
  return {
    title: dict.shop.title,
    description: dict.shop.subtitle,
    alternates: {
      canonical: localeHref(loc, "/shop"),
      languages: { en: "/en/shop", fr: "/fr/shop", "x-default": "/en/shop" },
    },
  };
}

export default async function ShopPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const dict = await getDictionary(loc);
  const [products, genera] = await Promise.all([getStorefrontProducts(), getGenera()]);
  return (
    <Suspense
      fallback={
        <div className="container-x py-10 md:py-14">
          <div className="mb-8">
            <h1 className="font-display text-4xl font-bold text-cream md:text-5xl">{dict.shop.title}</h1>
            <p className="mt-2 max-w-2xl text-bone">{dict.shop.subtitle}</p>
          </div>
        </div>
      }
    >
      <ShopClient products={products} genera={genera} />
    </Suspense>
  );
}

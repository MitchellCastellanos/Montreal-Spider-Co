import { Suspense } from "react";
import type { Metadata } from "next";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { GENERA, PRODUCTS } from "@/lib/products";
import { localeHref } from "@/lib/href";
import ShopClient from "@/components/shop/ShopClient";

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

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="container-x py-20 text-muted">Loading…</div>}>
      <ShopClient products={PRODUCTS} genera={GENERA} />
    </Suspense>
  );
}

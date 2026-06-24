"use client";

import { useI18n } from "@/i18n/I18nProvider";
import {
  productDisplaySubtitle,
  productDisplayTitle,
  productImageAlt,
} from "@/lib/product-display";
import type { Product } from "@/lib/types";

type Named = Pick<Product, "scientific" | "common">;

export function useProductDisplay(product: Named) {
  const { locale } = useI18n();
  return {
    title: productDisplayTitle(product),
    subtitle: productDisplaySubtitle(product, locale),
    imageAlt: productImageAlt(product, locale),
  };
}

import type { Locale } from "@/i18n/config";
import type { Product } from "./types";
import { t } from "./types";

type Named = Pick<Product, "scientific" | "common">;

/** Primary storefront / admin label — binomial scientific name. */
export function productDisplayTitle(product: Pick<Product, "scientific">): string {
  return product.scientific.trim();
}

/** Secondary label — localized common name when provided. */
export function productDisplaySubtitle(product: Pick<Product, "common">, locale: Locale): string {
  return t(product.common, locale).trim();
}

export function productHasCommonName(product: Pick<Product, "common">, locale: Locale): boolean {
  return productDisplaySubtitle(product, locale).length > 0;
}

/** SEO, Open Graph, and JSON-LD product name. */
export function productSeoName(product: Named, locale: Locale): string {
  const sci = productDisplayTitle(product);
  const common = productDisplaySubtitle(product, locale);
  return common ? `${sci} (${common})` : sci;
}

export function productImageAlt(product: Named, locale: Locale): string {
  const sci = productDisplayTitle(product);
  const common = productDisplaySubtitle(product, locale);
  return common ? `${sci} — ${common}` : sci;
}

export function productStripeLineName(product: Pick<Product, "scientific">, sizeLabel: string): string {
  return `${product.scientific.trim()} — ${sizeLabel}`;
}

/** Persisted order line names — scientific names are locale-neutral. */
export function productOrderLineNames(product: Pick<Product, "scientific">): { nameEn: string; nameFr: string } {
  const name = product.scientific.trim();
  return { nameEn: name, nameFr: name };
}

/** Admin tables / inventory — scientific first, common secondary when present. */
export function productPrimaryLabel(scientific: string, commonEn?: string | null): string {
  const sci = scientific.trim();
  const common = (commonEn ?? "").trim();
  return common ? `${sci} — ${common}` : sci;
}

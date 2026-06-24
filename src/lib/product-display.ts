import type { Locale } from "@/i18n/config";
import type { AvailableUnit, Product } from "./types";
import { t } from "./types";

/** Max size/price rows on a shop listing card before "+N more". */
export const CARD_AVAILABILITY_MAX = 4;

const SEX_SYMBOL = { male: "♂", female: "♀" } as const;

/** In-stock units for listing cards, smallest size first. */
export function cardAvailabilityUnits(availability: AvailableUnit[]): AvailableUnit[] {
  return availability
    .filter((u) => u.stock > 0)
    .sort((a, b) => a.sizeCm - b.sizeCm || a.price - b.price);
}

/** Show a sex marker when multiple in-stock units share a size but differ in sex. */
export function cardUnitShowsSex(units: AvailableUnit[], unit: AvailableUnit): boolean {
  if (unit.sex === "unsexed") return false;
  const atSize = units.filter((u) => u.sizeCm === unit.sizeCm);
  if (atSize.length <= 1) return false;
  return new Set(atSize.map((u) => u.sex)).size > 1;
}

export function cardUnitSexSymbol(unit: AvailableUnit): string {
  return unit.sex === "unsexed" ? "" : SEX_SYMBOL[unit.sex];
}

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

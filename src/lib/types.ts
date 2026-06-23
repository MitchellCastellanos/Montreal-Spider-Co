import type { Locale } from "@/i18n/config";
import type { WeeklyHours } from "@/lib/opening-hours";

export type L = { en: string; fr: string };

export function t(value: L, locale: Locale): string {
  return value[locale] ?? value.en;
}

export type Experience = "beginner" | "intermediate" | "advanced";
export type SpiderType = "terrestrial" | "arboreal" | "fossorial";
export type Temperament = "docile" | "skittish" | "defensive";

export type SpecimenSex = "unsexed" | "male" | "female";

/** A distinct in-stock (size, sex, price) bucket for a product — the storefront buy box. */
export interface AvailableUnit {
  /** Stable identity for cart/checkout: `${sizeCm}:${sex}:${price}`. */
  key: string;
  sizeCm: number;
  sizeInches: number;
  /** Formatted leg span, e.g. `2 3/8″`. */
  sizeLabel: string;
  sex: SpecimenSex;
  price: number;
  stock: number;
  /** Per-group photo override; falls back to the product photo when absent. */
  photo?: string;
}

export interface ProductDistributorStock {
  distributorId: string;
  stock: number;
}

/** Distributor info for product cards and availability CTAs. */
export interface DistributorSnippet {
  id: string;
  name: string;
  neighborhood: string;
  address: string;
  phone: string;
  mapsUrl: string;
  hours: WeeklyHours;
}

export interface Product {
  id: string;
  slug: string;
  scientific: string;
  common: L;
  genus: string;
  experience: Experience;
  type: SpiderType;
  temperament: Temperament;
  /** Available specimen buy-boxes, grouped by size/sex/price (replaces the old size-tier model). */
  availability: AvailableUnit[];
  featured?: boolean;
  newArrival?: boolean;
  /** Warehouse stock can be delivered or picked up at pickup points. */
  availableAtPickup?: boolean;
  /** Also available through authorized distributors (separate stock). */
  availableAtDistributor?: boolean;
  /** When true, hide this listing from storefront pages once it has zero stock everywhere. */
  hideWhenSoldOut?: boolean;
  /** Per-distributor stock counts (admin + storefront tooltips). */
  distributorStocks?: ProductDistributorStock[];
  /** Distributors carrying this product (populated when availableAtDistributor). */
  distributors?: DistributorSnippet[];
  hue: number; // base hue for the generated species graphic
  accent: string;
  /** Optional product photo URL (Cloudinary or /public path). Falls back to placeholder. */
  image?: string;
  adultSize: L;
  growth: L;
  origin: L;
  lifespan: L;
  humidity: string;
  temperature: string;
  enclosure: L;
  diet: L;
  description: L;
  careGuide?: string;
  /** ISO date used for "newest" sorting */
  arrived: string;
}

export function basePrice(p: Product): number {
  if (p.availability.length === 0) return 0;
  return Math.min(...p.availability.map((a) => a.price));
}

export function totalStock(p: Product): number {
  return p.availability.reduce((sum, a) => sum + a.stock, 0);
}

/** Stock held at our warehouse (same as totalStock on sizes). */
export function warehouseStock(p: Product): number {
  return totalStock(p);
}

export function distributorStockTotal(p: Product): number {
  return (p.distributorStocks ?? []).reduce((sum, d) => sum + d.stock, 0);
}

/** Online cart uses warehouse stock only. */
export function isPurchasableOnline(p: Product): boolean {
  return warehouseStock(p) > 0;
}

export function isAvailableAtDistributor(p: Product): boolean {
  return !!(p.availableAtDistributor && (p.distributors?.length ?? 0) > 0);
}

/** No stock left through any channel (online warehouse or distributor). */
export function isSoldOut(p: Product): boolean {
  return !isPurchasableOnline(p) && !isAvailableAtDistributor(p);
}

/** False when the admin chose to hide this listing once it sells out everywhere. */
export function isStorefrontVisible(p: Product): boolean {
  return !(p.hideWhenSoldOut && isSoldOut(p));
}

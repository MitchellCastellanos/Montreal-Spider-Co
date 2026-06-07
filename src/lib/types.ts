import type { Locale } from "@/i18n/config";

export type L = { en: string; fr: string };

export function t(value: L, locale: Locale): string {
  return value[locale] ?? value.en;
}

export type Experience = "beginner" | "intermediate" | "advanced";
export type SpiderType = "terrestrial" | "arboreal" | "fossorial";
export type Temperament = "docile" | "skittish" | "defensive";

export interface SizeOption {
  id: string;
  label: L;
  price: number;
  stock: number;
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
  sizes: SizeOption[];
  featured?: boolean;
  newArrival?: boolean;
  rating: number;
  reviews: number;
  hue: number; // base hue for the generated species graphic
  accent: string;
  /** Optional product photo URL (Supabase Storage or /public path). Falls back to placeholder. */
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
  return Math.min(...p.sizes.map((s) => s.price));
}

export function totalStock(p: Product): number {
  return p.sizes.reduce((sum, s) => sum + s.stock, 0);
}

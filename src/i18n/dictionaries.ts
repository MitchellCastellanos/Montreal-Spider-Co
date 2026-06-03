import "server-only";
import type { Locale } from "./config";

export type Dictionary = typeof import("./dictionaries/en.json");

const loaders: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import("./dictionaries/en.json").then((m) => m.default),
  fr: () => import("./dictionaries/fr.json").then((m) => m.default),
};

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  const load = loaders[locale] ?? loaders.en;
  return load();
}

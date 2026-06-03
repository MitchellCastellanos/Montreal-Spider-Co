import type { Locale } from "@/i18n/config";

/** Build a locale-prefixed path for use in server components. */
export function localeHref(locale: Locale, path: string): string {
  if (path === "/" || path === "") return `/${locale}`;
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `/${locale}${clean}`;
}

import type { Metadata } from "next";
import type { Locale } from "@/i18n/config";
import { localeHref } from "./href";

/** Build per-page Metadata with canonical + hreflang alternates. */
export function pageMeta(loc: Locale, path: string, title: string, description: string): Metadata {
  return {
    title,
    description,
    alternates: {
      canonical: localeHref(loc, path),
      languages: {
        en: localeHref("en", path),
        fr: localeHref("fr", path),
        "x-default": localeHref("en", path),
      },
    },
    openGraph: { title, description, type: "website", url: localeHref(loc, path) },
  };
}

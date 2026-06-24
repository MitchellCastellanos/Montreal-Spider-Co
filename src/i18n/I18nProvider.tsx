"use client";

import { createContext, useContext } from "react";
import { t } from "@/lib/types";
import type { Locale } from "./config";
import type enDict from "./dictionaries/en.json";

export type Dict = typeof enDict;

type Ctx = { locale: Locale; dict: Dict };

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Dict;
  children: React.ReactNode;
}) {
  return <I18nContext.Provider value={{ locale, dict }}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

/** Resolve any bilingual blob ({ en, fr }, JSON string, or nested) for the active locale. */
export function useT() {
  const { locale } = useI18n();
  return (value: unknown) => t(value, locale);
}

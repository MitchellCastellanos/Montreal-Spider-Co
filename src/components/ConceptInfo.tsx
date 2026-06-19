"use client";

import LocaleLink from "./LocaleLink";
import { useI18n } from "@/i18n/I18nProvider";
import { localeHref } from "@/lib/href";

export type ConceptKey = "pickup" | "distributor";

const PAGES: Record<ConceptKey, string> = {
  pickup: "/pickup-points",
  distributor: "/authorized-distributors",
};

export default function ConceptInfo({ concept, className = "" }: { concept: ConceptKey; className?: string }) {
  const { dict, locale } = useI18n();
  const info = dict.concepts[concept];

  return (
    <span className={`group/info relative inline-flex align-middle ${className}`}>
      <LocaleLink
        href={PAGES[concept]}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-[10px] font-bold leading-none text-gold-bright transition hover:border-gold hover:bg-gold/20"
        aria-label={info.title}
      >
        i
      </LocaleLink>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded-lg border border-line bg-ink-soft px-3 py-2 text-left text-xs leading-relaxed text-bone opacity-0 shadow-lg transition-opacity group-hover/info:opacity-100 group-focus-within/info:opacity-100"
      >
        <span className="mb-1 block font-medium text-cream">{info.title}</span>
        {info.tooltip}
        <span className="mt-1.5 block text-gold-deep group-hover/info:text-gold-bright">
          {dict.concepts.learnMore} →
        </span>
      </span>
    </span>
  );
}

/** Non-link variant for use inside links — tooltip only, page linked from tooltip text area. */
export function ConceptInfoInline({ concept }: { concept: ConceptKey }) {
  const { dict } = useI18n();
  const info = dict.concepts[concept];

  return (
    <span className="group/info relative inline-flex align-middle">
      <span
        tabIndex={0}
        className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-[10px] font-bold leading-none text-gold-bright"
        aria-label={info.title}
      >
        i
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded-lg border border-line bg-ink-soft px-3 py-2 text-left text-xs leading-relaxed text-bone opacity-0 shadow-lg transition-opacity group-hover/info:opacity-100 group-focus-within/info:opacity-100"
      >
        <span className="mb-1 block font-medium text-cream">{info.title}</span>
        {info.tooltip}
      </span>
    </span>
  );
}

export function conceptPageHref(locale: string, concept: ConceptKey): string {
  return localeHref(locale as "en" | "fr", PAGES[concept]);
}

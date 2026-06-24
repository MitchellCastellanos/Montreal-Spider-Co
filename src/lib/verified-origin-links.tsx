import { Fragment, type ReactNode } from "react";
import type { Locale } from "@/i18n/config";
import { SITE } from "@/lib/site";

const PHRASES: Record<Locale, string[]> = {
  en: ["TarantulApp Verified Origin", "Verified Origin"],
  fr: ["Origine Vérifiée TarantulApp", "Origine Vérifiée"],
};

const linkClass = "text-gold-bright hover:underline";

/** Inline link to the official TarantulApp Verified Origin page. */
export function VerifiedOriginLink({ children, className = linkClass }: { children: ReactNode; className?: string }) {
  return (
    <a href={SITE.verifiedOriginUrl} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}

/** Turn plain copy into text with Verified Origin phrases linked to TarantulApp. */
export function withVerifiedOriginLinks(text: string, locale: Locale): ReactNode {
  const phrases = PHRASES[locale];
  const pattern = new RegExp(
    `(${phrases.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
    "g",
  );
  const parts = text.split(pattern);

  return parts.map((part, i) =>
    phrases.includes(part) ? (
      <VerifiedOriginLink key={i}>{part}</VerifiedOriginLink>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

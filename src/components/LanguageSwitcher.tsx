"use client";

import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import { locales, type Locale } from "@/i18n/config";

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale } = useI18n();
  const pathname = usePathname();
  const router = useRouter();

  const switchTo = (next: Locale) => {
    if (next === locale) return;
    // eslint-disable-next-line react-hooks/immutability -- setting a browser cookie is a side effect, not state mutation
    document.cookie = `NEXT_LOCALE=${next};path=/;max-age=31536000;samesite=lax`;
    const segments = pathname.split("/");
    if ((locales as readonly string[]).includes(segments[1])) {
      segments[1] = next;
    } else {
      segments.splice(1, 0, next);
    }
    router.push(segments.join("/") || `/${next}`);
  };

  return (
    <div className={`inline-flex items-center rounded-full border border-line p-0.5 ${compact ? "text-xs" : "text-sm"}`}>
      {locales.map((loc) => (
        <button
          key={loc}
          onClick={() => switchTo(loc)}
          aria-pressed={loc === locale}
          className={`rounded-full px-2.5 py-1 font-semibold uppercase tracking-wide transition ${
            loc === locale ? "bg-gold text-ink" : "text-bone hover:text-gold-bright"
          }`}
        >
          {loc}
        </button>
      ))}
    </div>
  );
}

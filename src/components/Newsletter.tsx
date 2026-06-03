"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";

export default function Newsletter() {
  const { dict } = useI18n();
  const [done, setDone] = useState(false);
  const h = dict.home;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-line bg-ink-soft p-8 sm:p-12">
      <div className="web-grid pointer-events-none absolute inset-0 opacity-30" />
      <div className="relative mx-auto max-w-xl text-center">
        <h2 className="font-display text-3xl font-bold text-cream sm:text-4xl">{h.newsletterTitle}</h2>
        <p className="mt-3 text-bone">{h.newsletterBody}</p>
        {done ? (
          <p className="mt-6 text-lg text-ok">{h.newsletterThanks}</p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setDone(true);
            }}
            className="mx-auto mt-6 flex max-w-md flex-col gap-3 sm:flex-row"
          >
            <input type="email" required placeholder={h.newsletterPlaceholder} className="input" aria-label={dict.common.email} />
            <button className="btn btn-gold shrink-0">{h.newsletterButton}</button>
          </form>
        )}
      </div>
    </div>
  );
}

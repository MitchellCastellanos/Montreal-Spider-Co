"use client";

import { useMemo } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { formatWeeklyHoursSummary } from "@/lib/opening-hours";
import {
  formatAvailabilitySlot,
  formatDistributorCta,
  getDistributorAvailability,
  getSoonestDistributorAvailability,
} from "@/lib/distributor-availability";
import type { DistributorSnippet } from "@/lib/types";

type Variant = "card" | "detail";

export default function DistributorAvailabilityCta({
  distributors,
  variant = "card",
}: {
  distributors: DistributorSnippet[];
  variant?: Variant;
}) {
  const { dict, locale } = useI18n();
  const c = dict.common;

  const soonest = useMemo(() => getSoonestDistributorAvailability(distributors), [distributors]);
  const allAvail = useMemo(
    () =>
      distributors
        .map((d) => getDistributorAvailability(d))
        .filter((a): a is NonNullable<typeof a> => a !== null),
    [distributors],
  );

  if (!soonest) return null;

  const cta = formatDistributorCta(soonest, locale, {
    today: c.distributorCtaToday,
    soon: c.distributorCtaSoon,
  });

  const baseClass =
    variant === "detail"
      ? "rounded-xl border border-ok/30 bg-ok/10 p-4 text-sm leading-snug text-bone"
      : "rounded-lg border border-ok/25 bg-ok/10 px-2.5 py-2 text-[11px] leading-snug text-bone";

  return (
    <div className={`group/dist-cta relative ${baseClass}`} tabIndex={0}>
      <p className="font-medium text-ok">{cta}</p>
      {variant === "detail" && (
        <p className="mt-1 text-xs text-muted">{c.distributorCtaHint}</p>
      )}

      <div
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-0 z-50 mb-2 w-60 rounded-lg border border-line bg-ink-soft px-3 py-2.5 text-left text-[11px] leading-relaxed text-bone opacity-0 shadow-lg transition-opacity group-hover/dist-cta:opacity-100 group-focus-within/dist-cta:opacity-100"
      >
        <p className="mb-2 font-medium text-cream">{c.distributorHoverTitle}</p>
        <ul className="space-y-2.5">
          {allAvail.map((avail) => {
            const line = formatDistributorCta(avail, locale, {
              today: c.distributorCtaToday,
              soon: c.distributorCtaSoon,
            });
            const slot = formatAvailabilitySlot(avail.distributor.hours, avail.dayKey, locale);
            const d = avail.distributor;
            return (
              <li key={d.id} className="border-t border-line/60 pt-2 first:border-0 first:pt-0">
                <p className="font-medium text-cream">{line}</p>
                <p className="text-muted">{d.address}</p>
                {slot && <p className="text-gold-deep">{slot}</p>}
                <p className="text-xs text-muted">{formatWeeklyHoursSummary(d.hours, locale)}</p>
                {d.phone && <p className="mt-0.5 text-gold-bright">{d.phone}</p>}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

"use client";

import { useI18n } from "@/i18n/I18nProvider";
import { formatPrice } from "@/lib/format";

/** Recognisable Klarna wordmark pill (brand pink). */
export function KlarnaPill({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded bg-[#FFB3C7] px-1.5 py-0.5 text-[10px] font-extrabold leading-none tracking-tight text-black ${className}`}
    >
      Klarna
    </span>
  );
}

type Variant = "card" | "detail" | "summary";

/**
 * Promotes Klarna "Pay in 4" flexible payment (handled by Stripe at checkout).
 * - `card`    : compact line for product cards / listings.
 * - `detail`  : bordered block for the product page.
 * - `summary` : single line for cart / checkout summaries.
 */
export default function KlarnaBadge({
  amount,
  variant = "card",
  className = "",
}: {
  amount?: number;
  variant?: Variant;
  className?: string;
}) {
  const { dict, locale } = useI18n();
  const pay = dict.payments;
  const installment =
    typeof amount === "number" && amount > 0 ? formatPrice(amount / 4, locale) : null;

  if (variant === "detail") {
    return (
      <div className={`rounded-xl border border-line bg-ink-soft/40 p-3 ${className}`}>
        <div className="flex items-center gap-2">
          <KlarnaPill />
          <span className="text-sm font-medium text-cream">{pay.klarnaPay4}</span>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-bone">
          {installment
            ? pay.klarnaDetail.replace("{amount}", installment)
            : pay.klarnaDetailNoAmount}
        </p>
        <p className="mt-1 text-[11px] text-muted">{pay.disclaimer}</p>
      </div>
    );
  }

  if (variant === "summary") {
    return (
      <p className={`flex items-center gap-2 text-xs text-bone ${className}`}>
        <KlarnaPill />
        <span>{pay.klarnaSummary}</span>
      </p>
    );
  }

  return (
    <p className={`flex items-center gap-1.5 text-[11px] text-muted ${className}`}>
      <KlarnaPill />
      <span>
        {installment ? pay.klarnaInstallment.replace("{amount}", installment) : pay.klarnaPay4}
      </span>
    </p>
  );
}

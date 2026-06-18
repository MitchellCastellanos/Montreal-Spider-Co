"use client";

import { useEffect } from "react";
import LocaleLink from "@/components/LocaleLink";
import { useCart } from "@/context/CartContext";
import { useI18n } from "@/i18n/I18nProvider";
import { formatPrice } from "@/lib/format";

export interface CheckoutSuccessData {
  orderId: string;
  total: number;
  email: string;
}

export default function CheckoutSuccessView({ order }: { order: CheckoutSuccessData }) {
  const { dict, locale } = useI18n();
  const { clear } = useCart();
  const co = dict.checkout;

  useEffect(() => {
    clear();
  }, [clear]);

  return (
    <div className="container-x py-20">
      <div className="mx-auto max-w-lg text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-ok/15 text-4xl text-ok pulse-ring">
          ✓
        </div>
        <h1 className="font-display text-4xl font-bold text-cream">{co.successTitle}</h1>
        <p className="mt-3 text-bone">{co.successBody}</p>
        <div className="mt-6 rounded-2xl border border-gold/30 bg-gold/5 p-5">
          <p className="text-xs uppercase tracking-wide text-muted">{co.orderNumber}</p>
          <p className="font-display text-2xl font-bold text-gold-bright">{order.orderId}</p>
          <p className="mt-2 text-bone">{formatPrice(order.total, locale)}</p>
          <p className="mt-2 text-sm text-muted">{order.email}</p>
        </div>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <LocaleLink href="/account" className="btn btn-gold">
            {co.viewOrders}
          </LocaleLink>
          <LocaleLink href="/shop" className="btn btn-ghost">
            {co.keepShopping}
          </LocaleLink>
        </div>
      </div>
    </div>
  );
}

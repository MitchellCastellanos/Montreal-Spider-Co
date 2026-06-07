"use client";

import LocaleLink from "@/components/LocaleLink";
import SpiderGraphic from "@/components/SpiderGraphic";
import SpeciesImage from "@/components/SpeciesImage";
import { useCart } from "@/context/CartContext";
import { useI18n, useT } from "@/i18n/I18nProvider";
import { formatPrice } from "@/lib/format";

export default function CartView() {
  const { dict, locale } = useI18n();
  const tr = useT();
  const { resolved, subtotal, setQty, remove } = useCart();
  const c = dict.cart;

  if (resolved.length === 0) {
    return (
      <div className="container-x py-20 text-center">
        <div className="mx-auto w-40 opacity-40">
          <SpiderGraphic hue={42} animate={false} />
        </div>
        <h1 className="mt-6 font-display text-3xl font-bold text-cream">{c.empty}</h1>
        <p className="mt-2 text-bone">{c.emptyHint}</p>
        <LocaleLink href="/shop" className="btn btn-gold mt-6">{c.browse}</LocaleLink>
      </div>
    );
  }

  return (
    <div className="container-x py-12">
      <h1 className="mb-8 font-display text-4xl font-bold text-cream">{c.title}</h1>
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {resolved.map((line) => (
            <div key={line.key} className="card-glow flex gap-4 rounded-2xl p-4">
              <LocaleLink href={`/product/${line.product.slug}`} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-line" style={{ background: `radial-gradient(120% 120% at 50% 20%, hsl(${line.product.hue} 30% 16%), var(--ink))` }}>
                <SpeciesImage image={line.product.image} hue={line.product.hue} accent={line.product.accent} alt={tr(line.product.common)} sizes="96px" />
              </LocaleLink>
              <div className="flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <LocaleLink href={`/product/${line.product.slug}`} className="font-display text-lg font-semibold text-cream hover:text-gold-bright">
                      {tr(line.product.common)}
                    </LocaleLink>
                    <p className="text-xs italic text-muted">{line.product.scientific}</p>
                    <p className="mt-1 text-sm text-bone">{tr(line.size.label)}</p>
                  </div>
                  <button onClick={() => remove(line.productId, line.sizeId)} className="text-sm text-muted hover:text-danger">{c.remove}</button>
                </div>
                <div className="mt-auto flex items-center justify-between pt-3">
                  <div className="flex items-center gap-2 rounded-lg border border-line p-1">
                    <button onClick={() => setQty(line.productId, line.sizeId, line.qty - 1)} className="h-7 w-7 rounded text-bone hover:bg-ink hover:text-gold-bright" aria-label="-">−</button>
                    <span className="w-6 text-center text-sm text-cream">{line.qty}</span>
                    <button onClick={() => setQty(line.productId, line.sizeId, line.qty + 1)} className="h-7 w-7 rounded text-bone hover:bg-ink hover:text-gold-bright" aria-label="+">+</button>
                  </div>
                  <span className="font-display text-lg font-bold text-gold-bright">{formatPrice(line.lineTotal, locale)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <aside>
          <div className="card-glow sticky top-24 rounded-2xl p-6">
            <h2 className="font-display text-xl font-bold text-cream">{c.summary}</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between text-bone">
                <span>{c.subtotal}</span>
                <span className="text-cream">{formatPrice(subtotal, locale)}</span>
              </div>
              <div className="flex justify-between text-bone">
                <span>{c.shipping}</span>
                <span className="text-muted">{c.shippingAtCheckout}</span>
              </div>
            </div>
            <div className="my-4 h-px bg-line" />
            <div className="flex items-center justify-between">
              <span className="text-bone">{dict.common.total}</span>
              <span className="font-display text-2xl font-bold text-cream">{formatPrice(subtotal, locale)}</span>
            </div>
            <LocaleLink href="/checkout" className="btn btn-gold mt-5 w-full">{c.checkout} →</LocaleLink>
            <LocaleLink href="/shop" className="btn btn-ghost mt-2 w-full">{c.continue}</LocaleLink>
          </div>
        </aside>
      </div>
    </div>
  );
}

"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCart } from "@/context/CartContext";
import { useI18n, useT } from "@/i18n/I18nProvider";
import { formatPrice } from "@/lib/format";
import LocaleLink from "./LocaleLink";
import SpiderGraphic from "./SpiderGraphic";
import SpeciesImage from "./SpeciesImage";

export default function CartDrawer() {
  const { isOpen, closeCart, resolved, subtotal, setQty, remove, count } = useCart();
  const { dict, locale } = useI18n();
  const tr = useT();
  const c = dict.cart;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
          />
          <motion.aside
            className="fixed right-0 top-0 z-[61] flex h-full w-full max-w-md flex-col bg-ink-soft shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            role="dialog"
            aria-label={c.miniTitle}
          >
            <header className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="font-display text-xl text-cream">
                {c.miniTitle}{" "}
                <span className="text-sm text-muted">({count})</span>
              </h2>
              <button onClick={closeCart} aria-label={dict.nav.close} className="text-bone hover:text-gold-bright text-2xl leading-none">
                ×
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {resolved.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center text-muted">
                  <div className="w-28 opacity-40">
                    <SpiderGraphic hue={42} animate={false} />
                  </div>
                  <p className="mt-4">{c.miniEmpty}</p>
                  <LocaleLink href="/shop" onClick={closeCart} className="btn btn-ghost mt-5">
                    {c.browse}
                  </LocaleLink>
                </div>
              ) : (
                <ul className="space-y-4">
                  {resolved.map((line) => (
                    <li key={line.key} className="flex gap-3 border-b border-line/60 pb-4">
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-line bg-ink">
                        <SpeciesImage image={line.product.image} hue={line.product.hue} accent={line.product.accent} alt={tr(line.product.common)} sizes="64px" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <LocaleLink
                          href={`/product/${line.product.slug}`}
                          onClick={closeCart}
                          className="block truncate text-sm font-semibold text-cream hover:text-gold-bright"
                        >
                          {tr(line.product.common)}
                        </LocaleLink>
                        <p className="truncate text-xs italic text-muted">{line.product.scientific}</p>
                        <p className="text-xs text-bone">{line.size.label}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              className="h-6 w-6 rounded border border-line text-bone hover:border-gold"
                              onClick={() => setQty(line.productId, line.unitKey, line.qty - 1)}
                              aria-label="-"
                            >
                              −
                            </button>
                            <span className="w-5 text-center text-sm text-cream">{line.qty}</span>
                            <button
                              className="h-6 w-6 rounded border border-line text-bone hover:border-gold"
                              onClick={() => setQty(line.productId, line.unitKey, line.qty + 1)}
                              aria-label="+"
                            >
                              +
                            </button>
                          </div>
                          <span className="text-sm font-semibold text-gold-bright">
                            {formatPrice(line.lineTotal, locale)}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => remove(line.productId, line.unitKey)}
                        className="self-start text-xs text-muted hover:text-danger"
                        aria-label={c.remove}
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {resolved.length > 0 && (
              <footer className="border-t border-line px-5 py-4">
                <div className="mb-3 flex items-center justify-between text-sm">
                  <span className="text-bone">{c.subtotal}</span>
                  <span className="text-lg font-bold text-cream">
                    {formatPrice(subtotal, locale)}{" "}
                    <span className="text-xs font-normal text-muted">{dict.common.plusTaxes}</span>
                  </span>
                </div>
                <p className="mb-3 text-xs text-muted">{c.shippingAtCheckout}</p>
                <LocaleLink href="/checkout" onClick={closeCart} className="btn btn-gold w-full">
                  {c.checkout}
                </LocaleLink>
                <button onClick={closeCart} className="btn btn-ghost mt-2 w-full">
                  {c.continue}
                </button>
              </footer>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useCart, snapshotFromProduct } from "@/context/CartContext";
import { useI18n, useT } from "@/i18n/I18nProvider";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";

export default function AddToCart({ product }: { product: Product }) {
  const { dict, locale } = useI18n();
  const tr = useT();
  const { add } = useCart();
  const available = product.sizes.filter((s) => s.stock > 0);
  const [sizeId, setSizeId] = useState<string>(available[0]?.id ?? product.sizes[0].id);
  const [qty, setQty] = useState(1);
  const [pulse, setPulse] = useState(false);

  const selected = product.sizes.find((s) => s.id === sizeId)!;
  const soldOut = available.length === 0;

  const handleAdd = () => {
    if (soldOut) return;
    add(product.id, sizeId, qty, snapshotFromProduct(product, selected));
    setPulse(true);
    setTimeout(() => setPulse(false), 700);
  };

  return (
    <div>
      <div className="mb-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gold-deep">{dict.product.selectSize}</p>
        <div className="flex flex-wrap gap-2">
          {product.sizes.map((s) => {
            const disabled = s.stock === 0;
            const active = s.id === sizeId;
            return (
              <button
                key={s.id}
                disabled={disabled}
                onClick={() => setSizeId(s.id)}
                className={`rounded-xl border px-4 py-2.5 text-left transition ${
                  active ? "border-gold bg-gold/10" : "border-line hover:border-gold/50"
                } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
              >
                <span className="block text-sm font-semibold text-cream">{tr(s.label)}</span>
                <span className="block text-xs text-gold-bright">{formatPrice(s.price, locale)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">{dict.common.total}</p>
          <p className="font-display text-3xl font-bold text-cream">{formatPrice(selected.price * qty, locale)}</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-line p-1">
          <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="h-8 w-8 rounded-lg text-bone hover:bg-ink hover:text-gold-bright" aria-label="-">−</button>
          <span className="w-6 text-center text-cream">{qty}</span>
          <button onClick={() => setQty((q) => Math.min(selected.stock, q + 1))} className="h-8 w-8 rounded-lg text-bone hover:bg-ink hover:text-gold-bright" aria-label="+">+</button>
        </div>
      </div>

      <motion.button
        onClick={handleAdd}
        disabled={soldOut}
        animate={pulse ? { scale: [1, 1.04, 1] } : {}}
        className="btn btn-gold w-full text-base disabled:cursor-not-allowed disabled:opacity-50"
      >
        {soldOut ? dict.common.soldOut : pulse ? `✓ ${dict.common.added}` : dict.product.addToCart}
      </motion.button>

      {!soldOut && selected.stock <= 5 && (
        <p className="mt-2 text-center text-xs text-gold-deep">
          {dict.common.lowStock} · {selected.stock}
        </p>
      )}
    </div>
  );
}

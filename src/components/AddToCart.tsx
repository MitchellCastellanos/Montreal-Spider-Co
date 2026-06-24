"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import DistributorAvailabilityCta from "@/components/DistributorAvailabilityCta";
import UnitFulfillmentBadge from "@/components/UnitFulfillmentBadge";
import { useCart, snapshotFromProduct } from "@/context/CartContext";
import { useI18n } from "@/i18n/I18nProvider";
import { formatPrice } from "@/lib/format";
import { isAvailableAtDistributor, type Product } from "@/lib/types";
import { unitHasDistributorStock } from "@/lib/unit-fulfillment";

const SEX_LABEL_KEY = { unsexed: "sexUnsexed", male: "sexMale", female: "sexFemale" } as const;

export default function AddToCart({ product }: { product: Product }) {
  const { dict, locale } = useI18n();
  const { add } = useCart();
  const available = product.availability.filter((s) => s.stock > 0);
  const [unitKey, setUnitKey] = useState<string>(available[0]?.key ?? product.availability[0]?.key ?? "");
  const [qty, setQty] = useState(1);
  const [pulse, setPulse] = useState(false);

  const selected = product.availability.find((s) => s.key === unitKey);
  const soldOut = available.length === 0 || !selected;
  const distributorName = product.distributors?.[0]?.name;
  const showDistributorCta =
    isAvailableAtDistributor(product) &&
    product.distributors &&
    selected &&
    unitHasDistributorStock(selected);

  const handleAdd = () => {
    if (soldOut || !selected) return;
    add(product.id, unitKey, qty, snapshotFromProduct(product, selected));
    setPulse(true);
    setTimeout(() => setPulse(false), 700);
  };

  return (
    <div>
      <div className="mb-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gold-deep">{dict.product.selectSize}</p>
        <div className="flex flex-wrap gap-2">
          {product.availability.map((s) => {
            const disabled = s.stock === 0;
            const active = s.key === unitKey;
            return (
              <button
                key={s.key}
                disabled={disabled}
                onClick={() => setUnitKey(s.key)}
                className={`rounded-xl border px-4 py-2.5 text-left transition ${
                  active ? "border-gold bg-gold/10" : "border-line hover:border-gold/50"
                } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
              >
                <span className="block text-sm font-semibold text-cream">{s.sizeLabel}</span>
                <span className="block text-xs text-muted">{dict.product[SEX_LABEL_KEY[s.sex]]}</span>
                <UnitFulfillmentBadge unit={s} distributorName={distributorName} className="mt-0.5" />
                <span className="mt-0.5 block text-xs text-gold-bright">{formatPrice(s.price, locale)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">{dict.common.total}</p>
          <p className="font-display text-3xl font-bold text-cream">
            {formatPrice((selected?.price ?? 0) * qty, locale)}{" "}
            <span className="text-sm font-normal text-muted">{dict.common.plusTaxes}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-line p-1">
          <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="h-8 w-8 rounded-lg text-bone hover:bg-ink hover:text-gold-bright" aria-label="-">−</button>
          <span className="w-6 text-center text-cream">{qty}</span>
          <button onClick={() => setQty((q) => Math.min(selected?.stock ?? 1, q + 1))} className="h-8 w-8 rounded-lg text-bone hover:bg-ink hover:text-gold-bright" aria-label="+">+</button>
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

      {!soldOut && selected && selected.stock <= 5 && (
        <p className="mt-2 text-center text-xs text-gold-deep">
          {dict.common.lowStock} · {selected.stock}
        </p>
      )}

      {showDistributorCta && (
        <div className="mt-4">
          <DistributorAvailabilityCta distributors={product.distributors!} variant="detail" />
        </div>
      )}
    </div>
  );
}

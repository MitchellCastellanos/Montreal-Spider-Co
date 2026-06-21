"use client";

import { motion } from "framer-motion";
import LocaleLink from "./LocaleLink";
import SpeciesImage from "./SpeciesImage";
import DistributorAvailabilityCta from "./DistributorAvailabilityCta";
import { useCart, snapshotFromProduct } from "@/context/CartContext";
import { useI18n, useT } from "@/i18n/I18nProvider";
import { formatPrice } from "@/lib/format";
import { basePrice, isAvailableAtDistributor, isPurchasableOnline, warehouseStock, type Product } from "@/lib/types";

const expColor: Record<string, string> = {
  beginner: "text-ok",
  intermediate: "text-gold-bright",
  advanced: "text-danger",
};

export default function ProductCard({ product }: { product: Product }) {
  const { dict, locale } = useI18n();
  const { add } = useCart();
  const tr = useT();

  const stock = warehouseStock(product);
  const online = isPurchasableOnline(product);
  const atDistributor = isAvailableAtDistributor(product);
  const cheapest = product.sizes.reduce((a, b) => (b.price < a.price ? b : a), product.sizes[0]);
  const low = stock > 0 && stock <= 5;

  return (
    <motion.article
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="card-glow group flex flex-col overflow-hidden rounded-2xl"
    >
      <LocaleLink href={`/product/${product.slug}`} className="relative block">
        <div
          className="relative aspect-square overflow-hidden"
          style={{ background: `radial-gradient(120% 120% at 50% 20%, hsl(${product.hue} 30% 16%), var(--ink))` }}
        >
          <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-110">
            <SpeciesImage image={product.image} hue={product.hue} accent={product.accent} alt={tr(product.common)} sizes="(max-width: 768px) 50vw, 25vw" />
          </div>
          <div className="absolute left-3 top-3 flex flex-col gap-1.5">
            {product.newArrival && <span className="badge bg-gold/20">{dict.shop.sortNewest}</span>}
            {product.featured && !product.newArrival && (
              <span className="badge">{dict.home.featuredKicker}</span>
            )}
          </div>
          {!online && !atDistributor && (
            <div className="absolute inset-0 flex items-center justify-center bg-ink/70">
              <span className="badge text-sm">{dict.common.soldOut}</span>
            </div>
          )}
        </div>
      </LocaleLink>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className={`text-[11px] font-bold uppercase tracking-wider ${expColor[product.experience]}`}>
            {dict.filters[product.experience]}
          </span>
          {low && (
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gold-deep">{dict.common.lowStock}</span>
          )}
        </div>

        <LocaleLink href={`/product/${product.slug}`}>
          <h3 className="font-display text-lg font-semibold leading-tight text-cream transition-colors group-hover:text-gold-bright">
            {tr(product.common)}
          </h3>
        </LocaleLink>
        <p className="mb-3 text-xs italic text-muted">{product.scientific}</p>

        <div className="mb-3 flex flex-wrap gap-1.5">
          <Chip>{dict.filters[product.type]}</Chip>
          <Chip>{dict.filters[product.temperament]}</Chip>
        </div>

        {atDistributor && product.distributors && (
          <div className="mb-3">
            <DistributorAvailabilityCta distributors={product.distributors} variant="card" />
          </div>
        )}

        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted">{dict.common.from}</p>
            <p className="font-display text-xl font-bold text-cream">{formatPrice(basePrice(product), locale)}</p>
            {low && <p className="text-[11px] text-gold-deep">{dict.common.lowStock}</p>}
          </div>
          <button
            disabled={!online}
            onClick={() => add(product.id, cheapest.id, 1, snapshotFromProduct(product, cheapest))}
            className="btn btn-gold px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={`${dict.common.addToCart} — ${tr(product.common)}`}
          >
            +
          </button>
        </div>
      </div>
    </motion.article>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-line px-2 py-0.5 text-[11px] text-bone">{children}</span>
  );
}

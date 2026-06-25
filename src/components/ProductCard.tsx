"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import LocaleLink from "./LocaleLink";
import SpeciesImage from "./SpeciesImage";
import DistributorAvailabilityCta from "./DistributorAvailabilityCta";
import KlarnaBadge from "./KlarnaBadge";
import UnitFulfillmentBadge from "./UnitFulfillmentBadge";
import { useCart, snapshotFromProduct } from "@/context/CartContext";
import { useProductDisplay } from "@/hooks/useProductDisplay";
import { useI18n } from "@/i18n/I18nProvider";
import { formatPrice } from "@/lib/format";
import {
  CARD_AVAILABILITY_MAX,
  cardAvailabilityUnits,
  cardUnitSexSymbol,
  cardUnitShowsSex,
} from "@/lib/product-display";
import { basePrice, isAvailableAtDistributor, isPurchasableOnline, totalStock, type Product } from "@/lib/types";
import { unitHasDistributorStock } from "@/lib/unit-fulfillment";

const expColor: Record<string, string> = {
  beginner: "text-ok",
  intermediate: "text-gold-bright",
  advanced: "text-danger",
};

export default function ProductCard({ product }: { product: Product }) {
  const { dict, locale } = useI18n();
  const { add } = useCart();
  const { title, subtitle, imageAlt } = useProductDisplay(product);

  const stock = totalStock(product);
  const online = isPurchasableOnline(product);
  const atDistributor = isAvailableAtDistributor(product);
  const inStockUnits = cardAvailabilityUnits(product.availability);
  const visibleUnits = inStockUnits.slice(0, CARD_AVAILABILITY_MAX);
  const hiddenUnitCount = inStockUnits.length - visibleUnits.length;
  const defaultUnit = inStockUnits[0] ?? null;
  const [unitKey, setUnitKey] = useState(defaultUnit?.key ?? "");
  const selected =
    inStockUnits.find((u) => u.key === unitKey) ?? defaultUnit;
  const distributorName = product.distributors?.[0]?.name;
  const showDistributorCta =
    atDistributor &&
    product.distributors &&
    selected &&
    unitHasDistributorStock(selected);
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
          style={{ background: `radial-gradient(120% 120% at 50% 20%, hsl(${product.hue} var(--hue-sat) var(--hue-light)), var(--ink))` }}
        >
          <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-110">
            <SpeciesImage image={product.image} hue={product.hue} accent={product.accent} alt={imageAlt} sizes="(max-width: 768px) 50vw, 25vw" />
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
            {title}
          </h3>
        </LocaleLink>
        {subtitle && <p className="mb-3 text-xs text-muted">{subtitle}</p>}
        {!subtitle && <div className="mb-3" />}

        <div className="mb-3 flex flex-wrap gap-1.5">
          <Chip>{dict.filters[product.type]}</Chip>
          <Chip>{dict.filters[product.temperament]}</Chip>
        </div>

        {visibleUnits.length > 0 && (
          <ul
            className="mb-3 space-y-1 rounded-xl border border-line/60 bg-ink-soft/30 p-1.5"
            role="listbox"
            aria-label={dict.product.cardAvailability}
          >
            {visibleUnits.map((unit) => {
              const active = unit.key === selected?.key;
              return (
                <li key={unit.key} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => setUnitKey(unit.key)}
                    className={`flex w-full items-start justify-between gap-3 rounded-lg px-2 py-1.5 text-left transition ${
                      active ? "bg-gold/15 ring-1 ring-gold/40" : "hover:bg-ink-soft/60"
                    }`}
                  >
                    <span className="min-w-0 text-sm font-medium tabular-nums text-cream">
                      {unit.sizeLabel}
                      {cardUnitShowsSex(inStockUnits, unit) && (
                        <span className="ml-1 text-xs text-muted" aria-hidden>
                          {cardUnitSexSymbol(unit)}
                        </span>
                      )}
                      <UnitFulfillmentBadge
                        unit={unit}
                        distributorName={distributorName}
                        className="mt-0.5 font-normal normal-case tracking-normal"
                      />
                    </span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-gold-bright">
                      {formatPrice(unit.price, locale)}
                    </span>
                  </button>
                </li>
              );
            })}
            {hiddenUnitCount > 0 && (
              <li className="pt-0.5">
                <LocaleLink
                  href={`/product/${product.slug}`}
                  className="text-xs font-semibold text-gold-bright hover:underline"
                >
                  {dict.product.moreSizes.replace("{count}", String(hiddenUnitCount))}
                </LocaleLink>
              </li>
            )}
          </ul>
        )}

        {showDistributorCta && (
          <div className="mb-3">
            <DistributorAvailabilityCta distributors={product.distributors!} variant="card" />
          </div>
        )}

        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted">
              {inStockUnits.length > 1 && selected
                ? selected.sizeLabel
                : dict.common.from}
            </p>
            <p className="font-display text-xl font-bold text-cream">
              {formatPrice(selected?.price ?? basePrice(product), locale)}{" "}
              <span className="text-xs font-normal text-muted">{dict.common.plusTaxes}</span>
            </p>
            {online && (
              <KlarnaBadge amount={selected?.price ?? basePrice(product)} className="mt-1" />
            )}
            {low && <p className="text-[11px] text-gold-deep">{dict.common.lowStock}</p>}
          </div>
          <button
            disabled={!online || !selected}
            onClick={() => selected && add(product.id, selected.key, 1, snapshotFromProduct(product, selected))}
            className="btn btn-gold px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={
              selected
                ? `${dict.common.addToCart} — ${title}, ${selected.sizeLabel}`
                : `${dict.common.addToCart} — ${title}`
            }
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

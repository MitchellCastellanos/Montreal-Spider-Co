"use client";

import SpeciesImage from "./SpeciesImage";
import { useSelectedUnitKey } from "./ProductSelection";
import { useI18n } from "@/i18n/I18nProvider";
import type { Product } from "@/lib/types";

/**
 * Product photo that follows the selected variant (its own photo when it has one,
 * else the listing photo), with the "representative photo" notice and any
 * open-licence credit for the photo currently shown.
 */
export default function ProductHeroImage({
  product,
  alt,
  credits,
}: {
  product: Product;
  alt: string;
  /** photo URL → credit line, for photos imported from open catalogs. */
  credits: Record<string, string>;
}) {
  const { dict } = useI18n();
  const [unitKey] = useSelectedUnitKey(product);
  const unit = product.availability.find((u) => u.key === unitKey);
  const unitPhoto = unit?.photo;
  const shown = unitPhoto ?? product.image;
  const credit = shown ? credits[shown] : undefined;
  return (
    <div>
      <div
        className="relative aspect-square overflow-hidden rounded-3xl border border-line"
        style={{ background: `radial-gradient(130% 130% at 50% 20%, hsl(${product.hue} 32% 18%), var(--ink))` }}
      >
        <SpeciesImage
          key={shown ?? "none"}
          image={shown}
          isDefault={!unitPhoto && product.imageIsDefault}
          label={dict.product.photoRepresentative}
          hue={product.hue}
          accent={product.accent}
          alt={alt}
          sizes="(max-width: 1024px) 100vw, 50vw"
          priority
        />
      </div>
      {shown && (
        <p className="mt-2 text-xs leading-snug text-muted">
          {dict.product.photoNotice}
          {credit && <span className="mt-1 block">{credit}</span>}
        </p>
      )}
    </div>
  );
}

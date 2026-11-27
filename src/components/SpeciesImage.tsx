"use client";

import { useState } from "react";
import Image from "next/image";
import SpiderGraphic from "./SpiderGraphic";
import PhotoWatermark from "./PhotoWatermark";

export const SPECIES_PLACEHOLDER = "/images/species/_placeholder.png";

type Props = {
  image?: string;
  hue: number;
  accent?: string;
  alt: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
  animate?: boolean;
  /** The photo is the site-wide default fallback: it never carries the MSC photo credit. */
  isDefault?: boolean;
  /** Set false for tiny thumbnails (cart, checkout) where the credit would be unreadable. */
  watermark?: boolean;
  /** Short "Representative photo" chip shown on photos that are not of the actual specimen. */
  label?: string;
};

/**
 * Product photos are credited visually, without changing their source files.
 * The credit only goes on our own stock photos — never on the default fallback or the placeholder.
 */
export default function SpeciesImage({
  image, hue, accent, alt,
  sizes = "(max-width: 768px) 50vw, 25vw",
  priority, className = "object-cover", animate = false,
  isDefault = false, watermark = true, label,
}: Props) {
  const [failed, setFailed] = useState(false);
  const src = image || SPECIES_PLACEHOLDER;
  if (failed) {
    return <SpiderGraphic hue={hue} accent={accent} animate={animate} className="h-full w-full" />;
  }
  const isRealPhoto = Boolean(image) && image !== SPECIES_PLACEHOLDER;
  return (
    <div className="absolute inset-0">
      <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={className} onError={() => setFailed(true)} />
      {isRealPhoto && watermark && !isDefault && <PhotoWatermark />}
      {isRealPhoto && label && (
        <span className="pointer-events-none absolute bottom-[3%] left-[3%] z-[2] rounded-full bg-ink/70 px-2 py-0.5 text-[10px] font-medium text-bone backdrop-blur-sm">
          {label}
        </span>
      )}
    </div>
  );
}

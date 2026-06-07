"use client";

import { useState } from "react";
import Image from "next/image";
import SpiderGraphic from "./SpiderGraphic";

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
};

/**
 * Shows a product photo when available, the shared generic placeholder when not,
 * and gracefully falls back to the generated spider graphic if the image fails
 * to load (e.g. before the placeholder file has been uploaded).
 */
export default function SpeciesImage({
  image,
  hue,
  accent,
  alt,
  sizes = "(max-width: 768px) 50vw, 25vw",
  priority,
  className = "object-cover",
  animate = false,
}: Props) {
  const [failed, setFailed] = useState(false);
  const src = image || SPECIES_PLACEHOLDER;

  if (failed) {
    return <SpiderGraphic hue={hue} accent={accent} animate={animate} className="h-full w-full" />;
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}

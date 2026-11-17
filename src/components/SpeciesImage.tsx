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
};

/** Product photos are credited visually, without changing their source files. */
export default function SpeciesImage({
  image, hue, accent, alt,
  sizes = "(max-width: 768px) 50vw, 25vw",
  priority, className = "object-cover", animate = false,
}: Props) {
  const [failed, setFailed] = useState(false);
  const src = image || SPECIES_PLACEHOLDER;
  if (failed) {
    return <SpiderGraphic hue={hue} accent={accent} animate={animate} className="h-full w-full" />;
  }
  return (
    <div className="absolute inset-0">
      <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={className} onError={() => setFailed(true)} />
      {image && <PhotoWatermark />}
    </div>
  );
}

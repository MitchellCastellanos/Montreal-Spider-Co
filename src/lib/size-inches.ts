/** Leg-span size options in inches (1/8″ steps) for admin selects and shop filters. */

export const INCH_STEP = 0.125;
export const MIN_INCHES = 0.125; // 1/8″
export const MAX_INCHES = 12;

const FRAC_LABELS = ["", "1/8", "1/4", "3/8", "1/2", "5/8", "3/4", "7/8"] as const;

/** Format a decimal inch value as a readable label (e.g. 1.125 → `1 1/8″`). */
export function formatInches(inches: number): string {
  const eighths = Math.round(inches * 8);
  if (eighths <= 0) return "—";
  const whole = Math.floor(eighths / 8);
  const rem = eighths % 8;
  const frac = FRAC_LABELS[rem];
  if (whole === 0) return `${frac}″`;
  if (!frac) return `${whole}″`;
  return `${whole} ${frac}″`;
}

/** Compact range for product cards and size buttons. */
export function formatInchRange(min: number, max: number): string {
  if (min <= 0 && max <= 0) return "";
  if (Math.abs(min - max) < INCH_STEP / 2) return formatInches(min);
  return `${formatInches(min)}–${formatInches(max)}`;
}

export interface InchOption {
  value: number;
  label: string;
}

/** All selectable inch values from 1/8″ up to 12″. */
export const INCH_OPTIONS: InchOption[] = Array.from(
  { length: Math.round(MAX_INCHES / INCH_STEP) },
  (_, i) => {
    const value = (i + 1) * INCH_STEP;
    return { value, label: formatInches(value) };
  },
);

export function nearestInchOption(value: number): number {
  const clamped = Math.min(MAX_INCHES, Math.max(MIN_INCHES, value));
  const eighths = Math.round(clamped / INCH_STEP);
  return eighths * INCH_STEP;
}

/** True when a size band overlaps the filter range (inclusive). */
export function sizeOverlapsFilter(
  sizeMin: number,
  sizeMax: number,
  filterMin: number,
  filterMax: number,
): boolean {
  return sizeMin <= filterMax && sizeMax >= filterMin;
}

/** Product matches if any listed size overlaps the filter. */
export function productMatchesSizeFilter(
  sizes: { sizeMinInches: number; sizeMaxInches: number }[],
  filterMin: number,
  filterMax: number,
): boolean {
  return sizes.some((s) => sizeOverlapsFilter(s.sizeMinInches, s.sizeMaxInches, filterMin, filterMax));
}

/** Smallest / largest inch span across all size rows on a product. */
export function productInchSpan(sizes: { sizeMinInches: number; sizeMaxInches: number }[]): {
  min: number;
  max: number;
} {
  if (sizes.length === 0) return { min: 0, max: 0 };
  return {
    min: Math.min(...sizes.map((s) => s.sizeMinInches)),
    max: Math.max(...sizes.map((s) => s.sizeMaxInches)),
  };
}

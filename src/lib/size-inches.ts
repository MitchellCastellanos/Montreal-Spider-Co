/** Leg-span size options in inches (1/8″ steps) for admin selects and shop filters. */

export const INCH_STEP = 0.125;
export const MIN_INCHES = 0.125; // 1/8″
export const MAX_INCHES = 12;
export const CM_PER_INCH = 2.54;

const FRAC_LABELS = ["", "1/8", "1/4", "3/8", "1/2", "5/8", "3/4", "7/8"] as const;

/** Convert a leg span in centimeters (admin intake unit) to decimal inches. */
export function cmToInches(cm: number): number {
  return cm / CM_PER_INCH;
}

/** Convert decimal inches back to centimeters. */
export function inchesToCm(inches: number): number {
  return inches * CM_PER_INCH;
}

/** Format a cm value straight to the nearest-eighth inch label (e.g. 5.5cm → `2 1/8″`). */
export function formatCmAsInches(cm: number): string {
  return formatInches(cmToInches(cm));
}

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

/** Product matches if any available unit's size falls within the filter range (inclusive). */
export function productMatchesSizeFilter(
  units: { sizeInches: number }[],
  filterMin: number,
  filterMax: number,
): boolean {
  return units.some((u) => u.sizeInches >= filterMin && u.sizeInches <= filterMax);
}

/** Smallest / largest available size (inches) across all units on a product. */
export function productInchSpan(units: { sizeInches: number }[]): { min: number; max: number } {
  if (units.length === 0) return { min: 0, max: 0 };
  return {
    min: Math.min(...units.map((u) => u.sizeInches)),
    max: Math.max(...units.map((u) => u.sizeInches)),
  };
}

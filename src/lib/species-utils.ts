/** Client-safe helpers for species / product identity fields. */

export function deriveGenus(scientific: string): string {
  return scientific.trim().split(/\s+/)[0] ?? "";
}

export function deriveSlug(scientific: string, commonEn: string): string {
  const sci = scientific
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const common = commonEn
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return common && common !== sci ? `${sci}-${common}` : sci;
}

export function deriveHue(scientific: string): number {
  let hash = 0;
  for (const c of scientific.trim()) hash = (hash * 31 + c.charCodeAt(0)) % 360;
  return Math.abs(hash) || 36;
}

const ACCENT_PALETTE = [
  "#c9a24b", "#3a3a44", "#8b6914", "#2d4a3e", "#4a3728",
  "#1a3a5c", "#5c3a1a", "#3a1a5c", "#1a5c3a", "#5c1a3a",
];

export function deriveAccent(scientific: string): string {
  let hash = 0;
  for (const c of scientific.trim()) hash = (hash * 17 + c.charCodeAt(0)) >>> 0;
  return ACCENT_PALETTE[hash % ACCENT_PALETTE.length];
}

export const DEFAULT_SIZE_ROWS = [
  { key: "s", labelEn: "Sling", labelFr: "Jeune", sizeMinInches: 0.125, sizeMaxInches: 0.75, price: 0, stock: 0 },
  { key: "j", labelEn: "Juvenile", labelFr: "Juvénile", sizeMinInches: 0.875, sizeMaxInches: 1.75, price: 0, stock: 0 },
  { key: "u", labelEn: "Sub-adult", labelFr: "Sub-adulte", sizeMinInches: 2, sizeMaxInches: 3.5, price: 0, stock: 0 },
] as const;

export type SpeciesFormFields = {
  scientific: string;
  commonEn: string;
  commonFr: string;
  slug: string;
  genus: string;
  experience: string;
  type: string;
  temperament: string;
  hue: number;
  accent: string;
  featured: boolean;
  newArrival: boolean;
  careGuide: string;
  adultSizeEn: string;
  adultSizeFr: string;
  growthEn: string;
  growthFr: string;
  originEn: string;
  originFr: string;
  lifespanEn: string;
  lifespanFr: string;
  humidity: string;
  temperature: string;
  enclosureEn: string;
  enclosureFr: string;
  dietEn: string;
  dietFr: string;
  descriptionEn: string;
  descriptionFr: string;
};

export function emptySpeciesFields(): SpeciesFormFields {
  return {
    scientific: "",
    commonEn: "",
    commonFr: "",
    slug: "",
    genus: "",
    experience: "beginner",
    type: "terrestrial",
    temperament: "docile",
    hue: 36,
    accent: "#c9a24b",
    featured: false,
    newArrival: true,
    careGuide: "",
    adultSizeEn: "",
    adultSizeFr: "",
    growthEn: "",
    growthFr: "",
    originEn: "",
    originFr: "",
    lifespanEn: "",
    lifespanFr: "",
    humidity: "",
    temperature: "",
    enclosureEn: "",
    enclosureFr: "",
    dietEn: "",
    dietFr: "",
    descriptionEn: "",
    descriptionFr: "",
  };
}

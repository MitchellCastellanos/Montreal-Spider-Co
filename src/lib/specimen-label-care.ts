import type { Experience, SpecimenSex, SpiderType, Temperament } from "@/lib/types";

const TYPE_LABEL: Record<SpiderType, string> = {
  terrestrial: "Terrestrial",
  arboreal: "Arboreal",
  fossorial: "Fossorial",
};

const TEMPERAMENT_LABEL: Record<Temperament, string> = {
  docile: "Docile",
  skittish: "Skittish",
  defensive: "Defensive",
};

const EXPERIENCE_LABEL: Record<Experience, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

const SEX_LABEL: Record<SpecimenSex, string> = {
  unsexed: "Unsexed",
  male: "Male",
  female: "Female",
};

/** Short origin for a small label — first segment before a comma or dash. */
export function shortOrigin(origin: string): string | null {
  const trimmed = origin.trim();
  if (!trimmed) return null;
  const cut = trimmed.split(/[,–—-]/)[0]?.trim();
  return cut || trimmed;
}

export function formatSpecimenMeta(sizeLabel: string, sex: SpecimenSex): string {
  return `${sizeLabel} · ${SEX_LABEL[sex]}`;
}

export function formatCareTags(input: {
  type: SpiderType;
  temperament: Temperament;
  experience: Experience;
}): string {
  return [
    TYPE_LABEL[input.type],
    TEMPERAMENT_LABEL[input.temperament],
    EXPERIENCE_LABEL[input.experience],
  ].join(" · ");
}

export function formatClimate(humidity: string, temperature: string): string | null {
  const parts = [humidity.trim(), temperature.trim()].filter(Boolean);
  if (parts.length === 0) return null;
  if (parts.length === 2) return `${parts[0]} humidity · ${parts[1]}`;
  return humidity.trim() ? `${humidity.trim()} humidity` : parts[0] ?? null;
}

/** Two-line care block for small labels — tags, then climate + origin. */
export function formatCareBlock(input: {
  type: SpiderType;
  temperament: Temperament;
  experience: Experience;
  humidity: string;
  temperature: string;
  originEn: string;
}): string[] {
  const lines = [formatCareTags(input)];
  const detail = [formatClimate(input.humidity, input.temperature), shortOrigin(input.originEn)]
    .filter(Boolean)
    .join(" · ");
  if (detail) lines.push(detail);
  return lines;
}

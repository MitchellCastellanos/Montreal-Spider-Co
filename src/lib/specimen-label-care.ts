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

export type LabelFact = {
  label: string;
  value: string;
};

/** Short origin for a small label — first segment before a comma or dash. */
export function shortOrigin(origin: string): string | null {
  const trimmed = origin.trim();
  if (!trimmed) return null;
  const cut = trimmed.split(/[,–—-]/)[0]?.trim();
  return cut || trimmed;
}

/**
 * Left-column fact rows for terrarium labels. Deliberately excludes current
 * size: it changes with every molt, and this label is meant to stay on the
 * enclosure without a reprint until something that's actually worth a visit
 * changes — the only per-specimen fact that qualifies is sex, since a
 * specimen normally goes from unsexed to male/female exactly once (see
 * `recordSpecimenScan`, which is the only place that triggers a relabel).
 * Price is never printed here either — customers and partners alike always
 * see the live, current price by scanning the QR.
 */
export function buildLabelFacts(input: {
  sex: SpecimenSex;
  adultSizeEn: string;
  type: SpiderType;
  temperament: Temperament;
  experience: Experience;
  humidity: string;
  temperature: string;
  originEn: string;
}): LabelFact[] {
  const facts: LabelFact[] = [{ label: "Sex", value: SEX_LABEL[input.sex] }];

  const adult = input.adultSizeEn.trim();
  if (adult) facts.push({ label: "Adult", value: adult });

  facts.push(
    { label: "Type", value: TYPE_LABEL[input.type] },
    { label: "Nature", value: TEMPERAMENT_LABEL[input.temperament] },
    { label: "Level", value: EXPERIENCE_LABEL[input.experience] },
  );

  const humidity = input.humidity.trim();
  if (humidity) facts.push({ label: "Hum.", value: humidity });

  const temperature = input.temperature.trim();
  if (temperature) facts.push({ label: "Heat", value: temperature });

  const origin = shortOrigin(input.originEn);
  if (origin) facts.push({ label: "From", value: origin });

  return facts;
}

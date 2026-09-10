import { SITE } from "@/lib/site";
import type { Experience, SpecimenSex, SpiderType, Temperament } from "@/lib/types";

export type AdPlatform = "kijiji" | "morphmarket";

export interface AdCopyInput {
  scientific: string;
  commonName: string;
  sizeLabel: string;
  sex: SpecimenSex;
  price: number;
  includesEnclosure: boolean;
  experience: Experience;
  type: SpiderType;
  temperament: Temperament;
  originEn: string;
  adultSizeEn: string;
  descriptionEn: string;
  productUrl: string;
  tarantulAppId?: string | null;
}

const SEX_LABEL: Record<SpecimenSex, string> = {
  unsexed: "unsexed",
  male: "male",
  female: "female",
};

const TYPE_LABEL: Record<SpiderType, string> = {
  terrestrial: "terrestrial",
  arboreal: "arboreal",
  fossorial: "fossorial",
};

const TEMPERAMENT_LABEL: Record<Temperament, string> = {
  docile: "docile",
  skittish: "skittish",
  defensive: "defensive / fast",
};

const EXPERIENCE_LABEL: Record<Experience, string> = {
  beginner: "beginner-friendly",
  intermediate: "intermediate keepers",
  advanced: "advanced keepers",
};

function money(amount: number): string {
  return `$${amount.toFixed(amount % 1 === 0 ? 0 : 2)} CAD`;
}

/** Kijiji title field is short — keep it scannable and under ~64 chars. */
export function suggestAdTitle(input: AdCopyInput): string {
  const raw = `${input.commonName} tarantula (${input.scientific}) — ${input.sizeLabel} ${SEX_LABEL[input.sex]}`;
  if (raw.length <= 64) return raw;
  const short = `${input.commonName} tarantula — ${input.sizeLabel} ${SEX_LABEL[input.sex]}`;
  return short.length <= 64 ? short : short.slice(0, 63).trimEnd() + "…";
}

export function buildKijijiAdText(input: AdCopyInput): string {
  const sex = SEX_LABEL[input.sex];
  const enclosureLine = input.includesEnclosure
    ? "🏠 Comes bundled with a starter terrarium setup."
    : "🏠 Starter terrarium setups available on request.";

  return [
    `🕷️ ${input.commonName} (${input.scientific}) — ${input.sizeLabel}, ${sex}`,
    "",
    `Healthy, well-fed ${TYPE_LABEL[input.type]} tarantula from Montreal Spider Co., a local ${SITE.city} shop. ${input.descriptionEn}`.trim(),
    "",
    `📏 Current size: ${input.sizeLabel} (${sex})`,
    `🧬 Species: ${input.scientific}`,
    `🌡️ Care level: ${EXPERIENCE_LABEL[input.experience]}`,
    enclosureLine,
    input.originEn ? `📍 Native to: ${input.originEn}` : null,
    "",
    "🚇 Free hand-delivery to Montreal metro stations (Orange, Green, Blue & Yellow lines) — we meet you at a station near you, no live-animal shipping. Pickup also available at our Montreal location.",
    "",
    `💰 Price: ${money(input.price)}`,
    `🔗 More photos & full details: ${input.productUrl}`,
    "",
    `Montreal Spider Co. — ${SITE.city}, ${SITE.region}. Message us with any questions, we're happy to help!`,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

export function buildMorphMarketAdText(input: AdCopyInput): string {
  const sex = SEX_LABEL[input.sex];
  const verifiedLine = input.tarantulAppId
    ? `Verified Origin ID: ${input.tarantulAppId} — look it up on TarantulApp for full traceability.\n\n`
    : "";

  return [
    `${input.scientific} — ${input.commonName}`,
    `${sex[0].toUpperCase()}${sex.slice(1)} · ${input.sizeLabel} · ${money(input.price)}`,
    "",
    input.descriptionEn,
    "",
    `Husbandry notes: ${TYPE_LABEL[input.type]} species, ${TEMPERAMENT_LABEL[input.temperament]} temperament, suited to ${EXPERIENCE_LABEL[input.experience]}.${
      input.originEn ? ` Native range: ${input.originEn}.` : ""
    }${input.adultSizeEn ? ` Estimated adult size: ${input.adultSizeEn}.` : ""}`,
    "",
    "Delivery: Montreal Spider Co. hand-delivers locally to Montreal metro stations (Orange, Green, Blue & Yellow lines) and offers pickup at our Montreal, QC location — no live-animal shipping needed for local buyers. Out-of-town buyers, message us to discuss options.",
    "",
    `${verifiedLine}More photos & details: ${input.productUrl}`,
    `Montreal Spider Co. — Montreal, QC, Canada.`,
  ].join("\n");
}

export function buildAdText(platform: AdPlatform, input: AdCopyInput): string {
  return platform === "kijiji" ? buildKijijiAdText(input) : buildMorphMarketAdText(input);
}

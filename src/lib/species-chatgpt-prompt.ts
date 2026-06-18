import type { SpeciesFormFields } from "@/lib/species-utils";

const STYLE_EXAMPLE = `Example tone (do NOT copy facts — match this voice only):
DESCRIPTION_EN: The 'velvet jet' of the hobby — a glossy, all-black terrestrial that is famously calm and forgiving. Slow-growing but worth every molt, it's one of the best display tarantulas you can keep.
DESCRIPTION_FR: Le « velours noir » du loisir — une terrestre lustrée entièrement noire, réputée calme et tolérante. À croissance lente mais elle vaut chaque mue : l'une des meilleures mygales de présentation.`;

export function buildSpeciesChatGptPrompt(
  speciesLine: string,
  notes: string,
  careGuides: string[]
): string {
  const careOptions = careGuides.length ? careGuides.join(", ") : "beginner-setup, arboreal-setup, feeding-molting, rehousing-safely, advanced-husbandry";
  const notesBlock = notes.trim()
    ? `\nAdditional notes from the keeper (use if relevant):\n${notes.trim()}\n`
    : "";

  return `You are writing product copy for Montreal Spider Co., a bilingual (English + French) captive-bred tarantula shop in Montreal, Canada.

Your job: produce ALL fields below for ONE tarantula species so a shop admin can paste them directly into our listing form. Be accurate on husbandry facts. Write like a knowledgeable, warm hobbyist — not Wikipedia, not marketing fluff.

Rules:
- English and French must both read naturally (French: Quebec-friendly, not word-for-word translation).
- Descriptions: 2–3 sentences each, engaging, mention why keepers love this species.
- Temperature in Celsius (e.g. 22–26°C). Humidity as percentages (e.g. 60–70%).
- experience: exactly one of beginner | intermediate | advanced
- type: exactly one of terrestrial | arboreal | fossorial
- temperament: exactly one of docile | skittish | defensive
- careGuide: one slug from [${careOptions}] or none
- Keep field values on a single line each (no line breaks inside a value).
- Return ONLY the labeled block below — no intro, no markdown fences, no extra commentary.

${STYLE_EXAMPLE}

Reply using EXACTLY these labels (copy this structure):

COMMON_EN:
COMMON_FR:
GENUS:
EXPERIENCE:
TYPE:
TEMPERAMENT:
CARE_GUIDE:
DESCRIPTION_EN:
DESCRIPTION_FR:
ADULT_SIZE_EN:
ADULT_SIZE_FR:
GROWTH_EN:
GROWTH_FR:
ORIGIN_EN:
ORIGIN_FR:
LIFESPAN_EN:
LIFESPAN_FR:
HUMIDITY:
TEMPERATURE:
ENCLOSURE_EN:
ENCLOSURE_FR:
DIET_EN:
DIET_FR:
${notesBlock}
The species in question is: ${speciesLine.trim() || "(enter scientific name above, then copy this prompt again)"}`;
}

const FIELD_MAP: { key: keyof SpeciesFormFields; labels: string[] }[] = [
  { key: "commonEn", labels: ["COMMON_EN", "COMMON EN"] },
  { key: "commonFr", labels: ["COMMON_FR", "COMMON FR"] },
  { key: "genus", labels: ["GENUS"] },
  { key: "experience", labels: ["EXPERIENCE"] },
  { key: "type", labels: ["TYPE"] },
  { key: "temperament", labels: ["TEMPERAMENT"] },
  { key: "careGuide", labels: ["CARE_GUIDE", "CARE GUIDE"] },
  { key: "descriptionEn", labels: ["DESCRIPTION_EN", "DESCRIPTION EN"] },
  { key: "descriptionFr", labels: ["DESCRIPTION_FR", "DESCRIPTION FR"] },
  { key: "adultSizeEn", labels: ["ADULT_SIZE_EN", "ADULT SIZE EN", "ADULT LEG SPAN EN"] },
  { key: "adultSizeFr", labels: ["ADULT_SIZE_FR", "ADULT SIZE FR", "ADULT LEG SPAN FR"] },
  { key: "growthEn", labels: ["GROWTH_EN", "GROWTH EN", "GROWTH RATE EN"] },
  { key: "growthFr", labels: ["GROWTH_FR", "GROWTH FR", "GROWTH RATE FR"] },
  { key: "originEn", labels: ["ORIGIN_EN", "ORIGIN EN", "NATURAL RANGE EN"] },
  { key: "originFr", labels: ["ORIGIN_FR", "ORIGIN FR", "NATURAL RANGE FR"] },
  { key: "lifespanEn", labels: ["LIFESPAN_EN", "LIFESPAN EN", "LIFESPAN FEMALE EN"] },
  { key: "lifespanFr", labels: ["LIFESPAN_FR", "LIFESPAN FR", "LIFESPAN FEMALE FR"] },
  { key: "humidity", labels: ["HUMIDITY"] },
  { key: "temperature", labels: ["TEMPERATURE"] },
  { key: "enclosureEn", labels: ["ENCLOSURE_EN", "ENCLOSURE EN"] },
  { key: "enclosureFr", labels: ["ENCLOSURE_FR", "ENCLOSURE FR"] },
  { key: "dietEn", labels: ["DIET_EN", "DIET EN"] },
  { key: "dietFr", labels: ["DIET_FR", "DIET FR"] },
];

function normalizeLabel(line: string): string {
  return line
    .replace(/^\*\*|\*\*$/g, "")
    .replace(/:$/, "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
}

function cleanValue(value: string): string {
  return value.replace(/^\*\*|\*\*$/g, "").trim();
}

function normalizeCareGuide(value: string): string {
  const v = value.toLowerCase().trim();
  if (!v || v === "none" || v === "—" || v === "-") return "";
  return v.replace(/\s+/g, "-");
}

function normalizeEnum(value: string): string {
  return value.toLowerCase().trim();
}

/** Parse a ChatGPT reply in our labeled format into form fields. */
export function parseSpeciesChatGptResponse(text: string): Partial<SpeciesFormFields> {
  const result: Partial<SpeciesFormFields> = {};
  const lines = text.replace(/\r\n/g, "\n").split("\n");

  let currentKey: keyof SpeciesFormFields | null = null;
  let buffer: string[] = [];

  const flush = () => {
    if (!currentKey || buffer.length === 0) return;
    let value = cleanValue(buffer.join(" ").trim());
    if (currentKey === "careGuide") value = normalizeCareGuide(value);
    else if (currentKey === "experience" || currentKey === "type" || currentKey === "temperament") {
      value = normalizeEnum(value);
    }
    if (value) (result as Record<string, string>)[currentKey] = value;
    buffer = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      const label = normalizeLabel(line.slice(0, colonIdx));
      const rest = line.slice(colonIdx + 1).trim();
      const match = FIELD_MAP.find((f) => f.labels.some((l) => l === label || l.replace(/_/g, " ") === label.replace(/_/g, " ")));
      if (match) {
        flush();
        currentKey = match.key;
        if (rest) buffer.push(rest);
        continue;
      }
    }

    if (currentKey) buffer.push(line);
  }
  flush();

  return result;
}

export function countParsedFields(parsed: Partial<SpeciesFormFields>): number {
  return Object.values(parsed).filter((v) => v !== undefined && String(v).trim() !== "").length;
}

import "server-only";
import type { SpeciesInput } from "@/lib/data/species";
import { deriveGenus } from "@/lib/species-utils";

const VALID_EXPERIENCE = new Set(["beginner", "intermediate", "advanced"]);
const VALID_TYPE = new Set(["terrestrial", "arboreal", "fossorial"]);
const VALID_TEMPER = new Set(["docile", "skittish", "defensive"]);

type AiSpeciesJson = Partial<SpeciesInput> & { careGuide?: string | null };

function pickEnum<T extends string>(value: unknown, valid: Set<string>, fallback: T): T {
  const s = String(value ?? "").toLowerCase();
  return (valid.has(s) ? s : fallback) as T;
}

function str(value: unknown): string {
  return String(value ?? "").trim();
}

function parseAiResponse(raw: unknown, scientific: string): SpeciesInput {
  const j = (raw ?? {}) as AiSpeciesJson;
  return {
    scientific,
    commonEn: str(j.commonEn) || scientific,
    commonFr: str(j.commonFr) || str(j.commonEn) || scientific,
    genus: str(j.genus) || deriveGenus(scientific),
    experience: pickEnum(j.experience, VALID_EXPERIENCE, "beginner"),
    type: pickEnum(j.type, VALID_TYPE, "terrestrial"),
    temperament: pickEnum(j.temperament, VALID_TEMPER, "docile"),
    hue: 36,
    accent: "#c9a24b",
    image: null,
    adultSizeEn: str(j.adultSizeEn),
    adultSizeFr: str(j.adultSizeFr) || str(j.adultSizeEn),
    growthEn: str(j.growthEn),
    growthFr: str(j.growthFr) || str(j.growthEn),
    originEn: str(j.originEn),
    originFr: str(j.originFr) || str(j.originEn),
    lifespanEn: str(j.lifespanEn),
    lifespanFr: str(j.lifespanFr) || str(j.lifespanEn),
    humidity: str(j.humidity),
    temperature: str(j.temperature),
    enclosureEn: str(j.enclosureEn),
    enclosureFr: str(j.enclosureFr) || str(j.enclosureEn),
    dietEn: str(j.dietEn),
    dietFr: str(j.dietFr) || str(j.dietEn),
    descriptionEn: str(j.descriptionEn),
    descriptionFr: str(j.descriptionFr) || str(j.descriptionEn),
    careGuide: str(j.careGuide) || null,
  };
}

const SYSTEM = `You are a tarantula husbandry expert writing product content for Montreal Spider Co., a bilingual (EN/FR) captive-bred tarantula shop in Montreal, Canada.

Return ONLY valid JSON (no markdown). Be accurate, warm, and hobby-focused — not Wikipedia copy.
Temperature in Celsius (e.g. "22–26°C"). Humidity as percentages (e.g. "60–70%").
French text must be natural Quebec-friendly French, not machine-translated English.

JSON keys (all required unless noted):
commonEn, commonFr, genus, experience (beginner|intermediate|advanced), type (terrestrial|arboreal|fossorial), temperament (docile|skittish|defensive),
descriptionEn, descriptionFr (2-3 engaging sentences each),
adultSizeEn, adultSizeFr, growthEn, growthFr, originEn, originFr, lifespanEn, lifespanFr,
humidity, temperature, enclosureEn, enclosureFr, dietEn, dietFr,
careGuide (optional string slug like "beginner-setup" or null)`;

export async function generateSpeciesProfile(
  scientific: string,
  notes?: string
): Promise<SpeciesInput> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const trimmed = scientific.trim();
  if (!trimmed) throw new Error("Scientific name is required.");

  const user = `Species: ${trimmed}${notes?.trim() ? `\nNotes from keeper: ${notes.trim()}` : ""}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`AI request failed (${res.status})${err ? `: ${err.slice(0, 200)}` : ""}`);
  }

  const body = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = body.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI returned empty response.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("AI returned invalid JSON.");
  }

  return parseAiResponse(parsed, trimmed);
}

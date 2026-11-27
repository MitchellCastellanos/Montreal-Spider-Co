import { describe, expect, it } from "vitest";
import {
  buildSpeciesChatGptPrompt,
  countParsedFields,
  parseSpeciesChatGptResponse,
} from "@/lib/species-chatgpt-prompt";

// Golden sample of the single-species labeled format. Batch/validation work must keep this passing.
const SAMPLE = `COMMON_EN: Mexican Redknee
COMMON_FR: Mygale à genoux rouges
GENUS: Brachypelma
EXPERIENCE: Beginner
TYPE: terrestrial
TEMPERAMENT: Docile
CARE_GUIDE: beginner-setup
DESCRIPTION_EN: Calm and colourful.
second line of the description
DESCRIPTION_FR: Calme et colorée.
HUMIDITY: 60–70%
TEMPERATURE: 22–26°C`;

describe("parseSpeciesChatGptResponse (legacy single-species format)", () => {
  const parsed = parseSpeciesChatGptResponse(SAMPLE);

  it("reads labeled fields and lower-cases enums", () => {
    expect(parsed.commonEn).toBe("Mexican Redknee");
    expect(parsed.genus).toBe("Brachypelma");
    expect(parsed.experience).toBe("beginner");
    expect(parsed.temperament).toBe("docile");
    expect(parsed.careGuide).toBe("beginner-setup");
  });

  it("joins continuation lines into the previous field", () => {
    expect(parsed.descriptionEn).toBe("Calm and colourful. second line of the description");
  });

  it("accepts markdown-bold labels and label aliases", () => {
    const p = parseSpeciesChatGptResponse("**COMMON EN:** Brazilian Black\n**ADULT LEG SPAN EN:** 6–7\"");
    expect(p.commonEn).toBe("Brazilian Black");
    expect(p.adultSizeEn).toBe('6–7"');
  });

  it("treats CARE_GUIDE none/dash as empty", () => {
    expect(parseSpeciesChatGptResponse("CARE_GUIDE: none").careGuide).toBeUndefined();
    expect(parseSpeciesChatGptResponse("CARE_GUIDE: —").careGuide).toBeUndefined();
  });

  it("counts parsed fields and returns 0 for unrelated text", () => {
    expect(countParsedFields(parsed)).toBe(11);
    expect(countParsedFields(parseSpeciesChatGptResponse("hello world"))).toBe(0);
  });
});

describe("buildSpeciesChatGptPrompt", () => {
  it("ends with the species and lists the care guides", () => {
    const prompt = buildSpeciesChatGptPrompt("Brachypelma hamorii", "", ["beginner-setup"]);
    expect(prompt.trim().endsWith("Brachypelma hamorii")).toBe(true);
    expect(prompt).toContain("[beginner-setup]");
    expect(prompt).toContain("COMMON_EN:");
  });
});

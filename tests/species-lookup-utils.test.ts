import { describe, expect, it } from "vitest";
import {
  buildCreditNote,
  formatCreditNote,
  isAllowedPhotoUrl,
  normalizeScientific,
  pickPhotos,
  toPhotoOption,
} from "@/lib/species-lookup-utils";

describe("normalizeScientific", () => {
  it.each([
    ["Aphonopelma seemanni (Nicaragua)", "Aphonopelma seemanni"],
    ['Neoholothele incei "GOLD color form"', "Neoholothele incei"],
    ["Grammostola quirogai  (hobby G pulchra)", "Grammostola quirogai"],
    ["  brachypelma   HAMORII ", "Brachypelma hamorii"],
    ["Avicularia sp. braunshauseni", "Avicularia"],
    ["Phormictopus sp. Dominican Purple", "Phormictopus"],
    ["", ""],
    ["12345", ""],
  ])("%s -> %s", (input, expected) => {
    expect(normalizeScientific(input)).toBe(expected);
  });
});

describe("photo licensing and sources", () => {
  const base = {
    id: 4016251,
    attribution: "(c) Alan Rockefeller, some rights reserved (CC BY)",
    attribution_name: "Alan Rockefeller",
    square_url: "https://inaturalist-open-data.s3.amazonaws.com/photos/4016251/square.JPG",
    large_url: "https://inaturalist-open-data.s3.amazonaws.com/photos/4016251/large.JPG",
  };

  it("keeps CC BY and CC0, drops NC / SA / all-rights-reserved", () => {
    expect(toPhotoOption({ ...base, license_code: "cc-by" })?.creditName).toBe("Alan Rockefeller");
    expect(toPhotoOption({ ...base, license_code: "cc0" })?.creditName).toBe("");
    for (const code of ["cc-by-nc", "cc-by-sa", "cc-by-nd", "cc-by-nc-sa", null, undefined]) {
      expect(toPhotoOption({ ...base, license_code: code })).toBeNull();
    }
  });

  it("takes the author from the attribution text when attribution_name is missing (CC BY needs the author)", () => {
    const o = toPhotoOption({
      id: 5539434,
      license_code: "cc-by",
      attribution: "(c) nasua, some rights reserved (CC BY)",
      url: "https://inaturalist-open-data.s3.amazonaws.com/photos/5539434/square.jpeg",
    });
    expect(o?.creditName).toBe("nasua");
  });

  it("upgrades observation thumbnails (square) to large", () => {
    const o = toPhotoOption({ id: 7, license_code: "cc-by", url: "https://inaturalist-open-data.s3.amazonaws.com/photos/7/square.jpeg" });
    expect(o?.url).toBe("https://inaturalist-open-data.s3.amazonaws.com/photos/7/large.jpeg");
  });

  it("rejects photos hosted anywhere else (SSRF guard)", () => {
    expect(toPhotoOption({ id: 1, license_code: "cc0", url: "https://evil.example/photos/1/large.jpg" })).toBeNull();
    expect(isAllowedPhotoUrl("http://static.inaturalist.org/photos/1/large.jpg")).toBe(false);
    expect(isAllowedPhotoUrl("https://static.inaturalist.org/photos/1/large.jpg")).toBe(true);
    expect(isAllowedPhotoUrl("https://static.inaturalist.org/../etc/passwd")).toBe(false);
    expect(isAllowedPhotoUrl("https://inaturalist-open-data.s3.amazonaws.com.evil.com/photos/1/large.jpg")).toBe(false);
  });

  it("de-duplicates by id and keeps the first n in priority order", () => {
    const mk = (id: string) => ({ id, thumbUrl: "", url: "", license: "cc0" as const, creditName: "", attribution: "", sourceUrl: "" });
    const out = pickPhotos([mk("1"), null, mk("1"), mk("2"), mk("3"), mk("4"), mk("5")], 4);
    expect(out.map((p) => p.id)).toEqual(["1", "2", "3", "4"]);
  });

  it("round-trips the credit note shown on the product page", () => {
    const note = buildCreditNote({ creditName: "Alan Rockefeller", license: "cc-by", sourceUrl: "https://www.inaturalist.org/photos/4016251" });
    expect(formatCreditNote(note)).toBe("Photo: Alan Rockefeller · CC BY · iNaturalist");
    expect(buildCreditNote({ creditName: "", license: "cc0", sourceUrl: "x" })).toContain("iNaturalist contributor");
  });
});

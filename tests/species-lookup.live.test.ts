import { describe, expect, it } from "vitest";
import { lookupSpecies } from "@/lib/species-lookup";

// Hits the real iNaturalist + GBIF APIs. Run with: LIVE=1 npx vitest run tests/species-lookup.live.test.ts
describe.skipIf(!process.env.LIVE)("lookupSpecies (live)", () => {
  it("finds names, taxonomy and 4 commercially-usable photos", async () => {
    const r = await lookupSpecies('Brachypelma hamorii (Mexico)');
    console.log(JSON.stringify({ ...r, photos: r.photos.map((p) => [p.id, p.license, p.creditName, p.url]) }, null, 1));
    expect(r.exact).toBe(true);
    expect(r.names.commonFr).not.toBe("");
    expect(r.photos).toHaveLength(4);
    expect(r.photos.every((p) => p.license === "cc0" || p.license === "cc-by")).toBe(true);
  }, 30000);

  it("returns taxonomy and photos for a second species", async () => {
    const r = await lookupSpecies("Brachypelma albiceps");
    console.log(JSON.stringify({ taxonomy: r.taxonomy, warnings: r.warnings, exact: r.exact, photos: r.photos.length }));
  }, 30000);
});

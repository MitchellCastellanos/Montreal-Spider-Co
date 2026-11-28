import { describe, expect, it } from "vitest";
import { assessCatalog, parseCatalog, TARCAN_CATALOG_URL } from "@/lib/suppliers/tarcan";

// ONE read-only request to the supplier's public catalog. Run with: LIVE=1 npx vitest run tests/tarcan.live.test.ts
describe.skipIf(!process.env.LIVE)("TarCan catalog (live)", () => {
  it("parses the real payload into a plausible, valid catalog", async () => {
    const res = await fetch(TARCAN_CATALOG_URL, { headers: { "User-Agent": "MontrealSpiderCo-catalog-check/1.0 (test)" } });
    const parsed = parseCatalog(await res.json());
    const sex = { unsexed: 0, male: 0, female: 0 };
    for (const i of parsed.items) sex[i.sex]++;
    console.log(JSON.stringify({ animals: parsed.items.length, rejected: parsed.rejected, rowsSeen: parsed.rowsSeen, unparsableSizes: parsed.items.filter((i) => i.sizeCm == null).map((i) => i.sizeRaw), sex }));
    expect(assessCatalog(parsed, 0)).toEqual({ ok: true });
    expect(parsed.items.every((i) => i.price > 0 && i.rawName)).toBe(true);
  }, 30000);
});

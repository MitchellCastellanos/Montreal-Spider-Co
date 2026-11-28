import { describe, expect, it } from "vitest";
import { assessCatalog, cleanText, isListed, parseCatalog, parseSizeInchesToCm, speciesKey } from "@/lib/suppliers/tarcan";

// Synthetic rows shaped like the supplier's JSON (not copied data).
const animal = (over: Record<string, unknown> = {}) => ({
  itemid: 1,
  category: 1,
  image: "x.jpg",
  price: 45,
  saleprice: 0,
  wholesale2: 0,
  active: 1,
  i_table: "i_animal",
  notes: "",
  genus: "Brachypelma",
  species: "hamorii",
  size: '2"',
  sex: 1,
  sting: null,
  name: "Brachypelma hamorii",
  videos: [],
  unique: true,
  subitems: [],
  ...over,
});

describe("parseSizeInchesToCm", () => {
  it.each([
    ['1/2"', 1.27],
    ['2.5"', 6.35],
    ['3"', 7.62],
    ['1 1/2"', 3.81],
    ['1/8"', 0.32],
  ])("%s → %s cm", (raw, cm) => expect(parseSizeInchesToCm(raw)).toBe(cm));
  it.each(['3"3', "", "big", '0"', '99"'])("rejects %j", (raw) => expect(parseSizeInchesToCm(raw)).toBeNull());
});

describe("parseCatalog", () => {
  it("flattens nesting and de-duplicates by itemid (the supplier's nesting is not stable)", () => {
    const a = animal({ itemid: 1, subitems: [animal({ itemid: 2, size: '3"' })] });
    const b = animal({ itemid: 2, size: '3"' });
    // same set of ids in two different nestings → identical result
    const r1 = parseCatalog([a, b]);
    const r2 = parseCatalog([animal({ itemid: 1 }), animal({ itemid: 2, size: '3"', subitems: [animal({ itemid: 1 })] })]);
    expect(r1.items.map((i) => i.externalId).sort()).toEqual([1, 2]);
    expect(r2.items.map((i) => i.externalId).sort()).toEqual([1, 2]);
    expect(r1.rowsSeen).toBe(2);
  });

  it("maps sex, uses the sale price as the effective cost, flags new arrivals", () => {
    const { items } = parseCatalog([
      animal({ itemid: 1, sex: 0 }),
      animal({ itemid: 2, sex: 2, price: 150, saleprice: 125, sting: "New Arrival!" }),
    ]);
    expect(items[0].sex).toBe("unsexed");
    expect(items[1]).toMatchObject({ sex: "female", price: 125, listPrice: 150, salePrice: 125, isNewArrival: true });
  });

  it("ignores non-animals and inactive rows, rejects invalid rows, keeps a null size for unparsable text", () => {
    const r = parseCatalog([
      animal({ itemid: 1 }),
      animal({ itemid: 2, i_table: "i_drygoods" }),
      animal({ itemid: 3, active: 2 }),
      animal({ itemid: 4, price: 0 }),
      animal({ itemid: 5, sex: 9 }),
      animal({ itemid: 6, size: '3"3' }),
    ]);
    expect(r.items.map((i) => i.externalId).sort()).toEqual([1, 6]);
    expect(r.rejected).toBe(2);
    expect(r.items.find((i) => i.externalId === 6)!.sizeCm).toBeNull();
  });

  it("volume specials stay text (a commercial condition, not a quantity)", () => {
    const [i] = parseCatalog([animal({ notes: "3 for $90 special" })]).items;
    expect(i.notes).toBe("3 for $90 special");
    expect(i).not.toHaveProperty("quantity");
  });

  it("strips markup and control characters from supplier text", () => {
    expect(cleanText('<img src=x onerror=alert(1)>Hi\u0000 there')).toBe("Hi there");
    expect(cleanText("x".repeat(500)).length).toBe(200);
  });

  it("throws on a payload that is not a list (e.g. an HTML error page)", () => {
    expect(() => parseCatalog({ error: "x" })).toThrow();
    expect(() => parseCatalog("<html>")).toThrow();
  });
});

describe("assessCatalog", () => {
  const many = (n: number) => parseCatalog(Array.from({ length: n }, (_, i) => animal({ itemid: i + 1 })));
  it("accepts a normal catalog", () => expect(assessCatalog(many(200), 190)).toEqual({ ok: true }));
  it("rejects an empty / tiny response", () => {
    expect(assessCatalog(many(0), 200).ok).toBe(false);
    expect(assessCatalog(many(5), 0).ok).toBe(false);
  });
  it("rejects a >40% drop so a broken feed can't hide the whole catalog", () => {
    expect(assessCatalog(many(100), 200).ok).toBe(false);
    expect(assessCatalog(many(130), 200).ok).toBe(true);
  });
  it("rejects a response where too many rows are invalid (format change)", () => {
    const rows = [...Array.from({ length: 40 }, (_, i) => animal({ itemid: i + 1 })), ...Array.from({ length: 30 }, (_, i) => animal({ itemid: 100 + i, price: 0 }))];
    expect(assessCatalog(parseCatalog(rows), 0).ok).toBe(false);
  });
});

describe("isListed", () => {
  const now = new Date("2026-12-01T12:00:00Z");
  const h = (n: number) => new Date(now.getTime() - n * 3600_000);
  it("fresh and present → listed", () => expect(isListed({ lastSeenAt: h(2), missingRuns: 0 }, now)).toBe(true));
  it("one missed sync is tolerated, two are not", () => {
    expect(isListed({ lastSeenAt: h(30), missingRuns: 1 }, now)).toBe(true);
    expect(isListed({ lastSeenAt: h(30), missingRuns: 2 }, now)).toBe(false);
  });
  it("data older than 72h never counts, even if never marked missing (sync outage)", () => {
    expect(isListed({ lastSeenAt: h(73), missingRuns: 0 }, now)).toBe(false);
  });
});

describe("speciesKey", () => {
  it("matches exactly on Genus species; localities and forms collapse, nothing fuzzy", () => {
    expect(speciesKey('Aphonopelma seemanni (Nicaragua)')).toBe("aphonopelma seemanni");
    expect(speciesKey("Grammostola quirogai  (hobby G pulchra)")).toBe("grammostola quirogai"); // NOT pulchra
    expect(speciesKey("Avicularia sp. braunshauseni")).toBe("avicularia");
  });
});

import { describe, expect, it } from "vitest";
import { breakdownAt, computeOfferPrice, DEFAULT_PRICING, passesProfitGate } from "@/lib/external-orders/pricing";
import { planRotation, type RotationOffer } from "@/lib/external-orders/rotation";

describe("computeOfferPrice", () => {
  it("reproduces the audit table at a 25% target: $25 cost → $45, $55 → $90, $150 → $225", () => {
    // With the audit's 25% target:
    const p25 = { ...DEFAULT_PRICING, marginPct: 25 };
    expect(computeOfferPrice(25, p25)!.price).toBe(45);
    expect(computeOfferPrice(55, p25)!.price).toBe(90);
    expect(computeOfferPrice(150, p25)!.price).toBe(225);
  });

  it("always meets both the margin target and the minimum profit, and is a multiple of the rounding step", () => {
    for (const cost of [10, 25, 35, 55, 75, 105, 150, 250]) {
      for (const marginPct of [20, 30, 40]) {
        const p = { ...DEFAULT_PRICING, marginPct };
        const r = computeOfferPrice(cost, p)!;
        expect(r.operatingProfit).toBeGreaterThanOrEqual(p.minProfit - 0.01);
        expect(r.operatingMarginPct).toBeGreaterThanOrEqual(marginPct - 0.01);
        expect(r.price % 5).toBe(0);
        // …and it is the SMALLEST such price at that rounding step
        expect(passesProfitGate(r.price - 5, cost, p)).toBe(false);
      }
    }
  });

  it("cheap specimens are driven by the minimum profit, expensive ones by the margin %", () => {
    const cheap = computeOfferPrice(20, DEFAULT_PRICING)!;
    expect(cheap.operatingProfit).toBeGreaterThanOrEqual(12);
    const dear = computeOfferPrice(200, DEFAULT_PRICING)!;
    expect(dear.operatingMarginPct).toBeGreaterThanOrEqual(30);
  });

  it("returns null when the margin target is impossible", () => {
    expect(computeOfferPrice(50, { ...DEFAULT_PRICING, marginPct: 99 })).toBeNull();
  });

  it("distinguishes gross profit from operating profit", () => {
    const b = breakdownAt(90, 55, DEFAULT_PRICING);
    expect(b.grossProfit).toBe(35);
    expect(b.operatingProfit).toBeLessThan(b.grossProfit);
  });
});

const NOW = new Date("2026-12-01T12:00:00Z");
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86400000);
const offer = (id: string, over: Partial<RotationOffer> = {}): RotationOffer => ({
  id,
  productId: `p-${id}`,
  published: false,
  publishedAt: null,
  rotates: true,
  pinned: false,
  eligible: true,
  ...over,
});

describe("planRotation", () => {
  it("fills the slots with the MOST visited offers", () => {
    const offers = [offer("a"), offer("b"), offer("c"), offer("d")];
    const plan = planRotation({ offers, visitsByProduct: { "p-a": 50, "p-b": 3, "p-c": 10, "p-d": 0 }, slots: 2, minDays: 7, now: NOW });
    expect(plan.publish.sort()).toEqual(["a", "c"]);
    expect(plan.unpublish).toEqual([]);
  });

  it("rotates out the LEAST visited offer once its minimum display time has passed", () => {
    const offers = [offer("a", { published: true, publishedAt: daysAgo(10) }), offer("b")];
    const plan = planRotation({ offers, visitsByProduct: { "p-a": 1, "p-b": 100 }, slots: 1, minDays: 7, now: NOW });
    expect(plan.publish).toEqual(["b"]);
    expect(plan.unpublish).toEqual(["a"]);
  });

  it("keeps a well-visited offer even after its minimum time", () => {
    const offers = [offer("a", { published: true, publishedAt: daysAgo(30) }), offer("b")];
    const plan = planRotation({ offers, visitsByProduct: { "p-a": 100, "p-b": 1 }, slots: 1, minDays: 7, now: NOW });
    expect(plan.publish).toEqual([]);
    expect(plan.unpublish).toEqual([]);
  });

  it("does NOT flap: an offer inside its minimum display time stays, even with zero visits", () => {
    const offers = [offer("a", { published: true, publishedAt: daysAgo(2) }), offer("b")];
    const plan = planRotation({ offers, visitsByProduct: { "p-a": 0, "p-b": 100 }, slots: 1, minDays: 7, now: NOW });
    expect(plan.publish).toEqual([]);
    expect(plan.unpublish).toEqual([]);
    expect(plan.reasons.a).toMatch(/Minimum display time/);
  });

  it("pinned offers always stay, take a slot, and are never rotated out", () => {
    const offers = [offer("pin", { published: true, publishedAt: daysAgo(60), pinned: true }), offer("x"), offer("y")];
    const plan = planRotation({ offers, visitsByProduct: { "p-pin": 0, "p-x": 5, "p-y": 1 }, slots: 2, minDays: 7, now: NOW });
    expect(plan.unpublish).toEqual([]);
    expect(plan.publish).toEqual(["x"]); // the most visited of the rest takes the one free slot
    expect(plan.visibleAfter).toBe(2);
  });

  it("an offer below the profit gate is hidden, even if pinned or not rotating", () => {
    const offers = [offer("low", { published: true, publishedAt: daysAgo(1), pinned: true, eligible: false }), offer("ok")];
    const plan = planRotation({ offers, visitsByProduct: {}, slots: 5, minDays: 7, now: NOW });
    expect(plan.unpublish).toEqual(["low"]);
    expect(plan.publish).toEqual(["ok"]);
  });

  it("offers marked 'not rotating' are left alone", () => {
    const offers = [offer("fixed", { published: true, publishedAt: daysAgo(90), rotates: false }), offer("hidden-fixed", { rotates: false }), offer("r")];
    const plan = planRotation({ offers, visitsByProduct: { "p-r": 0 }, slots: 5, minDays: 7, now: NOW });
    expect(plan.unpublish).toEqual([]);
    expect(plan.publish).toEqual(["r"]); // 'hidden-fixed' is not auto-published
  });

  it("ties keep what is already visible; the result is deterministic whatever the input order", () => {
    const offers = [offer("a"), offer("b", { published: true, publishedAt: daysAgo(30) }), offer("c")];
    const one = planRotation({ offers, visitsByProduct: {}, slots: 1, minDays: 7, now: NOW });
    const two = planRotation({ offers: [...offers].reverse(), visitsByProduct: {}, slots: 1, minDays: 7, now: NOW });
    expect(one.publish).toEqual([]); // b stays
    expect(one.unpublish).toEqual([]);
    expect(two).toEqual(one);
  });

  it("zero slots hides every rotating, unpinned offer once unlocked", () => {
    const offers = [offer("a", { published: true, publishedAt: daysAgo(20) })];
    expect(planRotation({ offers, visitsByProduct: {}, slots: 0, minDays: 7, now: NOW }).unpublish).toEqual(["a"]);
  });
});

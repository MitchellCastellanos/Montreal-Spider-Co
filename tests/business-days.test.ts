import { describe, expect, it } from "vitest";
import { computeCollectBy, DEFAULT_PICKUP_HOURS } from "@/lib/business-days";

// Default meetup hours: Mon–Sat, closing 16:30 America/Toronto (EST = UTC−5 in November).
describe("computeCollectBy", () => {
  const readyMonday = new Date("2026-11-23T20:00:00Z"); // Mon 15:00 local

  it("day 1 is the next open day, until closing time", () => {
    expect(computeCollectBy(readyMonday, 1, DEFAULT_PICKUP_HOURS).toISOString()).toBe("2026-11-24T21:30:00.000Z");
  });

  it("skips closed days (Sunday)", () => {
    expect(computeCollectBy(readyMonday, 5, DEFAULT_PICKUP_HOURS).toISOString()).toBe("2026-11-28T21:30:00.000Z"); // Sat
    expect(computeCollectBy(readyMonday, 6, DEFAULT_PICKUP_HOURS).toISOString()).toBe("2026-11-30T21:30:00.000Z"); // next Mon
  });

  it("treats fewer than 1 day as 1", () => {
    expect(computeCollectBy(readyMonday, 0, DEFAULT_PICKUP_HOURS).toISOString()).toBe("2026-11-24T21:30:00.000Z");
  });
});

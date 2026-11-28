import { describe, expect, it } from "vitest";
import {
  apologyCouponCode,
  authExpiry,
  extendDeadline,
  hasEquivalentOwnUnit,
  holdUrgency,
  initialHoldDeadline,
  offerUnitKey,
  parseOfferKey,
  DEFAULT_EXTERNAL_SETTINGS,
} from "@/lib/external-orders/pure";

// Default supplier hours placeholder: Mon–Sat, closes 16:30 America/Toronto (EST = UTC−5 in November).
const H = DEFAULT_EXTERNAL_SETTINGS.supplierHours;
const S = DEFAULT_EXTERNAL_SETTINGS;

describe("offer keys", () => {
  it("round-trips and never matches own-inventory keys", () => {
    expect(parseOfferKey(offerUnitKey("abc"))).toBe("abc");
    expect(parseOfferKey("7.62:female:55")).toBeNull();
    expect(parseOfferKey("ext:")).toBeNull();
  });
});

describe("initialHoldDeadline", () => {
  it("1 business day = closing time of the next open supplier day", () => {
    const monday = new Date("2026-11-23T20:00:00Z"); // Mon 15:00 local
    const { deadline } = initialHoldDeadline(monday, S);
    expect(deadline.toISOString()).toBe("2026-11-24T21:30:00.000Z");
  });

  it("an order on Saturday evening skips Sunday", () => {
    const sat = new Date("2026-11-28T23:00:00Z");
    expect(initialHoldDeadline(sat, S).deadline.toISOString()).toBe("2026-11-30T21:30:00.000Z"); // Mon close
  });

  it("never exceeds the authorization expiry", () => {
    const { deadline, authExpiresAt } = initialHoldDeadline(new Date("2026-11-23T20:00:00Z"), { ...S, confirmDays: 20, authSafeDays: 2 });
    expect(deadline.getTime()).toBe(authExpiresAt.getTime());
  });
});

describe("extendDeadline", () => {
  const authAt = new Date("2026-11-23T20:00:00Z");
  const expires = authExpiry(authAt, 4); // Fri 15:00 local

  it("adds one supplier business day from the current deadline", () => {
    const current = new Date("2026-11-24T21:30:00Z"); // Tue close
    const r = extendDeadline(current, new Date("2026-11-24T18:00:00Z"), 1, H, expires);
    expect(r).toMatchObject({ ok: true, capped: false });
    expect(r.ok && r.deadline.toISOString()).toBe("2026-11-25T21:30:00.000Z"); // Wed close
  });

  it("extends from now when the deadline already passed", () => {
    const r = extendDeadline(new Date("2026-11-24T21:30:00Z"), new Date("2026-11-25T15:00:00Z"), 1, H, expires);
    expect(r.ok && r.deadline.toISOString()).toBe("2026-11-26T21:30:00.000Z"); // Thu close
  });

  it("caps at the authorization expiry instead of risking a lapsed hold", () => {
    const r = extendDeadline(new Date("2026-11-26T21:30:00Z"), new Date("2026-11-26T15:00:00Z"), 5, H, expires);
    expect(r).toMatchObject({ ok: true, capped: true });
    expect(r.ok && r.deadline.getTime()).toBe(expires.getTime());
  });

  it("refuses when the authorization is already used up", () => {
    const r = extendDeadline(expires, new Date(expires.getTime() + 1000), 1, H, expires);
    expect(r).toEqual({ ok: false, reason: "auth_expired" });
  });
});

describe("holdUrgency", () => {
  const now = new Date("2026-11-24T12:00:00Z");
  it("classifies deadlines", () => {
    expect(holdUrgency(new Date("2026-11-24T11:00:00Z"), now)).toBe("overdue");
    expect(holdUrgency(new Date("2026-11-25T11:00:00Z"), now)).toBe("due_soon");
    expect(holdUrgency(new Date("2026-11-27T11:00:00Z"), now)).toBe("ok");
  });
});

describe("hasEquivalentOwnUnit", () => {
  const offer = { sizeCm: 7.0, sex: "female" };
  it("matches same sex within tolerance and only when in stock", () => {
    expect(hasEquivalentOwnUnit(offer, [{ sizeCm: 7.3, sex: "female", stock: 1 }])).toBe(true);
    expect(hasEquivalentOwnUnit(offer, [{ sizeCm: 7.3, sex: "male", stock: 1 }])).toBe(false);
    expect(hasEquivalentOwnUnit(offer, [{ sizeCm: 9, sex: "female", stock: 1 }])).toBe(false);
    expect(hasEquivalentOwnUnit(offer, [{ sizeCm: 7, sex: "female", stock: 0 }])).toBe(false);
  });
});

describe("apologyCouponCode", () => {
  it("has the SORRY- prefix and 6 unambiguous chars", () => {
    expect(apologyCouponCode()).toMatch(/^SORRY-[A-HJKMNP-Z2-9]{6}$/);
  });
});

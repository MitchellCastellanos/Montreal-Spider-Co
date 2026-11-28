/**
 * Pure helpers for external (made-to-order) offers and the authorization-hold window.
 * No database, Stripe or "server-only" imports so everything here is unit-testable.
 */
import { computeCollectBy, DEFAULT_PICKUP_HOURS } from "@/lib/business-days";
import type { WeeklyHours } from "@/lib/opening-hours";

export const OFFER_KEY_PREFIX = "ext:";

/** Unit key for an external offer in the storefront (never contains the price, so price edits don't break carts). */
export function offerUnitKey(offerId: string): string {
  return `${OFFER_KEY_PREFIX}${offerId}`;
}

/** The offer id from a unit key, or null when it is a regular (own-inventory) key. */
export function parseOfferKey(unitKey: string): string | null {
  return unitKey.startsWith(OFFER_KEY_PREFIX) && unitKey.length > OFFER_KEY_PREFIX.length
    ? unitKey.slice(OFFER_KEY_PREFIX.length)
    : null;
}

export interface ExternalSettings {
  /** Master switch — everything external is hidden/refused while false. */
  enabled: boolean;
  /** Supplier business days MSC has to confirm (closing time of the Nth open day). */
  confirmDays: number;
  /** Days after authorization that MSC still considers the card hold safe to capture (Stripe's default window is 7). */
  authSafeDays: number;
  /** Default apology credit (CAD) offered when a specimen can't be obtained. 0 = none. */
  apologyCredit: number;
  /** Supplier opening hours — the confirm window only counts these days. */
  supplierHours: WeeklyHours;
}

export const DEFAULT_EXTERNAL_SETTINGS: ExternalSettings = {
  enabled: false,
  confirmDays: 1,
  authSafeDays: 4,
  apologyCredit: 10,
  // Placeholder until the supplier's real hours are confirmed (Admin → Special orders).
  supplierHours: DEFAULT_PICKUP_HOURS,
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Last moment the authorization is still considered safe to capture. */
export function authExpiry(authorizedAt: Date, authSafeDays: number): Date {
  return new Date(authorizedAt.getTime() + Math.max(1, authSafeDays) * DAY_MS);
}

/** First confirm-by deadline: closing time of the Nth supplier business day, never past the auth expiry. */
export function initialHoldDeadline(
  authorizedAt: Date,
  settings: Pick<ExternalSettings, "confirmDays" | "authSafeDays" | "supplierHours">,
): { deadline: Date; authExpiresAt: Date } {
  const authExpiresAt = authExpiry(authorizedAt, settings.authSafeDays);
  const raw = computeCollectBy(authorizedAt, settings.confirmDays, settings.supplierHours);
  return { deadline: raw > authExpiresAt ? authExpiresAt : raw, authExpiresAt };
}

export type ExtendResult =
  | { ok: true; deadline: Date; capped: boolean }
  | { ok: false; reason: "auth_expired" };

/**
 * Push the confirm-by deadline out by N supplier business days (counted from the later of the
 * current deadline and now). It can never pass the authorization expiry; if it would, it is capped
 * there (`capped: true`). If the authorization is already at/over its limit nothing can be extended.
 */
export function extendDeadline(
  current: Date,
  now: Date,
  extraDays: number,
  hours: WeeklyHours,
  authExpiresAt: Date,
): ExtendResult {
  if (authExpiresAt <= now || authExpiresAt <= current) return { ok: false, reason: "auth_expired" };
  const base = current > now ? current : now;
  const target = computeCollectBy(base, Math.max(1, Math.floor(extraDays)), hours);
  return target > authExpiresAt
    ? { ok: true, deadline: authExpiresAt, capped: true }
    : { ok: true, deadline: target, capped: false };
}

export type HoldUrgency = "ok" | "due_soon" | "overdue";

/** `due_soon` = within the next 24h. */
export function holdUrgency(deadline: Date, now: Date): HoldUrgency {
  if (deadline <= now) return "overdue";
  return deadline.getTime() - now.getTime() <= DAY_MS ? "due_soon" : "ok";
}

/**
 * True when MSC already stocks an equivalent specimen (same sex, size within `toleranceCm`),
 * in which case the external offer is hidden so own inventory is always preferred.
 */
export function hasEquivalentOwnUnit(
  offer: { sizeCm: number; sex: string },
  ownUnits: { sizeCm: number; sex: string; stock: number }[],
  toleranceCm = 0.5,
): boolean {
  return ownUnits.some(
    (u) => u.stock > 0 && u.sex === offer.sex && Math.abs(u.sizeCm - offer.sizeCm) <= toleranceCm,
  );
}

/** Generates an apology coupon code like SORRY-7K2Q9X (no ambiguous characters). */
export function apologyCouponCode(random: () => number = Math.random): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(random() * alphabet.length)];
  return `SORRY-${out}`;
}

import {
  DAY_KEYS,
  parseWeeklyHours,
  sameHours,
  type DayKey,
  type WeeklyHours,
} from "@/lib/opening-hours";

/** Store timezone — pickup hours are always expressed in local Montréal time. */
export const STORE_TZ = "America/Toronto";

/**
 * Hours used when an order has no pickup location with usable opening hours
 * (metro / custom meetups, or a location with every day marked closed).
 * Mirrors the public meetup schedule: Mon–Sat, 9:30–16:30.
 */
export const DEFAULT_PICKUP_HOURS: WeeklyHours = sameHours(
  ["mon", "tue", "wed", "thu", "fri", "sat"],
  "09:30",
  "16:30",
);

/** Safety cap so a bad config can never loop forever. */
const MAX_SCAN_DAYS = 120;

function hasOpenDay(hours: WeeklyHours): boolean {
  return DAY_KEYS.some((d) => {
    const s = hours[d];
    return s && !s.closed && s.open && s.close;
  });
}

/** Normalises whatever is stored on a location (JSON) into usable weekly hours. */
export function resolvePickupHours(raw: unknown): WeeklyHours {
  const parsed = parseWeeklyHours(raw);
  return parsed && hasOpenDay(parsed) ? parsed : DEFAULT_PICKUP_HOURS;
}

/** Offset (ms) of STORE_TZ from UTC at the given instant. */
function tzOffsetMs(at: Date): number {
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone: STORE_TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(at);
  const n = (t: string) => Number(p.find((x) => x.type === t)?.value);
  const asUtc = Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"), n("second"));
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

/** Local calendar date (in STORE_TZ) of an instant. */
function localDate(at: Date): { y: number; m: number; d: number } {
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone: STORE_TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(at);
  const n = (t: string) => Number(p.find((x) => x.type === t)?.value);
  return { y: n("year"), m: n("month"), d: n("day") };
}

/** Wall-clock "HH:mm" on a local calendar date in STORE_TZ → UTC instant. */
function localToUtc(y: number, m: number, d: number, hhmm: string): Date {
  const [h, mi] = hhmm.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, h, mi);
  const first = guess - tzOffsetMs(new Date(guess));
  // Re-evaluate once so instants near a DST change land on the right offset.
  return new Date(guess - tzOffsetMs(new Date(first)));
}

/**
 * Deadline = closing time of the Nth business day after the order is ready.
 *
 * A "business day" is a day the pickup location is open (per its weekly
 * opening hours; see {@link resolvePickupHours}). The day the order becomes
 * ready is not counted, so day 1 is the next open day. The customer can
 * collect until the location closes on day N.
 */
export function computeCollectBy(
  readyAt: Date,
  businessDays: number,
  hours: WeeklyHours = DEFAULT_PICKUP_HOURS,
): Date {
  const target = Math.max(1, Math.floor(businessDays));
  const usable = hasOpenDay(hours) ? hours : DEFAULT_PICKUP_HOURS;
  const { y, m, d } = localDate(readyAt);

  // Calendar arithmetic on a pure date (UTC midnight) — independent of DST.
  const cursor = new Date(Date.UTC(y, m - 1, d));
  let counted = 0;
  for (let i = 0; i < MAX_SCAN_DAYS; i++) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    const key: DayKey = DAY_KEYS[(cursor.getUTCDay() + 6) % 7];
    const slot = usable[key];
    if (!slot || slot.closed || !slot.open || !slot.close) continue;
    counted++;
    if (counted === target) {
      return localToUtc(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, cursor.getUTCDate(), slot.close);
    }
  }
  // Unreachable with a valid schedule; fall back to plain calendar days.
  return new Date(readyAt.getTime() + target * 24 * 60 * 60 * 1000);
}

/** "5 business days" / "5 jours ouvrables". */
export function formatBusinessDays(days: number, locale: "en" | "fr"): string {
  if (locale === "fr") return `${days} jour${days > 1 ? "s" : ""} ouvrable${days > 1 ? "s" : ""}`;
  return `${days} business day${days > 1 ? "s" : ""}`;
}

/** Deadline for customer-facing text, in store time — e.g. "Friday, November 27, 4:30 p.m.". */
export function formatDeadline(at: Date, locale: "en" | "fr"): string {
  return at.toLocaleString(locale === "fr" ? "fr-CA" : "en-CA", {
    timeZone: STORE_TZ,
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

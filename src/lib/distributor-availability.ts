import type { Locale } from "@/i18n/config";
import {
  DAY_KEYS,
  type DayKey,
  type WeeklyHours,
  formatTime,
  MONDAY_ANCHOR,
} from "@/lib/opening-hours";
import type { DistributorSnippet } from "@/lib/types";

const STORE_TZ = "America/Toronto";

const WEEKDAY_TO_KEY: Record<string, DayKey> = {
  Mon: "mon",
  Tue: "tue",
  Wed: "wed",
  Thu: "thu",
  Fri: "fri",
  Sat: "sat",
  Sun: "sun",
};

export interface DistributorAvailability {
  distributor: DistributorSnippet;
  when: "today" | "later";
  dayKey: DayKey;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function getStoreNow(now = new Date()): { dayKey: DayKey; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: STORE_TZ,
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(now);

  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  const dayKey = WEEKDAY_TO_KEY[weekday] ?? "mon";

  return { dayKey, minutes: hour * 60 + minute };
}

function dayLabel(dayKey: DayKey, locale: Locale): string {
  const date = new Date(MONDAY_ANCHOR);
  date.setDate(date.getDate() + DAY_KEYS.indexOf(dayKey));
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-CA" : "en-CA", { weekday: "long" }).format(date);
}

/** Earliest day a spider can be picked up at this distributor. */
export function getDistributorAvailability(
  distributor: DistributorSnippet,
  now = new Date(),
): DistributorAvailability | null {
  const { dayKey: todayKey, minutes: nowMinutes } = getStoreNow(now);
  const startIdx = DAY_KEYS.indexOf(todayKey);

  for (let offset = 0; offset < 7; offset++) {
    const key = DAY_KEYS[(startIdx + offset) % 7];
    const slot = distributor.hours[key] ?? { closed: true };
    if (slot.closed || !slot.open || !slot.close) continue;

    if (offset === 0 && nowMinutes < toMinutes(slot.close)) {
      return { distributor, when: "today", dayKey: key };
    }
    if (offset > 0) {
      return { distributor, when: "later", dayKey: key };
    }
  }

  return null;
}

/** Soonest availability across all distributors carrying the product. */
export function getSoonestDistributorAvailability(
  distributors: DistributorSnippet[],
  now = new Date(),
): DistributorAvailability | null {
  const { dayKey: todayKey } = getStoreNow(now);
  const todayIdx = DAY_KEYS.indexOf(todayKey);

  const ranked = distributors
    .map((d) => getDistributorAvailability(d, now))
    .filter((a): a is DistributorAvailability => a !== null)
    .sort((a, b) => {
      const dayOffset = (avail: DistributorAvailability) => {
        if (avail.when === "today") return 0;
        return (DAY_KEYS.indexOf(avail.dayKey) - todayIdx + 7) % 7;
      };
      return dayOffset(a) - dayOffset(b);
    });

  return ranked[0] ?? null;
}

/** Localized CTA line — e.g. "Available as soon as Saturday at Exotik Montréal's store". */
export function formatDistributorCta(
  avail: DistributorAvailability,
  locale: Locale,
  strings: { today: string; soon: string },
): string {
  const store = avail.distributor.name;
  if (avail.when === "today") {
    return strings.today.replace("{store}", store);
  }
  const day = dayLabel(avail.dayKey, locale);
  return strings.soon.replace("{day}", day).replace("{store}", store);
}

export function formatAvailabilitySlot(hours: WeeklyHours, dayKey: DayKey, locale: Locale): string | null {
  const slot = hours[dayKey];
  if (!slot || slot.closed || !slot.open || !slot.close) return null;
  return `${formatTime(slot.open, locale)}–${formatTime(slot.close, locale)}`;
}

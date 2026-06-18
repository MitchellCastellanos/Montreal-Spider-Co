import type { Locale } from "@/i18n/config";

export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export interface DayHours {
  closed?: boolean;
  open?: string;
  close?: string;
}

export type WeeklyHours = Record<DayKey, DayHours>;

export const DAY_KEYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

/** Monday = index 0 … Sunday = index 6 (matches Google Business Profile order). */
const MONDAY_ANCHOR = new Date(2000, 0, 3);

export const EMPTY_WEEKLY_HOURS: WeeklyHours = {
  mon: { closed: true },
  tue: { closed: true },
  wed: { closed: true },
  thu: { closed: true },
  fri: { closed: true },
  sat: { closed: true },
  sun: { closed: true },
};

export function sameHours(openDays: DayKey[], open: string, close: string): WeeklyHours {
  const hours = { ...EMPTY_WEEKLY_HOURS };
  for (const day of DAY_KEYS) {
    hours[day] = openDays.includes(day) ? { open, close } : { closed: true };
  }
  return hours;
}

function dayName(day: DayKey, locale: Locale, style: "short" | "long" = "short"): string {
  const date = new Date(MONDAY_ANCHOR);
  date.setDate(date.getDate() + DAY_KEYS.indexOf(day));
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-CA" : "en-CA", { weekday: style }).format(date);
}

export function formatTime(time: string, locale: Locale): string {
  const [h, m] = time.split(":").map(Number);
  if (locale === "fr") return `${String(h).padStart(2, "0")}h${String(m).padStart(2, "0")}`;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function slotKey(slot: DayHours): string {
  if (slot.closed || !slot.open || !slot.close) return "closed";
  return `${slot.open}-${slot.close}`;
}

function closedLabel(locale: Locale): string {
  return locale === "fr" ? "Fermé" : "Closed";
}

/** Compact summary — e.g. "Tue–Sun, 12:00–19:00". */
export function formatWeeklyHoursSummary(hours: WeeklyHours, locale: Locale): string {
  type Segment = { start: DayKey; end: DayKey; slot: DayHours };
  const segments: Segment[] = [];

  for (const day of DAY_KEYS) {
    const slot = hours[day] ?? { closed: true };
    const last = segments[segments.length - 1];
    if (
      last &&
      slotKey(last.slot) === slotKey(slot) &&
      DAY_KEYS.indexOf(day) === DAY_KEYS.indexOf(last.end) + 1
    ) {
      last.end = day;
    } else {
      segments.push({ start: day, end: day, slot });
    }
  }

  const openParts = segments
    .filter((s) => !s.slot.closed && s.slot.open && s.slot.close)
    .map((s) => {
      const days =
        s.start === s.end
          ? dayName(s.start, locale)
          : `${dayName(s.start, locale)}–${dayName(s.end, locale)}`;
      return `${days}, ${formatTime(s.slot.open!, locale)}–${formatTime(s.slot.close!, locale)}`;
    });

  return openParts.length > 0 ? openParts.join("; ") : closedLabel(locale);
}

/** One row per day — like Google Maps listing. */
export function formatWeeklyHoursLines(
  hours: WeeklyHours,
  locale: Locale,
): { day: string; hours: string }[] {
  return DAY_KEYS.map((day) => {
    const slot = hours[day] ?? { closed: true };
    if (slot.closed || !slot.open || !slot.close) {
      return { day: dayName(day, locale, "long"), hours: closedLabel(locale) };
    }
    return {
      day: dayName(day, locale, "long"),
      hours: `${formatTime(slot.open, locale)}–${formatTime(slot.close, locale)}`,
    };
  });
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function parseWeeklyHours(raw: unknown): WeeklyHours | null {
  if (!raw || typeof raw !== "object") return null;
  const input = raw as Record<string, unknown>;
  const result = { ...EMPTY_WEEKLY_HOURS };

  for (const day of DAY_KEYS) {
    const slot = input[day];
    if (!slot || typeof slot !== "object") continue;
    const s = slot as Record<string, unknown>;
    if (s.closed === true) {
      result[day] = { closed: true };
      continue;
    }
    const open = typeof s.open === "string" ? s.open : "";
    const close = typeof s.close === "string" ? s.close : "";
    if (TIME_RE.test(open) && TIME_RE.test(close)) {
      result[day] = { open, close };
    }
  }

  return result;
}

export function parseWeeklyHoursJson(json: string): WeeklyHours | null {
  if (!json.trim()) return { ...EMPTY_WEEKLY_HOURS };
  try {
    return parseWeeklyHours(JSON.parse(json));
  } catch {
    return null;
  }
}

import "server-only";
import { prisma } from "@/lib/db";

export type ChatHours = {
  enabled: boolean;
  /** 0=Sun..6=Sat */
  days: number[];
  /** 0-23, Eastern Time */
  startHour: number;
  /** 0-23, Eastern Time (exclusive) */
  endHour: number;
};

export type ChatSettings = {
  staffName: string;
  hours: ChatHours;
};

const KEY = "chat_settings";

export const DEFAULT_CHAT_SETTINGS: ChatSettings = {
  staffName: "Mitch",
  hours: { enabled: false, days: [1, 2, 3, 4, 5], startHour: 9, endHour: 18 },
};

/** Chat's own settings — deliberately separate from the general store Settings page. */
export async function getChatSettings(): Promise<ChatSettings> {
  if (!prisma) return DEFAULT_CHAT_SETTINGS;
  try {
    const row = await prisma.siteSetting.findUnique({ where: { key: KEY } });
    if (!row) return DEFAULT_CHAT_SETTINGS;
    const parsed = JSON.parse(row.value) as Partial<ChatSettings>;
    return {
      staffName: parsed.staffName?.trim() || DEFAULT_CHAT_SETTINGS.staffName,
      hours: { ...DEFAULT_CHAT_SETTINGS.hours, ...parsed.hours },
    };
  } catch {
    return DEFAULT_CHAT_SETTINGS;
  }
}

export async function updateChatSettings(input: ChatSettings): Promise<void> {
  if (!prisma) throw new Error("Database not configured.");
  await prisma.siteSetting.upsert({
    where: { key: KEY },
    create: { key: KEY, value: JSON.stringify(input) },
    update: { value: JSON.stringify(input) },
  });
}

/**
 * Is the team currently "in hours"? The schedule is defined in Eastern Time — this compares
 * against the current instant, so it's correct for a visitor in any timezone without any
 * conversion on their end. Always true while the schedule is disabled.
 */
export function isWithinChatHours(hours: ChatHours, now: Date = new Date()): boolean {
  if (!hours.enabled) return true;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "numeric",
    hour12: false,
  }).formatToParts(now);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const hourPart = parts.find((p) => p.type === "hour")?.value ?? "0";
  const dayIndex: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const day = dayIndex[weekday];
  const hour = parseInt(hourPart, 10) % 24; // some Intl implementations report midnight as "24"
  if (day === undefined || !hours.days.includes(day)) return false;
  return hour >= hours.startHour && hour < hours.endHour;
}

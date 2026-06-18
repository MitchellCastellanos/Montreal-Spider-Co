import "server-only";
import { prisma } from "@/lib/db";
import { DEFAULT_SETTINGS, type StoreSettings } from "./setting-defaults";

export { DEFAULT_SETTINGS, resolvePickupTerms } from "./setting-defaults";
export type { StoreSettings } from "./setting-defaults";

const KEYS = ["pickupWindowDays", "pickupTerms", "terms"] as const;

export async function getSettings(): Promise<StoreSettings> {
  if (!prisma) return DEFAULT_SETTINGS;
  const rows = await prisma.setting.findMany({ where: { key: { in: [...KEYS] } } });
  const map = new Map(rows.map((r) => [r.key, r]));
  const days = Number(map.get("pickupWindowDays")?.valueEn);
  const pt = map.get("pickupTerms");
  const tm = map.get("terms");
  return {
    pickupWindowDays: Number.isFinite(days) && days > 0 ? days : DEFAULT_SETTINGS.pickupWindowDays,
    pickupTerms: {
      en: pt?.valueEn || DEFAULT_SETTINGS.pickupTerms.en,
      fr: pt?.valueFr || DEFAULT_SETTINGS.pickupTerms.fr,
    },
    terms: {
      en: tm?.valueEn || DEFAULT_SETTINGS.terms.en,
      fr: tm?.valueFr || DEFAULT_SETTINGS.terms.fr,
    },
  };
}

export async function updateSettings(input: StoreSettings): Promise<void> {
  if (!prisma) throw new Error("Database not configured.");
  const db = prisma;
  const rows = [
    { key: "pickupWindowDays", valueEn: String(input.pickupWindowDays), valueFr: String(input.pickupWindowDays) },
    { key: "pickupTerms", valueEn: input.pickupTerms.en, valueFr: input.pickupTerms.fr },
    { key: "terms", valueEn: input.terms.en, valueFr: input.terms.fr },
  ];
  await db.$transaction(
    rows.map((r) =>
      db.setting.upsert({
        where: { key: r.key },
        update: { valueEn: r.valueEn, valueFr: r.valueFr },
        create: r,
      })
    )
  );
}

import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { logDbFallback } from "@/lib/data/db-safe";
import { resolvePickupHours } from "@/lib/business-days";
import { DEFAULT_EXTERNAL_SETTINGS, type ExternalSettings } from "@/lib/external-orders/pure";

const KEYS = {
  enabled: "external_orders_enabled",
  confirmDays: "external_confirm_days",
  authSafeDays: "external_auth_safe_days",
  apologyCredit: "external_apology_credit",
  supplierHours: "external_supplier_hours",
} as const;

function num(raw: string | undefined, fallback: number, min: number, max: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
}

/** External-orders configuration (stored in SiteSetting). Never throws; defaults leave the feature OFF. */
export const getExternalSettings = cache(async (): Promise<ExternalSettings> => {
  if (!prisma) return DEFAULT_EXTERNAL_SETTINGS;
  try {
    const rows = await prisma.siteSetting.findMany({ where: { key: { in: Object.values(KEYS) } } });
    const m = new Map(rows.map((r) => [r.key, r.value]));
    let hoursRaw: unknown = null;
    try {
      hoursRaw = m.get(KEYS.supplierHours) ? JSON.parse(m.get(KEYS.supplierHours)!) : null;
    } catch {
      hoursRaw = null;
    }
    return {
      enabled: m.get(KEYS.enabled) === "true",
      confirmDays: Math.floor(num(m.get(KEYS.confirmDays), DEFAULT_EXTERNAL_SETTINGS.confirmDays, 1, 10)),
      authSafeDays: Math.floor(num(m.get(KEYS.authSafeDays), DEFAULT_EXTERNAL_SETTINGS.authSafeDays, 1, 7)),
      apologyCredit: num(m.get(KEYS.apologyCredit), DEFAULT_EXTERNAL_SETTINGS.apologyCredit, 0, 500),
      supplierHours: hoursRaw ? resolvePickupHours(hoursRaw) : DEFAULT_EXTERNAL_SETTINGS.supplierHours,
    };
  } catch (e) {
    logDbFallback("getExternalSettings", e);
    return DEFAULT_EXTERNAL_SETTINGS;
  }
});

export async function saveExternalSettings(s: ExternalSettings): Promise<void> {
  if (!prisma) throw new Error("Database not configured.");
  const entries: [string, string][] = [
    [KEYS.enabled, String(s.enabled)],
    [KEYS.confirmDays, String(s.confirmDays)],
    [KEYS.authSafeDays, String(s.authSafeDays)],
    [KEYS.apologyCredit, String(s.apologyCredit)],
    [KEYS.supplierHours, JSON.stringify(s.supplierHours)],
  ];
  for (const [key, value] of entries) {
    await prisma.siteSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
  }
}

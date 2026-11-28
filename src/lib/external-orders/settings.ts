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
  syncEnabled: "external_sync_enabled",
  rotationMode: "external_rotation_mode",
  rotationSlots: "external_rotation_slots",
  rotationMinDays: "external_rotation_min_days",
  rotationWindowDays: "external_rotation_window_days",
  marginPct: "external_margin_pct",
  minProfit: "external_min_profit",
  handlingCost: "external_handling_cost",
  lossReservePct: "external_loss_reserve_pct",
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
    const mode = m.get(KEYS.rotationMode);
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
      syncEnabled: m.get(KEYS.syncEnabled) === "true",
      rotationMode: (["off", "suggest", "auto"] as const).find((x) => x === mode) ?? DEFAULT_EXTERNAL_SETTINGS.rotationMode,
      rotationSlots: Math.floor(num(m.get(KEYS.rotationSlots), DEFAULT_EXTERNAL_SETTINGS.rotationSlots, 0, 100)),
      rotationMinDays: Math.floor(num(m.get(KEYS.rotationMinDays), DEFAULT_EXTERNAL_SETTINGS.rotationMinDays, 0, 90)),
      rotationWindowDays: Math.floor(num(m.get(KEYS.rotationWindowDays), DEFAULT_EXTERNAL_SETTINGS.rotationWindowDays, 1, 90)),
      marginPct: num(m.get(KEYS.marginPct), DEFAULT_EXTERNAL_SETTINGS.marginPct, 0, 60),
      minProfit: num(m.get(KEYS.minProfit), DEFAULT_EXTERNAL_SETTINGS.minProfit, 0, 500),
      handlingCost: num(m.get(KEYS.handlingCost), DEFAULT_EXTERNAL_SETTINGS.handlingCost, 0, 200),
      lossReservePct: num(m.get(KEYS.lossReservePct), DEFAULT_EXTERNAL_SETTINGS.lossReservePct, 0, 50),
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
    [KEYS.syncEnabled, String(s.syncEnabled)],
    [KEYS.rotationMode, s.rotationMode],
    [KEYS.rotationSlots, String(s.rotationSlots)],
    [KEYS.rotationMinDays, String(s.rotationMinDays)],
    [KEYS.rotationWindowDays, String(s.rotationWindowDays)],
    [KEYS.marginPct, String(s.marginPct)],
    [KEYS.minProfit, String(s.minProfit)],
    [KEYS.handlingCost, String(s.handlingCost)],
    [KEYS.lossReservePct, String(s.lossReservePct)],
  ];
  for (const [key, value] of entries) {
    await prisma.siteSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
  }
}

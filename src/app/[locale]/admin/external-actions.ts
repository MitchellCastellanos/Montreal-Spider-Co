"use server";

import { revalidatePath } from "next/cache";
import type { SpecimenSex } from "@prisma/client";
import { isAdminAuthed } from "@/lib/auth";
import { DAY_KEYS, sameHours, type DayKey } from "@/lib/opening-hours";
import { inchesToCm } from "@/lib/size-inches";
import { getExternalSettings, saveExternalSettings } from "@/lib/external-orders/settings";
import { applyRotationNow, pricingFrom, repriceOffer } from "@/lib/external-orders/rotation-service";
import { computeOfferPrice } from "@/lib/external-orders/pricing";
import { prisma } from "@/lib/db";
import { runSupplierSync } from "@/lib/suppliers/sync";
import { createOfferFromItem, createOffersForMatched } from "@/lib/suppliers/catalog";
import { createOffer, deleteOffer, setOfferPublished, unpublishAllOffers } from "@/lib/external-orders/offers";
import { confirmExternalOrder, declineExternalOrder, extendExternalHold } from "@/lib/external-orders/hold";
import type { ActionState } from "./actions";

function str(f: FormData, k: string): string {
  return String(f.get(k) ?? "").trim();
}
function numField(f: FormData, k: string): number {
  return Number(str(f, k));
}
function fail(e: unknown): ActionState {
  return { error: e instanceof Error ? e.message : "Something went wrong." };
}
function refresh() {
  revalidatePath("/", "layout");
}

export async function saveExternalSettingsAction(_p: ActionState, f: FormData): Promise<ActionState> {
  if (!(await isAdminAuthed())) return { error: "unauthorized" };
  try {
    const days = f.getAll("openDays").map(String).filter((d): d is DayKey => (DAY_KEYS as string[]).includes(d));
    const open = str(f, "openTime") || "09:30";
    const close = str(f, "closeTime") || "16:30";
    if (days.length === 0) return { error: "Pick at least one supplier open day." };
    if (!/^\d{2}:\d{2}$/.test(open) || !/^\d{2}:\d{2}$/.test(close) || open >= close) return { error: "Opening time must be before closing time." };
    await saveExternalSettings({
      enabled: f.get("enabled") === "on",
      confirmDays: Math.min(10, Math.max(1, Math.floor(numField(f, "confirmDays") || 1))),
      authSafeDays: Math.min(7, Math.max(1, Math.floor(numField(f, "authSafeDays") || 4))),
      apologyCredit: Math.min(500, Math.max(0, numField(f, "apologyCredit") || 0)),
      supplierHours: sameHours(days, open, close),
      syncEnabled: f.get("syncEnabled") === "on",
      rotationMode: (["off", "suggest", "auto"] as const).find((m) => m === str(f, "rotationMode")) ?? "suggest",
      rotationSlots: Math.min(100, Math.max(0, Math.floor(numField(f, "rotationSlots") || 0))),
      rotationMinDays: Math.min(90, Math.max(0, Math.floor(numField(f, "rotationMinDays") || 0))),
      rotationWindowDays: Math.min(90, Math.max(1, Math.floor(numField(f, "rotationWindowDays") || 14))),
      marginPct: Math.min(60, Math.max(0, numField(f, "marginPct") || 0)),
      minProfit: Math.min(500, Math.max(0, numField(f, "minProfit") || 0)),
      handlingCost: Math.min(200, Math.max(0, numField(f, "handlingCost") || 0)),
      lossReservePct: Math.min(50, Math.max(0, numField(f, "lossReservePct") || 0)),
    });
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function createOfferAction(_p: ActionState, f: FormData): Promise<ActionState> {
  if (!(await isAdminAuthed())) return { error: "unauthorized" };
  try {
    const sex = str(f, "sex") as SpecimenSex;
    if (!["unsexed", "male", "female"].includes(sex)) return { error: "Choose a sex." };
    const priceMode = str(f, "priceMode") === "margin" ? "margin" : "manual";
    const unitCost = numField(f, "unitCost") || 0;
    let price = numField(f, "price");
    if (priceMode === "margin") {
      if (!(unitCost > 0)) return { error: "Enter the supplier cost to price by profit margin." };
      const priced = computeOfferPrice(unitCost, pricingFrom(await getExternalSettings()));
      if (!priced) return { error: "The profit margin target can't be reached — lower it in Settings." };
      price = priced.price;
    }
    await createOffer({
      priceMode,
      productId: str(f, "productId"),
      sizeCm: Math.round(inchesToCm(numField(f, "inches")) * 100) / 100,
      sex,
      price,
      unitCost,
      leadDaysMin: Math.floor(numField(f, "leadDaysMin") || 1),
      leadDaysMax: Math.floor(numField(f, "leadDaysMax") || 3),
      maxPerOrder: Math.floor(numField(f, "maxPerOrder") || 1),
      notes: str(f, "notes"),
    });
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Read the supplier's public catalog now (same code the daily job runs). */
export async function syncSupplierNowAction(): Promise<ActionState & { detail?: string }> {
  if (!(await isAdminAuthed())) return { error: "unauthorized" };
  try {
    const r = await runSupplierSync("manual");
    refresh();
    if (r.status === "ok") return { ok: true, detail: `${r.itemCount} listed · ${r.newCount} new · ${r.priceChanges} price changes · ${r.missingCount} not listed` };
    if (r.status === "skipped") return { ok: true, detail: r.detail };
    return { error: `Sync ${r.status}: ${r.detail}` };
  } catch (e) {
    return fail(e);
  }
}

export async function createOfferFromItemAction(_p: ActionState, f: FormData): Promise<ActionState> {
  if (!(await isAdminAuthed())) return { error: "unauthorized" };
  try {
    await createOfferFromItem(str(f, "itemId"));
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function createMatchedOffersAction(): Promise<ActionState & { detail?: string }> {
  if (!(await isAdminAuthed())) return { error: "unauthorized" };
  try {
    const n = await createOffersForMatched();
    refresh();
    return { ok: true, detail: `${n} hidden offer${n === 1 ? "" : "s"} created` };
  } catch (e) {
    return fail(e);
  }
}

export async function setOfferFlagsAction(_p: ActionState, f: FormData): Promise<ActionState> {
  if (!(await isAdminAuthed())) return { error: "unauthorized" };
  try {
    const db = prisma;
    if (!db) throw new Error("Database not configured.");
    const data: { pinned?: boolean; rotates?: boolean; priceMode?: string } = {};
    if (f.has("pinned")) data.pinned = str(f, "pinned") === "true";
    if (f.has("rotates")) data.rotates = str(f, "rotates") === "true";
    if (f.has("priceMode")) data.priceMode = str(f, "priceMode") === "margin" ? "margin" : "manual";
    await db.supplierOffer.update({ where: { id: str(f, "id") }, data });
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function repriceOfferAction(_p: ActionState, f: FormData): Promise<ActionState> {
  if (!(await isAdminAuthed())) return { error: "unauthorized" };
  try {
    await repriceOffer(str(f, "id"));
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Suggest mode: staff apply the proposed rotation. */
export async function applyRotationAction(): Promise<ActionState> {
  if (!(await isAdminAuthed())) return { error: "unauthorized" };
  try {
    await applyRotationNow();
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function setOfferPublishedAction(_p: ActionState, f: FormData): Promise<ActionState> {
  if (!(await isAdminAuthed())) return { error: "unauthorized" };
  try {
    await setOfferPublished(str(f, "id"), str(f, "published") === "true");
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteOfferAction(_p: ActionState, f: FormData): Promise<ActionState> {
  if (!(await isAdminAuthed())) return { error: "unauthorized" };
  try {
    await deleteOffer(str(f, "id"));
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Kill switch for suppliers: hide every made-to-order offer immediately (own inventory untouched). */
export async function unpublishAllOffersAction(): Promise<ActionState> {
  if (!(await isAdminAuthed())) return { error: "unauthorized" };
  try {
    await unpublishAllOffers();
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function confirmExternalOrderAction(_p: ActionState, f: FormData): Promise<ActionState> {
  if (!(await isAdminAuthed())) return { error: "unauthorized" };
  try {
    const cost = str(f, "unitCost");
    await confirmExternalOrder(str(f, "orderId"), { unitCost: cost === "" ? undefined : Number(cost) });
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function declineExternalOrderAction(_p: ActionState, f: FormData): Promise<ActionState> {
  if (!(await isAdminAuthed())) return { error: "unauthorized" };
  try {
    await declineExternalOrder(str(f, "orderId"), { credit: Math.max(0, numField(f, "credit") || 0) });
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function extendExternalOrderAction(_p: ActionState, f: FormData): Promise<ActionState> {
  if (!(await isAdminAuthed())) return { error: "unauthorized" };
  try {
    await extendExternalHold(str(f, "orderId"), numField(f, "days") || 1);
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

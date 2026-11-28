"use server";

import { revalidatePath } from "next/cache";
import type { SpecimenSex } from "@prisma/client";
import { isAdminAuthed } from "@/lib/auth";
import { DAY_KEYS, sameHours, type DayKey } from "@/lib/opening-hours";
import { inchesToCm } from "@/lib/size-inches";
import { saveExternalSettings } from "@/lib/external-orders/settings";
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
    await createOffer({
      productId: str(f, "productId"),
      sizeCm: Math.round(inchesToCm(numField(f, "inches")) * 100) / 100,
      sex,
      price: numField(f, "price"),
      unitCost: numField(f, "unitCost") || 0,
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

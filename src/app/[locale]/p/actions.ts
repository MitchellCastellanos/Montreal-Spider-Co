"use server";

import { revalidatePath } from "next/cache";
import type { PaymentMethod } from "@prisma/client";
import { respondToProposal } from "@/lib/data/restock";
import { getFulfillmentByPickupToken, confirmPickup } from "@/lib/fulfillment/fulfillment";
import { assertPartnerTokenForLocation } from "@/lib/partner/auth";
import { registerWalkInSale, reportSpecimenIssue, type WalkInSaleResult } from "@/lib/partner/walk-in";

/**
 * Partner-facing server actions. Partners have no accounts — every action is
 * authorized by an unguessable token carried in the QR code / email link.
 */

export type PartnerActionState = {
  error?: string;
  ok?: boolean;
  sale?: WalkInSaleResult;
};

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function fail(e: unknown, fallback: string): PartnerActionState {
  return { error: e instanceof Error ? e.message : fallback };
}

/** Partner accepts or declines a restock proposal (link from the proposal email). */
export async function respondToProposalAction(
  _prev: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  try {
    await respondToProposal(
      str(formData, "token"),
      str(formData, "response") === "accept",
      str(formData, "partnerNotes"),
    );
  } catch (e) {
    return fail(e, "response_failed");
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Partner confirms physical handover of a web order at their pickup point. */
export async function confirmPickupByTokenAction(
  _prev: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  try {
    const f = await getFulfillmentByPickupToken(str(formData, "token"));
    if (!f) return { error: "Order not found." };
    if (!f.locationId) {
      return { error: "This order must be confirmed by Montreal Spider Co. staff (meetup / custom pickup)." };
    }
    await assertPartnerTokenForLocation(str(formData, "partnerToken"), f.locationId);
    await confirmPickup(f.id);
  } catch (e) {
    return fail(e, "confirm_failed");
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Partner employee registers a walk-in sale from the specimen QR page. */
export async function walkInSaleAction(
  _prev: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  const salePrice = Number(formData.get("salePrice"));
  if (!Number.isFinite(salePrice) || salePrice <= 0) {
    return { error: "Enter the sale price." };
  }
  const method = str(formData, "paymentMethod");
  try {
    const sale = await registerWalkInSale({
      qrToken: str(formData, "qrToken"),
      partnerToken: str(formData, "partnerToken"),
      salePrice,
      paymentMethod: (["stripe", "cash", "e_transfer", "other"].includes(method)
        ? method
        : "cash") as PaymentMethod,
      notes: str(formData, "notes"),
    });
    revalidatePath("/", "layout");
    return { ok: true, sale };
  } catch (e) {
    return fail(e, "sale_failed");
  }
}

/** Anyone with the specimen QR can report an issue (health, enclosure, …). */
export async function reportIssueAction(
  _prev: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  try {
    await reportSpecimenIssue({
      qrToken: str(formData, "qrToken"),
      issue: str(formData, "issue"),
      reporter: str(formData, "reporter"),
    });
  } catch (e) {
    return fail(e, "report_failed");
  }
  return { ok: true };
}

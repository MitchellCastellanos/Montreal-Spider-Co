"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PaymentMethod, SalesChannel, TaskType } from "@prisma/client";
import { isAdminAuthed } from "@/lib/auth";
import {
  markPreparing,
  markReady,
  confirmPickup,
  sendPickupReminder,
  processNoShow,
  cancelFulfillment,
} from "@/lib/fulfillment/fulfillment";
import { createAudit, applyAuditCorrection, type AuditItemInput } from "@/lib/data/audits";
import {
  createProposal,
  sendProposal,
  shipProposal,
  completeProposal,
  cancelProposal,
} from "@/lib/data/restock";
import {
  generateMonthlyStatement,
  sendStatement,
  markStatementPaid,
} from "@/lib/data/settlement";
import { recordMolt, recordMeasurement } from "@/lib/data/growth";
import { createTask, resolveTask } from "@/lib/data/tasks";
import { sellSpecimensManual } from "@/lib/data/specimens";
import { registerWalkInSale } from "@/lib/partner/walk-in";
import type { ActionState } from "./actions";

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}
function num(formData: FormData, key: string, fallback = 0): number {
  const v = Number(formData.get(key));
  return Number.isFinite(v) ? v : fallback;
}

async function guard(): Promise<ActionState | null> {
  if (!(await isAdminAuthed())) return { error: "unauthorized" };
  return null;
}

function fail(e: unknown, fallback: string): ActionState {
  return { error: e instanceof Error ? e.message : fallback };
}

// --- Fulfillment -------------------------------------------------------------

export async function fulfillmentTransitionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const denied = await guard();
  if (denied) return denied;

  const id = str(formData, "fulfillmentId");
  const action = str(formData, "transition");
  if (!id) return { error: "missing_fields" };

  try {
    switch (action) {
      case "preparing":
        await markPreparing(id);
        break;
      case "ready":
        await markReady(id);
        break;
      case "complete":
        await confirmPickup(id);
        break;
      case "remind":
        await sendPickupReminder(id, false);
        break;
      case "final-remind":
        await sendPickupReminder(id, true);
        break;
      case "no-show":
        await processNoShow(id, num(formData, "noShowFee", 0));
        break;
      case "cancel":
        await cancelFulfillment(id, {
          reason: str(formData, "reason") || "the order was cancelled by our team",
          reasonFr: "la commande a été annulée par notre équipe",
        });
        break;
      default:
        return { error: "unknown_transition" };
    }
  } catch (e) {
    return fail(e, "transition_failed");
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

// --- Store audits ------------------------------------------------------------

export async function createAuditAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const denied = await guard();
  if (denied) return denied;
  const locale = str(formData, "locale") || "en";

  let items: AuditItemInput[] = [];
  try {
    items = JSON.parse(str(formData, "items") || "[]");
  } catch {
    return { error: "items_invalid" };
  }
  if (!Array.isArray(items) || items.length === 0) return { error: "items_empty" };

  try {
    await createAudit({
      locationId: str(formData, "locationId"),
      employee: str(formData, "employee"),
      auditedAt: str(formData, "auditedAt") ? new Date(str(formData, "auditedAt")) : undefined,
      notes: str(formData, "notes"),
      items,
    });
  } catch (e) {
    return fail(e, "audit_failed");
  }

  revalidatePath("/", "layout");
  redirect(`/${locale}/admin/audits`);
}

export async function auditCorrectionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const denied = await guard();
  if (denied) return denied;

  try {
    await applyAuditCorrection(str(formData, "specimenId"), str(formData, "notes"));
    const taskId = str(formData, "taskId");
    if (taskId) await resolveTask(taskId, "Inventory correction applied — specimen written off.");
  } catch (e) {
    return fail(e, "correction_failed");
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

// --- Restock proposals --------------------------------------------------------

export async function createProposalAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const denied = await guard();
  if (denied) return denied;
  const locale = str(formData, "locale") || "en";

  let specimenIds: string[] = [];
  try {
    specimenIds = JSON.parse(str(formData, "specimenIds") || "[]");
  } catch {
    return { error: "specimens_invalid" };
  }

  try {
    await createProposal({
      locationId: str(formData, "locationId"),
      specimenIds,
      reason: str(formData, "reason"),
      preferredDate: str(formData, "preferredDate") ? new Date(str(formData, "preferredDate")) : null,
    });
  } catch (e) {
    return fail(e, "proposal_failed");
  }

  revalidatePath("/", "layout");
  redirect(`/${locale}/admin/restock`);
}

export async function proposalTransitionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const denied = await guard();
  if (denied) return denied;

  const id = str(formData, "proposalId");
  const action = str(formData, "transition");
  if (!id) return { error: "missing_fields" };

  try {
    switch (action) {
      case "send":
        await sendProposal(id);
        break;
      case "ship":
        await shipProposal(id);
        break;
      case "complete":
        await completeProposal(id);
        break;
      case "cancel":
        await cancelProposal(id);
        break;
      default:
        return { error: "unknown_transition" };
    }
  } catch (e) {
    return fail(e, "transition_failed");
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

// --- Settlements ---------------------------------------------------------------

export async function generateStatementAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const denied = await guard();
  if (denied) return denied;

  const [yearStr, monthStr] = str(formData, "period").split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return { error: "Enter a period like 2026-07." };
  }

  try {
    await generateMonthlyStatement(str(formData, "locationId"), year, month);
  } catch (e) {
    return fail(e, "statement_failed");
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function statementTransitionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const denied = await guard();
  if (denied) return denied;

  const id = str(formData, "statementId");
  const action = str(formData, "transition");

  try {
    if (action === "send") await sendStatement(id);
    else if (action === "paid") await markStatementPaid(id);
    else return { error: "unknown_transition" };
  } catch (e) {
    return fail(e, "transition_failed");
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

// --- Growth & molting -----------------------------------------------------------

export async function recordMoltAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const denied = await guard();
  if (denied) return denied;

  try {
    await recordMolt({
      specimenId: str(formData, "specimenId"),
      newSizeEstimateCm: num(formData, "newSizeEstimateCm"),
      moltedAt: str(formData, "moltedAt") ? new Date(str(formData, "moltedAt")) : undefined,
      notes: str(formData, "notes"),
    });
  } catch (e) {
    return fail(e, "molt_failed");
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function recordMeasurementAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const denied = await guard();
  if (denied) return denied;

  try {
    await recordMeasurement({
      specimenId: str(formData, "specimenId"),
      sizeCm: num(formData, "sizeCm"),
      measuredAt: str(formData, "measuredAt") ? new Date(str(formData, "measuredAt")) : undefined,
      notes: str(formData, "notes"),
    });
  } catch (e) {
    return fail(e, "measurement_failed");
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

// --- Tasks -----------------------------------------------------------------------

export async function createTaskAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const denied = await guard();
  if (denied) return denied;

  const title = str(formData, "title");
  if (!title) return { error: "missing_fields" };

  try {
    await createTask({
      type: (str(formData, "type") || "general") as TaskType,
      title,
      details: str(formData, "details"),
      locationId: str(formData, "locationId") || null,
      specimenId: str(formData, "specimenId") || null,
      dueAt: str(formData, "dueAt") ? new Date(str(formData, "dueAt")) : null,
    });
  } catch (e) {
    return fail(e, "task_failed");
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function resolveTaskAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const denied = await guard();
  if (denied) return denied;

  try {
    await resolveTask(
      str(formData, "taskId"),
      str(formData, "resolution"),
      str(formData, "dismiss") === "true",
    );
  } catch (e) {
    return fail(e, "task_failed");
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Resolve a task by discovering its linked specimen was actually sold (e.g. an
 * audit "missing" investigation where the partner confirms it was sold, just
 * never registered). Runs the exact same sale processing as the manual sale
 * form — inventory movement, settlement entry if it's at a partner store,
 * Finance visibility — then closes the task out.
 */
export async function resolveTaskAsSoldAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const denied = await guard();
  if (denied) return denied;

  const taskId = str(formData, "taskId");
  const specimenId = str(formData, "specimenId");
  if (!taskId || !specimenId) return { error: "missing_fields" };

  const salesChannel = (str(formData, "salesChannel") || "distributor") as SalesChannel;
  const notes = str(formData, "notes");

  try {
    await sellSpecimensManual({
      specimenIds: [specimenId],
      salePrice: num(formData, "salePrice"),
      salesChannel,
      paymentMethod: (str(formData, "paymentMethod") || "cash") as PaymentMethod,
      notes,
    });
    await resolveTask(taskId, notes || `Confirmed sold via ${salesChannel} — resolved from this task.`);
  } catch (e) {
    return fail(e, "sale_failed");
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

// --- Walk-in sale registered by staff on behalf of a partner ------------------------

export async function adminWalkInSaleAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const denied = await guard();
  if (denied) return denied;

  try {
    await registerWalkInSale({
      qrToken: str(formData, "qrToken"),
      partnerToken: str(formData, "partnerToken"),
      salePrice: num(formData, "salePrice"),
      paymentMethod: (str(formData, "paymentMethod") || "cash") as PaymentMethod,
      notes: str(formData, "notes"),
    });
  } catch (e) {
    return fail(e, "sale_failed");
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

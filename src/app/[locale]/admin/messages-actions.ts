"use server";

import { revalidatePath } from "next/cache";
import { isAdminAuthed } from "@/lib/auth";
import { recordContactReply } from "@/lib/data/contact-messages";
import { sendNotificationDetailed } from "@/lib/notifications/service";
import { paragraphsFromPlainText } from "@/lib/email-templates";
import type { ActionState } from "./actions";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/** Sends a branded reply to a stored contact-form message and logs it on the thread. */
export async function replyToContactMessageAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isAdminAuthed())) return { error: "unauthorized" };

  const id = str(formData, "id");
  const to = str(formData, "to");
  const subject = str(formData, "subject");
  const body = str(formData, "body");
  const locale = str(formData, "emailLocale") === "fr" ? "fr" : "en";

  if (!id) return { error: "missing_id" };
  if (!EMAIL_RE.test(to)) return { error: "Enter a valid email address." };
  if (!subject || !body) return { error: "Write a subject and a message before sending." };

  const result = await sendNotificationDetailed({
    templateId: "admin-composed",
    event: "contact.replied",
    to,
    locale,
    data: { subject, bodyHtml: paragraphsFromPlainText(body) },
    context: { contactMessageId: id },
  });
  if (!result.ok) return { error: result.error };

  try {
    await recordContactReply(id, subject, body);
  } catch (e) {
    console.error("[admin] failed to record contact reply:", e);
  }

  revalidatePath("/[locale]/admin/messages", "page");
  return { ok: true };
}

/** Sends a one-off branded email composed from scratch (not tied to a stored message). */
export async function sendComposedEmailAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isAdminAuthed())) return { error: "unauthorized" };

  const to = str(formData, "to");
  const subject = str(formData, "subject");
  const body = str(formData, "body");
  const locale = str(formData, "emailLocale") === "fr" ? "fr" : "en";

  if (!EMAIL_RE.test(to)) return { error: "Enter a valid destination email address." };
  if (!subject || !body) return { error: "Write a subject and a message before sending." };

  const result = await sendNotificationDetailed({
    templateId: "admin-composed",
    event: "admin.email_sent",
    to,
    locale,
    data: { subject, bodyHtml: paragraphsFromPlainText(body) },
  });
  if (!result.ok) return { error: result.error };

  return { ok: true };
}

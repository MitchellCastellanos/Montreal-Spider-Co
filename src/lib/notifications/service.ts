import "server-only";
import { Resend } from "resend";
import { prisma } from "@/lib/db";
import { SITE } from "@/lib/site";
import { getEmailTemplate, type EmailLocale } from "@/lib/email-templates";

/**
 * Centralized Notification Service.
 *
 * Business modules never send email directly. They emit a business event
 * through `sendNotification` / `notifyStaff`; the service renders the template,
 * delivers via Resend and records the attempt in the EmailLog — success,
 * failure or skip alike.
 */

const resendConfigured = Boolean(process.env.RESEND_API_KEY);
const fromEmail = process.env.RESEND_FROM_EMAIL ?? `orders@${new URL(SITE.url).hostname}`;

export interface NotificationInput {
  /** Template id from the registry in `email-templates.ts`. */
  templateId: string;
  /** Business event that triggered the send, e.g. "fulfillment.ready". */
  event: string;
  to: string;
  locale?: EmailLocale;
  /** Template data — {token} placeholders. */
  data: Record<string, string>;
  /** Business context stored on the log entry (orderId, specimenId, locationId, …). */
  context?: Record<string, string>;
}

async function logEmail(entry: {
  templateId: string;
  event: string;
  to: string;
  subject: string;
  status: "sent" | "failed" | "skipped";
  error?: string;
  context?: Record<string, string>;
}): Promise<void> {
  if (!prisma) return;
  try {
    await prisma.emailLog.create({
      data: {
        templateId: entry.templateId,
        event: entry.event,
        to: entry.to,
        subject: entry.subject,
        status: entry.status,
        error: entry.error ?? "",
        context: entry.context ?? {},
      },
    });
  } catch (e) {
    console.error("[notifications] email log write failed:", e);
  }
}

/**
 * Render + deliver + log one notification. Never throws — failures are logged
 * so a broken email can never break a business transaction.
 */
export async function sendNotification(input: NotificationInput): Promise<boolean> {
  const template = getEmailTemplate(input.templateId);
  if (!template) {
    console.error(`[notifications] unknown template "${input.templateId}" for event ${input.event}`);
    await logEmail({
      templateId: input.templateId,
      event: input.event,
      to: input.to,
      subject: "",
      status: "skipped",
      error: "Unknown template",
      context: input.context,
    });
    return false;
  }

  const email = template.render(input.locale ?? "en", input.data);

  if (!input.to?.trim()) {
    await logEmail({
      templateId: input.templateId,
      event: input.event,
      to: "",
      subject: email.subject,
      status: "skipped",
      error: "No recipient",
      context: input.context,
    });
    return false;
  }

  if (!resendConfigured) {
    console.info(`[notifications] RESEND_API_KEY not set — skipping ${input.templateId} to ${input.to}`);
    await logEmail({
      templateId: input.templateId,
      event: input.event,
      to: input.to,
      subject: email.subject,
      status: "skipped",
      error: "Resend not configured",
      context: input.context,
    });
    return false;
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: fromEmail,
      to: input.to,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
    if (error) throw new Error(error.message || "Resend rejected the email");
    await logEmail({
      templateId: input.templateId,
      event: input.event,
      to: input.to,
      subject: email.subject,
      status: "sent",
      context: input.context,
    });
    return true;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Send failed";
    console.error(`[notifications] ${input.templateId} to ${input.to} failed:`, message);
    await logEmail({
      templateId: input.templateId,
      event: input.event,
      to: input.to,
      subject: email.subject,
      status: "failed",
      error: message,
      context: input.context,
    });
    return false;
  }
}

/** Internal staff notification (Admin inbox). */
export async function notifyStaff(
  input: Omit<NotificationInput, "to" | "locale">,
): Promise<boolean> {
  const adminTo = process.env.ORDERS_ADMIN_EMAIL ?? SITE.email;
  return sendNotification({ ...input, to: adminTo, locale: "en" });
}

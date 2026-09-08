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
const siteHostname = new URL(SITE.url).hostname;
const fromEmail = process.env.RESEND_FROM_EMAIL ?? `orders@${siteHostname}`;
const partnerFromEmail = process.env.RESEND_PARTNER_FROM_EMAIL ?? fromEmail;
const accountFromEmail = process.env.RESEND_ACCOUNT_FROM_EMAIL ?? `hello@${siteHostname}`;
const contactFromEmail = process.env.RESEND_CONTACT_FROM_EMAIL ?? `contact@${siteHostname}`;
const reportsFromEmail = process.env.RESEND_REPORTS_FROM_EMAIL ?? `reports@${siteHostname}`;

const partnerFromDisplay = `Partners @ ${SITE.name} <${partnerFromEmail}>`;
const reportsFromDisplay = `${SITE.name} Reports <${reportsFromEmail}>`;

const adminEmail = process.env.ORDERS_ADMIN_EMAIL ?? SITE.email;

/** Account templates (not order-specific): welcome, password reset. */
const ACCOUNT_TEMPLATE_IDS = new Set(["welcome", "password-reset"]);
/** Internal/staff reports send from a distinct address, separate from customer- and partner-facing mail. */
const REPORT_TEMPLATE_IDS = new Set(["distributor-sale-alert"]);

/**
 * Chooses the "from" address by template purpose, so recipients can filter/trust
 * each stream independently: customer orders, account mail, the contact-form
 * auto-reply, partner/distributor operations, and internal staff reports.
 */
function resolveFromEmail(templateId: string): string {
  if (templateId.startsWith("partner-")) return partnerFromDisplay;
  if (templateId.startsWith("internal-") || REPORT_TEMPLATE_IDS.has(templateId)) return reportsFromDisplay;
  if (templateId === "contact-received") return contactFromEmail;
  if (ACCOUNT_TEMPLATE_IDS.has(templateId)) return accountFromEmail;
  return fromEmail;
}

/** BCC the admin inbox whenever a message goes out to a distributor (consignment) location. */
export function distributorBcc(isDistributor: boolean): string | undefined {
  return isDistributor ? adminEmail : undefined;
}

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
  /** Optional file attachments (e.g. a CSV/PDF export sent along with the email). */
  attachments?: { filename: string; content: Buffer; contentType?: string }[];
  /** Optional BCC recipient(s) — e.g. looping in the admin on distributor-facing mail. */
  bcc?: string | string[];
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
      from: resolveFromEmail(input.templateId),
      to: input.to,
      bcc: input.bcc,
      subject: email.subject,
      html: email.html,
      text: email.text,
      attachments: input.attachments,
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
  return sendNotification({ ...input, to: adminEmail, locale: "en" });
}

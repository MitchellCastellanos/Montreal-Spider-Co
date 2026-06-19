import "server-only";
import { Resend } from "resend";
import { SITE } from "@/lib/site";
import {
  getEmailTemplate,
  type EmailLocale,
  type RenderedEmail,
} from "@/lib/email-templates";

const resendConfigured = Boolean(process.env.RESEND_API_KEY);
const fromEmail = process.env.RESEND_FROM_EMAIL ?? `orders@${new URL(SITE.url).hostname}`;

/** Whether outgoing email can actually be delivered (RESEND_API_KEY set). */
export const emailConfigured = resendConfigured;

/** Low-level send. Returns the recipient on success; throws on Resend errors. */
async function deliver(to: string, email: RenderedEmail): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: fromEmail,
    to,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });
  if (error) {
    throw new Error(error.message || "Resend rejected the email");
  }
}

export async function sendOrderConfirmationEmail(input: {
  to: string;
  locale: EmailLocale;
  orderNumber: string;
  total: number;
  name: string;
}) {
  if (!resendConfigured) {
    console.info("[email] RESEND_API_KEY not set — skipping order confirmation to", input.to);
    return;
  }

  const template = getEmailTemplate("order-confirmation");
  if (!template) return;

  const email = template.render(input.locale, {
    name: input.name,
    orderNumber: input.orderNumber,
    total: `$${input.total.toFixed(2)} CAD`,
  });
  await deliver(input.to, email);
}

export type SendTestResult = { ok: true } | { ok: false; error: string };

/**
 * Render a template with its sample data and send it to a single address.
 * Used by the admin "Templates" section to preview emails in a real inbox.
 */
export async function sendTemplateTestEmail(input: {
  templateId: string;
  to: string;
  locale: EmailLocale;
}): Promise<SendTestResult> {
  if (!resendConfigured) {
    return { ok: false, error: "Email is not configured — set RESEND_API_KEY to send tests." };
  }

  const template = getEmailTemplate(input.templateId);
  if (!template) {
    return { ok: false, error: "Unknown template." };
  }

  const email = template.render(input.locale, template.sample);
  // Prefix the subject so test sends are obvious in the inbox.
  email.subject = `[TEST] ${email.subject}`;

  try {
    await deliver(input.to, email);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to send." };
  }
}

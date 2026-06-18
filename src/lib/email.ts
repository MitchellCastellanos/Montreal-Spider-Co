import "server-only";
import { Resend } from "resend";
import { SITE } from "@/lib/site";

const resendConfigured = Boolean(process.env.RESEND_API_KEY);
const fromEmail = process.env.RESEND_FROM_EMAIL ?? `orders@${new URL(SITE.url).hostname}`;

export async function sendOrderConfirmationEmail(input: {
  to: string;
  locale: "en" | "fr";
  orderNumber: string;
  total: number;
  name: string;
}) {
  if (!resendConfigured) {
    console.info("[email] RESEND_API_KEY not set — skipping order confirmation to", input.to);
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const isFr = input.locale === "fr";
  const subject = isFr
    ? `Commande confirmée — ${input.orderNumber}`
    : `Order confirmed — ${input.orderNumber}`;
  const body = isFr
    ? `Bonjour ${input.name},\n\nMerci pour votre commande chez ${SITE.name}!\n\nNuméro de commande: ${input.orderNumber}\nTotal: ${input.total.toFixed(2)} $ CAD\n\nNous préparons vos mygales avec soin.\n\n— ${SITE.name}`
    : `Hi ${input.name},\n\nThank you for your order at ${SITE.name}!\n\nOrder number: ${input.orderNumber}\nTotal: $${input.total.toFixed(2)} CAD\n\nYour spiders are being prepared with care.\n\n— ${SITE.name}`;

  await resend.emails.send({
    from: fromEmail,
    to: input.to,
    subject,
    text: body,
  });
}

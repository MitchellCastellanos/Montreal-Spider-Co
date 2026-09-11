import { NextResponse } from "next/server";
import { createPasswordResetToken } from "@/lib/customer-auth";
import { sendNotification } from "@/lib/notifications/service";
import { SITE } from "@/lib/site";

/**
 * Always responds ok — never reveals whether an account exists for the given email.
 */
export async function POST(req: Request) {
  let body: { email?: string; locale?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = body.email?.trim();
  const locale = body.locale === "fr" ? "fr" : "en";
  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const result = await createPasswordResetToken(email);
  if (result) {
    const resetUrl = `${SITE.url}/${locale}/account/reset?token=${result.token}`;
    await sendNotification({
      templateId: "password-reset",
      event: "auth.forgot_password",
      to: result.customer.email,
      locale,
      data: { name: result.customer.name, resetUrl, expiresIn: locale === "fr" ? "1 heure" : "1 hour" },
      context: { customerId: result.customer.id },
    });
  }

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { isLocale, type Locale } from "@/i18n/config";
import { CheckoutError, createCheckoutSession, type CheckoutPayload } from "@/lib/checkout-stripe";
import { getCustomerIdFromSession } from "@/lib/customer-auth";
import { stripeConfigured } from "@/lib/stripe";
import { SITE } from "@/lib/site";

export async function POST(req: Request) {
  if (!stripeConfigured) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }

  let body: CheckoutPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const locale: Locale = isLocale(body.locale) ? body.locale : "en";
  const customerId = (await getCustomerIdFromSession()) ?? undefined;
  const base = SITE.url.replace(/\/$/, "");

  try {
    const session = await createCheckoutSession(
      { ...body, locale, customerId },
      `${base}/${locale}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      `${base}/${locale}/checkout`,
    );

    if (!session.url) {
      return NextResponse.json({ error: "Could not create checkout session." }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (e) {
    if (e instanceof CheckoutError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[stripe/checkout]", e);
    return NextResponse.json({ error: "Payment setup failed." }, { status: 500 });
  }
}

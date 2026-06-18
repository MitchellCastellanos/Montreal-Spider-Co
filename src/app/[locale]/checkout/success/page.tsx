import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import CheckoutSuccessView from "@/components/checkout/CheckoutSuccessView";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { fulfillCheckoutSession, getOrderByStripeSession } from "@/lib/orders/fulfill-checkout";
import { getStripe, stripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const dict = await getDictionary(loc);
  return { title: dict.checkout.successTitle, robots: { index: false, follow: false } };
}

export default async function CheckoutSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const { session_id } = await searchParams;

  if (!stripeConfigured || !session_id) {
    redirect(`/${loc}/checkout`);
  }

  const session = await getStripe().checkout.sessions.retrieve(session_id);

  if (session.status !== "complete" && session.payment_status !== "paid") {
    notFound();
  }

  let order = await getOrderByStripeSession(session_id);
  if (!order) {
    try {
      order = await fulfillCheckoutSession(session);
    } catch (e) {
      console.error("[checkout/success] fulfill failed:", e);
    }
  }

  return (
    <CheckoutSuccessView
      order={{
        orderId: order?.orderNumber ?? `MSC-${session_id.slice(-8).toUpperCase()}`,
        total: order?.total ?? (session.amount_total ?? 0) / 100,
        email: session.customer_details?.email ?? session.customer_email ?? "",
      }}
    />
  );
}

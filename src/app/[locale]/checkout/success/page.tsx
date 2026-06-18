import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import CheckoutSuccessView from "@/components/checkout/CheckoutSuccessView";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
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

  const total = (session.amount_total ?? 0) / 100;
  const orderId = session.metadata?.orderId ?? session.id.slice(-8).toUpperCase();

  return (
    <CheckoutSuccessView
      order={{
        orderId: `MSC-${orderId}`,
        total,
        email: session.customer_details?.email ?? session.customer_email ?? "",
      }}
    />
  );
}

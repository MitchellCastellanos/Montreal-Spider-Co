import type { Metadata } from "next";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getPickupPoints } from "@/lib/data/locations";
import { getSettings, resolvePickupTerms } from "@/lib/data/settings";
import CheckoutView from "@/components/checkout/CheckoutView";
import { stripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const dict = await getDictionary(loc);
  return { title: dict.checkout.title, robots: { index: false, follow: false } };
}

export default async function CheckoutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const [pickups, settings] = await Promise.all([getPickupPoints(), getSettings()]);
  const pickupPolicy = resolvePickupTerms(settings, loc);
  return (
    <CheckoutView
      stripeEnabled={stripeConfigured}
      pickups={pickups.map((p) => ({ id: p.id, name: p.name, neighborhood: p.neighborhood, hours: p.hours }))}
      pickupPolicy={pickupPolicy}
    />
  );
}

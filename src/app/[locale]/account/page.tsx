import type { Metadata } from "next";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import AccountView from "@/components/account/AccountView";
import type { PickupOption } from "@/components/checkout/PickupMeetupSection";
import { getPickupPoints } from "@/lib/data/locations";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const dict = await getDictionary(loc);
  return { title: dict.account.title, robots: { index: false, follow: false } };
}

export default async function AccountPage() {
  const pickups = await getPickupPoints();
  const pickupOptions: PickupOption[] = pickups.map((p) => ({
    id: p.id,
    name: p.name,
    neighborhood: p.neighborhood,
    hours: p.hours,
  }));
  return <AccountView pickups={pickupOptions} />;
}

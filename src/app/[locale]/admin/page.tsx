import type { Metadata } from "next";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import AdminLookup from "@/components/admin/AdminLookup";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const dict = await getDictionary(loc);
  return { title: dict.admin.title, robots: { index: false, follow: false } };
}

export default function AdminPage() {
  return <AdminLookup />;
}

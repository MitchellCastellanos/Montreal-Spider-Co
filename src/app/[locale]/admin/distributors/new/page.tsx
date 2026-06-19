import { isLocale } from "@/i18n/config";
import DistributorForm from "@/components/admin/DistributorForm";

export default async function NewDistributorPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  return <DistributorForm distributor={null} />;
}

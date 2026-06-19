import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDistributorById } from "@/lib/data/distributors";
import DistributorForm from "@/components/admin/DistributorForm";

export default async function EditDistributorPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const distributor = await getDistributorById(id);
  if (!distributor) notFound();
  return <DistributorForm distributor={distributor} />;
}

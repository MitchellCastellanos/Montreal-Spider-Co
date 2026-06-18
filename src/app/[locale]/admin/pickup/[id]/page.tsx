import { notFound } from "next/navigation";
import { getPickupPointById } from "@/lib/data/locations";
import PickupForm from "@/components/admin/PickupForm";

export default async function EditPickupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const point = await getPickupPointById(id);
  if (!point) notFound();
  return <PickupForm point={point} />;
}

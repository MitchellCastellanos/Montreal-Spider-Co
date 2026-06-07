import { notFound } from "next/navigation";
import { getProductById } from "@/lib/data/products";
import { CARE_GUIDES } from "@/lib/care";
import ProductForm from "@/components/admin/ProductForm";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) notFound();
  return <ProductForm product={product} careGuides={CARE_GUIDES.map((g) => g.slug)} />;
}

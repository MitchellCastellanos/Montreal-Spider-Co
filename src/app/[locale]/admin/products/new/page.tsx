import { CARE_GUIDES } from "@/lib/care";
import ProductForm from "@/components/admin/ProductForm";

export default function NewProductPage() {
  return <ProductForm product={null} careGuides={CARE_GUIDES.map((g) => g.slug)} />;
}

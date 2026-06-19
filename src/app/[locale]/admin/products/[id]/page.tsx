import { notFound } from "next/navigation";
import { getProductByIdForAdmin } from "@/lib/data/products";
import { getDefaultProductImage } from "@/lib/data/site-settings";
import { suggestLibraryImages } from "@/lib/data/species-library";
import { listSpecies } from "@/lib/data/species";
import { CARE_GUIDES } from "@/lib/care";
import { getDistributorLocations } from "@/lib/data/locations";
import ProductForm from "@/components/admin/ProductForm";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProductByIdForAdmin(id);
  if (!product) notFound();
  const [defaultImage, libraryImages, speciesList, distributors] = await Promise.all([
    getDefaultProductImage(),
    suggestLibraryImages(product.scientific, product.genus, product.slug),
    listSpecies(),
    getDistributorLocations(),
  ]);
  return (
    <ProductForm
      product={product}
      careGuides={CARE_GUIDES.map((g) => g.slug)}
      defaultProductImage={defaultImage}
      libraryImages={libraryImages}
      speciesList={speciesList}
      distributors={distributors}
    />
  );
}

import { CARE_GUIDES } from "@/lib/care";
import { getDefaultProductImage } from "@/lib/data/site-settings";
import { listLibraryImages } from "@/lib/data/species-library";
import { listSpecies } from "@/lib/data/species";
import { getAllDistributors } from "@/lib/data/distributors";
import ProductForm from "@/components/admin/ProductForm";

export default async function NewProductPage() {
  const [defaultImage, libraryImages, speciesList, distributors] = await Promise.all([
    getDefaultProductImage(),
    listLibraryImages(),
    listSpecies(),
    getAllDistributors(),
  ]);
  return (
    <ProductForm
      product={null}
      careGuides={CARE_GUIDES.map((g) => g.slug)}
      defaultProductImage={defaultImage}
      libraryImages={libraryImages}
      speciesList={speciesList}
      distributors={distributors}
    />
  );
}

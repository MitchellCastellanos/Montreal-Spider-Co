import { isLocale } from "@/i18n/config";
import { getDefaultProductImage } from "@/lib/data/site-settings";
import { listLibraryImages } from "@/lib/data/species-library";
import { listSpecies } from "@/lib/data/species";
import SpeciesLibraryManager from "@/components/admin/SpeciesLibraryManager";

export default async function SpeciesLibraryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc = isLocale(locale) ? locale : "en";
  const [speciesList, libraryImages, defaultProductImage] = await Promise.all([
    listSpecies(),
    listLibraryImages(),
    getDefaultProductImage(),
  ]);

  return (
    <SpeciesLibraryManager
      speciesList={speciesList}
      libraryImages={libraryImages}
      defaultProductImage={defaultProductImage}
      locale={loc}
    />
  );
}

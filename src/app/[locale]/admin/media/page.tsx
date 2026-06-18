import { isLocale } from "@/i18n/config";
import { getDefaultProductImage } from "@/lib/data/site-settings";
import { listLibraryImages } from "@/lib/data/species-library";
import MediaManager from "@/components/admin/MediaManager";

export default async function AdminMediaPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc = isLocale(locale) ? locale : "en";
  const [defaultImage, libraryImages] = await Promise.all([getDefaultProductImage(), listLibraryImages()]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-cream">Media &amp; photos</h1>
        <p className="text-sm text-muted">Default listing photo and reusable species library.</p>
      </div>
      <MediaManager locale={loc} defaultImage={defaultImage} libraryImages={libraryImages} />
    </div>
  );
}

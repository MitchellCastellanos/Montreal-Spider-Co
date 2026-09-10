import { isLocale, type Locale } from "@/i18n/config";
import { getAllProducts } from "@/lib/data/products";
import { listSpecimens } from "@/lib/data/specimens";
import { hasDatabase } from "@/lib/db";
import AdStudioHub from "@/components/admin/AdStudioHub";

export default async function AdminAdsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";

  if (!hasDatabase) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold text-cream">Ad Studio</h1>
        <p className="mt-4 text-sm text-muted">Connect a database to generate listing ads.</p>
      </div>
    );
  }

  const [specimens, products] = await Promise.all([listSpecimens(), getAllProducts()]);

  return <AdStudioHub specimens={specimens} products={products} locale={loc} />;
}

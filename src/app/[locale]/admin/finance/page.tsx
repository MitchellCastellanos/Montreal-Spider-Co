import { isLocale, type Locale } from "@/i18n/config";
import { getFinanceSummary } from "@/lib/data/specimens";
import { hasDatabase } from "@/lib/db";
import FinanceDashboard from "@/components/admin/FinanceDashboard";

export default async function AdminFinancePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";

  if (!hasDatabase) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold text-cream">Finance</h1>
        <p className="mt-4 text-sm text-muted">Connect a database to view finance data.</p>
      </div>
    );
  }

  const summary = await getFinanceSummary();

  return <FinanceDashboard summary={summary} locale={loc} />;
}

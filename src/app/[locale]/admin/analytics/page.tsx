import { hasDatabase } from "@/lib/db";
import { getDailySeries, getRangeBreakdown } from "@/lib/data/analytics";
import AnalyticsDashboard from "@/components/admin/AnalyticsDashboard";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  if (!hasDatabase) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold text-cream">Analytics</h1>
        <p className="mt-4 text-sm text-muted">Connect a database to start tracking site traffic.</p>
      </div>
    );
  }

  const [daily, b7, b30, b90] = await Promise.all([
    getDailySeries(90),
    getRangeBreakdown(7),
    getRangeBreakdown(30),
    getRangeBreakdown(90),
  ]);

  return <AnalyticsDashboard daily={daily} breakdowns={{ "7": b7, "30": b30, "90": b90 }} />;
}

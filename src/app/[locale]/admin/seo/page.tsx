import { hasDatabase } from "@/lib/db";
import { getLatestSeoAudit, listSeoAuditRuns } from "@/lib/data/seo-audits";
import SeoAuditHub from "@/components/admin/SeoAuditHub";

export const dynamic = "force-dynamic";

export default async function AdminSeoPage() {
  if (!hasDatabase) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold text-cream">SEO audits</h1>
        <p className="mt-4 text-sm text-muted">Connect a database to run and track weekly SEO audits.</p>
      </div>
    );
  }

  const [latest, history] = await Promise.all([getLatestSeoAudit(), listSeoAuditRuns(20)]);

  return <SeoAuditHub latest={latest} history={history} />;
}

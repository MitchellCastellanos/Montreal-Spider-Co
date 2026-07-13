import { hasDatabase } from "@/lib/db";
import { getPartnerBalances, listSettlementEntries, listStatements } from "@/lib/data/settlement";
import { getDistributorLocations } from "@/lib/data/locations";
import SettlementsHub from "@/components/admin/SettlementsHub";

export const dynamic = "force-dynamic";

export default async function AdminSettlementsPage() {
  if (!hasDatabase) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold text-cream">Partner settlements</h1>
        <p className="mt-4 text-sm text-muted">Connect a database to track settlements.</p>
      </div>
    );
  }

  const [balances, entries, statements, locations] = await Promise.all([
    getPartnerBalances(),
    listSettlementEntries(),
    listStatements(),
    getDistributorLocations(),
  ]);

  return (
    <SettlementsHub
      balances={balances}
      entries={entries.map((e) => ({
        id: e.id,
        locationName: e.locationName,
        scientific: e.scientific,
        sizeLabel: e.sizeLabel,
        soldAt: e.soldAt,
        salePrice: e.salePrice,
        settlementPrice: e.settlementPrice,
        partnerMargin: e.partnerMargin,
        paymentStatus: e.paymentStatus,
      }))}
      statements={statements.map((s) => ({
        id: s.id,
        locationName: s.locationName,
        periodStart: s.periodStart,
        totalSales: s.totalSales,
        totalOwed: s.totalOwed,
        totalMargin: s.totalMargin,
        entryCount: s.entryCount,
        status: s.status,
      }))}
      locations={locations.map((l) => ({ id: l.id, name: l.name }))}
    />
  );
}

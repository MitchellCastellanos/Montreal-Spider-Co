import { isLocale, type Locale } from "@/i18n/config";
import { hasDatabase } from "@/lib/db";
import { listAudits, listExpectedSpecimensAt } from "@/lib/data/audits";
import { getDistributorLocations } from "@/lib/data/locations";
import AuditsHub, { type AuditLocation } from "@/components/admin/AuditsHub";

export const dynamic = "force-dynamic";

export default async function AdminAuditsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";

  if (!hasDatabase) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold text-cream">Store audits</h1>
        <p className="mt-4 text-sm text-muted">Connect a database to run store audits.</p>
      </div>
    );
  }

  const [audits, partnerLocations] = await Promise.all([listAudits(), getDistributorLocations()]);

  const locations: AuditLocation[] = await Promise.all(
    partnerLocations.map(async (l) => ({
      id: l.id,
      name: l.name,
      specimens: (await listExpectedSpecimensAt(l.id)).map((s) => ({
        id: s.id,
        scientific: s.scientific,
        commonName: s.commonName,
        sizeLabel: s.sizeLabel,
        sizeCm: s.sizeCm,
        sex: s.sex,
        status: s.status,
        price: s.price,
        msrp: s.msrp,
        settlementPrice: s.settlementPrice,
      })),
    })),
  );

  return <AuditsHub audits={audits} locations={locations} locale={loc} />;
}

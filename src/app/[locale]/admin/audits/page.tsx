import { isLocale, type Locale } from "@/i18n/config";
import { hasDatabase } from "@/lib/db";
import { listAudits, listExpectedSpecimensAt, listOpenAudits } from "@/lib/data/audits";
import { getDistributorLocations } from "@/lib/data/locations";
import AuditsHub, { type AuditLocation, type OpenAudit } from "@/components/admin/AuditsHub";

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

  const [audits, partnerLocations, openAudits] = await Promise.all([
    listAudits(),
    getDistributorLocations(),
    listOpenAudits(),
  ]);

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

  const openAuditViews: OpenAudit[] = openAudits.map((a) => ({
    id: a.id,
    locationName: a.locationName,
    auditedAt: a.auditedAt,
    employee: a.employee,
    foundCount: a.foundCount,
    missingCount: a.missingCount,
    soldCount: a.soldCount,
    items: a.items.map((i) => ({
      specimenId: i.specimenId,
      scientific: i.scientific,
      sizeLabel: i.sizeLabel,
      result: i.result,
      notes: i.notes,
    })),
  }));

  return <AuditsHub audits={audits} locations={locations} openAudits={openAuditViews} locale={loc} />;
}

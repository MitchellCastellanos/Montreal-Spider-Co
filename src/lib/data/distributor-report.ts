import "server-only";
import { getLocationById } from "@/lib/data/locations";
import { listExpectedSpecimensAt } from "@/lib/data/audits";
import { prisma } from "@/lib/db";
import { suggestedSalePrice } from "@/lib/inventory-labels";
import { sendNotification } from "@/lib/notifications/service";
import type { EmailLocale } from "@/lib/email-templates";

/**
 * Per-distributor inventory report — what a partner currently holds on
 * consignment, priced two ways: the recommended (website) price and what
 * they owe MSC ("their" price), plus their outstanding settlement balance.
 * Powers the admin Distributors page (view, CSV export, email to partner).
 */

function requireDb() {
  if (!prisma) throw new Error("Database not configured.");
  return prisma;
}

export interface DistributorInventoryRow {
  specimenId: string;
  scientific: string;
  commonName: string;
  sizeLabel: string;
  sex: string;
  status: string;
  /** Suggested retail (website) price. */
  recommendedPrice: number;
  /** What the partner owes MSC if they sell this specimen. */
  distributorPrice: number;
}

export interface DistributorInventoryReport {
  locationId: string;
  locationName: string;
  contactName: string;
  email: string;
  phone: string;
  items: DistributorInventoryRow[];
  itemCount: number;
  totalRecommendedValue: number;
  totalDistributorValue: number;
  /** Already-sold entries not yet paid (pending + invoiced), from the settlement ledger. */
  outstandingOwed: number;
}

export async function getDistributorInventoryReport(locationId: string): Promise<DistributorInventoryReport> {
  const location = await getLocationById(locationId);
  if (!location) throw new Error("Distributor not found.");

  const db = requireDb();
  const [expected, balanceEntries] = await Promise.all([
    listExpectedSpecimensAt(locationId),
    db.settlementEntry.findMany({
      where: { locationId, paymentStatus: { in: ["pending", "invoiced"] } },
      select: { settlementPrice: true },
    }),
  ]);

  const items: DistributorInventoryRow[] = expected.map((s) => ({
    specimenId: s.id,
    scientific: s.scientific,
    commonName: s.commonName,
    sizeLabel: s.sizeLabel,
    sex: s.sex,
    status: s.status,
    recommendedPrice: s.msrp ?? s.price,
    distributorPrice: suggestedSalePrice(s, "distributor"),
  }));

  return {
    locationId: location.id,
    locationName: location.name,
    contactName: location.contactName,
    email: location.email,
    phone: location.phone || location.whatsapp,
    items,
    itemCount: items.length,
    totalRecommendedValue: items.reduce((sum, i) => sum + i.recommendedPrice, 0),
    totalDistributorValue: items.reduce((sum, i) => sum + i.distributorPrice, 0),
    outstandingOwed: balanceEntries.reduce((sum, e) => sum + e.settlementPrice, 0),
  };
}

/** Emails the current inventory report (with financial summary) to the partner's address on file. */
export async function sendDistributorInventoryReport(locationId: string, locale: EmailLocale = "en"): Promise<void> {
  const report = await getDistributorInventoryReport(locationId);
  if (!report.email.trim()) throw new Error("This distributor has no contact email on file.");

  const rowsHtml = report.items
    .map(
      (i) =>
        `<tr><td style="padding:8px 10px;border-bottom:1px solid #efe7d4;"><i>${i.scientific}</i><br /><span style="color:#8a7b5c;font-size:12px;">${i.sizeLabel} · ${i.sex}</span></td>` +
        `<td style="padding:8px 10px;border-bottom:1px solid #efe7d4;text-align:right;">$${i.recommendedPrice.toFixed(2)}</td>` +
        `<td style="padding:8px 10px;border-bottom:1px solid #efe7d4;text-align:right;">$${i.distributorPrice.toFixed(2)}</td></tr>`,
    )
    .join("");

  const generatedDate = new Date().toLocaleDateString(locale === "fr" ? "fr-CA" : "en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  await sendNotification({
    templateId: "partner-inventory-report",
    event: "distributor.inventory_report_sent",
    to: report.email,
    locale,
    data: {
      partnerName: report.contactName || report.locationName,
      storeName: report.locationName,
      generatedDate,
      itemCount: String(report.itemCount),
      totalRecommendedValue: `$${report.totalRecommendedValue.toFixed(2)} CAD`,
      totalDistributorValue: `$${report.totalDistributorValue.toFixed(2)} CAD`,
      outstandingOwed: `$${report.outstandingOwed.toFixed(2)} CAD`,
      itemRows: rowsHtml,
    },
    context: { locationId },
  });
}

import "server-only";
import { getLocationById } from "@/lib/data/locations";
import { listExpectedSpecimensAt } from "@/lib/data/audits";
import { prisma } from "@/lib/db";
import { suggestedSalePrice, STATUS_LABELS } from "@/lib/inventory-labels";
import { sendNotification } from "@/lib/notifications/service";
import { buildDistributorInventoryPdf } from "@/lib/distributor-report-pdf";
import { SITE } from "@/lib/site";
import type { EmailLocale } from "@/lib/email-templates";

export type DistributorReportFormat = "csv" | "pdf";

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

function reportFilenameBase(report: DistributorInventoryReport): string {
  const slug = report.locationName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${slug || "distributor"}-inventory-${new Date().toISOString().slice(0, 10)}`;
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Plain-text CSV export — item table, financial summary and MSC contact info. */
export function buildDistributorInventoryCsv(report: DistributorInventoryReport): string {
  const lines: string[] = [];
  lines.push(csvCell(`Distributor inventory report — ${report.locationName}`));
  lines.push(`Generated,${new Date().toISOString().slice(0, 10)}`);
  lines.push("");
  lines.push(
    ["Species", "Common name", "Size", "Sex", "Status", "Recommended price (CAD)", "Distributor price (CAD)"].join(","),
  );
  for (const item of report.items) {
    lines.push(
      [
        csvCell(item.scientific),
        csvCell(item.commonName),
        csvCell(item.sizeLabel),
        item.sex,
        STATUS_LABELS[item.status] ?? item.status,
        item.recommendedPrice.toFixed(2),
        item.distributorPrice.toFixed(2),
      ].join(","),
    );
  }
  lines.push("");
  lines.push("Summary");
  lines.push(`Items on hand,${report.itemCount}`);
  lines.push(`Total value at recommended price,${report.totalRecommendedValue.toFixed(2)}`);
  lines.push(`Total owed to MSC if all sold,${report.totalDistributorValue.toFixed(2)}`);
  lines.push(`Outstanding balance already owed,${report.outstandingOwed.toFixed(2)}`);
  lines.push("");
  lines.push("Contact");
  lines.push(csvCell(`${SITE.name},${SITE.email},${SITE.url}`));
  return lines.join("\n");
}

/** Emails the current inventory report (with financial summary) to the partner's address on file, attached as CSV or PDF. */
export async function sendDistributorInventoryReport(
  locationId: string,
  locale: EmailLocale = "en",
  format: DistributorReportFormat = "pdf",
): Promise<void> {
  const report = await getDistributorInventoryReport(locationId);
  if (!report.email.trim()) throw new Error("This distributor has no contact email on file.");

  const filenameBase = reportFilenameBase(report);
  const attachment =
    format === "pdf"
      ? {
          filename: `${filenameBase}.pdf`,
          content: Buffer.from(await buildDistributorInventoryPdf(report)),
          contentType: "application/pdf",
        }
      : {
          filename: `${filenameBase}.csv`,
          content: Buffer.from(buildDistributorInventoryCsv(report), "utf-8"),
          contentType: "text/csv",
        };

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
      attachmentLabel: format.toUpperCase(),
    },
    context: { locationId, format },
    attachments: [attachment],
  });
}

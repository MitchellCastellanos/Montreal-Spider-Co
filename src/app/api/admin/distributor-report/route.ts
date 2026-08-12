import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/auth";
import { getDistributorInventoryReport, buildDistributorInventoryCsv } from "@/lib/data/distributor-report";
import { buildDistributorInventoryPdf } from "@/lib/distributor-report-pdf";

export const dynamic = "force-dynamic";

/** Downloads a distributor's current inventory report as CSV or PDF. `?locationId=…&format=csv|pdf` */
export async function GET(req: Request) {
  if (!(await isAdminAuthed())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get("locationId");
  const format = searchParams.get("format") === "pdf" ? "pdf" : "csv";
  if (!locationId) {
    return NextResponse.json({ error: "Missing locationId." }, { status: 400 });
  }

  let report;
  try {
    report = await getDistributorInventoryReport(locationId);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "not_found" }, { status: 404 });
  }

  const slug = report.locationName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "distributor";
  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "pdf") {
    const pdfBytes = await buildDistributorInventoryPdf(report);
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${slug}-inventory-${stamp}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const csv = buildDistributorInventoryCsv(report);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}-inventory-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

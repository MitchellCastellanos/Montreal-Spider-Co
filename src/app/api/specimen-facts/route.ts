import { NextRequest, NextResponse } from "next/server";
import { hasDatabase } from "@/lib/db";
import { getSpecimenByQrToken } from "@/lib/partner/walk-in";
import { formatCmAsInches } from "@/lib/size-inches";

/**
 * Public facts for a scanned specimen QR — backs the "Important facts" panel
 * on the product page. Only customer-facing fields: no MSRP, settlement price
 * or other partner-only figures (those stay on the distributor screen).
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const slug = request.nextUrl.searchParams.get("slug");
  if (!token || !slug || !hasDatabase) {
    return NextResponse.json(null, { status: 404 });
  }

  const specimen = await getSpecimenByQrToken(token);
  if (!specimen || specimen.product.slug !== slug) {
    return NextResponse.json(null, { status: 404 });
  }

  return NextResponse.json({
    sizeLabel: `${formatCmAsInches(specimen.sizeCm)} (${specimen.sizeCm.toFixed(1)} cm)`,
    sex: specimen.sex,
    lastMeasured: specimen.lastMeasuredAt?.toISOString().slice(0, 10) ?? null,
    locationName: specimen.locationType === "consignment" && specimen.location ? specimen.location.name : null,
    tarantulAppId: specimen.tarantulAppId,
    status: specimen.status,
    includesEnclosure: specimen.includesEnclosure,
  });
}

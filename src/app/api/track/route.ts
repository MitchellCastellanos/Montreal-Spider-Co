import { NextResponse } from "next/server";
import { trackPageView } from "@/lib/data/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * First-party pageview beacon. Fired by `AnalyticsBeacon` on every route
 * change. Never blocks or errors the page: always returns 204, even when the
 * database isn't configured or the payload is malformed.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "0.0.0.0";
    const userAgent = req.headers.get("user-agent") || "";

    await trackPageView({
      path: typeof body.path === "string" ? body.path : "/",
      locale: typeof body.locale === "string" ? body.locale : "en",
      referrer: typeof body.referrer === "string" ? body.referrer : "",
      utmSource: typeof body.utmSource === "string" ? body.utmSource : "",
      utmMedium: typeof body.utmMedium === "string" ? body.utmMedium : "",
      utmCampaign: typeof body.utmCampaign === "string" ? body.utmCampaign : "",
      ip,
      userAgent,
    });
  } catch {
    // swallow — tracking must never surface an error to the client
  }
  return new NextResponse(null, { status: 204 });
}

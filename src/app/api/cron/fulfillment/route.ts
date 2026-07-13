import { NextResponse } from "next/server";
import { hasDatabase } from "@/lib/db";
import { processOverdueFulfillments } from "@/lib/fulfillment/fulfillment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Scheduled fulfillment sweep (Vercel Cron): pickup reminders, no-show
 * warnings, and automatic cancellation + refund after the grace period.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
  }
  if (!hasDatabase) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }

  const result = await processOverdueFulfillments();
  return NextResponse.json({ ok: true, ...result });
}

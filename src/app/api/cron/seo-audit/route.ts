import { NextResponse } from "next/server";
import { hasDatabase } from "@/lib/db";
import { executeAndRecordSeoAudit } from "@/lib/data/seo-audits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Weekly automated SEO health check (Vercel Cron, see vercel.json). Crawls
 * key routes, scores the result, stores it for the admin SEO dashboard, and
 * emails a summary to staff — the "agency-style" weekly audit.
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

  const runId = await executeAndRecordSeoAudit();
  return NextResponse.json({ ok: true, runId });
}

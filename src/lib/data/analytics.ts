import "server-only";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { logDbFallback } from "@/lib/data/db-safe";
import { SITE } from "@/lib/site";

/**
 * First-party, cookie-free pageview tracking. No script or IP address ever
 * leaves the server: `visitorHash` is a one-way hash of IP+UA salted with the
 * calendar day, just enough to approximate daily unique visitors without
 * storing anything that identifies a person.
 */

const BOT_UA = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|whatsapp|pingdom|uptimerobot|headlesschrome|lighthouse|ahrefsbot|semrushbot|mj12bot|dotbot/i;

function dailySalt(): string {
  return new Date().toISOString().slice(0, 10);
}

function hashVisitor(ip: string, ua: string): string {
  return crypto.createHash("sha256").update(`${dailySalt()}|${ip}|${ua}`).digest("hex").slice(0, 32);
}

function deviceFromUA(ua: string): string {
  if (/tablet|ipad/i.test(ua)) return "tablet";
  if (/mobile|android|iphone/i.test(ua)) return "mobile";
  return "desktop";
}

export interface TrackPageViewInput {
  path: string;
  locale: string;
  referrer: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  ip: string;
  userAgent: string;
}

/** Returns true if the hit was recorded (false if skipped — no DB, bot, or admin route). */
export async function trackPageView(input: TrackPageViewInput): Promise<boolean> {
  if (!prisma) return false;
  if (BOT_UA.test(input.userAgent)) return false;
  if (input.path.startsWith("/admin")) return false;

  let referrerHost = "";
  if (input.referrer) {
    try {
      const url = new URL(input.referrer);
      const host = url.hostname.replace(/^www\./, "");
      const ownHost = new URL(SITE.url).hostname.replace(/^www\./, "");
      if (host !== ownHost) referrerHost = host;
    } catch {
      // ignore unparsable referrer
    }
  }

  try {
    await prisma.pageView.create({
      data: {
        path: input.path.slice(0, 300),
        locale: input.locale === "fr" ? "fr" : "en",
        referrerHost: referrerHost.slice(0, 200),
        utmSource: input.utmSource.slice(0, 100),
        utmMedium: input.utmMedium.slice(0, 100),
        utmCampaign: input.utmCampaign.slice(0, 100),
        device: deviceFromUA(input.userAgent),
        visitorHash: hashVisitor(input.ip, input.userAgent),
      },
    });
    return true;
  } catch (e) {
    logDbFallback("trackPageView", e);
    return false;
  }
}

export interface DailyPoint {
  date: string; // YYYY-MM-DD
  views: number;
  uniques: number;
}

export interface RangeBreakdown {
  totals: { views: number; uniques: number };
  topPages: { path: string; views: number }[];
  topReferrers: { referrer: string; views: number }[];
  devices: { device: string; views: number }[];
  locales: { locale: string; views: number }[];
}

const MAX_DAYS = 90;

/** Daily series for the last `days` days (default the widest range the dashboard offers). */
export async function getDailySeries(days: number = MAX_DAYS): Promise<DailyPoint[]> {
  if (!prisma) return [];
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  try {
    const rows = await prisma.$queryRaw<{ day: Date; views: bigint; uniques: bigint }[]>`
      SELECT date_trunc('day', "createdAt") AS day,
             COUNT(*)::bigint AS views,
             COUNT(DISTINCT "visitorHash")::bigint AS uniques
      FROM "PageView"
      WHERE "createdAt" >= ${since}
      GROUP BY 1
      ORDER BY 1 ASC
    `;
    const byDay = new Map(rows.map((r) => [r.day.toISOString().slice(0, 10), r]));

    const series: DailyPoint[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const row = byDay.get(key);
      series.push({ date: key, views: row ? Number(row.views) : 0, uniques: row ? Number(row.uniques) : 0 });
    }
    return series;
  } catch (e) {
    logDbFallback("getDailySeries", e);
    return [];
  }
}

/** Top pages / referrers / devices / locales + totals for the last `days` days. */
export async function getRangeBreakdown(days: number): Promise<RangeBreakdown> {
  const empty: RangeBreakdown = { totals: { views: 0, uniques: 0 }, topPages: [], topReferrers: [], devices: [], locales: [] };
  if (!prisma) return empty;

  const since = new Date();
  since.setDate(since.getDate() - days);

  try {
    const [totalsRow, topPages, topReferrers, devices, locales] = await Promise.all([
      prisma.$queryRaw<{ views: bigint; uniques: bigint }[]>`
        SELECT COUNT(*)::bigint AS views, COUNT(DISTINCT "visitorHash")::bigint AS uniques
        FROM "PageView" WHERE "createdAt" >= ${since}
      `,
      prisma.pageView.groupBy({
        by: ["path"],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
        orderBy: { _count: { path: "desc" } },
        take: 10,
      }),
      prisma.pageView.groupBy({
        by: ["referrerHost"],
        where: { createdAt: { gte: since }, referrerHost: { not: "" } },
        _count: { _all: true },
        orderBy: { _count: { referrerHost: "desc" } },
        take: 10,
      }),
      prisma.pageView.groupBy({
        by: ["device"],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
        orderBy: { _count: { device: "desc" } },
      }),
      prisma.pageView.groupBy({
        by: ["locale"],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
        orderBy: { _count: { locale: "desc" } },
      }),
    ]);

    return {
      totals: { views: Number(totalsRow[0]?.views ?? 0), uniques: Number(totalsRow[0]?.uniques ?? 0) },
      topPages: topPages.map((r) => ({ path: r.path, views: r._count._all })),
      topReferrers: topReferrers.map((r) => ({ referrer: r.referrerHost || "Direct", views: r._count._all })),
      devices: devices.map((r) => ({ device: r.device, views: r._count._all })),
      locales: locales.map((r) => ({ locale: r.locale, views: r._count._all })),
    };
  } catch (e) {
    logDbFallback("getRangeBreakdown", e);
    return empty;
  }
}

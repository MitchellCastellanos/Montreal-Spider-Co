import "server-only";
import { prisma } from "@/lib/db";
import { logDbFallback } from "@/lib/data/db-safe";
import { runSeoAudit } from "@/lib/seo-audit";
import { SITE } from "@/lib/site";
import { locales } from "@/i18n/config";
import { localeHref } from "@/lib/href";
import { notifyStaff } from "@/lib/notifications/service";

function requireDb() {
  if (!prisma) throw new Error("Database not configured.");
  return prisma;
}

const SEVERITY_RANK: Record<string, number> = { critical: 0, warning: 1, info: 2 };

export interface SeoAuditRunView {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  pagesChecked: number;
  score: number;
  criticalCount: number;
  warningCount: number;
  error: string;
}

export interface SeoAuditIssueView {
  path: string;
  severity: "info" | "warning" | "critical";
  code: string;
  message: string;
}

export interface SeoAuditDetail extends SeoAuditRunView {
  issues: SeoAuditIssueView[];
}

function formatIssueLines(issues: SeoAuditIssueView[]): string {
  const top = issues.filter((i) => i.severity !== "info").slice(0, 10);
  if (top.length === 0) return "No critical or warning issues — nice work.";
  return top.map((i) => `• [${i.severity.toUpperCase()}] ${i.path} — ${i.message}`).join("<br />");
}

/** Runs the crawl and persists the result, then emails the staff a summary. Never throws. */
export async function executeAndRecordSeoAudit(): Promise<string> {
  const db = requireDb();
  const run = await db.seoAuditRun.create({ data: {} });

  try {
    const result = await runSeoAudit(SITE.url, locales);
    const criticalCount = result.issues.filter((i) => i.severity === "critical").length;
    const warningCount = result.issues.filter((i) => i.severity === "warning").length;

    await db.seoAuditIssue.createMany({
      data: result.issues.map((i) => ({ runId: run.id, path: i.path, severity: i.severity, code: i.code, message: i.message })),
    });
    await db.seoAuditRun.update({
      where: { id: run.id },
      data: { finishedAt: new Date(), pagesChecked: result.pagesChecked, score: result.score, criticalCount, warningCount },
    });

    await notifyStaff({
      templateId: "internal-seo-audit-report",
      event: "seo_audit.completed",
      data: {
        score: String(result.score),
        pagesChecked: String(result.pagesChecked),
        criticalCount: String(criticalCount),
        warningCount: String(warningCount),
        issueLines: formatIssueLines(
          result.issues.map((i) => ({ ...i, severity: i.severity as "info" | "warning" | "critical" })),
        ),
        dashboardUrl: `${SITE.url}${localeHref("en", "/admin/seo")}`,
      },
      context: { runId: run.id },
    });

    return run.id;
  } catch (e) {
    logDbFallback("executeAndRecordSeoAudit", e);
    await db.seoAuditRun.update({
      where: { id: run.id },
      data: { finishedAt: new Date(), error: e instanceof Error ? e.message : "Audit failed" },
    });
    return run.id;
  }
}

export async function listSeoAuditRuns(limit = 20): Promise<SeoAuditRunView[]> {
  const db = requireDb();
  const rows = await db.seoAuditRun.findMany({ orderBy: { startedAt: "desc" }, take: limit });
  return rows.map((r) => ({
    id: r.id,
    startedAt: r.startedAt.toISOString(),
    finishedAt: r.finishedAt ? r.finishedAt.toISOString() : null,
    pagesChecked: r.pagesChecked,
    score: r.score,
    criticalCount: r.criticalCount,
    warningCount: r.warningCount,
    error: r.error,
  }));
}

export async function getLatestSeoAudit(): Promise<SeoAuditDetail | null> {
  const db = requireDb();
  const run = await db.seoAuditRun.findFirst({ orderBy: { startedAt: "desc" }, include: { issues: true } });
  if (!run) return null;
  return {
    id: run.id,
    startedAt: run.startedAt.toISOString(),
    finishedAt: run.finishedAt ? run.finishedAt.toISOString() : null,
    pagesChecked: run.pagesChecked,
    score: run.score,
    criticalCount: run.criticalCount,
    warningCount: run.warningCount,
    error: run.error,
    issues: [...run.issues]
      .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
      .map((i) => ({ path: i.path, severity: i.severity, code: i.code, message: i.message })),
  };
}

import "server-only";

/**
 * Weekly technical/on-page SEO crawler. Fetches a curated set of key routes
 * (both locales) plus robots.txt/sitemap.xml over HTTP and inspects the raw
 * HTML with lightweight regex checks — no headless browser, so it runs fast
 * and cheap inside a Vercel Cron function.
 */

export type SeoIssueSeverity = "info" | "warning" | "critical";

export interface SeoIssueDraft {
  path: string;
  severity: SeoIssueSeverity;
  code: string;
  message: string;
}

export interface SeoAuditResult {
  pagesChecked: number;
  score: number;
  issues: SeoIssueDraft[];
}

const CHECK_PATHS = ["", "/shop", "/care", "/blog", "/verified-origin", "/delivery", "/about", "/faq", "/contact"];

async function fetchPage(url: string): Promise<{ status: number; html: string; ms: number } | null> {
  const start = Date.now();
  try {
    const res = await fetch(url, { redirect: "follow", headers: { "User-Agent": "MSC-SEO-Audit/1.0 (+internal)" }, cache: "no-store" });
    const html = await res.text();
    return { status: res.status, html, ms: Date.now() - start };
  } catch {
    return null;
  }
}

function extract(html: string, re: RegExp): string | null {
  const m = html.match(re);
  return m ? m[1].trim() : null;
}

function countMatches(html: string, re: RegExp): number {
  return (html.match(re) || []).length;
}

export async function runSeoAudit(baseUrl: string, locales: readonly string[]): Promise<SeoAuditResult> {
  const issues: SeoIssueDraft[] = [];
  let pagesChecked = 0;

  const robots = await fetchPage(`${baseUrl}/robots.txt`);
  if (!robots || robots.status !== 200) {
    issues.push({ path: "/robots.txt", severity: "critical", code: "robots_unreachable", message: "robots.txt did not return HTTP 200." });
  } else if (!/sitemap:/i.test(robots.html)) {
    issues.push({ path: "/robots.txt", severity: "warning", code: "robots_no_sitemap", message: "robots.txt doesn't reference the sitemap." });
  }

  const sitemap = await fetchPage(`${baseUrl}/sitemap.xml`);
  if (!sitemap || sitemap.status !== 200) {
    issues.push({ path: "/sitemap.xml", severity: "critical", code: "sitemap_unreachable", message: "sitemap.xml did not return HTTP 200." });
  } else if (countMatches(sitemap.html, /<loc>/g) === 0) {
    issues.push({ path: "/sitemap.xml", severity: "critical", code: "sitemap_empty", message: "sitemap.xml has no <loc> entries." });
  }

  for (const locale of locales) {
    for (const path of CHECK_PATHS) {
      const fullPath = `/${locale}${path}`;
      const page = await fetchPage(`${baseUrl}${fullPath}`);
      pagesChecked++;

      if (!page) {
        issues.push({ path: fullPath, severity: "critical", code: "fetch_failed", message: "Request failed (network error)." });
        continue;
      }
      if (page.status !== 200) {
        issues.push({ path: fullPath, severity: "critical", code: "bad_status", message: `Returned HTTP ${page.status}.` });
        continue;
      }
      if (page.ms > 3000) {
        issues.push({ path: fullPath, severity: "warning", code: "slow_response", message: `Response took ${page.ms}ms (aim under 3s).` });
      }

      const title = extract(page.html, /<title[^>]*>([^<]*)<\/title>/i);
      if (!title) {
        issues.push({ path: fullPath, severity: "critical", code: "missing_title", message: "No <title> tag found." });
      } else if (title.length < 10 || title.length > 70) {
        issues.push({ path: fullPath, severity: "warning", code: "title_length", message: `Title is ${title.length} characters (aim for 10-70).` });
      }

      const description = extract(page.html, /<meta\s+name="description"\s+content="([^"]*)"/i);
      if (!description) {
        issues.push({ path: fullPath, severity: "critical", code: "missing_description", message: "No meta description found." });
      } else if (description.length < 50 || description.length > 160) {
        issues.push({ path: fullPath, severity: "warning", code: "description_length", message: `Description is ${description.length} characters (aim for 50-160).` });
      }

      const h1Count = countMatches(page.html, /<h1[\s>]/gi);
      if (h1Count === 0) {
        issues.push({ path: fullPath, severity: "warning", code: "missing_h1", message: "No <h1> found on the page." });
      } else if (h1Count > 1) {
        issues.push({ path: fullPath, severity: "info", code: "multiple_h1", message: `${h1Count} <h1> tags found — expected exactly one.` });
      }

      if (!/rel="canonical"/i.test(page.html)) {
        issues.push({ path: fullPath, severity: "warning", code: "missing_canonical", message: "No canonical link tag." });
      }

      const hreflangCount = countMatches(page.html, /rel="alternate"[^>]+hreflang=/gi);
      if (hreflangCount < locales.length) {
        issues.push({ path: fullPath, severity: "info", code: "incomplete_hreflang", message: `Only ${hreflangCount} hreflang alternate tag(s) found.` });
      }

      if (!/property="og:title"/i.test(page.html) || !/property="og:image"/i.test(page.html)) {
        issues.push({ path: fullPath, severity: "info", code: "missing_og", message: "Missing Open Graph title or image tags." });
      }

      const imgTags = page.html.match(/<img\b[^>]*>/gi) || [];
      const imgsMissingAlt = imgTags.filter((t) => !/\balt=/i.test(t)).length;
      if (imgsMissingAlt > 0) {
        issues.push({ path: fullPath, severity: "warning", code: "images_missing_alt", message: `${imgsMissingAlt} <img> tag(s) without alt text.` });
      }

      const ldJsonBlocks = page.html.match(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi) || [];
      if (ldJsonBlocks.length === 0) {
        issues.push({ path: fullPath, severity: "info", code: "missing_structured_data", message: "No JSON-LD structured data found." });
      } else {
        for (const block of ldJsonBlocks) {
          const jsonMatch = block.match(/>([\s\S]*?)<\/script>/i);
          try {
            if (jsonMatch) JSON.parse(jsonMatch[1]);
          } catch {
            issues.push({ path: fullPath, severity: "critical", code: "invalid_structured_data", message: "A JSON-LD block failed to parse as JSON." });
          }
        }
      }
    }
  }

  const criticalCount = issues.filter((i) => i.severity === "critical").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const score = Math.max(0, 100 - criticalCount * 8 - warningCount * 3);

  return { pagesChecked, score, issues };
}

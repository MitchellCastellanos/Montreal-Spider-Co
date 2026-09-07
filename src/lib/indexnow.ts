import "server-only";
import { SITE } from "@/lib/site";

const INDEXNOW_KEY = process.env.INDEXNOW_KEY;

/**
 * Notifies IndexNow-participating search engines (Bing, Yandex, Seznam, Naver —
 * not Google, which has no equivalent push API) that specific URLs changed, so
 * they can recrawl in minutes instead of waiting for their next sitemap crawl.
 * No-op when INDEXNOW_KEY isn't configured. Never throws.
 */
export async function pingIndexNow(paths: string[]): Promise<void> {
  if (!INDEXNOW_KEY || paths.length === 0) return;
  try {
    const host = new URL(SITE.url).hostname;
    await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host,
        key: INDEXNOW_KEY,
        keyLocation: `${SITE.url}/api/indexnow-key`,
        urlList: paths.map((p) => `${SITE.url}${p}`),
      }),
    });
  } catch (e) {
    console.warn("[indexnow] ping failed:", e instanceof Error ? e.message : e);
  }
}

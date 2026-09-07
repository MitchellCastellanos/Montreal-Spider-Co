"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { Locale } from "@/i18n/config";

function stripLocale(pathname: string): string {
  const m = pathname.match(/^\/(en|fr)(\/.*)?$/);
  return m?.[2] || "/";
}

/**
 * Fires a first-party pageview beacon on mount and on every route change.
 * No cookies, no client-side storage, no third-party script. Skipped
 * entirely on admin routes.
 */
export default function AnalyticsBeacon({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    const path = stripLocale(pathname);
    if (path.startsWith("/admin")) return;
    if (lastSent.current === pathname) return;
    lastSent.current = pathname;

    const payload = {
      path,
      locale,
      referrer: document.referrer || "",
      utmSource: searchParams.get("utm_source") || "",
      utmMedium: searchParams.get("utm_medium") || "",
      utmCampaign: searchParams.get("utm_campaign") || "",
    };

    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
    } else {
      fetch("/api/track", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
    }
  }, [pathname, searchParams, locale]);

  return null;
}

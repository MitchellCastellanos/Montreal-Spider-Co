import { NextRequest, NextResponse } from "next/server";
import { locales, defaultLocale } from "./i18n/config";

const PUBLIC_FILE = /\.(.*)$/;

/** `/en/api/catalog` → `/api/catalog` so locale-prefixed API URLs still hit route handlers. */
function localePrefixedApiPath(pathname: string): string | null {
  for (const loc of locales) {
    const prefix = `/${loc}/api`;
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return pathname.slice(`/${loc}`.length);
    }
  }
  return null;
}

function pickLocale(request: NextRequest): string {
  const cookie = request.cookies.get("NEXT_LOCALE")?.value;
  if (cookie && (locales as readonly string[]).includes(cookie)) return cookie;

  const accept = request.headers.get("accept-language");
  if (accept) {
    const preferred = accept
      .split(",")
      .map((part) => part.split(";")[0].trim().slice(0, 2).toLowerCase());
    for (const lang of preferred) {
      if ((locales as readonly string[]).includes(lang)) return lang;
    }
  }
  return defaultLocale;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const apiPath = localePrefixedApiPath(pathname);
  if (apiPath) {
    const url = request.nextUrl.clone();
    url.pathname = apiPath;
    return NextResponse.rewrite(url);
  }

  // Skip internals, API and static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  const hasLocale = locales.some(
    (loc) => pathname === `/${loc}` || pathname.startsWith(`/${loc}/`)
  );

  if (!hasLocale) {
    const locale = pickLocale(request);
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

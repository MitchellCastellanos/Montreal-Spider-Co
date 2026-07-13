"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/[locale]/admin/actions";
import type { Locale } from "@/i18n/config";
import { localeHref } from "@/lib/href";

const NAV = [
  { href: "/admin", label: "Listings" },
  { href: "/admin/inventory", label: "Inventory" },
  { href: "/admin/operations", label: "Operations" },
  { href: "/admin/audits", label: "Store audits" },
  { href: "/admin/restock", label: "Restock" },
  { href: "/admin/settlements", label: "Settlements" },
  { href: "/admin/labels", label: "QR labels" },
  { href: "/admin/finance", label: "Finance" },
  { href: "/admin/pickup", label: "Locations" },
  { href: "/admin/media", label: "Media & photos" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/templates", label: "Email templates" },
] as const;

function stripLocale(pathname: string): string {
  const m = pathname.match(/^\/(en|fr)(\/.*)?$/);
  return m?.[2] ?? pathname;
}

function isNavActive(pathname: string, href: string): boolean {
  const path = stripLocale(pathname);
  if (href === "/admin") {
    return path === "/admin" || path.startsWith("/admin/products");
  }
  return path === href || path.startsWith(`${href}/`);
}

export default function AdminNav({ locale }: { locale: Locale }) {
  const pathname = usePathname();

  return (
    <aside className="lg:sticky lg:top-24 lg:self-start">
      <div className="rounded-2xl border border-line bg-ink-soft/40 p-3">
        <p className="px-2 pb-2 font-display text-sm font-bold text-cream">Admin panel</p>
        <nav className="flex flex-col gap-1">
          {NAV.map((n) => {
            const active = isNavActive(pathname, n.href);
            return (
              <Link
                key={n.href}
                href={localeHref(locale, n.href)}
                aria-current={active ? "page" : undefined}
                className={`rounded-lg px-3 py-2 text-sm transition ${
                  active
                    ? "bg-gold/15 font-medium text-gold-bright ring-1 ring-gold/40"
                    : "text-bone hover:bg-ink hover:text-gold-bright"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <form action={logoutAction} className="mt-2 border-t border-line pt-2">
          <input type="hidden" name="locale" value={locale} />
          <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-muted transition hover:text-danger">
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}

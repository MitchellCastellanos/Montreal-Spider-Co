import type { Metadata } from "next";
import Link from "next/link";
import { isLocale } from "@/i18n/config";
import { isAdminAuthed, adminConfigured } from "@/lib/auth";
import { hasDatabase } from "@/lib/db";
import { hasStorage } from "@/lib/storage";
import { localeHref } from "@/lib/href";
import AdminLogin from "@/components/admin/AdminLogin";
import { logoutAction } from "./actions";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

// Admin must render per-request: it reads runtime env (ADMIN_PASSWORD, DATABASE_URL)
// and the session cookie, so it must never be prerendered at build time.
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const loc = isLocale(locale) ? locale : "en";

  if (!(await isAdminAuthed())) {
    return <AdminLogin configured={adminConfigured} />;
  }

  const nav = [
    { href: "/admin", label: "Products" },
    { href: "/admin/pickup", label: "Pickup points" },
    { href: "/admin/settings", label: "Settings" },
    { href: "/admin/customers", label: "Customers" },
  ];

  return (
    <div className="container-x py-8">
      {(!hasDatabase || !hasStorage) && (
        <div className="mb-6 rounded-xl border border-gold/30 bg-gold/5 p-3 text-sm text-bone">
          {!hasDatabase && (
            <p>⚠️ No database connected — showing the seed catalog (read-only). Set <code className="text-cream">DATABASE_URL</code> to manage products.</p>
          )}
          {hasDatabase && !hasStorage && (
            <p>⚠️ Image storage not configured — set the Cloudinary env vars to upload product photos.</p>
          )}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[210px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-line bg-ink-soft/40 p-3">
            <p className="px-2 pb-2 font-display text-sm font-bold text-cream">Admin panel</p>
            <nav className="flex flex-col gap-1">
              {nav.map((n) => (
                <Link
                  key={n.href}
                  href={localeHref(loc, n.href)}
                  className="rounded-lg px-3 py-2 text-sm text-bone transition hover:bg-ink hover:text-gold-bright"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
            <form action={logoutAction} className="mt-2 border-t border-line pt-2">
              <input type="hidden" name="locale" value={loc} />
              <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-muted transition hover:text-danger">
                Sign out
              </button>
            </form>
          </div>
        </aside>

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

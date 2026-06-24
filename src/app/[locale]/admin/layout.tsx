import type { Metadata } from "next";
import { isLocale } from "@/i18n/config";
import { isAdminAuthed, adminConfigured } from "@/lib/auth";
import { hasDatabase } from "@/lib/db";
import { hasStorage } from "@/lib/storage";
import AdminLogin from "@/components/admin/AdminLogin";
import AdminNav from "@/components/admin/AdminNav";

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
        <AdminNav locale={loc} />

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

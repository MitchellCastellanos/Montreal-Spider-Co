import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { getAllPickupPoints } from "@/lib/data/locations";
import { t } from "@/lib/types";
import { hasDatabase } from "@/lib/db";
import { localeHref } from "@/lib/href";
import { deletePickupAction } from "../actions";

export default async function AdminPickupPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const points = await getAllPickupPoints();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-cream">Pickup points</h1>
          <p className="text-sm text-muted">{points.length} location(s)</p>
        </div>
        {hasDatabase && (
          <Link href={localeHref(loc, "/admin/pickup/new")} className="btn btn-gold">+ New pickup point</Link>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink-soft text-xs uppercase tracking-wide text-gold-deep">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Address</th>
              <th className="px-4 py-3">Hours</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {points.map((p) => (
              <tr key={p.id} className="text-bone">
                <td className="px-4 py-3">
                  <p className="font-medium text-cream">{p.name}</p>
                  <p className="text-xs text-muted">{p.neighborhood}</p>
                </td>
                <td className="px-4 py-3">{t(p.address, loc)}</td>
                <td className="px-4 py-3">{t(p.hours, loc)}</td>
                <td className="px-4 py-3">
                  {p.active ? <span className="text-ok">Active</span> : <span className="text-muted">Hidden</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {hasDatabase ? (
                      <>
                        <Link href={localeHref(loc, `/admin/pickup/${p.id}`)} className="rounded-md border border-line px-3 py-1.5 text-xs text-cream hover:border-gold hover:text-gold-bright">Edit</Link>
                        <form action={deletePickupAction}>
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="locale" value={loc} />
                          <button className="rounded-md border border-line px-3 py-1.5 text-xs text-muted hover:border-danger hover:text-danger">Delete</button>
                        </form>
                      </>
                    ) : (
                      <span className="text-xs text-muted">read-only</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!hasDatabase && (
        <p className="mt-4 text-sm text-muted">Connect a database (see <code className="text-cream">SETUP_DATABASE.md</code>) to manage pickup points.</p>
      )}
    </div>
  );
}

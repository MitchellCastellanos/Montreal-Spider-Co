"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { bulkDistributorAction, toggleDistributorActiveAction } from "@/app/[locale]/admin/actions";
import type { Locale } from "@/i18n/config";
import type { DistributorView } from "@/lib/data/distributors";
import { formatWeeklyHoursSummary } from "@/lib/opening-hours";
import { localeHref } from "@/lib/href";

export default function DistributorListTable({ distributors, locale }: { distributors: DistributorView[]; locale: Locale }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [pending, startTransition] = useTransition();

  const allSelected = distributors.length > 0 && selected.size === distributors.length;
  const someSelected = selected.size > 0;
  const selectedIds = useMemo(() => [...selected], [selected]);

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(distributors.map((d) => d.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function runBulk(action: "activate" | "deactivate" | "delete") {
    if (!someSelected) return;
    if (action === "delete" && !confirm(`Delete ${selected.size} distributor(s)? This cannot be undone.`)) return;

    const fd = new FormData();
    fd.set("locale", locale);
    fd.set("action", action);
    fd.set("ids", JSON.stringify(selectedIds));

    startTransition(async () => {
      await bulkDistributorAction(fd);
      setSelected(new Set());
    });
  }

  function toggleActive(id: string, active: boolean) {
    const fd = new FormData();
    fd.set("id", id);
    if (active) fd.set("active", "on");

    startTransition(async () => {
      await toggleDistributorActiveAction(fd);
      router.refresh();
    });
  }

  return (
    <div>
      {someSelected && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-gold/25 bg-gold/5 px-4 py-3">
          <span className="text-sm text-bone">{selected.size} selected</span>
          <button type="button" className="btn btn-ghost py-1.5 text-xs" disabled={pending} onClick={() => runBulk("activate")}>
            Activate
          </button>
          <button type="button" className="btn btn-ghost py-1.5 text-xs" disabled={pending} onClick={() => runBulk("deactivate")}>
            Deactivate
          </button>
          <button type="button" className="rounded-md border border-line px-3 py-1.5 text-xs text-muted hover:border-danger hover:text-danger disabled:opacity-50" disabled={pending} onClick={() => runBulk("delete")}>
            Delete
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink-soft text-xs uppercase tracking-wide text-gold-deep">
            <tr>
              <th className="w-10 px-4 py-3">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all" className="accent-[var(--gold)]" />
              </th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Address</th>
              <th className="px-4 py-3">Hours</th>
              <th className="px-4 py-3">Active</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {distributors.map((d) => (
              <tr key={d.id} className={`text-bone ${selected.has(d.id) ? "bg-gold/5" : ""}`}>
                <td className="px-4 py-3">
                  <input type="checkbox" checked={selected.has(d.id)} onChange={() => toggleOne(d.id)} aria-label={`Select ${d.name}`} className="accent-[var(--gold)]" />
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-cream">{d.name}</p>
                  <p className="text-xs text-muted">{d.neighborhood}</p>
                </td>
                <td className="px-4 py-3">{d.address}</td>
                <td className="px-4 py-3">{formatWeeklyHoursSummary(d.hours, locale)}</td>
                <td className="px-4 py-3">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={d.active} disabled={pending} onChange={(e) => toggleActive(d.id, e.target.checked)} className="accent-[var(--gold)]" />
                    <span className="text-xs text-muted">{d.active ? "Visible" : "Hidden"}</span>
                  </label>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={localeHref(locale, `/admin/distributors/${d.id}`)} className="rounded-md border border-line px-3 py-1.5 text-xs text-cream hover:border-gold hover:text-gold-bright">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

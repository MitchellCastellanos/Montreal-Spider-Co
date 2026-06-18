"use client";

import { useActionState } from "react";
import Link from "next/link";
import { savePickupAction, type ActionState } from "@/app/[locale]/admin/actions";
import { useI18n } from "@/i18n/I18nProvider";
import { localeHref } from "@/lib/href";
import type { PickupView } from "@/lib/data/locations";

export default function PickupForm({ point }: { point: PickupView | null }) {
  const { locale } = useI18n();
  const [state, action, pending] = useActionState<ActionState, FormData>(savePickupAction, {});

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-cream">{point ? "Edit pickup point" : "New pickup point"}</h1>
        <Link href={localeHref(locale, "/admin/pickup")} className="text-sm text-gold-deep hover:text-gold-bright">← Back</Link>
      </div>

      <form action={action} className="card-glow space-y-4 rounded-2xl p-5">
        <input type="hidden" name="locale" value={locale} />
        {point && <input type="hidden" name="id" value={point.id} />}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="field">
            <span>Name *</span>
            <input name="name" defaultValue={point?.name} className="input" required />
          </label>
          <label className="field">
            <span>Neighborhood</span>
            <input name="neighborhood" defaultValue={point?.neighborhood} className="input" />
          </label>
          <label className="field">
            <span>Address (EN) *</span>
            <input name="addressEn" defaultValue={point?.address.en} className="input" required />
          </label>
          <label className="field">
            <span>Address (FR)</span>
            <input name="addressFr" defaultValue={point?.address.fr} className="input" />
          </label>
          <label className="field">
            <span>Hours (EN)</span>
            <input name="hoursEn" defaultValue={point?.hours.en} className="input" placeholder="Tue–Sun, 12:00–19:00" />
          </label>
          <label className="field">
            <span>Hours (FR)</span>
            <input name="hoursFr" defaultValue={point?.hours.fr} className="input" placeholder="Mar–Dim, 12h00–19h00" />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm text-bone">
          <input type="checkbox" name="active" defaultChecked={point ? point.active : true} className="accent-[var(--gold)]" />
          Active (visible on the site)
        </label>

        {state.error && <p className="text-sm text-danger">Could not save: {state.error}</p>}

        <div className="flex gap-3 pt-1">
          <button className="btn btn-gold" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
          <Link href={localeHref(locale, "/admin/pickup")} className="btn btn-ghost">Cancel</Link>
        </div>
      </form>
    </div>
  );
}

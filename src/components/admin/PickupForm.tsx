"use client";

import { useActionState } from "react";
import Link from "next/link";
import { savePickupAction, type ActionState } from "@/app/[locale]/admin/actions";
import { useI18n } from "@/i18n/I18nProvider";
import { localeHref } from "@/lib/href";
import type { PickupView } from "@/lib/data/locations";
import { EMPTY_WEEKLY_HOURS } from "@/lib/opening-hours";
import OpeningHoursEditor from "@/components/admin/OpeningHoursEditor";

export default function PickupForm({ point }: { point: PickupView | null }) {
  const { locale } = useI18n();
  const [state, action, pending] = useActionState<ActionState, FormData>(savePickupAction, {});

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-cream">{point ? "Edit pickup point" : "New pickup point"}</h1>
        <Link href={localeHref(locale, "/admin/pickup")} className="text-sm text-gold-deep hover:text-gold-bright">← Back</Link>
      </div>

      <form action={action} className="card-glow space-y-5 rounded-2xl p-5">
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
          <label className="field sm:col-span-2">
            <span>Address *</span>
            <input name="address" defaultValue={point?.address} className="input" required placeholder="1234 Rue Example, Montréal" />
          </label>
          <label className="field">
            <span>Phone</span>
            <input name="phone" type="tel" defaultValue={point?.phone} className="input" placeholder="514-555-0142" />
          </label>
          <label className="field">
            <span>Google Maps link</span>
            <input name="mapsUrl" type="url" defaultValue={point?.mapsUrl} className="input" placeholder="https://maps.google.com/..." />
          </label>
        </div>

        <div>
          <p className="mb-3 text-sm font-medium text-cream">Opening hours</p>
          <p className="mb-3 text-xs text-muted">Set hours per day — displayed on the site in the visitor&apos;s language.</p>
          <OpeningHoursEditor name="hours" initial={point?.hours ?? EMPTY_WEEKLY_HOURS} />
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

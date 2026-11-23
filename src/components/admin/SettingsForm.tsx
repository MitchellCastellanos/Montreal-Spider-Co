"use client";

import { useActionState } from "react";
import { saveSettingsAction, type ActionState } from "@/app/[locale]/admin/actions";
import { useI18n } from "@/i18n/I18nProvider";
import type { StoreSettings } from "@/lib/data/setting-defaults";

export default function SettingsForm({ settings, editable }: { settings: StoreSettings; editable: boolean }) {
  const { locale } = useI18n();
  const [state, action, pending] = useActionState<ActionState, FormData>(saveSettingsAction, {});

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-bold text-cream">Store settings</h1>
      <p className="mb-6 text-sm text-muted">Pickup policy and terms &amp; conditions. Use <code className="text-cream">{"{days}"}</code> in the pickup policy to insert the number of business days automatically.</p>

      <form action={action} className="space-y-6">
        <input type="hidden" name="locale" value={locale} />

        <section className="card-glow rounded-2xl p-5">
          <h2 className="mb-4 font-display text-lg font-semibold text-cream">Pickup policy</h2>
          <label className="field max-w-[200px]">
            <span>Pickup window (business days)</span>
            <input type="number" min="1" name="pickupBusinessDays" defaultValue={settings.pickupBusinessDays} className="input" />
          </label>
          <p className="mt-2 max-w-2xl text-xs text-muted">
            Counted on the days the pickup location (distributor or pickup point) is open, per its opening hours. The day
            the order becomes ready isn&apos;t counted; the customer can collect until the location closes on the last day.
            Meetups and locations without hours use Mon–Sat, 9:30–16:30.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="field">
              <span>Pickup terms (EN)</span>
              <textarea name="pickupTermsEn" defaultValue={settings.pickupTerms.en} className="input min-h-32" />
            </label>
            <label className="field">
              <span>Pickup terms (FR)</span>
              <textarea name="pickupTermsFr" defaultValue={settings.pickupTerms.fr} className="input min-h-32" />
            </label>
          </div>
        </section>

        <section className="card-glow rounded-2xl p-5">
          <h2 className="mb-4 font-display text-lg font-semibold text-cream">Reviews</h2>
          <label className="field">
            <span>Google review link</span>
            <input
              type="url"
              name="googleReviewUrl"
              defaultValue={settings.googleReviewUrl}
              placeholder="https://g.page/r/…/review"
              className="input"
            />
          </label>
          <p className="mt-2 text-xs text-muted">
            Once set, customers get a one-time &ldquo;leave a review&rdquo; email 3 days after their order is marked complete.
            Find this link in your Google Business Profile under Ask for reviews. Leave empty to skip.
          </p>
        </section>

        <section className="card-glow rounded-2xl p-5">
          <h2 className="mb-4 font-display text-lg font-semibold text-cream">Terms &amp; conditions</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="field">
              <span>Terms (EN)</span>
              <textarea name="termsEn" defaultValue={settings.terms.en} className="input min-h-48" />
            </label>
            <label className="field">
              <span>Terms (FR)</span>
              <textarea name="termsFr" defaultValue={settings.terms.fr} className="input min-h-48" />
            </label>
          </div>
        </section>

        {!editable && (
          <p className="rounded-lg border border-gold/30 bg-gold/5 p-3 text-sm text-bone">
            No database connected — these are the defaults (read-only). Set <code className="text-cream">DATABASE_URL</code> to edit and save.
          </p>
        )}
        {state.error && <p className="text-sm text-danger">Could not save: {state.error}</p>}
        {state.ok && <p className="text-sm text-ok">✓ Saved.</p>}

        <button className="btn btn-gold" disabled={pending || !editable}>{pending ? "Saving…" : "Save settings"}</button>
      </form>
    </div>
  );
}

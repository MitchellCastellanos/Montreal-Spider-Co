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
      <p className="mb-6 text-sm text-muted">Pickup policy and terms &amp; conditions. Use <code className="text-cream">{"{days}"}</code> in the pickup policy to insert the window automatically.</p>

      <form action={action} className="space-y-6">
        <input type="hidden" name="locale" value={locale} />

        <section className="card-glow rounded-2xl p-5">
          <h2 className="mb-4 font-display text-lg font-semibold text-cream">Pickup policy</h2>
          <label className="field max-w-[200px]">
            <span>Pickup window (days)</span>
            <input type="number" min="1" name="pickupWindowDays" defaultValue={settings.pickupWindowDays} className="input" />
          </label>
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

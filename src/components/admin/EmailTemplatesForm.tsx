"use client";

import { useActionState, useState } from "react";
import { sendTestEmailAction, type ActionState } from "@/app/[locale]/admin/actions";
import { useI18n } from "@/i18n/I18nProvider";
import type { EmailTemplateMeta } from "@/lib/email-templates";

export default function EmailTemplatesForm({
  templates,
  configured,
}: {
  templates: EmailTemplateMeta[];
  configured: boolean;
}) {
  const { locale } = useI18n();
  const [state, action, pending] = useActionState<ActionState, FormData>(sendTestEmailAction, {});
  const [selected, setSelected] = useState<string>(templates[0]?.id ?? "");
  const [emailLocale, setEmailLocale] = useState<"en" | "fr">("en");

  const active = templates.find((t) => t.id === selected);

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-bold text-cream">Email templates</h1>
      <p className="mb-6 text-sm text-muted">
        Pick a template and send a test copy to any address. Templates still live in code (
        <code className="text-cream">src/lib/email-templates.ts</code>) — this is only for previewing them in a real inbox.
      </p>

      {!configured && (
        <p className="mb-6 rounded-lg border border-gold/30 bg-gold/5 p-3 text-sm text-bone">
          ⚠️ Email delivery is not configured — set <code className="text-cream">RESEND_API_KEY</code> (and optionally{" "}
          <code className="text-cream">RESEND_FROM_EMAIL</code>) to send test emails.
        </p>
      )}

      <form action={action} className="space-y-6">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="templateId" value={selected} />
        <input type="hidden" name="emailLocale" value={emailLocale} />

        <section className="card-glow rounded-2xl p-5">
          <h2 className="mb-4 font-display text-lg font-semibold text-cream">Choose a template</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {templates.map((tpl) => {
              const isActive = tpl.id === selected;
              return (
                <button
                  type="button"
                  key={tpl.id}
                  onClick={() => setSelected(tpl.id)}
                  className={`rounded-xl border p-4 text-left transition ${
                    isActive
                      ? "border-gold bg-gold/10"
                      : "border-line hover:border-gold/50 hover:bg-ink"
                  }`}
                >
                  <p className={`font-medium ${isActive ? "text-gold-bright" : "text-cream"}`}>{tpl.label}</p>
                  <p className="mt-1 text-xs text-muted">{tpl.description}</p>
                </button>
              );
            })}
          </div>
          {active && active.fields.length > 0 && (
            <p className="mt-4 text-xs text-muted">
              Sent with sample values for:{" "}
              {active.fields.map((f) => (
                <code key={f} className="mr-1 text-bone">
                  {f}
                </code>
              ))}
            </p>
          )}
        </section>

        <section className="card-glow rounded-2xl p-5">
          <h2 className="mb-4 font-display text-lg font-semibold text-cream">Send test</h2>
          <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
            <label className="field">
              <span>Send to</span>
              <input
                type="email"
                name="to"
                required
                placeholder="you@example.com"
                className="input"
                autoComplete="off"
              />
            </label>
            <label className="field">
              <span>Language</span>
              <select
                value={emailLocale}
                onChange={(e) => setEmailLocale(e.target.value === "fr" ? "fr" : "en")}
                className="input"
              >
                <option value="en">English</option>
                <option value="fr">Français</option>
              </select>
            </label>
          </div>

          {state.error && <p className="mt-4 text-sm text-danger">Could not send: {state.error}</p>}
          {state.ok && <p className="mt-4 text-sm text-ok">✓ Test email sent.</p>}

          <button className="btn btn-gold mt-5" disabled={pending || !configured || !selected}>
            {pending ? "Sending…" : "Send test email"}
          </button>
        </section>
      </form>
    </div>
  );
}

"use client";

import { useActionState } from "react";
import { loginAction, type ActionState } from "@/app/[locale]/admin/actions";
import { useI18n } from "@/i18n/I18nProvider";

export default function AdminLogin({ configured }: { configured: boolean }) {
  const { locale } = useI18n();
  const [state, action, pending] = useActionState<ActionState, FormData>(loginAction, {});

  return (
    <div className="container-x flex min-h-[70vh] items-center justify-center py-16">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-gold/30 bg-gold/10 text-xl text-gold-bright">
            ⚙
          </span>
          <h1 className="mt-4 font-display text-2xl font-bold text-cream">Admin · Montreal Spider Co.</h1>
          <p className="mt-2 text-sm text-bone">Staff sign-in</p>
        </div>

        {!configured ? (
          <div className="rounded-2xl border border-gold/30 bg-gold/5 p-5 text-sm text-bone">
            <p className="font-semibold text-gold-bright">Admin not configured</p>
            <p className="mt-2">
              Set the <code className="text-cream">ADMIN_PASSWORD</code> environment variable (and{" "}
              <code className="text-cream">DATABASE_URL</code> for product management) to enable the
              admin panel. See <code className="text-cream">SETUP_DATABASE.md</code>.
            </p>
          </div>
        ) : (
          <form action={action} className="card-glow space-y-4 rounded-2xl p-6">
            <input type="hidden" name="locale" value={locale} />
            <label className="field">
              <span>Password</span>
              <input type="password" name="password" className="input" autoFocus autoComplete="current-password" />
            </label>
            {state.error && <p className="text-sm text-danger">Incorrect password.</p>}
            <button className="btn btn-gold w-full" disabled={pending}>
              {pending ? "…" : "Sign in"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

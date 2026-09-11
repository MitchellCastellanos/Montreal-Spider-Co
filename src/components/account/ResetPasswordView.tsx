"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/i18n/I18nProvider";
import SpiderGraphic from "@/components/SpiderGraphic";

export default function ResetPasswordView({ token }: { token: string }) {
  const { dict, locale } = useI18n();
  const { resetPassword } = useAuth();
  const router = useRouter();
  const a = dict.account;
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="container-x py-16">
        <div className="mx-auto max-w-md text-center">
          <h1 className="font-display text-3xl font-bold text-cream">{a.resetPasswordTitle}</h1>
          <p className="mt-4 text-sm text-danger">{a.resetInvalidToken}</p>
          <a href={`/${locale}/account`} className="mt-5 inline-block font-semibold text-gold-bright hover:underline">
            {a.backToSignIn}
          </a>
        </div>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (pwd.length < 8) {
      setErr(a.passwordMin);
      return;
    }
    const error = await resetPassword(token, pwd);
    if (error) {
      setErr(error);
      return;
    }
    setDone(true);
    setTimeout(() => router.push(`/${locale}/account`), 1500);
  };

  return (
    <div className="container-x py-16">
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto w-24 opacity-50">
            <SpiderGraphic hue={42} animate={false} />
          </div>
          <h1 className="mt-4 font-display text-3xl font-bold text-cream">{a.resetPasswordTitle}</h1>
        </div>
        {done ? (
          <div className="card-glow rounded-2xl p-6 text-center text-sm text-bone">{a.resetSuccess}</div>
        ) : (
          <form onSubmit={submit} className="card-glow space-y-4 rounded-2xl p-6">
            <label className="field">
              <span>{a.newPassword}</span>
              <input
                type="password"
                className="input"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>
            {err && <p className="text-sm text-danger">{err}</p>}
            <button className="btn btn-gold w-full">{a.resetPasswordButton}</button>
          </form>
        )}
      </div>
    </div>
  );
}

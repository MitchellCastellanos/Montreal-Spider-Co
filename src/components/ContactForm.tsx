"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";

export default function ContactForm() {
  const { dict, locale } = useI18n();
  const c = dict.contact;
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(false);

  if (sent) {
    return (
      <div className="card-glow rounded-2xl p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-ok/15 text-2xl text-ok">✓</div>
        <p className="text-lg text-cream">{c.sent}</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const data = new FormData(form);
        setSending(true);
        setError(false);
        try {
          const res = await fetch("/api/contact", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: data.get("name"),
              email: data.get("email"),
              phone: data.get("phone"),
              subject: data.get("subject"),
              message: data.get("message"),
              locale,
            }),
          });
          if (!res.ok) throw new Error("Request failed");
          setSent(true);
        } catch {
          setError(true);
        } finally {
          setSending(false);
        }
      }}
      className="card-glow space-y-4 rounded-2xl p-6 sm:p-8"
    >
      <h2 className="font-display text-2xl font-bold text-cream">{c.formTitle}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="field">
          <span>{dict.common.name}</span>
          <input name="name" className="input" required autoComplete="name" />
        </label>
        <label className="field">
          <span>{dict.common.email}</span>
          <input name="email" type="email" className="input" required autoComplete="email" />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="field">
          <span>{dict.common.phone} <span className="text-muted">({dict.common.optional})</span></span>
          <input name="phone" type="tel" className="input" autoComplete="tel" />
        </label>
        <label className="field">
          <span>{c.subjectLabel}</span>
          <select name="subject" className="input" defaultValue="general">
            <option value="general">{c.subjectGeneral}</option>
            <option value="order">{c.subjectOrder}</option>
            <option value="species">{c.subjectSpecies}</option>
            <option value="wholesale">{c.subjectWholesale}</option>
          </select>
        </label>
      </div>
      <label className="field">
        <span>{c.messageLabel}</span>
        <textarea name="message" className="input min-h-32 resize-y" placeholder={c.messagePlaceholder} required />
      </label>
      {error && <p className="text-sm text-red-400">{c.error}</p>}
      <button className="btn btn-gold w-full" disabled={sending}>
        {sending ? c.sending : c.send}
      </button>
    </form>
  );
}

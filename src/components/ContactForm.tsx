"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";

export default function ContactForm() {
  const { dict } = useI18n();
  const c = dict.contact;
  const [sent, setSent] = useState(false);

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
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
      }}
      className="card-glow space-y-4 rounded-2xl p-6 sm:p-8"
    >
      <h2 className="font-display text-2xl font-bold text-cream">{c.formTitle}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="field">
          <span>{dict.common.name}</span>
          <input className="input" required autoComplete="name" />
        </label>
        <label className="field">
          <span>{dict.common.email}</span>
          <input type="email" className="input" required autoComplete="email" />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="field">
          <span>{dict.common.phone} <span className="text-muted">({dict.common.optional})</span></span>
          <input type="tel" className="input" autoComplete="tel" />
        </label>
        <label className="field">
          <span>{c.subjectLabel}</span>
          <select className="input" defaultValue="general">
            <option value="general">{c.subjectGeneral}</option>
            <option value="order">{c.subjectOrder}</option>
            <option value="species">{c.subjectSpecies}</option>
            <option value="wholesale">{c.subjectWholesale}</option>
          </select>
        </label>
      </div>
      <label className="field">
        <span>{c.messageLabel}</span>
        <textarea className="input min-h-32 resize-y" placeholder={c.messagePlaceholder} required />
      </label>
      <button className="btn btn-gold w-full">{c.send}</button>
    </form>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/i18n/I18nProvider";

export default function SaveGuideButton({ slug }: { slug: string }) {
  const { user } = useAuth();
  const { dict } = useI18n();
  const a = dict.account;
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    void fetch("/api/account/saved-guides", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { guides?: { slug: string }[] }) => {
        setSaved(Boolean(d.guides?.some((g) => g.slug === slug)));
      })
      .catch(() => {});
  }, [user, slug]);

  if (!user) return null;

  const toggle = async () => {
    setBusy(true);
    try {
      if (saved) {
        await fetch(`/api/account/saved-guides?slug=${slug}`, { method: "DELETE" });
        setSaved(false);
      } else {
        const res = await fetch("/api/account/saved-guides", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug }),
        });
        if (res.ok) setSaved(true);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" onClick={() => void toggle()} disabled={busy} className="btn btn-ghost text-sm">
      {saved ? `✓ ${a.guideSaved}` : a.guideSave}
    </button>
  );
}

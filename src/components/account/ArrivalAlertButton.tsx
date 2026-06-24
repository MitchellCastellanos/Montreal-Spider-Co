"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/i18n/I18nProvider";

export default function ArrivalAlertButton({
  productId,
  genus,
  className = "",
}: {
  productId?: string;
  genus?: string;
  className?: string;
}) {
  const { user } = useAuth();
  const { dict } = useI18n();
  const a = dict.account;
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  const toggle = async () => {
    setBusy(true);
    try {
      if (active) {
        setActive(false);
      } else {
        const res = await fetch("/api/account/arrival-alerts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId, genus }),
        });
        if (res.ok) setActive(true);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" onClick={() => void toggle()} disabled={busy} className={`btn btn-ghost text-sm ${className}`}>
      {active ? `✓ ${a.alertActive}` : `🔔 ${a.alertNewArrival}`}
    </button>
  );
}

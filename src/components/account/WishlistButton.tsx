"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/i18n/I18nProvider";

export default function WishlistButton({
  productId,
  unitKey = "",
  className = "",
}: {
  productId: string;
  unitKey?: string;
  className?: string;
}) {
  const { user } = useAuth();
  const { dict } = useI18n();
  const a = dict.account;
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  const toggle = async () => {
    setBusy(true);
    try {
      if (saved) {
        await fetch(`/api/account/wishlist?productId=${productId}&unitKey=${encodeURIComponent(unitKey)}`, {
          method: "DELETE",
        });
        setSaved(false);
      } else {
        const res = await fetch("/api/account/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId, unitKey, notifyStock: true }),
        });
        if (res.ok) setSaved(true);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={busy}
      className={`btn btn-ghost text-sm ${className}`}
      aria-pressed={saved}
    >
      {saved ? `♥ ${a.wishlistSaved}` : `♡ ${a.wishlistAdd}`}
    </button>
  );
}

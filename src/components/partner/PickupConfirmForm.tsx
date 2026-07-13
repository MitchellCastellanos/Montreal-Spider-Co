"use client";

import { useActionState } from "react";
import { confirmPickupByTokenAction, type PartnerActionState } from "@/app/[locale]/p/actions";

export default function PickupConfirmForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<PartnerActionState, FormData>(
    confirmPickupByTokenAction,
    {},
  );

  if (state.ok) {
    return (
      <p className="rounded-xl border border-gold/30 bg-gold/5 p-4 text-sm text-cream">
        Handover confirmed — the order is complete and inventory has been settled. Thank you!
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <button
        disabled={pending}
        className="w-full rounded-lg bg-gold px-4 py-3 text-sm font-semibold text-ink transition hover:bg-gold-bright disabled:opacity-50"
      >
        {pending ? "Confirming…" : "Confirm handover to customer"}
      </button>
      <p className="text-xs text-muted">
        Only tap this once the customer has physically received the animal(s).
      </p>
    </form>
  );
}

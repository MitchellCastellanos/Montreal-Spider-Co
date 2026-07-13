"use client";

import { useActionState } from "react";
import { respondToProposalAction, type PartnerActionState } from "@/app/[locale]/p/actions";

export default function RestockResponseForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<PartnerActionState, FormData>(
    respondToProposalAction,
    {},
  );

  if (state.ok) {
    return (
      <p className="rounded-xl border border-gold/30 bg-gold/5 p-4 text-sm text-cream">
        Thank you — your response has been recorded. Montreal Spider Co. will follow up with the details.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <label className="block text-sm text-bone">
        Notes for the MSC team (optional)
        <textarea
          name="partnerNotes"
          rows={3}
          className="mt-1 w-full rounded-lg border border-line bg-ink p-3 text-sm text-cream"
          placeholder="Preferred delivery day, display space notes…"
        />
      </label>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <div className="flex gap-3">
        <button
          name="response"
          value="accept"
          disabled={pending}
          className="flex-1 rounded-lg bg-gold px-4 py-3 text-sm font-semibold text-ink transition hover:bg-gold-bright disabled:opacity-50"
        >
          Approve restock
        </button>
        <button
          name="response"
          value="decline"
          disabled={pending}
          className="flex-1 rounded-lg border border-line px-4 py-3 text-sm text-bone transition hover:text-danger disabled:opacity-50"
        >
          Decline
        </button>
      </div>
    </form>
  );
}

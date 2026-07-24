"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { verifyDistributorCodeAction, type PartnerActionState } from "@/app/[locale]/p/actions";

/** Code prompt in front of the distributor screen — unlocking re-fetches the page so the real content only ever reaches the client after the code checks out. */
export default function DistributorCodeGate({ qrToken }: { qrToken: string }) {
  const [state, formAction, pending] = useActionState<PartnerActionState, FormData>(
    verifyDistributorCodeAction,
    {},
  );
  const router = useRouter();

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="qrToken" value={qrToken} />
      <label className="block text-sm text-bone">
        Distributor code
        <input
          name="code"
          type="text"
          autoFocus
          required
          className="mt-1 w-full rounded-lg border border-line bg-ink p-3 text-sm tracking-widest text-cream"
          placeholder="Code from Montreal Spider Co."
        />
      </label>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <button
        disabled={pending}
        className="w-full rounded-lg bg-gold px-4 py-3 text-sm font-semibold text-ink transition hover:bg-gold-bright disabled:opacity-50"
      >
        {pending ? "Checking…" : "Unlock"}
      </button>
    </form>
  );
}

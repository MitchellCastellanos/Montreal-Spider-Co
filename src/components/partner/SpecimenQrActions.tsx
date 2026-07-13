"use client";

import { useState, useActionState } from "react";
import { walkInSaleAction, reportIssueAction, type PartnerActionState } from "@/app/[locale]/p/actions";

const PAYMENT_OPTIONS = [
  { id: "cash", label: "Cash" },
  { id: "stripe", label: "Card" },
  { id: "e_transfer", label: "E-transfer" },
  { id: "other", label: "Other" },
] as const;

function WalkInSaleForm({
  qrToken,
  partnerToken,
  suggestedPrice,
}: {
  qrToken: string;
  partnerToken: string;
  suggestedPrice: number | null;
}) {
  const [state, formAction, pending] = useActionState<PartnerActionState, FormData>(
    walkInSaleAction,
    {},
  );

  if (state.ok && state.sale) {
    return (
      <div className="rounded-xl border border-gold/30 bg-gold/5 p-4 text-sm text-cream">
        <p className="font-semibold">Sale registered ✓</p>
        <p className="mt-1 text-bone">
          <span className="italic">{state.sale.scientific}</span> ({state.sale.sizeLabel}) — $
          {state.sale.salePrice.toFixed(2)}
        </p>
        <p className="mt-1 text-xs text-muted">
          Owed to MSC: ${state.sale.settlementPrice.toFixed(2)} · Your margin: $
          {state.sale.partnerMargin.toFixed(2)}. Added to your settlement ledger.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="qrToken" value={qrToken} />
      <input type="hidden" name="partnerToken" value={partnerToken} />
      <label className="block text-sm text-bone">
        Sale price (CAD)
        <input
          type="number"
          name="salePrice"
          step="0.01"
          min="1"
          required
          defaultValue={suggestedPrice ?? undefined}
          className="mt-1 w-full rounded-lg border border-line bg-ink p-3 text-sm text-cream"
        />
      </label>
      <label className="block text-sm text-bone">
        Payment method
        <select
          name="paymentMethod"
          className="mt-1 w-full rounded-lg border border-line bg-ink p-3 text-sm text-cream"
        >
          {PAYMENT_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm text-bone">
        Notes (optional)
        <input
          type="text"
          name="notes"
          className="mt-1 w-full rounded-lg border border-line bg-ink p-3 text-sm text-cream"
        />
      </label>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <button
        disabled={pending}
        className="w-full rounded-lg bg-gold px-4 py-3 text-sm font-semibold text-ink transition hover:bg-gold-bright disabled:opacity-50"
      >
        {pending ? "Registering…" : "Register walk-in sale"}
      </button>
    </form>
  );
}

function ReportIssueForm({ qrToken }: { qrToken: string }) {
  const [state, formAction, pending] = useActionState<PartnerActionState, FormData>(
    reportIssueAction,
    {},
  );

  if (state.ok) {
    return (
      <p className="rounded-xl border border-gold/30 bg-gold/5 p-4 text-sm text-cream">
        Issue reported — the Montreal Spider Co. team has been alerted.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="qrToken" value={qrToken} />
      <label className="block text-sm text-bone">
        What&apos;s wrong?
        <textarea
          name="issue"
          rows={3}
          required
          className="mt-1 w-full rounded-lg border border-line bg-ink p-3 text-sm text-cream"
          placeholder="Health concern, enclosure damage, escape…"
        />
      </label>
      <label className="block text-sm text-bone">
        Your name (optional)
        <input
          type="text"
          name="reporter"
          className="mt-1 w-full rounded-lg border border-line bg-ink p-3 text-sm text-cream"
        />
      </label>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <button
        disabled={pending}
        className="w-full rounded-lg border border-line px-4 py-3 text-sm text-bone transition hover:text-gold-bright disabled:opacity-50"
      >
        {pending ? "Sending…" : "Report issue"}
      </button>
    </form>
  );
}

/** Action tabs on the specimen QR page. The sale tab only appears with a valid partner key. */
export default function SpecimenQrActions({
  qrToken,
  partnerToken,
  canSell,
  suggestedPrice,
}: {
  qrToken: string;
  partnerToken: string | null;
  canSell: boolean;
  suggestedPrice: number | null;
}) {
  const [tab, setTab] = useState<"sale" | "issue">(canSell ? "sale" : "issue");

  return (
    <div>
      {canSell && partnerToken && (
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setTab("sale")}
            className={`rounded-lg px-3 py-2 text-sm ${tab === "sale" ? "bg-gold/15 text-gold-bright ring-1 ring-gold/40" : "text-bone"}`}
          >
            Walk-in sale
          </button>
          <button
            onClick={() => setTab("issue")}
            className={`rounded-lg px-3 py-2 text-sm ${tab === "issue" ? "bg-gold/15 text-gold-bright ring-1 ring-gold/40" : "text-bone"}`}
          >
            Report issue
          </button>
        </div>
      )}
      {tab === "sale" && canSell && partnerToken ? (
        <WalkInSaleForm qrToken={qrToken} partnerToken={partnerToken} suggestedPrice={suggestedPrice} />
      ) : (
        <ReportIssueForm qrToken={qrToken} />
      )}
    </div>
  );
}

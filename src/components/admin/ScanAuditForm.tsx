"use client";

import { useActionState, useState } from "react";
import { recordScanAction } from "@/app/[locale]/admin/ops-actions";
import type { ActionState } from "@/app/[locale]/admin/actions";
import type { Locale } from "@/i18n/config";
import { PAYMENT_LABELS, PAYMENT_METHODS, suggestedSalePrice } from "@/lib/inventory-labels";

type Result = "found" | "sold" | "missing";
type Sex = "unsexed" | "male" | "female";

export interface ScanTargetView {
  specimenId: string;
  qrToken: string;
  scientific: string;
  commonName: string;
  sizeCm: number;
  sizeLabel: string;
  sex: Sex;
  price: number;
  msrp: number | null;
  settlementPrice: number | null;
  status: string;
  locationName: string;
}

export default function ScanAuditForm({ target, locale }: { target: ScanTargetView; locale: Locale }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(recordScanAction, {});
  const [result, setResult] = useState<Result>("found");
  const [sizeCm, setSizeCm] = useState(target.sizeCm.toFixed(1));
  const [sex, setSex] = useState<Sex>(target.sex);
  const [price, setPrice] = useState(target.price.toFixed(2));
  const [msrp, setMsrp] = useState(target.msrp != null ? target.msrp.toFixed(2) : "");
  const [settlementPrice, setSettlementPrice] = useState(
    target.settlementPrice != null ? target.settlementPrice.toFixed(2) : "",
  );
  const [salePrice, setSalePrice] = useState(String(suggestedSalePrice(target, "distributor")));
  const [paymentMethod, setPaymentMethod] = useState("cash");

  const sexChanged = result === "found" && sex !== target.sex;

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="font-display text-2xl font-bold text-cream">Scan audit</h1>
      <p className="mt-1 text-sm text-muted">
        <span className="italic">{target.scientific}</span> · {target.commonName} · at {target.locationName}
      </p>

      <form action={formAction} className="mt-6 space-y-4">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="qrToken" value={target.qrToken} />
        <input type="hidden" name="result" value={result} />

        <div className="grid grid-cols-3 gap-2">
          {(["found", "sold", "missing"] as Result[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setResult(r)}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold capitalize transition ${
                result === r ? "border-gold bg-gold/10 text-gold-bright" : "border-line text-bone"
              }`}
            >
              {r === "sold" ? "Sold" : r}
            </button>
          ))}
        </div>

        {result === "found" && (
          <div className="space-y-3 rounded-xl border border-line bg-ink-soft/40 p-4">
            <p className="text-xs text-muted">
              On file: {target.sizeLabel} ({target.sizeCm.toFixed(1)} cm) · {target.sex} · ${target.price.toFixed(2)}{" "}
              web · MSRP {target.msrp != null ? `$${target.msrp.toFixed(2)}` : "—"} · settlement{" "}
              {target.settlementPrice != null ? `$${target.settlementPrice.toFixed(2)}` : "—"}
            </p>
            <label className="block text-sm text-bone">
              Measured size (cm)
              <input
                type="number"
                step="0.1"
                min="0"
                name="sizeCm"
                value={sizeCm}
                onChange={(e) => setSizeCm(e.target.value)}
                className="mt-1 w-full rounded-lg border border-line bg-ink p-2.5 text-sm text-cream"
              />
            </label>
            <label className="block text-sm text-bone">
              Sex
              <select
                name="sex"
                value={sex}
                onChange={(e) => setSex(e.target.value as Sex)}
                className="mt-1 w-full rounded-lg border border-line bg-ink p-2.5 text-sm text-cream"
              >
                <option value="unsexed">Unsexed</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <label className="block text-sm text-bone">
                Web price ($)
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="price"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line bg-ink p-2.5 text-sm text-cream"
                />
              </label>
              <label className="block text-sm text-bone">
                MSRP ($)
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="msrp"
                  value={msrp}
                  onChange={(e) => setMsrp(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line bg-ink p-2.5 text-sm text-cream"
                />
              </label>
              <label className="block text-sm text-bone">
                Settlement ($)
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="settlementPrice"
                  value={settlementPrice}
                  onChange={(e) => setSettlementPrice(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line bg-ink p-2.5 text-sm text-cream"
                />
              </label>
            </div>
            <p className="text-xs text-muted">
              Size and pricing update immediately (storefront, settlement math) — nothing physical to change, the QR
              always shows the live price.
            </p>
            {sexChanged && (
              <p className="text-xs text-gold-bright">
                Sex confirmed — the terrarium label only shows sex, so this queues a reprint and gives the partner a
                heads-up. No action needed from them.
              </p>
            )}
            <label className="block text-sm text-bone">
              Health notes
              <input
                type="text"
                name="healthNotes"
                placeholder="Healthy, in premolt…"
                className="mt-1 w-full rounded-lg border border-line bg-ink p-2.5 text-sm text-cream"
              />
            </label>
          </div>
        )}

        {result === "sold" && (
          <div className="space-y-3 rounded-xl border border-line bg-ink-soft/40 p-4">
            <p className="text-xs text-muted">
              The partner sold this without registering it — this books it as a distributor sale immediately.
            </p>
            <label className="block text-sm text-bone">
              Sale price ($)
              <input
                type="number"
                step="0.01"
                min="0"
                name="salePrice"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                className="mt-1 w-full rounded-lg border border-line bg-ink p-2.5 text-sm text-cream"
              />
            </label>
            <label className="block text-sm text-bone">
              Payment method
              <select
                name="paymentMethod"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="mt-1 w-full rounded-lg border border-line bg-ink p-2.5 text-sm text-cream"
              >
                {PAYMENT_METHODS.filter((m) => m !== "stripe").map((m) => (
                  <option key={m} value={m}>
                    {PAYMENT_LABELS[m]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {result === "missing" && (
          <p className="rounded-xl border border-line bg-ink-soft/40 p-4 text-sm text-bone">
            Opens an investigation task — nothing is written off automatically. Only use this when the specimen is
            genuinely unaccounted for (escape, theft, miscount).
          </p>
        )}

        <label className="block text-sm text-bone">
          Employee
          <input
            type="text"
            name="employee"
            required
            className="mt-1 w-full rounded-lg border border-line bg-ink p-2.5 text-sm text-cream"
          />
        </label>

        <label className="block text-sm text-bone">
          Notes
          <textarea
            name="notes"
            rows={2}
            className="mt-1 w-full rounded-lg border border-line bg-ink p-2.5 text-sm text-cream"
          />
        </label>

        {state.error && <p className="text-sm text-danger">{state.error}</p>}
        <button
          disabled={pending}
          className="w-full rounded-lg bg-gold px-4 py-3 text-sm font-semibold text-ink transition hover:bg-gold-bright disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save — scan the next one when ready"}
        </button>
      </form>
    </div>
  );
}

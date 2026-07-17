import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasDatabase } from "@/lib/db";
import { getFulfillmentByPickupToken } from "@/lib/fulfillment/fulfillment";
import PartnerCard from "@/components/partner/PartnerCard";
import PickupConfirmForm from "@/components/partner/PickupConfirmForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Confirm pickup",
  robots: { index: false, follow: false },
};

export default async function PickupConfirmPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ k?: string }>;
}) {
  const { token } = await params;
  const { k } = await searchParams;
  if (!hasDatabase) notFound();

  const f = await getFulfillmentByPickupToken(token);
  if (!f) notFound();

  const partnerKey = k ?? null;
  const atPartner = f.locationId != null && f.location != null;
  const keyMatches = atPartner && partnerKey === f.location!.partnerToken;
  const canConfirm = f.status === "ready" && keyMatches;

  const statusNote: Record<string, string> = {
    completed: "This order was already handed over — nothing else to do.",
    cancelled: "This order was cancelled. Do NOT hand over the animal(s); contact Montreal Spider Co.",
    no_show: "This order was cancelled as a no-show. Do NOT hand over the animal(s); contact Montreal Spider Co.",
    pending: "This order is not ready for handover yet — MSC is still preparing it.",
    preparing: "This order is not ready for handover yet — MSC is still preparing it.",
  };

  return (
    <PartnerCard
      title={`Order ${f.order.orderNumber}`}
      subtitle={`Customer: ${f.order.name}${f.order.phone ? ` · ${f.order.phone}` : ""}`}
    >
      <ul className="space-y-2">
        {f.order.lines.map((line) => (
          <li key={line.id} className="rounded-lg border border-line bg-ink p-3 text-sm text-cream">
            {line.qty}× <span className="italic">{line.nameEn}</span>
            <span className="text-muted"> — {line.sizeLabelEn}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6">
        {canConfirm && partnerKey ? (
          <PickupConfirmForm token={token} partnerToken={partnerKey} />
        ) : f.status === "ready" && atPartner && !keyMatches ? (
          <p className="rounded-xl border border-line bg-ink p-4 text-sm text-muted">
            This handover link is missing your store authorization key. Open the link from the Montreal Spider Co.
            email sent to your store — do not share it with customers.
          </p>
        ) : f.status === "ready" && !atPartner ? (
          <p className="rounded-xl border border-line bg-ink p-4 text-sm text-muted">
            This meetup order must be confirmed by Montreal Spider Co. staff at handover — not via this partner link.
          </p>
        ) : (
          <p className="rounded-xl border border-line bg-ink p-4 text-sm text-muted">
            {statusNote[f.status]}
          </p>
        )}
      </div>
    </PartnerCard>
  );
}

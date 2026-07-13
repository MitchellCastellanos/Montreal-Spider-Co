import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasDatabase } from "@/lib/db";
import { getProposalByToken } from "@/lib/data/restock";
import PartnerCard from "@/components/partner/PartnerCard";
import RestockResponseForm from "@/components/partner/RestockResponseForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Restock proposal",
  robots: { index: false, follow: false },
};

export default async function RestockProposalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!hasDatabase) notFound();

  const proposal = await getProposalByToken(token);
  if (!proposal) notFound();

  const statusNote: Record<string, string> = {
    confirmed: "You approved this restock — delivery is being scheduled.",
    declined: "You declined this restock. Nothing will be shipped.",
    in_transit: "This restock is on its way to your store.",
    completed: "This restock was delivered. Thanks!",
    cancelled: "This proposal was cancelled by Montreal Spider Co.",
    draft: "This proposal hasn't been sent yet.",
  };

  return (
    <PartnerCard
      title={`Restock proposal — ${proposal.locationName}`}
      subtitle={proposal.reason || "Suggested replacement inventory for your MSC display."}
    >
      <ul className="space-y-2">
        {proposal.items.map((item) => (
          <li
            key={item.specimenId}
            className="rounded-lg border border-line bg-ink p-3 text-sm text-cream"
          >
            <span className="italic">{item.scientific}</span>
            <span className="text-muted"> — {item.sizeLabel}, {item.sex}</span>
            {item.notes && <span className="block text-xs text-muted">{item.notes}</span>}
          </li>
        ))}
      </ul>
      {proposal.preferredDate && (
        <p className="mt-3 text-sm text-bone">
          Suggested delivery date: <strong className="text-cream">{proposal.preferredDate}</strong>
        </p>
      )}
      <div className="mt-6">
        {proposal.status === "sent" ? (
          <RestockResponseForm token={token} />
        ) : (
          <p className="rounded-xl border border-line bg-ink p-4 text-sm text-muted">
            {statusNote[proposal.status]}
          </p>
        )}
      </div>
    </PartnerCard>
  );
}

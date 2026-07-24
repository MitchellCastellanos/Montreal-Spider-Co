"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";

type SpecimenFacts = {
  sizeLabel: string;
  sex: "unsexed" | "male" | "female";
  lastMeasured: string | null;
  locationName: string | null;
  tarantulAppId: string | null;
  status: string;
};

/** "Important facts" banner shown when the product page is reached via a specimen QR scan. */
export default function SpecimenFactsPanel({ slug }: { slug: string }) {
  const searchParams = useSearchParams();
  const token = searchParams.get("specimen");
  const { dict } = useI18n();
  const [facts, setFacts] = useState<SpecimenFacts | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetch(`/api/specimen-facts?token=${encodeURIComponent(token)}&slug=${encodeURIComponent(slug)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setFacts(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [token, slug]);

  if (!token || !facts) return null;
  const p = dict.product;
  const sexLabel = facts.sex === "unsexed" ? p.sexUnsexed : facts.sex === "male" ? p.sexMale : p.sexFemale;
  const statusNote =
    facts.status === "allocated"
      ? p.specimenStatusAllocated
      : facts.status === "sold"
        ? p.specimenStatusSold
        : facts.status === "written_off"
          ? p.specimenStatusWrittenOff
          : null;

  return (
    <section className="mb-8 rounded-2xl border border-gold/30 bg-gold/5 p-5">
      <p className="text-xs uppercase tracking-widest text-gold">{p.specimenFactsEyebrow}</p>
      <h2 className="mt-1 font-display text-lg font-semibold text-cream">{p.specimenFactsTitle}</h2>
      {statusNote && <p className="mt-2 text-sm text-cream">{statusNote}</p>}
      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs text-muted">{p.specimenSize}</dt>
          <dd className="text-cream">{facts.sizeLabel}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">{p.specimenSex}</dt>
          <dd className="text-cream">{sexLabel}</dd>
        </div>
        {facts.lastMeasured && (
          <div>
            <dt className="text-xs text-muted">{p.specimenMeasured}</dt>
            <dd className="text-cream">{facts.lastMeasured}</dd>
          </div>
        )}
        <div>
          <dt className="text-xs text-muted">{p.specimenLocation}</dt>
          <dd className="text-cream">{facts.locationName ?? p.specimenLocationHq}</dd>
        </div>
        {facts.tarantulAppId && (
          <div>
            <dt className="text-xs text-muted">{p.specimenVerifiedId}</dt>
            <dd className="text-cream">{facts.tarantulAppId}</dd>
          </div>
        )}
      </dl>
    </section>
  );
}

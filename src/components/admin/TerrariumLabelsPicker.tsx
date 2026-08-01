"use client";

import { useEffect, useMemo, useState } from "react";
import SpecimenTerrariumLabel from "@/components/admin/SpecimenTerrariumLabel";
import type { TerrariumLabelRecord } from "@/lib/data/terrarium-labels";

export type TerrariumLabelView = TerrariumLabelRecord & { qrDataUrl: string };

type Props = {
  labels: TerrariumLabelView[];
  locationFilter?: string;
};

export default function TerrariumLabelsPicker({ labels, locationFilter }: Props) {
  const allIds = useMemo(() => labels.map((l) => l.id), [labels]);
  const allIdsKey = allIds.join(",");
  const [selected, setSelected] = useState<Set<string>>(() => new Set(allIds));
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    setSelected(new Set(allIds));
  }, [allIdsKey, allIds]);

  const selectedCount = selected.size;
  const selectedLabels = labels.filter((l) => selected.has(l.id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(allIds));
  }

  function clearAll() {
    setSelected(new Set());
  }

  async function downloadPdf() {
    if (selectedCount === 0) return;
    setDownloading(true);
    try {
      const res = await fetch("/api/admin/labels/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: [...selected],
          location: locationFilter,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(typeof err.error === "string" ? err.error : "PDF download failed.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        res.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] ??
        "terrarium-labels.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  function printSelected() {
    if (selectedCount === 0) return;
    window.print();
  }

  if (labels.length === 0) {
    return <p className="mt-6 text-sm text-muted">No specimens for this filter.</p>;
  }

  return (
    <>
      <div className="print:hidden">
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" onClick={selectAll} className="btn btn-ghost text-xs">
            Select all
          </button>
          <button type="button" onClick={clearAll} className="btn btn-ghost text-xs">
            Clear all
          </button>
          <span className="text-xs text-muted">
            {selectedCount} of {labels.length} selected
          </span>
        </div>

        <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto rounded-xl border border-line bg-ink-soft/30 p-2">
          {labels.map((label) => {
            const checked = selected.has(label.id);
            return (
              <li key={label.id}>
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 text-sm transition hover:bg-ink/60 ${
                    checked ? "bg-gold/5" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(label.id)}
                    className="mt-0.5 accent-[var(--gold)]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium italic text-cream">{label.scientific}</span>
                    <span className="block text-xs text-muted">
                      {label.commonName} · {label.sizeLabel} · {label.sex}
                      {label.tarantulAppId ? ` · ${label.tarantulAppId}` : ""}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void downloadPdf()}
            disabled={selectedCount === 0 || downloading}
            className="btn btn-primary text-sm disabled:opacity-50"
          >
            {downloading ? "Generating…" : "Download PDF"}
          </button>
          <button
            type="button"
            onClick={printSelected}
            disabled={selectedCount === 0}
            className="btn btn-ghost text-sm disabled:opacity-50"
          >
            Print selected
          </button>
          <p className="text-xs text-muted">
            PDF and print use only checked labels · 6 × 4 cm · print at{" "}
            <strong className="text-bone">100% scale</strong>
          </p>
        </div>

        <div className="labels-size-ref mt-3" aria-hidden>
          Size check
          <br />
          6 × 4 cm
        </div>
      </div>

      <div className="labels-print-sheet mt-6 print:mt-0">
        {selectedLabels.map((label) => (
          <SpecimenTerrariumLabel key={label.id} {...label} />
        ))}
      </div>

      {selectedCount === 0 && (
        <p className="mt-4 text-sm text-muted print:hidden">Select at least one label to preview or print.</p>
      )}
    </>
  );
}

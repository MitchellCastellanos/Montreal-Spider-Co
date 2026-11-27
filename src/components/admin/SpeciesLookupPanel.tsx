"use client";

import { useState, useTransition } from "react";
import { importLookupPhotoAction, lookupSpeciesAction } from "@/app/[locale]/admin/species-actions";
import type { SpeciesLookupResult } from "@/lib/species-lookup";
import type { LookupPhoto } from "@/lib/species-lookup-utils";

export type LookupNames = { scientific: string; commonEn: string; commonFr: string; genus: string };

type Props = {
  scientific: string;
  /** Fill the listing's names from the catalog result. */
  onApplyNames: (names: LookupNames) => void;
  /** A photo was copied to MSC storage and added to the library — select it for this listing. */
  onPhotoImported: (url: string) => void;
};

const ERRORS: Record<string, string> = {
  unauthorized: "Session expired — log in again.",
  storage_unconfigured: "Image storage (Cloudinary) is not configured.",
  photo_not_allowed: "That photo can't be imported (licence or source not allowed).",
  download_failed: "Could not download the photo.",
  not_an_image: "The file is not an image.",
  photo_too_large: "Photo is larger than 8 MB.",
  import_failed: "Import failed — try another photo.",
};

/** One click: names + taxonomy check + 4 free-licence photo options from iNaturalist/GBIF. */
export default function SpeciesLookupPanel({ scientific, onApplyNames, onPhotoImported }: Props) {
  const [result, setResult] = useState<SpeciesLookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyPhoto, setBusyPhoto] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const search = () => {
    setError(null);
    startTransition(async () => {
      const r = await lookupSpeciesAction(scientific);
      if ("error" in r) {
        setResult(null);
        setError(ERRORS[r.error] ?? r.error);
      } else {
        setResult(r);
      }
    });
  };

  const pickPhoto = async (p: LookupPhoto) => {
    if (!result) return;
    setBusyPhoto(p.id);
    setError(null);
    const res = await importLookupPhotoAction({
      url: p.url,
      license: p.license,
      creditName: p.creditName,
      sourceUrl: p.sourceUrl,
      scientific: result.names.scientific,
      genus: result.names.genus,
      label: result.names.commonEn || result.names.scientific,
    });
    setBusyPhoto(null);
    if (res.url) onPhotoImported(res.url);
    else setError(ERRORS[res.error ?? ""] ?? res.error ?? "Import failed.");
  };

  return (
    <div className="rounded-xl border border-gold/25 bg-gold/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-display text-sm font-semibold text-cream">Find photo &amp; names automatically</h3>
          <p className="text-xs text-muted">Free open catalogs (iNaturalist, GBIF). Only CC0 / CC BY photos are offered.</p>
        </div>
        <button type="button" className="btn btn-gold text-xs" onClick={search} disabled={pending || !scientific.trim()}>
          {pending ? "Searching…" : "Search"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      {result && (
        <div className="mt-4 space-y-4">
          {result.warnings.length > 0 && (
            <ul className="space-y-1 text-xs text-gold-deep">
              {result.warnings.map((w) => (
                <li key={w}>⚠ {w}</li>
              ))}
            </ul>
          )}

          {(result.names.commonEn || result.names.commonFr || result.taxonomy) && (
            <div className="rounded-lg border border-line bg-ink-soft/40 p-3 text-sm text-bone">
              <p>
                <span className="text-muted">EN:</span> {result.names.commonEn || "—"} · <span className="text-muted">FR:</span>{" "}
                {result.names.commonFr || "—"} · <span className="text-muted">Genus:</span> {result.names.genus}
              </p>
              {result.taxonomy && (
                <p className="mt-1 text-xs text-muted">
                  GBIF: {result.taxonomy.status || "—"} ({result.taxonomy.matchType}) · family {result.taxonomy.family || "—"}
                  {result.taxonomy.acceptedName && <> · accepted name: <span className="text-cream">{result.taxonomy.acceptedName}</span></>}
                </p>
              )}
              {result.exact && (
                <button type="button" className="btn btn-ghost mt-2 text-xs" onClick={() => onApplyNames(result.names)}>
                  Apply names to the listing
                </button>
              )}
            </div>
          )}

          {result.photos.length > 0 && (
            <div>
              <p className="mb-2 text-xs text-muted">
                Pick the best one. Photos are copied to our storage and credited on the product page; they show as “Representative photo”.
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {result.photos.map((p) => (
                  <div key={p.id} className="overflow-hidden rounded-lg border border-line">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.thumbUrl} alt="" className="aspect-square w-full object-cover" />
                    <div className="space-y-1 p-2">
                      <p className="truncate text-[10px] text-muted" title={p.attribution}>
                        {p.license === "cc0" ? "CC0" : "CC BY"} · {p.creditName || "public domain"}
                      </p>
                      <button
                        type="button"
                        className="btn btn-ghost w-full text-xs"
                        onClick={() => pickPhoto(p)}
                        disabled={busyPhoto !== null}
                      >
                        {busyPhoto === p.id ? "Importing…" : "Use this photo"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

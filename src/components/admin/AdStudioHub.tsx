"use client";

import { useEffect, useMemo, useState } from "react";
import { SITE } from "@/lib/site";
import type { SpecimenView } from "@/lib/data/specimens";
import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { buildAdText, suggestAdTitle, type AdPlatform } from "@/lib/ad-studio/ad-copy";
import { buildAdCardPngDataUrl } from "@/lib/ad-studio/ad-card";
import type { Locale } from "@/i18n/config";

/** Sellable specimen statuses — mirrors IN_STOCK_STATUSES in lib/data/specimens.ts (server-only, can't import here). */
const LISTABLE_STATUSES = new Set(["available", "consignment"]);

const PLATFORMS: { id: AdPlatform; label: string }[] = [
  { id: "kijiji", label: "Kijiji" },
  { id: "morphmarket", label: "MorphMarket" },
];

function sanitizeFilename(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "listing";
}

export default function AdStudioHub({
  specimens,
  products,
  locale,
}: {
  specimens: SpecimenView[];
  products: Product[];
  locale: Locale;
}) {
  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const listable = useMemo(
    () => specimens.filter((s) => LISTABLE_STATUSES.has(s.status)),
    [specimens],
  );

  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(listable[0]?.id ?? null);
  const [platform, setPlatform] = useState<AdPlatform>("kijiji");
  const [copied, setCopied] = useState(false);
  const [cardDataUrl, setCardDataUrl] = useState<string | null>(null);
  const [cardLoading, setCardLoading] = useState(false);
  const [cardError, setCardError] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return listable;
    return listable.filter((s) => `${s.scientific} ${s.commonName}`.toLowerCase().includes(q));
  }, [listable, query]);

  const selected = useMemo(
    () => listable.find((s) => s.id === selectedId) ?? null,
    [listable, selectedId],
  );
  const selectedProduct = selected ? productById.get(selected.productId) ?? null : null;

  const productUrl = selectedProduct ? `${SITE.url}/en/product/${selectedProduct.slug}` : "";

  const adInput = useMemo(() => {
    if (!selected || !selectedProduct) return null;
    return {
      scientific: selected.scientific,
      commonName: selected.commonName,
      sizeLabel: selected.sizeLabel,
      sex: selected.sex,
      price: selected.price,
      includesEnclosure: selected.includesEnclosure,
      experience: selectedProduct.experience,
      type: selectedProduct.type,
      temperament: selectedProduct.temperament,
      originEn: selectedProduct.origin.en,
      adultSizeEn: selectedProduct.adultSize.en,
      descriptionEn: selectedProduct.description.en,
      productUrl,
      tarantulAppId: selected.tarantulAppId,
    };
  }, [selected, selectedProduct, productUrl]);

  const adText = adInput ? buildAdText(platform, adInput) : "";
  const adTitle = adInput ? suggestAdTitle(adInput) : "";

  useEffect(() => {
    // No selection (empty inventory) — nothing to render; the UI shows a
    // placeholder instead of the thumbnail panel in that case.
    if (!selected) return;
    let cancelled = false;
    (async () => {
      setCardLoading(true);
      setCardError(false);
      try {
        const dataUrl = await buildAdCardPngDataUrl({
          scientific: selected.scientific,
          commonName: selected.commonName,
          sizeLabel: selected.sizeLabel,
          sex: selected.sex,
          price: selected.price,
          photoUrl: selected.photoUrl || selectedProduct?.image || null,
          productUrl: productUrl || SITE.url,
        });
        if (!cancelled) setCardDataUrl(dataUrl);
      } catch {
        if (!cancelled) setCardError(true);
      } finally {
        if (!cancelled) setCardLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected, selectedProduct, productUrl]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const copyText = async () => {
    const full = `${adTitle}\n\n${adText}`;
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
    } catch {
      /* clipboard may be unavailable — text is still selectable */
    }
  };

  const downloadCard = () => {
    if (!cardDataUrl || !selected) return;
    const a = document.createElement("a");
    a.href = cardDataUrl;
    a.download = `${sanitizeFilename(selected.scientific)}-${sanitizeFilename(selected.sizeLabel + "-" + selected.sex)}.png`;
    a.click();
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-cream">Ad Studio</h1>
        <p className="mt-1 text-sm text-muted">
          Generate a ready-to-paste Kijiji or MorphMarket listing — copy, thumbnail with price &amp; metro
          delivery — for any available specimen.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search species…"
            className="input mb-3 w-full"
          />
          <div className="max-h-[70vh] space-y-1 overflow-y-auto rounded-2xl border border-line p-2">
            {filtered.length === 0 && (
              <p className="p-3 text-sm text-muted">No listable specimens match your search.</p>
            )}
            {filtered.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedId(s.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${
                  s.id === selectedId ? "bg-gold/15 ring-1 ring-gold/40" : "hover:bg-ink-soft"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.photoUrl || s.productImage || "/images/species/_placeholder.png"}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-lg border border-line object-cover"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium italic text-cream">{s.scientific}</p>
                  <p className="truncate text-xs text-muted">
                    {s.sizeLabel} · {s.sex} · {formatPrice(s.price, locale)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          {!selected || !selectedProduct ? (
            <div className="rounded-2xl border border-line p-8 text-center text-sm text-muted">
              Select a specimen to generate its ad.
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlatform(p.id)}
                    className={`rounded-lg px-3 py-1.5 text-sm ${
                      platform === p.id
                        ? "bg-gold/15 font-medium text-gold-bright ring-1 ring-gold/40"
                        : "border border-line text-bone hover:text-gold-bright"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-cream">Ad text</label>
                  <input
                    value={adTitle}
                    readOnly
                    onFocus={(e) => e.target.select()}
                    className="input mb-2 w-full text-sm"
                  />
                  <textarea
                    value={adText}
                    readOnly
                    rows={16}
                    onFocus={(e) => e.target.select()}
                    className="input w-full text-sm"
                    style={{ whiteSpace: "pre-wrap" }}
                  />
                  <button type="button" onClick={copyText} className="btn btn-gold mt-2">
                    {copied ? "Copied ✓" : "Copy title + text"}
                  </button>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-cream">Thumbnail</label>
                  <div
                    className="flex items-center justify-center overflow-hidden rounded-2xl border border-line"
                    style={{ aspectRatio: "1 / 1", background: "rgba(0,0,0,0.15)" }}
                  >
                    {cardLoading && <span className="text-sm text-muted">Generating…</span>}
                    {!cardLoading && cardError && (
                      <span className="px-4 text-center text-sm text-muted">
                        Couldn&apos;t generate the thumbnail. Try again.
                      </span>
                    )}
                    {!cardLoading && !cardError && cardDataUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cardDataUrl} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={downloadCard}
                    disabled={cardLoading || cardError || !cardDataUrl}
                    className="btn btn-gold mt-2 w-full disabled:opacity-50"
                  >
                    Download PNG
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

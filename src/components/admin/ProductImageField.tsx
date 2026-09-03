"use client";

import { useMemo, useState } from "react";
import type { LibraryImage } from "@/lib/data/species-library";

type Props = {
  storedImage: string | null;
  /** The linked species' current library photo, if any — the fallback when this listing has no photo of its own. */
  speciesImage: string | null;
  defaultProductImage: string | null;
  libraryImages: LibraryImage[];
  scientific?: string;
  genus?: string;
};

export default function ProductImageField({
  storedImage,
  speciesImage,
  defaultProductImage,
  libraryImages,
}: Props) {
  const [mode, setMode] = useState<"keep" | "upload" | "library" | "clear">("keep");
  const [preview, setPreview] = useState<string | null>(storedImage);
  const [libraryUrl, setLibraryUrl] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Fallback chain: this listing's own photo, else its species' photo, else the site default.
  const inheritedImage = speciesImage ?? defaultProductImage;

  const displayPreview = useMemo(() => {
    if (mode === "clear") return inheritedImage;
    if (mode === "library" && libraryUrl) return libraryUrl;
    if (mode === "upload" && preview?.startsWith("blob:")) return preview;
    if (preview) return preview;
    return inheritedImage;
  }, [mode, preview, libraryUrl, inheritedImage]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return libraryImages;
    return libraryImages.filter(
      (img) =>
        img.label.toLowerCase().includes(q) ||
        img.scientific.toLowerCase().includes(q) ||
        img.genus.toLowerCase().includes(q) ||
        img.slug.toLowerCase().includes(q)
    );
  }, [libraryImages, search]);

  const pickLibrary = (url: string) => {
    setLibraryUrl(url);
    setMode("library");
    setPickerOpen(false);
  };

  return (
    <div className="space-y-4">
      <input type="hidden" name="imageMode" value={mode} />
      <input type="hidden" name="storedImage" value={storedImage ?? ""} />
      <input type="hidden" name="libraryImageUrl" value={libraryUrl} />

      <div className="flex flex-wrap items-start gap-4">
        <div className="relative h-28 w-28 overflow-hidden rounded-xl border border-line bg-ink">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {displayPreview ? (
            <img src={displayPreview} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center px-2 text-center text-xs text-muted">No photo</span>
          )}
        </div>

        <div className="flex min-w-[200px] flex-1 flex-col gap-2">
          <p className="text-sm text-bone">
            {mode === "clear" &&
              (speciesImage
                ? "Cleared — will use the species photo on the storefront."
                : "Cleared — will use the site default photo on the storefront.")}
            {mode === "library" && libraryUrl && "Using a photo picked from the library for this listing only."}
            {mode === "upload" && preview?.startsWith("blob:") && "New upload for this listing only — save to apply."}
            {mode === "keep" && storedImage && "This listing has its own photo, overriding the species photo."}
            {mode === "keep" && !storedImage && speciesImage && "No listing-specific photo — using the species photo."}
            {mode === "keep" && !storedImage && !speciesImage && defaultProductImage && "No species photo — storefront shows the site default."}
            {mode === "keep" && !storedImage && !speciesImage && !defaultProductImage && "No photo — storefront shows generated placeholder."}
          </p>

          <div className="flex flex-wrap gap-2">
            <label className="btn btn-ghost cursor-pointer text-xs">
              Upload new
              <input
                type="file"
                name="imageFile"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setMode("upload");
                    setPreview(URL.createObjectURL(f));
                    setLibraryUrl("");
                  }
                }}
              />
            </label>
            <button type="button" className="btn btn-ghost text-xs" onClick={() => setPickerOpen(true)}>
              Browse library
            </button>
            {(storedImage || mode === "library" || mode === "upload") && (
              <button
                type="button"
                className="btn btn-ghost text-xs text-muted hover:text-danger"
                onClick={() => {
                  setMode("clear");
                  setLibraryUrl("");
                }}
              >
                {speciesImage ? "Use species photo" : "Use default"}
              </button>
            )}
            {mode !== "keep" && (
              <button
                type="button"
                className="btn btn-ghost text-xs"
                onClick={() => {
                  setMode("keep");
                  setPreview(storedImage);
                  setLibraryUrl("");
                }}
              >
                Reset
              </button>
            )}
          </div>

          <label className="flex items-center gap-2 text-xs text-muted">
            <input type="checkbox" name="saveToLibrary" defaultChecked className="accent-[var(--gold)]" />
            Save new uploads to species library
          </label>
        </div>
      </div>

      {pickerOpen && (
        <div className="rounded-xl border border-line bg-ink-soft/60 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-sm font-semibold text-cream">Species library</h3>
            <button type="button" className="text-xs text-muted hover:text-cream" onClick={() => setPickerOpen(false)}>
              Close
            </button>
          </div>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, genus, scientific…"
            className="input mb-3"
          />
          {filtered.length === 0 ? (
            <p className="text-sm text-muted">
              No library photos yet. Upload one here or save from a product — manage all in{" "}
              <span className="text-cream">Media &amp; photos</span>.
            </p>
          ) : (
            <div className="grid max-h-64 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4 md:grid-cols-6">
              {filtered.map((img) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => pickLibrary(img.url)}
                  className={`overflow-hidden rounded-lg border text-left transition hover:border-gold ${
                    libraryUrl === img.url ? "border-gold ring-1 ring-gold" : "border-line"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" className="aspect-square w-full object-cover" />
                  <span className="block truncate px-1 py-1 text-[10px] text-muted">
                    {img.label || img.scientific || img.genus || "Photo"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

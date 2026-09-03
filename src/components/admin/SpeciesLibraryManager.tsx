"use client";

import { useActionState, useMemo, useState } from "react";
import type { ActionState } from "@/app/[locale]/admin/actions";
import { addSpeciesAction, updateSpeciesImageAction } from "@/app/[locale]/admin/species-actions";
import type { SpeciesProfile } from "@/lib/data/species";
import type { LibraryImage } from "@/lib/data/species-library";

export default function SpeciesLibraryManager({
  speciesList,
  libraryImages,
  defaultProductImage,
  locale,
}: {
  speciesList: SpeciesProfile[];
  libraryImages: LibraryImage[];
  defaultProductImage: string | null;
  locale: string;
}) {
  const [addState, addAction, addPending] = useActionState<ActionState, FormData>(addSpeciesAction, {});
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return speciesList;
    return speciesList.filter(
      (s) =>
        s.scientific.toLowerCase().includes(q) ||
        s.commonEn.toLowerCase().includes(q) ||
        s.commonFr.toLowerCase().includes(q) ||
        s.genus.toLowerCase().includes(q)
    );
  }, [speciesList, search]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-cream">Species library</h1>
        <p className="mt-1 text-sm text-bone">
          One photo per species, used automatically by every listing for that species. A listing can still be given
          its own photo on its edit page, which takes priority over the species photo here.
        </p>
      </div>

      <section className="card-glow rounded-2xl p-5">
        <h2 className="mb-3 font-display text-lg font-semibold text-cream">Add a species</h2>
        <form action={addAction} className="grid gap-3 sm:grid-cols-3">
          <input type="hidden" name="locale" value={locale} />
          <label className="field">
            <span>Scientific name *</span>
            <input name="scientific" className="input" placeholder="Brachypelma hamorii" required />
          </label>
          <label className="field">
            <span>Common name (EN)</span>
            <input name="commonEn" className="input" placeholder="Mexican Red Knee" />
          </label>
          <label className="field">
            <span>Common name (FR)</span>
            <input name="commonFr" className="input" />
          </label>
          <div className="sm:col-span-3">
            <button className="btn btn-gold text-sm" disabled={addPending}>
              {addPending ? "Adding…" : "Add species"}
            </button>
            {addState.error && <p className="mt-2 text-sm text-danger">Could not add species.</p>}
          </div>
        </form>
      </section>

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by scientific name, common name, genus…"
        className="input max-w-md"
      />

      {filtered.length === 0 ? (
        <p className="text-sm text-muted">
          No species yet — add one above, or one is created automatically the first time you receive stock for a
          new species.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <SpeciesPhotoRow
              key={`${s.id}:${s.image ?? ""}`}
              species={s}
              libraryImages={libraryImages}
              defaultProductImage={defaultProductImage}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SpeciesPhotoRow({
  species,
  libraryImages,
  defaultProductImage,
}: {
  species: SpeciesProfile;
  libraryImages: LibraryImage[];
  defaultProductImage: string | null;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateSpeciesImageAction, {});
  const [mode, setMode] = useState<"keep" | "upload" | "library" | "clear">("keep");
  const [preview, setPreview] = useState<string | null>(species.image);
  const [libraryUrl, setLibraryUrl] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");

  const displayPreview = useMemo(() => {
    if (mode === "clear") return defaultProductImage;
    if (mode === "library" && libraryUrl) return libraryUrl;
    if (mode === "upload" && preview?.startsWith("blob:")) return preview;
    if (preview) return preview;
    return defaultProductImage;
  }, [mode, preview, libraryUrl, defaultProductImage]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return libraryImages;
    return libraryImages.filter(
      (img) =>
        img.label.toLowerCase().includes(q) ||
        img.scientific.toLowerCase().includes(q) ||
        img.genus.toLowerCase().includes(q)
    );
  }, [libraryImages, search]);

  const pickLibrary = (url: string) => {
    setLibraryUrl(url);
    setMode("library");
    setPickerOpen(false);
  };

  return (
    <article className="card-glow rounded-2xl p-4">
      <form action={action} className="space-y-3">
        <input type="hidden" name="speciesId" value={species.id} />
        <input type="hidden" name="scientific" value={species.scientific} />
        <input type="hidden" name="commonEn" value={species.commonEn} />
        <input type="hidden" name="genus" value={species.genus} />
        <input type="hidden" name="imageMode" value={mode} />
        <input type="hidden" name="libraryImageUrl" value={libraryUrl} />

        <div className="flex items-start gap-3">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-line bg-ink">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {displayPreview ? (
              <img src={displayPreview} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full items-center justify-center px-1 text-center text-[10px] text-muted">
                No photo
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-sm font-semibold text-cream">{species.scientific}</p>
            {species.commonEn && <p className="truncate text-xs text-muted">{species.commonEn}</p>}
            <p className="mt-1 text-[11px] text-muted">
              {mode === "keep" && species.image && "Used by every listing for this species."}
              {mode === "keep" && !species.image && "No photo — listings fall back to the site default."}
              {mode === "clear" && "Will clear — listings fall back to the site default."}
              {mode === "library" && libraryUrl && "Photo picked from the library — save to apply."}
              {mode === "upload" && "New upload — save to apply."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="btn btn-ghost cursor-pointer text-xs">
            Upload
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
          <button type="button" className="btn btn-ghost text-xs" onClick={() => setPickerOpen((o) => !o)}>
            Browse library
          </button>
          {species.image && mode !== "clear" && (
            <button
              type="button"
              className="btn btn-ghost text-xs text-muted hover:text-danger"
              onClick={() => {
                setMode("clear");
                setLibraryUrl("");
              }}
            >
              Clear
            </button>
          )}
          {mode !== "keep" && (
            <button type="submit" className="btn btn-gold text-xs" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </button>
          )}
        </div>

        <label className="flex items-center gap-2 text-[11px] text-muted">
          <input type="checkbox" name="saveToLibrary" defaultChecked className="accent-[var(--gold)]" />
          Save new uploads to the photo library too
        </label>

        {state.error && <p className="text-xs text-danger">Could not save photo — check Cloudinary env vars.</p>}

        {pickerOpen && (
          <div className="rounded-xl border border-line bg-ink-soft/60 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search library…"
                className="input text-xs"
              />
              <button type="button" className="text-xs text-muted hover:text-cream" onClick={() => setPickerOpen(false)}>
                Close
              </button>
            </div>
            {filtered.length === 0 ? (
              <p className="text-xs text-muted">No library photos yet.</p>
            ) : (
              <div className="grid max-h-48 grid-cols-4 gap-2 overflow-y-auto">
                {filtered.map((img) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => pickLibrary(img.url)}
                    className={`overflow-hidden rounded-lg border transition hover:border-gold ${
                      libraryUrl === img.url ? "border-gold ring-1 ring-gold" : "border-line"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt="" className="aspect-square w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </form>
    </article>
  );
}

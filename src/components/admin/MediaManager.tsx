"use client";

import { useActionState, useMemo, useState } from "react";
import type { LibraryImage } from "@/lib/data/species-library";
import {
  deleteLibraryImageAction,
  saveDefaultImageAction,
  uploadLibraryImageAction,
} from "@/app/[locale]/admin/media-actions";
import type { ActionState } from "@/app/[locale]/admin/actions";

export default function MediaManager({
  locale,
  defaultImage,
  libraryImages,
}: {
  locale: string;
  defaultImage: string | null;
  libraryImages: LibraryImage[];
}) {
  const [defaultState, defaultAction, defaultPending] = useActionState<ActionState, FormData>(
    saveDefaultImageAction,
    {}
  );
  const [uploadState, uploadAction, uploadPending] = useActionState<ActionState, FormData>(
    uploadLibraryImageAction,
    {}
  );
  const [search, setSearch] = useState("");
  const [pickForDefault, setPickForDefault] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return libraryImages;
    return libraryImages.filter(
      (img) =>
        img.label.toLowerCase().includes(q) ||
        img.scientific.toLowerCase().includes(q) ||
        img.genus.toLowerCase().includes(q) ||
        img.slug.toLowerCase().includes(q) ||
        img.notes.toLowerCase().includes(q)
    );
  }, [libraryImages, search]);

  return (
    <div className="space-y-8">
      {/* Default listing photo */}
      <section className="card-glow rounded-2xl p-5">
        <h2 className="mb-1 font-display text-lg font-semibold text-cream">Default listing photo</h2>
        <p className="mb-4 text-sm text-muted">
          Shown on the shop when a product has no species-specific photo. Upload once here instead of per listing.
        </p>

        <div className="mb-4 flex items-start gap-4">
          <div className="relative h-28 w-28 overflow-hidden rounded-xl border border-line bg-ink">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {defaultImage ? (
              <img src={defaultImage} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full items-center justify-center px-2 text-center text-xs text-muted">None set</span>
            )}
          </div>
          <div className="text-sm text-bone">
            {defaultImage ? "Active fallback for listings without a photo." : "No default — listings without a photo show the generated spider graphic."}
          </div>
        </div>

        <form action={defaultAction} className="space-y-3 border-t border-line pt-4">
          <input type="hidden" name="libraryUrl" value={pickForDefault ?? ""} />
          <label className="field block max-w-md">
            <span>Upload new default</span>
            <input type="file" name="imageFile" accept="image/*" className="input" />
          </label>
          {pickForDefault && (
            <p className="text-xs text-gold-bright">Selected from library — save to apply as default.</p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="btn btn-gold text-sm" disabled={defaultPending}>
              {defaultPending ? "Saving…" : "Save default"}
            </button>
            {defaultImage && (
              <button
                type="submit"
                name="clearDefault"
                value="true"
                className="btn btn-ghost text-sm text-muted hover:text-danger"
              >
                Remove default
              </button>
            )}
          </div>
          {defaultState.error && <p className="text-sm text-danger">Could not save default photo.</p>}
          {defaultState.ok && <p className="text-sm text-ok">Default photo updated.</p>}
        </form>
      </section>

      {/* Species library */}
      <section className="card-glow rounded-2xl p-5">
        <h2 className="mb-1 font-display text-lg font-semibold text-cream">Species photo library</h2>
        <p className="mb-4 text-sm text-muted">
          Reusable photos by species. New product uploads are saved here automatically. Pick them when editing any listing.
        </p>

        <form action={uploadAction} className="mb-6 grid gap-3 border-b border-line pb-6 sm:grid-cols-2">
          <label className="field sm:col-span-2">
            <span>Photo file *</span>
            <input type="file" name="imageFile" accept="image/*" className="input" required />
          </label>
          <label className="field">
            <span>Label</span>
            <input name="label" className="input" placeholder="Brazilian Black" />
          </label>
          <label className="field">
            <span>Scientific name</span>
            <input name="scientific" className="input" placeholder="Grammostola pulchra" />
          </label>
          <label className="field">
            <span>Genus</span>
            <input name="genus" className="input" placeholder="Grammostola" />
          </label>
          <label className="field">
            <span>Slug (optional)</span>
            <input name="slug" className="input" placeholder="grammostola-pulchra-…" />
          </label>
          <label className="field sm:col-span-2">
            <span>Notes</span>
            <input name="notes" className="input" placeholder="Adult female, studio shot…" />
          </label>
          <div className="sm:col-span-2">
            <button type="submit" className="btn btn-gold text-sm" disabled={uploadPending}>
              {uploadPending ? "Uploading…" : "Add to library"}
            </button>
            {uploadState.error && <p className="mt-2 text-sm text-danger">Upload failed — check Cloudinary env vars.</p>}
            {uploadState.ok && <p className="mt-2 text-sm text-ok">Added to library.</p>}
          </div>
        </form>

        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search library…"
          className="input mb-4 max-w-md"
        />

        {filtered.length === 0 ? (
          <p className="text-sm text-muted">Library is empty. Upload photos above or from a product edit form.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {filtered.map((img) => (
              <article key={img.id} className="overflow-hidden rounded-xl border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className="aspect-square w-full object-cover" />
                <div className="space-y-1 p-2">
                  <p className="truncate text-xs font-medium text-cream">{img.label || img.scientific || "Untitled"}</p>
                  {img.scientific && <p className="truncate text-[10px] italic text-muted">{img.scientific}</p>}
                  <div className="flex flex-wrap gap-1 pt-1">
                    <button
                      type="button"
                      onClick={() => setPickForDefault(img.url)}
                      className="rounded border border-line px-2 py-0.5 text-[10px] text-bone hover:border-gold"
                    >
                      Set as default
                    </button>
                    <form action={deleteLibraryImageAction}>
                      <input type="hidden" name="id" value={img.id} />
                      <input type="hidden" name="locale" value={locale} />
                      <button className="rounded border border-line px-2 py-0.5 text-[10px] text-muted hover:border-danger hover:text-danger">
                        Delete
                      </button>
                    </form>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

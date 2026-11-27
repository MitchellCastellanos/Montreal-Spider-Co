"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminAuthed } from "@/lib/auth";
import { updateSpeciesImage, upsertSpeciesMinimal } from "@/lib/data/species";
import { addLibraryImage } from "@/lib/data/species-library";
import { hasStorage, uploadLibraryImage, uploadProductImage } from "@/lib/storage";
import { lookupSpecies, type SpeciesLookupResult } from "@/lib/species-lookup";
import { buildCreditNote, isAllowedPhotoUrl, isCommercialLicense } from "@/lib/species-lookup-utils";
import type { ActionState } from "./actions";

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/** Add a species to the library with just a name — full specs are filled in later from a listing. */
export async function addSpeciesAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isAdminAuthed())) return { error: "unauthorized" };

  const scientific = str(formData, "scientific");
  if (!scientific) return { error: "missing_fields" };

  try {
    await upsertSpeciesMinimal(scientific, str(formData, "commonEn"), str(formData, "commonFr"));
  } catch (e) {
    return { error: e instanceof Error ? e.message : "save_failed" };
  }

  revalidatePath("/", "layout");
  redirect(`/${str(formData, "locale") || "en"}/admin/species`);
}

/** Set, replace, or clear a species' canonical photo — used by every listing for that species. */
export async function updateSpeciesImageAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isAdminAuthed())) return { error: "unauthorized" };

  const speciesId = str(formData, "speciesId");
  if (!speciesId) return { error: "missing_id" };

  const imageMode = str(formData, "imageMode") || "keep";
  if (imageMode === "keep") return { ok: true };

  try {
    if (imageMode === "clear") {
      await updateSpeciesImage(speciesId, null);
    } else if (imageMode === "library") {
      const picked = str(formData, "libraryImageUrl");
      if (!picked) return { error: "library_image_required" };
      await updateSpeciesImage(speciesId, picked);
    } else {
      const file = formData.get("imageFile");
      if (!(file instanceof File) || file.size === 0) return { error: "no_image" };
      if (!hasStorage) return { error: "storage_unconfigured" };
      const url = await uploadProductImage(await file.arrayBuffer());
      await updateSpeciesImage(speciesId, url);
      if (formData.get("saveToLibrary") !== "false") {
        await addLibraryImage({
          url,
          label: str(formData, "commonEn") || str(formData, "scientific"),
          scientific: str(formData, "scientific"),
          genus: str(formData, "genus"),
        });
      }
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "save_failed" };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Search the free open catalogs (iNaturalist + GBIF) for names, taxonomy and 4 photo options. */
export async function lookupSpeciesAction(name: string): Promise<SpeciesLookupResult | { error: string }> {
  if (!(await isAdminAuthed())) return { error: "unauthorized" };
  return lookupSpecies(String(name ?? ""));
}

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

/**
 * Copy a chosen open-licence photo to MSC storage and add it to the species library with its credit.
 * Only CC0 / CC BY photos from allow-listed hosts are accepted.
 */
export async function importLookupPhotoAction(input: {
  url: string;
  license: string;
  creditName: string;
  sourceUrl: string;
  scientific: string;
  genus: string;
  label: string;
}): Promise<{ url?: string; error?: string }> {
  if (!(await isAdminAuthed())) return { error: "unauthorized" };
  if (!hasStorage) return { error: "storage_unconfigured" };
  if (!isAllowedPhotoUrl(input.url) || !isCommercialLicense(input.license)) return { error: "photo_not_allowed" };
  if (!/^https:\/\/www\.inaturalist\.org\/photos\/\d+$/.test(input.sourceUrl)) return { error: "photo_not_allowed" };

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 15000);
  try {
    const res = await fetch(input.url, { signal: ctl.signal, redirect: "error", cache: "no-store" });
    if (!res.ok) return { error: "download_failed" };
    if (!(res.headers.get("content-type") ?? "").startsWith("image/")) return { error: "not_an_image" };
    const declared = Number(res.headers.get("content-length") ?? 0);
    if (declared > MAX_PHOTO_BYTES) return { error: "photo_too_large" };
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_PHOTO_BYTES) return { error: "photo_too_large" };

    const url = await uploadLibraryImage(buf);
    await addLibraryImage({
      url,
      label: input.label.slice(0, 120) || input.scientific.slice(0, 120),
      scientific: input.scientific.slice(0, 120),
      genus: input.genus.slice(0, 80),
      notes: buildCreditNote({
        creditName: input.creditName.slice(0, 120),
        license: input.license,
        sourceUrl: input.sourceUrl,
      }),
    });
    revalidatePath("/", "layout");
    return { url };
  } catch {
    return { error: "import_failed" };
  } finally {
    clearTimeout(timer);
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminAuthed } from "@/lib/auth";
import { updateSpeciesImage, upsertSpeciesMinimal } from "@/lib/data/species";
import { addLibraryImage } from "@/lib/data/species-library";
import { hasStorage, uploadProductImage } from "@/lib/storage";
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

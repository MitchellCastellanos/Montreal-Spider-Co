"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminAuthed } from "@/lib/auth";
import { setDefaultProductImage } from "@/lib/data/site-settings";
import {
  addLibraryImage,
  deleteLibraryImage,
  listLibraryImages,
  type LibraryImageInput,
} from "@/lib/data/species-library";
import { hasStorage, uploadLibraryImage } from "@/lib/storage";
import type { ActionState } from "./actions";

export async function saveDefaultImageAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isAdminAuthed())) return { error: "unauthorized" };

  const clear = formData.get("clearDefault") === "true";
  if (clear) {
    await setDefaultProductImage(null);
    revalidatePath("/", "layout");
    return { ok: true };
  }

  const libraryUrl = String(formData.get("libraryUrl") ?? "").trim();
  if (libraryUrl) {
    await setDefaultProductImage(libraryUrl);
    revalidatePath("/", "layout");
    return { ok: true };
  }

  const file = formData.get("imageFile");
  if (file instanceof File && file.size > 0) {
    if (!hasStorage) return { error: "storage_unconfigured" };
    try {
      const url = await uploadLibraryImage(await file.arrayBuffer());
      await setDefaultProductImage(url);
      await addLibraryImage({ url, label: "Default listing photo", notes: "Site-wide fallback" });
      revalidatePath("/", "layout");
      return { ok: true };
    } catch {
      return { error: "upload_failed" };
    }
  }

  return { error: "no_image" };
}

export async function uploadLibraryImageAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isAdminAuthed())) return { error: "unauthorized" };
  if (!hasStorage) return { error: "storage_unconfigured" };

  const file = formData.get("imageFile");
  if (!(file instanceof File) || file.size === 0) return { error: "no_image" };

  try {
    const url = await uploadLibraryImage(await file.arrayBuffer());
    const input: LibraryImageInput = {
      url,
      label: String(formData.get("label") ?? "").trim(),
      scientific: String(formData.get("scientific") ?? "").trim(),
      genus: String(formData.get("genus") ?? "").trim(),
      slug: String(formData.get("slug") ?? "").trim(),
      notes: String(formData.get("notes") ?? "").trim(),
    };
    await addLibraryImage(input);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch {
    return { error: "upload_failed" };
  }
}

export async function deleteLibraryImageAction(formData: FormData): Promise<void> {
  if (!(await isAdminAuthed())) return;
  const id = String(formData.get("id") ?? "").trim();
  const locale = String(formData.get("locale") ?? "en");
  if (id) {
    await deleteLibraryImage(id);
    revalidatePath("/", "layout");
  }
  redirect(`/${locale}/admin/media`);
}

export async function searchLibraryAction(query: string) {
  if (!(await isAdminAuthed())) return [];
  return listLibraryImages(query);
}

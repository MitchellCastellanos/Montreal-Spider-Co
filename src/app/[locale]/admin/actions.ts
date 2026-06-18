"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { checkPassword, setAdminCookie, clearAdminCookie, isAdminAuthed } from "@/lib/auth";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  type ProductInput,
  type ProductSizeInput,
} from "@/lib/data/products";
import { uploadProductImage, hasStorage } from "@/lib/storage";
import { createPickupPoint, updatePickupPoint, deletePickupPoint, type PickupInput } from "@/lib/data/locations";
import { updateSettings } from "@/lib/data/settings";
import { addLibraryImage } from "@/lib/data/species-library";
import { linkProductToSpecies, type SpeciesInput } from "@/lib/data/species";
import { parseWeeklyHoursJson } from "@/lib/opening-hours";
import { deriveGenus } from "@/lib/species-utils";

export type ActionState = { error?: string; ok?: boolean };

function speciesInputFromForm(formData: FormData, image: string | null): SpeciesInput {
  return {
    scientific: str(formData, "scientific"),
    commonEn: str(formData, "commonEn"),
    commonFr: str(formData, "commonFr") || str(formData, "commonEn"),
    genus: str(formData, "genus") || deriveGenus(str(formData, "scientific")),
    experience: (str(formData, "experience") || "beginner") as SpeciesInput["experience"],
    type: (str(formData, "type") || "terrestrial") as SpeciesInput["type"],
    temperament: (str(formData, "temperament") || "docile") as SpeciesInput["temperament"],
    hue: Math.round(num(formData, "hue", 36)),
    accent: str(formData, "accent") || "#c9a24b",
    image,
    adultSizeEn: str(formData, "adultSizeEn"),
    adultSizeFr: str(formData, "adultSizeFr"),
    growthEn: str(formData, "growthEn"),
    growthFr: str(formData, "growthFr"),
    originEn: str(formData, "originEn"),
    originFr: str(formData, "originFr"),
    lifespanEn: str(formData, "lifespanEn"),
    lifespanFr: str(formData, "lifespanFr"),
    humidity: str(formData, "humidity"),
    temperature: str(formData, "temperature"),
    enclosureEn: str(formData, "enclosureEn"),
    enclosureFr: str(formData, "enclosureFr"),
    dietEn: str(formData, "dietEn"),
    dietFr: str(formData, "dietFr"),
    descriptionEn: str(formData, "descriptionEn"),
    descriptionFr: str(formData, "descriptionFr"),
    careGuide: str(formData, "careGuide") || null,
  };
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const password = String(formData.get("password") ?? "");
  const locale = String(formData.get("locale") ?? "en");
  if (!checkPassword(password)) {
    return { error: "invalid" };
  }
  await setAdminCookie();
  redirect(`/${locale}/admin`);
}

export async function logoutAction(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "en");
  await clearAdminCookie();
  redirect(`/${locale}/admin`);
}

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}
function bool(formData: FormData, key: string): boolean {
  return formData.get(key) === "on" || formData.get(key) === "true";
}
function num(formData: FormData, key: string, fallback = 0): number {
  const v = Number(formData.get(key));
  return Number.isFinite(v) ? v : fallback;
}

export async function saveProductAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isAdminAuthed())) return { error: "unauthorized" };

  const id = str(formData, "id");
  const locale = str(formData, "locale") || "en";

  // Sizes are submitted as a JSON string from the client form.
  let sizes: ProductSizeInput[] = [];
  try {
    sizes = JSON.parse(str(formData, "sizes") || "[]");
  } catch {
    return { error: "sizes_invalid" };
  }
  sizes = sizes.filter((s) => s.key && Number.isFinite(s.price));
  if (sizes.length === 0) return { error: "sizes_required" };

  const slug = str(formData, "slug").toLowerCase().replace(/\s+/g, "-");
  if (!slug || !str(formData, "scientific") || !str(formData, "commonEn")) {
    return { error: "missing_fields" };
  }

  // Image: upload, pick from library, clear, or keep current.
  const imageMode = str(formData, "imageMode") || "keep";
  let image: string | null = str(formData, "storedImage") || null;

  if (imageMode === "clear") {
    image = null;
  } else if (imageMode === "library") {
    const picked = str(formData, "libraryImageUrl");
    if (!picked) return { error: "library_image_required" };
    image = picked;
  } else {
    const file = formData.get("imageFile");
    if (file instanceof File && file.size > 0) {
      if (!hasStorage) return { error: "storage_unconfigured" };
      try {
        image = await uploadProductImage(await file.arrayBuffer());
        if (formData.get("saveToLibrary") !== "false") {
          await addLibraryImage({
            url: image,
            label: str(formData, "commonEn") || str(formData, "scientific"),
            scientific: str(formData, "scientific"),
            genus: str(formData, "genus"),
            slug,
          });
        }
      } catch {
        return { error: "upload_failed" };
      }
    }
  }

  const input: ProductInput = {
    slug,
    scientific: str(formData, "scientific"),
    commonEn: str(formData, "commonEn"),
    commonFr: str(formData, "commonFr") || str(formData, "commonEn"),
    genus: str(formData, "genus"),
    experience: (str(formData, "experience") || "beginner") as ProductInput["experience"],
    type: (str(formData, "type") || "terrestrial") as ProductInput["type"],
    temperament: (str(formData, "temperament") || "docile") as ProductInput["temperament"],
    featured: bool(formData, "featured"),
    newArrival: bool(formData, "newArrival"),
    rating: num(formData, "rating", 5),
    reviews: Math.round(num(formData, "reviews", 0)),
    hue: Math.round(num(formData, "hue", 36)),
    accent: str(formData, "accent") || "#c9a24b",
    image,
    adultSizeEn: str(formData, "adultSizeEn"),
    adultSizeFr: str(formData, "adultSizeFr"),
    growthEn: str(formData, "growthEn"),
    growthFr: str(formData, "growthFr"),
    originEn: str(formData, "originEn"),
    originFr: str(formData, "originFr"),
    lifespanEn: str(formData, "lifespanEn"),
    lifespanFr: str(formData, "lifespanFr"),
    humidity: str(formData, "humidity"),
    temperature: str(formData, "temperature"),
    enclosureEn: str(formData, "enclosureEn"),
    enclosureFr: str(formData, "enclosureFr"),
    dietEn: str(formData, "dietEn"),
    dietFr: str(formData, "dietFr"),
    descriptionEn: str(formData, "descriptionEn"),
    descriptionFr: str(formData, "descriptionFr"),
    careGuide: str(formData, "careGuide") || null,
    sizes,
  };

  try {
    let productId = id;
    if (id) {
      await updateProduct(id, input);
    } else {
      productId = await createProduct(input);
    }

    if (bool(formData, "saveSpeciesTemplate") && productId) {
      await linkProductToSpecies(productId, speciesInputFromForm(formData, image));
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "save_failed" };
  }

  revalidatePath("/", "layout");
  redirect(`/${locale}/admin`);
}

export async function deleteProductAction(formData: FormData): Promise<void> {
  if (!(await isAdminAuthed())) return;
  const id = str(formData, "id");
  const locale = str(formData, "locale") || "en";
  if (id) {
    await deleteProduct(id);
    revalidatePath("/", "layout");
  }
  redirect(`/${locale}/admin`);
}

// --- Pickup points ---------------------------------------------------------

export async function savePickupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isAdminAuthed())) return { error: "unauthorized" };
  const id = str(formData, "id");
  const locale = str(formData, "locale") || "en";
  if (!str(formData, "name") || !str(formData, "address")) return { error: "missing_fields" };

  const hours = parseWeeklyHoursJson(str(formData, "hours"));
  if (!hours) return { error: "hours_invalid" };

  const input: PickupInput = {
    name: str(formData, "name"),
    neighborhood: str(formData, "neighborhood"),
    address: str(formData, "address"),
    hours,
    mapsUrl: str(formData, "mapsUrl"),
    phone: str(formData, "phone"),
    active: bool(formData, "active"),
  };

  try {
    if (id) await updatePickupPoint(id, input);
    else await createPickupPoint(input);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "save_failed" };
  }
  revalidatePath("/", "layout");
  redirect(`/${locale}/admin/pickup`);
}

export async function deletePickupAction(formData: FormData): Promise<void> {
  if (!(await isAdminAuthed())) return;
  const id = str(formData, "id");
  const locale = str(formData, "locale") || "en";
  if (id) {
    await deletePickupPoint(id);
    revalidatePath("/", "layout");
  }
  redirect(`/${locale}/admin/pickup`);
}

// --- Store settings (pickup terms, T&C) ------------------------------------

export async function saveSettingsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isAdminAuthed())) return { error: "unauthorized" };
  try {
    await updateSettings({
      pickupWindowDays: Math.max(1, Math.round(num(formData, "pickupWindowDays", 2))),
      pickupTerms: { en: str(formData, "pickupTermsEn"), fr: str(formData, "pickupTermsFr") },
      terms: { en: str(formData, "termsEn"), fr: str(formData, "termsFr") },
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "save_failed" };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

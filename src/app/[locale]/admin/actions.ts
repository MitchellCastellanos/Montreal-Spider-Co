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
  type ProductDistributorStockInput,
} from "@/lib/data/products";
import { uploadProductImage, hasStorage } from "@/lib/storage";
import { createPickupPoint, updatePickupPoint, deletePickupPoint, deletePickupPoints, setPickupPointsActive, setPickupActive, type PickupInput } from "@/lib/data/locations";
import { createDistributor, updateDistributor, deleteDistributor, deleteDistributors, setDistributorsActive, setDistributorActive, type DistributorInput } from "@/lib/data/distributors";
import { updateSettings } from "@/lib/data/settings";
import { sendTemplateTestEmail } from "@/lib/email";
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

  let distributorStocks: ProductDistributorStockInput[] = [];
  try {
    distributorStocks = JSON.parse(str(formData, "distributorStocks") || "[]");
  } catch {
    return { error: "distributor_stocks_invalid" };
  }
  if (!Array.isArray(distributorStocks)) distributorStocks = [];

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
    availableAtPickup: bool(formData, "availableAtPickup"),
    availableAtDistributor: bool(formData, "availableAtDistributor"),
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
    distributorStocks,
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

function parsePickupIds(formData: FormData): string[] {
  try {
    const parsed = JSON.parse(str(formData, "ids") || "[]");
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string" && x.length > 0) : [];
  } catch {
    return [];
  }
}

export async function bulkPickupAction(formData: FormData): Promise<void> {
  if (!(await isAdminAuthed())) return;
  const locale = str(formData, "locale") || "en";
  const action = str(formData, "action");
  const ids = parsePickupIds(formData);
  if (ids.length > 0) {
    if (action === "delete") await deletePickupPoints(ids);
    else if (action === "activate") await setPickupPointsActive(ids, true);
    else if (action === "deactivate") await setPickupPointsActive(ids, false);
    revalidatePath("/", "layout");
  }
  redirect(`/${locale}/admin/pickup`);
}

export async function togglePickupActiveAction(formData: FormData): Promise<void> {
  if (!(await isAdminAuthed())) return;
  const id = str(formData, "id");
  if (id) {
    await setPickupActive(id, bool(formData, "active"));
    revalidatePath("/", "layout");
  }
}

// --- Authorized distributors -----------------------------------------------

export async function saveDistributorAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isAdminAuthed())) return { error: "unauthorized" };
  const id = str(formData, "id");
  const locale = str(formData, "locale") || "en";
  if (!str(formData, "name") || !str(formData, "address")) return { error: "missing_fields" };

  const hours = parseWeeklyHoursJson(str(formData, "hours"));
  if (!hours) return { error: "hours_invalid" };

  const input: DistributorInput = {
    name: str(formData, "name"),
    neighborhood: str(formData, "neighborhood"),
    address: str(formData, "address"),
    hours,
    mapsUrl: str(formData, "mapsUrl"),
    phone: str(formData, "phone"),
    active: bool(formData, "active"),
  };

  try {
    if (id) await updateDistributor(id, input);
    else await createDistributor(input);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "save_failed" };
  }
  revalidatePath("/", "layout");
  redirect(`/${locale}/admin/pickup?tab=distributors`);
}

export async function deleteDistributorAction(formData: FormData): Promise<void> {
  if (!(await isAdminAuthed())) return;
  const id = str(formData, "id");
  const locale = str(formData, "locale") || "en";
  if (id) {
    await deleteDistributor(id);
    revalidatePath("/", "layout");
  }
  redirect(`/${locale}/admin/pickup?tab=distributors`);
}

function parseDistributorIds(formData: FormData): string[] {
  try {
    const parsed = JSON.parse(str(formData, "ids") || "[]");
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string" && x.length > 0) : [];
  } catch {
    return [];
  }
}

export async function bulkDistributorAction(formData: FormData): Promise<void> {
  if (!(await isAdminAuthed())) return;
  const locale = str(formData, "locale") || "en";
  const action = str(formData, "action");
  const ids = parseDistributorIds(formData);
  if (ids.length > 0) {
    if (action === "delete") await deleteDistributors(ids);
    else if (action === "activate") await setDistributorsActive(ids, true);
    else if (action === "deactivate") await setDistributorsActive(ids, false);
    revalidatePath("/", "layout");
  }
  redirect(`/${locale}/admin/pickup?tab=distributors`);
}

export async function toggleDistributorActiveAction(formData: FormData): Promise<void> {
  if (!(await isAdminAuthed())) return;
  const id = str(formData, "id");
  if (id) {
    await setDistributorActive(id, bool(formData, "active"));
    revalidatePath("/", "layout");
  }
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

// --- Email templates (test sends) ------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function sendTestEmailAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isAdminAuthed())) return { error: "unauthorized" };

  const templateId = str(formData, "templateId");
  const to = str(formData, "to");
  const locale = (str(formData, "emailLocale") === "fr" ? "fr" : "en") as "en" | "fr";

  if (!templateId) return { error: "Select a template first." };
  if (!EMAIL_RE.test(to)) return { error: "Enter a valid email address." };

  const result = await sendTemplateTestEmail({ templateId, to, locale });
  if (!result.ok) return { error: result.error };
  return { ok: true };
}

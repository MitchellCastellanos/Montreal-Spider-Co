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
import { nearestInchOption } from "@/lib/size-inches";
import { uploadProductImage, hasStorage } from "@/lib/storage";
import {
  bulkUpdateLocations,
  createLocation,
  type LocationBulkRow,
  type LocationInput,
} from "@/lib/data/locations";
import { updateSettings } from "@/lib/data/settings";
import { sendTemplateTestEmail } from "@/lib/email";
import { addLibraryImage } from "@/lib/data/species-library";
import { linkProductToSpecies, type SpeciesInput } from "@/lib/data/species";
import {
  receiveSpecimens,
  sellSpecimensManual,
  transferToConsignment,
  transferToWarehouse,
  writeOffSpecimens,
  updateTarantulAppId,
  exportSoldSpecimensCsv,
  syncAggregateStock,
  deleteSpecimens,
} from "@/lib/data/specimens";
import type { PaymentMethod, SalesChannel } from "@prisma/client";
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
  sizes = sizes
    .filter((s) => s.key && Number.isFinite(s.price))
    .map((s) => {
      let sizeMinInches = Number(s.sizeMinInches);
      let sizeMaxInches = Number(s.sizeMaxInches);
      if (!Number.isFinite(sizeMinInches)) sizeMinInches = 0.125;
      if (!Number.isFinite(sizeMaxInches)) sizeMaxInches = sizeMinInches;
      sizeMinInches = nearestInchOption(sizeMinInches);
      sizeMaxInches = nearestInchOption(sizeMaxInches);
      if (sizeMaxInches < sizeMinInches) [sizeMinInches, sizeMaxInches] = [sizeMaxInches, sizeMinInches];
      return { ...s, sizeMinInches, sizeMaxInches };
    });
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
    await syncAggregateStock(productId);
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

// --- Store locations (pickup + distributor) --------------------------------

export async function bulkSaveLocationsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isAdminAuthed())) return { error: "unauthorized" };
  const locale = str(formData, "locale") || "en";

  let rows: LocationBulkRow[] = [];
  try {
    rows = JSON.parse(str(formData, "locations") || "[]");
  } catch {
    return { error: "locations_invalid" };
  }
  if (!Array.isArray(rows) || rows.length === 0) return { error: "locations_empty" };

  try {
    await bulkUpdateLocations(rows);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "save_failed" };
  }
  revalidatePath("/", "layout");
  redirect(`/${locale}/admin/pickup`);
}

export async function createLocationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isAdminAuthed())) return { error: "unauthorized" };
  const locale = str(formData, "locale") || "en";
  if (!str(formData, "name") || !str(formData, "address")) return { error: "missing_fields" };

  const hours = parseWeeklyHoursJson(str(formData, "hours"));
  if (!hours) return { error: "hours_invalid" };

  const input: LocationInput = {
    name: str(formData, "name"),
    neighborhood: str(formData, "neighborhood"),
    address: str(formData, "address"),
    hours,
    mapsUrl: str(formData, "mapsUrl"),
    phone: str(formData, "phone"),
    active: true,
    isPickup: bool(formData, "isPickup"),
    isDistributor: bool(formData, "isDistributor"),
  };

  if (!input.isPickup && !input.isDistributor) {
    return { error: "Select pickup and/or distributor" };
  }

  try {
    await createLocation(input);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "save_failed" };
  }
  revalidatePath("/", "layout");
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

// --- Inventory & specimens -------------------------------------------------

export async function receiveSpecimensAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isAdminAuthed())) return { error: "unauthorized" };
  const locale = str(formData, "locale") || "en";

  const quantity = Math.round(num(formData, "quantity", 1));
  const tarantulAppIdsRaw = str(formData, "tarantulAppIds");
  const tarantulAppIds = tarantulAppIdsRaw
    ? tarantulAppIdsRaw
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined;

  try {
    await receiveSpecimens({
      productId: str(formData, "productId"),
      sizeKey: str(formData, "sizeKey"),
      quantity,
      unitCost: num(formData, "unitCost", 0),
      purchasedAt: new Date(str(formData, "purchasedAt") || new Date().toISOString().slice(0, 10)),
      supplier: str(formData, "supplier"),
      notes: str(formData, "notes"),
      tarantulAppId: str(formData, "tarantulAppId") || undefined,
      tarantulAppIds,
      locationType: str(formData, "locationType") === "consignment" ? "consignment" : "warehouse",
      locationId: str(formData, "locationId") || undefined,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "receive_failed" };
  }

  revalidatePath("/", "layout");
  redirect(`/${locale}/admin/inventory`);
}

export async function transferSpecimensAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isAdminAuthed())) return { error: "unauthorized" };
  const locale = str(formData, "locale") || "en";
  const direction = str(formData, "direction");

  let specimenIds: string[] = [];
  try {
    specimenIds = JSON.parse(str(formData, "specimenIds") || "[]");
  } catch {
    return { error: "specimens_invalid" };
  }

  try {
    if (direction === "warehouse") {
      await transferToWarehouse(specimenIds, str(formData, "notes"));
    } else {
      await transferToConsignment({
        specimenIds,
        locationId: str(formData, "locationId"),
        notes: str(formData, "notes"),
      });
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "transfer_failed" };
  }

  revalidatePath("/", "layout");
  redirect(`/${locale}/admin/inventory`);
}

export async function sellSpecimensAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isAdminAuthed())) return { error: "unauthorized" };
  const locale = str(formData, "locale") || "en";

  let specimenIds: string[] = [];
  try {
    specimenIds = JSON.parse(str(formData, "specimenIds") || "[]");
  } catch {
    return { error: "specimens_invalid" };
  }

  try {
    await sellSpecimensManual({
      specimenIds,
      salePrice: num(formData, "salePrice", 0),
      salesChannel: (str(formData, "salesChannel") || "other") as SalesChannel,
      paymentMethod: (str(formData, "paymentMethod") || "cash") as PaymentMethod,
      notes: str(formData, "notes"),
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "sale_failed" };
  }

  revalidatePath("/", "layout");
  redirect(`/${locale}/admin/inventory`);
}

export async function writeOffSpecimensAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isAdminAuthed())) return { error: "unauthorized" };
  const locale = str(formData, "locale") || "en";

  let specimenIds: string[] = [];
  try {
    specimenIds = JSON.parse(str(formData, "specimenIds") || "[]");
  } catch {
    return { error: "specimens_invalid" };
  }

  try {
    await writeOffSpecimens({ specimenIds, notes: str(formData, "notes") });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "writeoff_failed" };
  }

  revalidatePath("/", "layout");
  redirect(`/${locale}/admin/inventory`);
}

export async function updateTarantulAppIdAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isAdminAuthed())) return { error: "unauthorized" };

  try {
    await updateTarantulAppId(str(formData, "specimenId"), str(formData, "tarantulAppId") || null);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "update_failed" };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteSpecimensAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isAdminAuthed())) return { error: "unauthorized" };
  const locale = str(formData, "locale") || "en";

  let specimenIds: string[] = [];
  try {
    specimenIds = JSON.parse(str(formData, "specimenIds") || "[]");
  } catch {
    return { error: "specimens_invalid" };
  }

  try {
    await deleteSpecimens(specimenIds);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "delete_failed" };
  }

  revalidatePath("/", "layout");
  redirect(`/${locale}/admin/inventory`);
}

export async function exportSalesCsvAction(formData: FormData): Promise<{ csv?: string; error?: string }> {
  if (!(await isAdminAuthed())) return { error: "unauthorized" };

  const fromStr = str(formData, "from");
  const toStr = str(formData, "to");
  try {
    const csv = await exportSoldSpecimensCsv(
      fromStr ? new Date(fromStr) : undefined,
      toStr ? new Date(toStr) : undefined,
    );
    return { csv };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "export_failed" };
  }
}

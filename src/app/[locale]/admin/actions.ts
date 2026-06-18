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

export type ActionState = { error?: string; ok?: boolean };

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

  // Image: upload a new file if provided, otherwise keep the current URL.
  let image: string | null = str(formData, "currentImage") || null;
  const file = formData.get("imageFile");
  if (file instanceof File && file.size > 0) {
    if (!hasStorage) return { error: "storage_unconfigured" };
    try {
      image = await uploadProductImage(await file.arrayBuffer());
    } catch {
      return { error: "upload_failed" };
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
    if (id) {
      await updateProduct(id, input);
    } else {
      await createProduct(input);
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

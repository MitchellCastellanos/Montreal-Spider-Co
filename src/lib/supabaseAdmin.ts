import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client using the service-role key, used for product
 * image uploads to Storage. Null until Supabase env vars are configured.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const PRODUCT_BUCKET = process.env.SUPABASE_PRODUCT_BUCKET || "product-images";

export const supabaseAdmin: SupabaseClient | null =
  url && serviceKey ? createClient(url, serviceKey, { auth: { persistSession: false } }) : null;

export const hasStorage = Boolean(supabaseAdmin);

/** Upload a file buffer to the product image bucket and return its public URL. */
export async function uploadProductImage(
  file: ArrayBuffer,
  filename: string,
  contentType: string
): Promise<string> {
  if (!supabaseAdmin) throw new Error("Supabase Storage is not configured.");
  const path = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const { error } = await supabaseAdmin.storage
    .from(PRODUCT_BUCKET)
    .upload(path, file, { contentType, upsert: false });
  if (error) throw error;
  const { data } = supabaseAdmin.storage.from(PRODUCT_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

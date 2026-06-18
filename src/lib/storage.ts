import "server-only";
import { v2 as cloudinary } from "cloudinary";

/**
 * Product image uploads via Cloudinary. Null/disabled until the Cloudinary
 * env vars are configured (the admin then shows a "storage not configured" note).
 */
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

export const hasStorage = Boolean(cloudName && apiKey && apiSecret);

if (hasStorage) {
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
}

const FOLDER = process.env.CLOUDINARY_FOLDER || "montreal-spider-co/products";

/** Upload an image buffer to Cloudinary and return its secure CDN URL. */
export async function uploadProductImage(file: ArrayBuffer): Promise<string> {
  if (!hasStorage) throw new Error("Cloudinary is not configured.");
  const buffer = Buffer.from(file);
  return new Promise<string>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: FOLDER, resource_type: "image" },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error("Upload failed"));
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

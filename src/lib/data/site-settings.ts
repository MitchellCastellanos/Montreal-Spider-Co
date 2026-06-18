import "server-only";
import { cache } from "react";
import { prisma, hasDatabase } from "@/lib/db";
import { logDbFallback } from "@/lib/data/db-safe";

const DEFAULT_PRODUCT_IMAGE_KEY = "default_product_image";

export const getDefaultProductImage = cache(async (): Promise<string | null> => {
  if (!prisma) return null;
  try {
    const row = await prisma.siteSetting.findUnique({ where: { key: DEFAULT_PRODUCT_IMAGE_KEY } });
    return row?.value || null;
  } catch (e) {
    logDbFallback("getDefaultProductImage", e);
    return null;
  }
});

export async function setDefaultProductImage(url: string | null): Promise<void> {
  if (!prisma) throw new Error("Database not configured.");
  if (!url) {
    await prisma.siteSetting.deleteMany({ where: { key: DEFAULT_PRODUCT_IMAGE_KEY } });
    return;
  }
  await prisma.siteSetting.upsert({
    where: { key: DEFAULT_PRODUCT_IMAGE_KEY },
    create: { key: DEFAULT_PRODUCT_IMAGE_KEY, value: url },
    update: { value: url },
  });
}

export { hasDatabase };

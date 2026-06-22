// Fix Specimen rows created by the old tier-based backfill (backfill-specimens.mjs),
// which only set sizeKey — sizeCm/price were left at their schema defaults of 0.
// The new storefront groups availability by sizeCm/sex/price, so any row still at the
// default would show up as a free, sizeless buy-box. Match it back to its old
// ProductSize (by key) and fill in a real size/price.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const CM_PER_INCH = 2.54;

async function main() {
  const legacy = await prisma.specimen.findMany({
    where: { sizeKey: { not: null }, sizeCm: 0 },
  });

  if (legacy.length === 0) {
    console.log("[backfill-specimen-size-price] No legacy specimens to migrate.");
    return;
  }

  const sizeCache = new Map();
  let updated = 0;
  for (const specimen of legacy) {
    const cacheKey = `${specimen.productId}:${specimen.sizeKey}`;
    let size = sizeCache.get(cacheKey);
    if (size === undefined) {
      size = await prisma.productSize.findFirst({
        where: { productId: specimen.productId, key: specimen.sizeKey },
      });
      sizeCache.set(cacheKey, size ?? null);
    }
    if (!size) continue;

    const midInches = (size.sizeMinInches + size.sizeMaxInches) / 2;
    await prisma.specimen.update({
      where: { id: specimen.id },
      data: { sizeCm: midInches * CM_PER_INCH, price: size.price },
    });
    updated++;
  }

  console.log(`[backfill-specimen-size-price] Migrated ${updated}/${legacy.length} legacy specimen(s).`);
}

main()
  .catch((e) => {
    console.error("[backfill-specimen-size-price] failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

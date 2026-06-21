// Drop legacy product rating/reviews columns (removed from storefront).
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function columnExists(table, column) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
     ) AS "exists"`,
    table,
    column,
  );
  return Boolean(rows[0]?.exists);
}

async function main() {
  const hasRating = await columnExists("Product", "rating");
  const hasReviews = await columnExists("Product", "reviews");
  if (!hasRating && !hasReviews) {
    console.log("[drop-product-ratings] Columns already removed — skipping.");
    return;
  }
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Product"
      DROP COLUMN IF EXISTS "rating",
      DROP COLUMN IF EXISTS "reviews"
  `);
  console.log("[drop-product-ratings] Dropped rating/reviews columns.");
}

main()
  .catch((e) => {
    console.error("[drop-product-ratings] failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

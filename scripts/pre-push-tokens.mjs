// Runs BEFORE `prisma db push` (see db-deploy.mjs).
//
// Specimen.qrToken and StoreLocation.partnerToken are required unique columns
// whose cuid() default only exists client-side, so `db push` can't add them to
// non-empty tables. This script adds the columns nullable, backfills unique
// tokens for existing rows, then marks them NOT NULL — after which db push
// sees the columns already in place and only adds the unique indexes.
// Safe to run repeatedly.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL || process.env.DATABASE_URL,
});

async function columnExists(table, column) {
  const rows = await prisma.$queryRaw`
    SELECT 1 FROM information_schema.columns
    WHERE table_name = ${table} AND column_name = ${column}
  `;
  return rows.length > 0;
}

async function ensureTokenColumn(table, column) {
  if (!(await columnExists(table, column))) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN "${column}" TEXT`);
    console.log(`[pre-push-tokens] Added ${table}.${column}.`);
  }
  const filled = await prisma.$executeRawUnsafe(
    `UPDATE "${table}" SET "${column}" = replace(gen_random_uuid()::text, '-', '') WHERE "${column}" IS NULL`,
  );
  if (filled > 0) console.log(`[pre-push-tokens] Backfilled ${filled} tokens on ${table}.${column}.`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ALTER COLUMN "${column}" SET NOT NULL`);
  // Create the unique index under the exact name Prisma expects, so db push
  // doesn't try to add it itself (which trips its data-loss guard).
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "${table}_${column}_key" ON "${table}"("${column}")`,
  );
}

async function main() {
  await ensureTokenColumn("Specimen", "qrToken");
  await ensureTokenColumn("StoreLocation", "partnerToken");
  console.log("[pre-push-tokens] Done.");
}

main()
  .catch((e) => {
    console.error("[pre-push-tokens] Failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

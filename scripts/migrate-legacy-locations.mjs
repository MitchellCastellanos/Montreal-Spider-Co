// One-time migration: PickupPoint + AuthorizedDistributor → StoreLocation.
// Runs before `prisma db push` so production data is preserved and the push
// does not block on "data loss" warnings for the dropped legacy tables.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function tableExists(table) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = $1
     ) AS "exists"`,
    table,
  );
  return Boolean(rows[0]?.exists);
}

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
  const hasPickup = await tableExists("PickupPoint");
  const hasDistributor = await tableExists("AuthorizedDistributor");

  if (!hasPickup && !hasDistributor) {
    console.log("[migrate-locations] No legacy tables — skipping.");
    return;
  }

  console.log("[migrate-locations] Migrating PickupPoint / AuthorizedDistributor → StoreLocation…");

  if (!(await tableExists("StoreLocation"))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "StoreLocation" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "neighborhood" TEXT NOT NULL DEFAULT '',
        "address" TEXT NOT NULL,
        "hours" JSONB NOT NULL DEFAULT '{}',
        "mapsUrl" TEXT NOT NULL DEFAULT '',
        "phone" TEXT NOT NULL DEFAULT '',
        "position" INTEGER NOT NULL DEFAULT 0,
        "active" BOOLEAN NOT NULL DEFAULT true,
        "isPickup" BOOLEAN NOT NULL DEFAULT false,
        "isDistributor" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "StoreLocation_pkey" PRIMARY KEY ("id")
      )
    `);
  }

  if (hasPickup) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO "StoreLocation" (
        "id", "name", "neighborhood", "address", "hours", "mapsUrl", "phone",
        "position", "active", "isPickup", "isDistributor", "createdAt", "updatedAt"
      )
      SELECT
        "id", "name", "neighborhood", "address", "hours", "mapsUrl", "phone",
        "position", "active", true, false, "createdAt", "updatedAt"
      FROM "PickupPoint"
      ON CONFLICT ("id") DO UPDATE SET
        "name" = EXCLUDED."name",
        "neighborhood" = EXCLUDED."neighborhood",
        "address" = EXCLUDED."address",
        "hours" = EXCLUDED."hours",
        "mapsUrl" = EXCLUDED."mapsUrl",
        "phone" = EXCLUDED."phone",
        "position" = EXCLUDED."position",
        "active" = EXCLUDED."active",
        "isPickup" = true,
        "updatedAt" = EXCLUDED."updatedAt"
    `);
  }

  if (hasDistributor) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO "StoreLocation" (
        "id", "name", "neighborhood", "address", "hours", "mapsUrl", "phone",
        "position", "active", "isPickup", "isDistributor", "createdAt", "updatedAt"
      )
      SELECT
        "id", "name", "neighborhood", "address", "hours", "mapsUrl", "phone",
        "position", "active", false, true, "createdAt", "updatedAt"
      FROM "AuthorizedDistributor"
      ON CONFLICT ("id") DO UPDATE SET
        "name" = EXCLUDED."name",
        "neighborhood" = EXCLUDED."neighborhood",
        "address" = EXCLUDED."address",
        "hours" = EXCLUDED."hours",
        "mapsUrl" = EXCLUDED."mapsUrl",
        "phone" = EXCLUDED."phone",
        "position" = EXCLUDED."position",
        "active" = EXCLUDED."active",
        "isDistributor" = true,
        "updatedAt" = EXCLUDED."updatedAt"
    `);
  }

  if (await tableExists("ProductDistributorStock")) {
    const hasDistId = await columnExists("ProductDistributorStock", "distributorId");
    const hasLocId = await columnExists("ProductDistributorStock", "locationId");

    if (hasDistId && !hasLocId) {
      await prisma.$executeRawUnsafe(`
        DO $$ DECLARE r RECORD;
        BEGIN
          FOR r IN (
            SELECT con.conname
            FROM pg_constraint con
            JOIN pg_class rel ON rel.oid = con.conrelid
            WHERE rel.relname = 'ProductDistributorStock'
              AND con.contype = 'f'
              AND pg_get_constraintdef(con.oid) LIKE '%AuthorizedDistributor%'
          ) LOOP
            EXECUTE 'ALTER TABLE "ProductDistributorStock" DROP CONSTRAINT ' || quote_ident(r.conname);
          END LOOP;
        END $$
      `);
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "ProductDistributorStock" RENAME COLUMN "distributorId" TO "locationId"
      `);
    }
  }

  if (hasDistributor) {
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "AuthorizedDistributor" CASCADE`);
  }
  if (hasPickup) {
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "PickupPoint" CASCADE`);
  }

  console.log("[migrate-locations] Done.");
}

main()
  .catch((e) => {
    console.error("[migrate-locations] failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

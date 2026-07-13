// Status/location separation backfill.
//
// Historically "consignment" was a Specimen *status*; it is now purely a
// physical location (locationType) — the status of a sellable specimen is
// always "available". This script:
//   1. Converts legacy status=consignment rows to status=available
//      (their locationType/locationId already point at the partner store).
//   2. Seeds settlementPrice from the legacy per-product distributorPrice
//      for specimens sitting at that partner (only when not already set).
//   3. Seeds lastMeasuredAt from purchasedAt for rows that never had it.
// Safe to run repeatedly.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const statusFixed = await prisma.specimen.updateMany({
    where: { status: "consignment" },
    data: { status: "available" },
  });
  if (statusFixed.count > 0) {
    console.log(`[backfill-status-location] Converted ${statusFixed.count} legacy consignment-status rows to available.`);
  }

  const distPrices = await prisma.productDistributorStock.findMany({
    where: { distributorPrice: { not: null } },
    select: { productId: true, locationId: true, distributorPrice: true },
  });
  let priced = 0;
  for (const row of distPrices) {
    const updated = await prisma.specimen.updateMany({
      where: {
        productId: row.productId,
        locationId: row.locationId,
        locationType: "consignment",
        settlementPrice: null,
      },
      data: { settlementPrice: row.distributorPrice },
    });
    priced += updated.count;
  }
  if (priced > 0) {
    console.log(`[backfill-status-location] Seeded settlementPrice on ${priced} partner specimens from legacy distributor prices.`);
  }

  const measured = await prisma.$executeRaw`UPDATE "Specimen" SET "lastMeasuredAt" = "purchasedAt" WHERE "lastMeasuredAt" IS NULL`;
  if (measured > 0) {
    console.log(`[backfill-status-location] Seeded lastMeasuredAt on ${measured} specimens.`);
  }

  console.log("[backfill-status-location] Done.");
}

main()
  .catch((e) => {
    console.error("[backfill-status-location] Failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

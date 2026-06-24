/**
 * One-time (or occasional) sync: enable distributor channel on listings with consignment
 * stock, refresh ProductDistributorStock counts, and backfill store price on consignment
 * specimens that were saved at $0.
 *
 * Usage: dotenv -e .env.local -- node scripts/sync-distributor-storefront.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function syncDistributorStockCounts() {
  const consignmentCounts = await prisma.specimen.groupBy({
    by: ["productId", "locationId"],
    where: { status: "consignment", locationId: { not: null } },
    _count: { _all: true },
  });

  const distRows = await prisma.productDistributorStock.findMany({
    select: { id: true, productId: true, locationId: true },
  });

  let updated = 0;
  for (const row of distRows) {
    const match = consignmentCounts.find(
      (c) => c.productId === row.productId && c.locationId === row.locationId,
    );
    const stock = match?._count._all ?? 0;
    await prisma.productDistributorStock.update({
      where: { id: row.id },
      data: { stock },
    });
    updated++;
  }

  const productIds = [...new Set(consignmentCounts.map((c) => c.productId))];
  if (productIds.length > 0) {
    await prisma.product.updateMany({
      where: { id: { in: productIds } },
      data: { availableAtDistributor: true },
    });
  }

  return { distRowsUpdated: updated, listingsEnabled: productIds.length };
}

async function backfillConsignmentPrices() {
  const zeroPrice = await prisma.specimen.findMany({
    where: { status: "consignment", price: 0 },
    select: { id: true, productId: true, sizeCm: true, sex: true },
  });

  if (zeroPrice.length === 0) return { fixed: 0, skipped: 0 };

  let fixed = 0;
  let skipped = 0;

  for (const s of zeroPrice) {
    const donor = await prisma.specimen.findFirst({
      where: {
        productId: s.productId,
        price: { gt: 0 },
        status: { in: ["available", "consignment", "sold"] },
      },
      orderBy: { purchasedAt: "desc" },
      select: { price: true },
    });

    if (!donor) {
      skipped++;
      continue;
    }

    await prisma.specimen.update({
      where: { id: s.id },
      data: { price: donor.price },
    });
    fixed++;
  }

  return { fixed, skipped };
}

async function main() {
  console.log("[sync-distributor-storefront] Starting…");

  const stock = await syncDistributorStockCounts();
  console.log(
    `[sync-distributor-storefront] Distributor stock rows updated: ${stock.distRowsUpdated}; listings with distributor channel enabled: ${stock.listingsEnabled}`,
  );

  const prices = await backfillConsignmentPrices();
  console.log(
    `[sync-distributor-storefront] Consignment prices backfilled: ${prices.fixed}; still at $0 (no donor price found): ${prices.skipped}`,
  );

  const consignment = await prisma.specimen.count({ where: { status: "consignment" } });
  const withPrice = await prisma.specimen.count({
    where: { status: "consignment", price: { gt: 0 } },
  });
  console.log(
    `[sync-distributor-storefront] Consignment specimens: ${consignment} total, ${withPrice} with store price > $0`,
  );

  console.log("[sync-distributor-storefront] Done.");
}

main()
  .catch((e) => {
    console.error("[sync-distributor-storefront] failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

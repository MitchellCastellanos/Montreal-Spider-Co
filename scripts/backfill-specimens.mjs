// Create Specimen rows from existing ProductSize.stock counts (one-time / deploy backfill).
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.specimen.count();
  if (existing > 0) {
    console.log(`[backfill-specimens] ${existing} specimen(s) already exist — skipping.`);
    return;
  }

  const sizes = await prisma.productSize.findMany({
    where: { stock: { gt: 0 } },
    include: { product: { select: { commonEn: true } } },
  });

  if (sizes.length === 0) {
    console.log("[backfill-specimens] No stock to backfill.");
    return;
  }

  let created = 0;
  for (const size of sizes) {
    for (let i = 0; i < size.stock; i++) {
      const specimen = await prisma.specimen.create({
        data: {
          productId: size.productId,
          sizeKey: size.key,
          status: "available",
          locationType: "warehouse",
          unitCost: 0,
          purchasedAt: new Date(),
          notes: "Legacy stock (auto-migrated)",
        },
      });
      await prisma.inventoryMovement.create({
        data: {
          specimenId: specimen.id,
          type: "purchase",
          toLocationType: "warehouse",
          notes: "Legacy stock migration",
        },
      });
      created++;
    }
  }

  const distStocks = await prisma.productDistributorStock.findMany({ where: { stock: { gt: 0 } } });
  for (const ds of distStocks) {
    const firstSize = await prisma.productSize.findFirst({
      where: { productId: ds.productId },
      orderBy: { position: "asc" },
    });
    if (!firstSize) continue;

    for (let i = 0; i < ds.stock; i++) {
      const specimen = await prisma.specimen.create({
        data: {
          productId: ds.productId,
          sizeKey: firstSize.key,
          status: "consignment",
          locationType: "consignment",
          locationId: ds.locationId,
          unitCost: 0,
          purchasedAt: new Date(),
          notes: "Legacy consignment (auto-migrated — verify size)",
        },
      });
      await prisma.inventoryMovement.create({
        data: {
          specimenId: specimen.id,
          type: "transfer",
          toLocationType: "consignment",
          toLocationId: ds.locationId,
          notes: "Legacy consignment migration",
        },
      });
      created++;
    }
  }

  console.log(`[backfill-specimens] Created ${created} legacy specimen(s).`);
}

main()
  .catch((e) => {
    console.error("[backfill-specimens] failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

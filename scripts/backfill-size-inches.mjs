// Backfill leg-span inches on existing ProductSize rows (additive schema defaults are 1/8″–1/4″ for all keys).
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const BY_KEY = {
  s: { sizeMinInches: 0.125, sizeMaxInches: 0.75 },
  j: { sizeMinInches: 0.875, sizeMaxInches: 1.75 },
  u: { sizeMinInches: 2, sizeMaxInches: 3.5 },
};

async function main() {
  for (const [key, range] of Object.entries(BY_KEY)) {
    const updated = await prisma.productSize.updateMany({
      where: { key, sizeMinInches: 0.125, sizeMaxInches: 0.25 },
      data: range,
    });
    if (updated.count > 0) {
      console.log(`[backfill-size-inches] Updated ${updated.count} "${key}" row(s).`);
    }
  }
}

main()
  .catch((e) => {
    console.error("[backfill-size-inches] failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

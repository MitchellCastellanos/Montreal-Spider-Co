import { PrismaClient } from "@prisma/client";
import { PRODUCTS } from "../src/lib/products";

const prisma = new PrismaClient();

async function main() {
  console.log(`Seeding ${PRODUCTS.length} products…`);
  for (const p of PRODUCTS) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      // Don't clobber edits made in the admin panel when re-seeding.
      update: {},
      create: {
        slug: p.slug,
        scientific: p.scientific,
        commonEn: p.common.en,
        commonFr: p.common.fr,
        genus: p.genus,
        experience: p.experience,
        type: p.type,
        temperament: p.temperament,
        featured: p.featured ?? false,
        newArrival: p.newArrival ?? false,
        rating: p.rating,
        reviews: p.reviews,
        hue: p.hue,
        accent: p.accent,
        image: p.image ?? null,
        adultSizeEn: p.adultSize.en,
        adultSizeFr: p.adultSize.fr,
        growthEn: p.growth.en,
        growthFr: p.growth.fr,
        originEn: p.origin.en,
        originFr: p.origin.fr,
        lifespanEn: p.lifespan.en,
        lifespanFr: p.lifespan.fr,
        humidity: p.humidity,
        temperature: p.temperature,
        enclosureEn: p.enclosure.en,
        enclosureFr: p.enclosure.fr,
        dietEn: p.diet.en,
        dietFr: p.diet.fr,
        descriptionEn: p.description.en,
        descriptionFr: p.description.fr,
        careGuide: p.careGuide ?? null,
        arrived: new Date(p.arrived),
        sizes: {
          create: p.sizes.map((s, i) => ({
            key: s.id,
            labelEn: s.label.en,
            labelFr: s.label.fr,
            price: s.price,
            stock: s.stock,
            position: i,
          })),
        },
      },
    });
  }
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

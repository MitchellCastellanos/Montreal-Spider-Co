import { PrismaClient } from "@prisma/client";
import { PRODUCTS } from "../src/lib/products";
import { PICKUP_POINTS } from "../src/lib/locations";
import { DEFAULT_SETTINGS } from "../src/lib/data/setting-defaults";

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

  console.log(`Seeding ${PICKUP_POINTS.length} pickup points…`);
  for (let i = 0; i < PICKUP_POINTS.length; i++) {
    const p = PICKUP_POINTS[i];
    const data = {
      name: p.name,
      neighborhood: p.neighborhood,
      addressEn: p.address.en,
      addressFr: p.address.fr,
      hoursEn: p.hours.en,
      hoursFr: p.hours.fr,
      position: i,
      active: true,
    };
    // Use the seed id as the row id so re-seeding is idempotent.
    await prisma.pickupPoint.upsert({ where: { id: p.id }, update: {}, create: { id: p.id, ...data } });
  }

  console.log("Seeding default settings…");
  const settings = [
    { key: "pickupWindowDays", valueEn: String(DEFAULT_SETTINGS.pickupWindowDays), valueFr: String(DEFAULT_SETTINGS.pickupWindowDays) },
    { key: "pickupTerms", valueEn: DEFAULT_SETTINGS.pickupTerms.en, valueFr: DEFAULT_SETTINGS.pickupTerms.fr },
    { key: "terms", valueEn: DEFAULT_SETTINGS.terms.en, valueFr: DEFAULT_SETTINGS.terms.fr },
  ];
  for (const s of settings) {
    await prisma.setting.upsert({ where: { key: s.key }, update: {}, create: s });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

import { PrismaClient } from "@prisma/client";
import { PRODUCTS } from "../src/lib/products";
import { STORE_LOCATIONS } from "../src/lib/locations";
import { DEFAULT_SETTINGS } from "../src/lib/data/setting-defaults";

const prisma = new PrismaClient();

async function main() {
  const [productCount, locationCount, settingCount, speciesCount, specimenCount] = await Promise.all([
    prisma.product.count(),
    prisma.storeLocation.count(),
    prisma.setting.count(),
    prisma.species.count(),
    prisma.specimen.count(),
  ]);

  if (productCount > 0) {
    console.log(`Products already seeded (${productCount}) — skipping.`);
  } else {
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
      },
    });
  }
  }

  if (specimenCount > 0) {
    console.log(`Specimens already seeded (${specimenCount}) — skipping.`);
  } else {
    console.log("Seeding demo specimens from product availability…");
    for (const p of PRODUCTS) {
      const product = await prisma.product.findUnique({ where: { slug: p.slug } });
      if (!product) continue;
      for (const unit of p.availability) {
        for (let i = 0; i < unit.stock; i++) {
          await prisma.specimen.create({
            data: {
              productId: product.id,
              sizeCm: unit.sizeCm,
              sex: unit.sex,
              price: unit.price,
              photoUrl: unit.photo ?? null,
              status: "available",
              locationType: "warehouse",
              purchasedAt: new Date(p.arrived),
            },
          });
        }
      }
    }
  }

  if (locationCount > 0) {
    console.log(`Locations already seeded (${locationCount}) — skipping.`);
  } else {
  console.log(`Seeding ${STORE_LOCATIONS.length} store locations…`);
  for (let i = 0; i < STORE_LOCATIONS.length; i++) {
    const l = STORE_LOCATIONS[i];
    await prisma.storeLocation.upsert({
      where: { id: l.id },
      update: {},
      create: {
        id: l.id,
        name: l.name,
        neighborhood: l.neighborhood,
        address: l.address,
        mapsUrl: l.mapsUrl ?? "",
        phone: l.phone ?? "",
        position: i,
        active: true,
        isPickup: l.isPickup,
        isDistributor: l.isDistributor,
        hours: l.hours as unknown as object,
      },
    });
  }
  }

  if (settingCount > 0) {
    console.log(`Settings already seeded (${settingCount}) — skipping.`);
  } else {
  console.log("Seeding default settings…");
  const settings = [
    { key: "pickupWindowDays", valueEn: String(DEFAULT_SETTINGS.pickupWindowDays), valueFr: String(DEFAULT_SETTINGS.pickupWindowDays) },
    { key: "pickupTerms", valueEn: DEFAULT_SETTINGS.pickupTerms.en, valueFr: DEFAULT_SETTINGS.pickupTerms.fr },
    { key: "terms", valueEn: DEFAULT_SETTINGS.terms.en, valueFr: DEFAULT_SETTINGS.terms.fr },
  ];
  for (const s of settings) {
    await prisma.setting.upsert({ where: { key: s.key }, update: {}, create: s });
  }
  }

  if (speciesCount > 0) {
    console.log(`Species already seeded (${speciesCount}) — skipping.`);
  } else {
    // Build species profiles from DB products (if any) or the static seed catalog.
    const dbProducts =
      productCount > 0
        ? await prisma.product.findMany({ orderBy: { arrived: "desc" } })
        : [];
    const source =
      dbProducts.length > 0
        ? dbProducts.map((p) => ({
            scientific: p.scientific,
            commonEn: p.commonEn,
            commonFr: p.commonFr,
            genus: p.genus,
            experience: p.experience,
            type: p.type,
            temperament: p.temperament,
            hue: p.hue,
            accent: p.accent,
            image: p.image,
            adultSizeEn: p.adultSizeEn,
            adultSizeFr: p.adultSizeFr,
            growthEn: p.growthEn,
            growthFr: p.growthFr,
            originEn: p.originEn,
            originFr: p.originFr,
            lifespanEn: p.lifespanEn,
            lifespanFr: p.lifespanFr,
            humidity: p.humidity,
            temperature: p.temperature,
            enclosureEn: p.enclosureEn,
            enclosureFr: p.enclosureFr,
            dietEn: p.dietEn,
            dietFr: p.dietFr,
            descriptionEn: p.descriptionEn,
            descriptionFr: p.descriptionFr,
            careGuide: p.careGuide,
          }))
        : PRODUCTS.map((p) => ({
            scientific: p.scientific,
            commonEn: p.common.en,
            commonFr: p.common.fr,
            genus: p.genus,
            experience: p.experience,
            type: p.type,
            temperament: p.temperament,
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
          }));

    const seen = new Set<string>();
    console.log("Seeding species profiles from catalog…");
    for (const s of source) {
      if (seen.has(s.scientific)) continue;
      seen.add(s.scientific);
      await prisma.species.create({ data: s });
    }

    // Link existing products to their species row.
    if (dbProducts.length > 0) {
      for (const p of dbProducts) {
        const sp = await prisma.species.findUnique({ where: { scientific: p.scientific } });
        if (sp) await prisma.product.update({ where: { id: p.id }, data: { speciesId: sp.id } });
      }
    }
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

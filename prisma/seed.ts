import { PrismaClient } from "@prisma/client";
import { PRODUCTS } from "../src/lib/products";
import { PICKUP_POINTS } from "../src/lib/locations";
import { AUTHORIZED_DISTRIBUTORS } from "../src/lib/locations";
import { DEFAULT_SETTINGS } from "../src/lib/data/setting-defaults";

const prisma = new PrismaClient();

async function main() {
  // Seed each table only when it is EMPTY. This makes the seed safe to run on
  // every deploy: it self-heals a freshly created table once, and never
  // resurrects rows you later deleted in the admin panel.
  const [productCount, pickupCount, distributorCount, settingCount, speciesCount] = await Promise.all([
    prisma.product.count(),
    prisma.pickupPoint.count(),
    prisma.authorizedDistributor.count(),
    prisma.setting.count(),
    prisma.species.count(),
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
  }

  if (pickupCount > 0) {
    console.log(`Pickup points already seeded (${pickupCount}) — skipping.`);
  } else {
  console.log(`Seeding ${PICKUP_POINTS.length} pickup points…`);
  for (let i = 0; i < PICKUP_POINTS.length; i++) {
    const p = PICKUP_POINTS[i];
    const data = {
      name: p.name,
      neighborhood: p.neighborhood,
      address: p.address,
      mapsUrl: p.mapsUrl ?? "",
      phone: p.phone ?? "",
      position: i,
      active: true,
    };
    // Use the seed id as the row id so re-seeding is idempotent.
    await prisma.pickupPoint.upsert({
      where: { id: p.id },
      update: {},
      create: { id: p.id, ...data, hours: p.hours as unknown as object },
    });
  }
  }

  if (distributorCount > 0) {
    console.log(`Distributors already seeded (${distributorCount}) — skipping.`);
  } else {
  console.log(`Seeding ${AUTHORIZED_DISTRIBUTORS.length} authorized distributors…`);
  for (let i = 0; i < AUTHORIZED_DISTRIBUTORS.length; i++) {
    const d = AUTHORIZED_DISTRIBUTORS[i];
    const data = {
      name: d.name,
      neighborhood: d.neighborhood,
      address: d.address,
      mapsUrl: d.mapsUrl ?? "",
      phone: d.phone ?? "",
      position: i,
      active: true,
    };
    await prisma.authorizedDistributor.upsert({
      where: { id: d.id },
      update: {},
      create: { id: d.id, ...data, hours: d.hours as unknown as object },
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

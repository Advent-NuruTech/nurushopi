import bcrypt from "bcryptjs";
import { PrismaClient, AdminRole } from "../generated/client/index.js";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@nurushop.com").toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe!2026";

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.admin.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash,
      name: "Senior Admin",
      role: AdminRole.SENIOR,
    },
  });
  console.log(`✔ Senior admin ready: ${admin.email}`);

  const categories = [
    { name: "Electronics", slug: "electronics", icon: "💻" },
    { name: "Fashion", slug: "fashion", icon: "👗" },
    { name: "Home & Living", slug: "home-living", icon: "🏠" },
    { name: "Beauty & Health", slug: "beauty-health", icon: "💄" },
    { name: "Groceries", slug: "groceries", icon: "🛒" },
  ];

  for (const [i, c] of categories.entries()) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: { ...c, sortOrder: i },
    });
  }
  console.log(`✔ Seeded ${categories.length} categories`);
  const collections = [
    { key: "flash_sale", displayName: "Nuru Rush", collectionType: "flash_sale", selectionStrategy: "promotion", priority: 600 },
    { key: "new_arrivals", displayName: "Fresh Finds", collectionType: "new_arrivals", selectionStrategy: "automatic", priority: 500, configuration: { newArrivalWindowDays: 30, maxPerCategory: 4 } },
    { key: "best_sellers", displayName: "People's Picks", collectionType: "best_sellers", selectionStrategy: "algorithm", priority: 400, configuration: { rankingWindowDays: 30, maxPerCategory: 4 } },
    { key: "spotlight", displayName: "Nuru Spotlight", collectionType: "spotlight", selectionStrategy: "manual", priority: 300 },
    { key: "bundles", displayName: "Better Together", collectionType: "bundles", selectionStrategy: "hybrid", priority: 200 },
    { key: "trending", displayName: "Rising Picks", collectionType: "trending", selectionStrategy: "algorithm", priority: 100, configuration: { halfLifeHours: 12, maxPerCategory: 4 } },
  ] as const;

  for (const [position, definition] of collections.entries()) {
    const collection = await prisma.merchandisingCollection.upsert({
      where: { key: definition.key },
      // Never overwrite presentation on reseed: administrators own the name.
      update: {},
      create: { ...definition, status: "ACTIVE", maxProducts: 12, createdById: admin.id },
    });
    const section = await prisma.homepageSection.findFirst({
      where: { collectionId: collection.id }, select: { id: true },
    });
    if (!section) {
      await prisma.homepageSection.create({
        data: {
          collectionId: collection.id,
          position,
          status: "ACTIVE",
          configuration: { layout: "horizontal", productLimit: 12 },
        },
      });
    }
  }
  console.log(`Seeded ${collections.length} merchandising collection identities`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

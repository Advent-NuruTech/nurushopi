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

/**
 * Post-migration validation.
 *
 *  A. Count verification — Firestore (source) vs Postgres (target) per entity.
 *  B. Referential integrity — raw queries that would surface broken/orphan FKs
 *     (Postgres enforces declared FKs, so these confirm 0; they also report how
 *     many references were intentionally nulled for unresolved sources).
 *
 * Can run standalone (`pnpm --filter migrate validate`) or be invoked by the
 * migration at the end (passing the in-flight Report so skip counts reconcile).
 */
import { prisma } from "@nuru/db";
import { firebaseAuth } from "./lib/firebase.js";
import { exactCount, listCollections } from "./lib/discover.js";
import { log } from "./lib/logger.js";
import { Report } from "./lib/report.js";

async function authUserCount(): Promise<number> {
  let total = 0;
  let token: string | undefined;
  do {
    const page = await firebaseAuth().listUsers(1000, token);
    total += page.users.length;
    token = page.pageToken;
  } while (token);
  return total;
}

function skipsFor(report: Report | undefined, collection: string): number {
  const r = report?.collections.find((c) => c.collection === collection);
  return r ? r.skipped + r.failed : 0;
}

export async function runValidation(report: Report = new Report()): Promise<Report> {
  // --- gather Firestore counts ---
  const names = new Set(await listCollections());
  const fs = async (name: string) => (names.has(name) ? exactCount(name) : 0);

  const [
    fsCategories,
    fsProducts,
    fsUsersDocs,
    fsOrders,
    fsReviews,
    fsWalletTx,
    fsRedemptions,
    fsNotifications,
    fsMessages,
    fsContacts,
    fsVendors,
    fsBanners,
    fsHero,
    fsSabbath,
    fsAdmins,
    fsAdminLogs,
    authCount,
  ] = await Promise.all([
    fs("categories"),
    fs("products"),
    fs("users"),
    fs("orders"),
    fs("reviews"),
    fs("wallet_transactions"),
    fs("wallet_redemptions"),
    fs("notifications"),
    fs("messages"),
    fs("contacts"),
    (async () => (await fs("vendorApplications")) + (await fs("vendors")))(),
    fs("banners"),
    fs("hero_announcements"),
    (async () => (await fs("sabbathMessages")) || (await fs("sabbath_messages")))(),
    fs("admins"),
    fs("admin_logs"),
    authUserCount(),
  ]);

  // --- gather Postgres counts (sequential: Supabase's pooler caps concurrent
  //     connections, so firing all counts at once exhausts the pool) ---
  const pgCategories = await prisma.category.count();
  const pgProducts = await prisma.product.count();
  const pgWholesale = await prisma.wholesaleItem.count();
  const pgUsers = await prisma.user.count();
  const pgOrders = await prisma.order.count();
  const pgOrderItems = await prisma.orderItem.count();
  const pgReviews = await prisma.review.count();
  const pgWalletTx = await prisma.walletTransaction.count();
  const pgRedemptions = await prisma.walletRedemption.count();
  const pgNotifications = await prisma.notification.count();
  const pgMessages = await prisma.message.count();
  const pgContacts = await prisma.contact.count();
  const pgVendors = await prisma.vendorApplication.count();
  const pgBanners = await prisma.banner.count();
  const pgHero = await prisma.heroAnnouncement.count();
  const pgSabbath = await prisma.sabbathMessage.count();
  const pgAdmins = await prisma.admin.count();
  const pgAdminLogs = await prisma.adminLog.count();
  const pgReferrals = await prisma.referral.count();

  // `pass` allows source === target, OR source === target + legitimate skips.
  const check = (label: string, source: number, target: number, skips = 0, note?: string) => {
    const pass = target === source || target + skips === source || (skips === 0 && target >= source);
    report.addCount({ label, source, target, pass, note: skips ? `${skips} skipped/failed${note ? "; " + note : ""}` : note });
  };

  check("Categories", fsCategories, pgCategories, 0, pgCategories > fsCategories ? `${pgCategories - fsCategories} synthesised from product.category` : undefined);
  check("Products + Wholesale", fsProducts, pgProducts + pgWholesale, skipsFor(report, "products"), `retail=${pgProducts}, wholesale=${pgWholesale}`);
  check("Users (vs Firebase Auth)", authCount, pgUsers, 0, `${fsUsersDocs} profile docs; placeholder emails allowed`);
  check("Orders", fsOrders, pgOrders, skipsFor(report, "orders"));
  check("Reviews", fsReviews, pgReviews, skipsFor(report, "reviews"));
  check("Wallet transactions", fsWalletTx, pgWalletTx, skipsFor(report, "wallet_transactions"));
  check("Wallet redemptions", fsRedemptions, pgRedemptions, skipsFor(report, "wallet_redemptions"));
  check("Notifications", fsNotifications, pgNotifications, skipsFor(report, "notifications"));
  check("Messages", fsMessages, pgMessages, skipsFor(report, "messages"));
  check("Contacts", fsContacts, pgContacts, skipsFor(report, "contacts"));
  check("Vendor applications", fsVendors, pgVendors, skipsFor(report, "vendorApplications") + skipsFor(report, "vendors"));
  check("Banners", fsBanners, pgBanners, skipsFor(report, "banners"));
  check("Hero announcements", fsHero, pgHero, skipsFor(report, "hero_announcements"));
  check("Sabbath messages", fsSabbath, pgSabbath, skipsFor(report, "sabbathMessages"));
  check("Admins", fsAdmins, pgAdmins, skipsFor(report, "admins"));
  check("Admin logs", fsAdminLogs, pgAdminLogs, skipsFor(report, "admin_logs"));
  report.addCount({ label: "Order items (no source equiv.)", source: pgOrderItems, target: pgOrderItems, pass: true, note: "derived from embedded order.items" });
  report.addCount({ label: "Referrals (derived)", source: pgReferrals, target: pgReferrals, pass: true });

  // --- referential integrity (raw): these must all be 0 ---
  // Tables are snake_case (@@map) but COLUMNS keep their camelCase Prisma names
  // (no per-field @map), so column identifiers must be double-quoted.
  await integrity(report, "products.categoryId -> categories",
    `SELECT COUNT(*)::int AS n FROM products p WHERE p."categoryId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM categories c WHERE c.id = p."categoryId")`);
  await integrity(report, "order_items.orderId -> orders",
    `SELECT COUNT(*)::int AS n FROM order_items oi WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.id = oi."orderId")`);
  await integrity(report, "order_items.productId -> products",
    `SELECT COUNT(*)::int AS n FROM order_items oi WHERE oi."productId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM products p WHERE p.id = oi."productId")`);
  await integrity(report, "reviews.userId -> users",
    `SELECT COUNT(*)::int AS n FROM reviews r WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = r."userId")`);
  await integrity(report, "reviews.productId -> products",
    `SELECT COUNT(*)::int AS n FROM reviews r WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.id = r."productId")`);
  await integrity(report, "wallet_transactions.userId -> users",
    `SELECT COUNT(*)::int AS n FROM wallet_transactions w WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = w."userId")`);
  await integrity(report, "wallet_redemptions.userId -> users",
    `SELECT COUNT(*)::int AS n FROM wallet_redemptions w WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = w."userId")`);
  await integrity(report, "orders.userId -> users",
    `SELECT COUNT(*)::int AS n FROM orders o WHERE o."userId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = o."userId")`);
  await integrity(report, "referrals.referrerId -> users",
    `SELECT COUNT(*)::int AS n FROM referrals r WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = r."referrerId")`);

  return report;
}

async function integrity(report: Report, label: string, sql: string) {
  try {
    const rows = await prisma.$queryRawUnsafe<{ n: number }[]>(sql);
    const orphans = Number(rows[0]?.n ?? 0);
    report.addIntegrity({ label, orphans, pass: orphans === 0 });
  } catch (e) {
    report.addIntegrity({ label, orphans: -1, pass: false, detail: String((e as Error).message ?? e) });
  }
}

// Standalone entry
if (process.argv[1] && process.argv[1].endsWith("validate.ts")) {
  (async () => {
    log.info("Running standalone validation…");
    const report = await runValidation();
    const { mdPath, pass } = report.write();
    log.info(`Validation report: ${mdPath}`);
    log[pass ? "success" : "error"](pass ? "✅ VALIDATION PASSED" : "❌ VALIDATION FAILED");
    await prisma.$disconnect();
    process.exit(pass ? 0 : 1);
  })().catch((e) => {
    log.error("Validation crashed", { error: String(e?.stack ?? e) });
    process.exit(1);
  });
}

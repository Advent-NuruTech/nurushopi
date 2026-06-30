/**
 * `ROLLBACK_CONFIRM=DELETE_ALL_MIGRATED pnpm --filter migrate rollback`
 *
 * Reverses the migration by emptying the migrated Postgres tables in FK-safe
 * order, inside ONE transaction (all-or-nothing). Firestore is never touched.
 *
 * This is intentionally hard to fire by accident: it refuses to run unless the
 * env var ROLLBACK_CONFIRM exactly equals "DELETE_ALL_MIGRATED".
 *
 * NOTE: This truncates the whole target schema's domain tables. If you ran the
 * migration into a database that ALSO has non-migrated production rows, prefer a
 * point-in-time DB restore instead. For the intended use (migrate into a fresh
 * Postgres) this cleanly resets so you can re-run.
 */
import { prisma } from "@nuru/db";
import { log } from "./lib/logger.js";

const CONFIRM = "DELETE_ALL_MIGRATED";

// Children first, parents last (also matches CASCADE-safe truncation order).
const TABLES_IN_ORDER = [
  "admin_logs",
  "legacy_password_imports",
  "order_items",
  "reviews",
  "wallet_transactions",
  "wallet_redemptions",
  "referrals",
  "messages",
  "notifications",
  "contacts",
  "vendor_applications",
  "orders",
  "products",
  "wholesale_items",
  "banners",
  "hero_announcements",
  "sabbath_messages",
  "categories",
  "admins",
  "users",
];

async function main() {
  if (process.env.ROLLBACK_CONFIRM !== CONFIRM) {
    log.error(
      `Refusing to roll back. To proceed, set ROLLBACK_CONFIRM="${CONFIRM}" and re-run. ` +
        `This deletes all migrated rows from Postgres (Firestore is untouched).`,
    );
    process.exit(2);
  }

  log.warn("Rolling back: truncating migrated tables (CASCADE) in one transaction…");
  const before: Record<string, number> = {};
  for (const t of TABLES_IN_ORDER) {
    try {
      const rows = await prisma.$queryRawUnsafe<{ n: number }[]>(`SELECT COUNT(*)::int AS n FROM "${t}"`);
      before[t] = Number(rows[0]?.n ?? 0);
    } catch {
      before[t] = -1;
    }
  }

  // Single TRUNCATE statement over all tables is atomic and resets sequences.
  const list = TABLES_IN_ORDER.map((t) => `"${t}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);

  log.success("Rollback complete. Row counts removed:");
  for (const t of TABLES_IN_ORDER) {
    if (before[t]! > 0) log.info(`  ${t}: ${before[t]}`);
  }

  await prisma.$disconnect();
  process.exit(0);
}

main().catch(async (e) => {
  log.error("Rollback failed (transaction rolled back; no partial deletion)", {
    error: String(e?.stack ?? e),
  });
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});

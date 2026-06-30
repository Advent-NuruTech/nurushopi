/**
 * `pnpm --filter migrate migrate`        (live)
 * `pnpm --filter migrate migrate:dry`    (DRY_RUN=true — transform + log only)
 *
 * Orchestrates the full migration:
 *   1. Build the lookup context (categories / ids) + synthetic categories.
 *   2. Migrate Firebase Auth users  -> users.
 *   3. Run the FK-ordered Firestore pipeline in memory-safe batches; each batch
 *      is one transaction (commit-or-rollback) with retry/backoff.
 *   4. Derive referral rows.
 *   5. Write the migration + error reports, then auto-run validation.
 *
 * Idempotent: every write is an upsert keyed by the original Firestore id, so
 * the whole thing is safe to re-run after fixing a problem.
 */
import { prisma } from "@nuru/db";
import { env } from "./config/env.js";
import { log } from "./lib/logger.js";
import { Report } from "./lib/report.js";
import { readBatches } from "./lib/reader.js";
import { commitBatch } from "./lib/upsert.js";
import { firestore } from "./lib/firebase.js";
import { buildContext } from "./context-builder.js";
import { PIPELINE, seedSlugDedupers, type Migrator } from "./migrators.js";
import { migrateAuthUsers, deriveReferrals, freeCollidingEmails } from "./auth.js";
import { runValidation } from "./validate.js";

/** Pick the first candidate collection that actually exists & has docs. */
async function resolveCollection(candidates: string[]): Promise<string | null> {
  for (const name of candidates) {
    const snap = await firestore().collection(name).limit(1).get();
    if (!snap.empty) return name;
  }
  return null;
}

async function runMigrator(m: Migrator, report: Report, ctx: Awaited<ReturnType<typeof buildContext>>["ctx"]) {
  const name = await resolveCollection(m.collections);
  const result = report.startCollection(m.collections[0]!, m.target);
  if (!name) {
    log.warn(`Skipping ${m.target}: no source collection found (${m.collections.join(", ")})`);
    return;
  }
  log.info(`Migrating ${name} -> ${m.target}…`);

  for await (const batch of readBatches(name, env.batchSize)) {
    result.read += batch.length;
    const { ops, ids, skipped } = m.build(batch, ctx);
    result.skipped += skipped;
    const outcome = await commitBatch(ops, ids);
    result.inserted += outcome.committed;
    result.retries += outcome.retries;
    for (const f of outcome.failures) {
      result.failed++;
      result.errors.push({ id: ids[f.index] ?? "?", reason: f.reason });
    }
    log.info(`  ${name}: read ${result.read}, inserted ${result.inserted}, skipped ${result.skipped}, failed ${result.failed}`);
  }
  log.success(`Done ${name}: ${result.inserted} rows (${result.skipped} skipped, ${result.failed} failed)`);
}

async function main() {
  log.info(`=== NuruShop migration === run ${log.runId} ${env.dryRun ? "[DRY RUN]" : "[LIVE]"}`);

  // 1. Context
  log.info("Building lookup context…");
  const { ctx, syntheticCategories } = await buildContext();

  // 1a. Seed slug dedupers from existing DB rows so re-runs never try to assign
  //     a slug already tied to a different id.
  await seedSlugDedupers();

  // 1b. Free any pre-existing Postgres emails that collide with Firebase
  //     identities, so the Firebase user (source of truth) migrates by uid.
  log.info("Resolving email collisions with pre-existing users…");
  const freeResult = report().startCollection("__free_emails__", "users (email collisions freed)");
  await freeCollidingEmails(freeResult);

  // 2. Auth users (before everything that references users)
  const authResult = report().startCollection("__auth__", "users (Firebase Auth)");
  const authStats = await migrateAuthUsers(authResult);
  log.success(
    `Auth: ${authStats.total} accounts, ${authStats.withPasswords} hashes exported, ${authStats.placeholderEmails} placeholder emails`,
  );

  // 2b. Synthetic categories referenced by products but missing from `categories`
  if (syntheticCategories.length) {
    log.info(`Creating ${syntheticCategories.length} synthetic categories…`);
    const synthResult = report().startCollection("__synthetic_categories__", "categories");
    const ops = syntheticCategories.map((c) =>
      prisma.category.upsert({
        where: { id: c.id },
        create: { id: c.id, name: c.name, slug: c.slug },
        update: { name: c.name, slug: c.slug },
      }),
    );
    const outcome = await commitBatch(ops, syntheticCategories.map((c) => c.id));
    synthResult.read = ops.length;
    synthResult.inserted = outcome.committed;
  }

  // 3. FK-ordered pipeline
  for (const m of PIPELINE) {
    await runMigrator(m, report(), ctx);
  }

  // 4. Referrals
  log.info("Deriving referral rows…");
  const refResult = report().startCollection("__referrals__", "referrals");
  await deriveReferrals(refResult);
  log.success(`Referrals: ${refResult.inserted} rows`);

  // 5. Validation + reports
  log.info("Running post-migration validation…");
  await runValidation(report());

  const { jsonPath, mdPath, pass } = report().write();
  log.info(`Report written: ${mdPath}`);
  log.info(`JSON report: ${jsonPath}`);
  if (pass) {
    log.success("✅ MIGRATION PASSED — all counts and integrity checks green.");
  } else {
    log.error("❌ MIGRATION FAILED — see report for the failing checks. Fix and re-run (idempotent).");
  }

  await prisma.$disconnect();
  process.exit(pass ? 0 : 1);
}

// A single shared Report instance for the run.
let _report: Report | undefined;
function report(): Report {
  return (_report ??= new Report());
}

main().catch(async (e) => {
  log.error("Migration crashed", { error: String(e?.stack ?? e) });
  try {
    report().write();
  } catch {
    /* ignore */
  }
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});

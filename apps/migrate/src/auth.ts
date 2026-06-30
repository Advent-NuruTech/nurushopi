/**
 * Firebase Authentication -> Postgres `users` migration.
 *
 * Runs BEFORE the Firestore `users` collection so that every Auth account
 * exists as a User row (keyed by the Firebase UID) and the profile docs then
 * enrich those rows. Preserves UID, email, phone, display name, photo URL,
 * disabled status, email-verification and creation metadata, and (optionally)
 * the scrypt password hash so existing users can keep logging in.
 *
 * Passwords: Firebase uses a modified scrypt that bcrypt cannot verify. We
 * NEVER fabricate a bcrypt hash (that would lock everyone out). Instead the
 * raw scrypt hash + per-user salt are exported to
 * `out/firebase-password-hashes.json`. See README "Password migration" for the
 * zero-friction lazy-rehash login shim that consumes this file.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import type { UserRecord } from "firebase-admin/auth";
import { prisma } from "@nuru/db";
import { firebaseAuth } from "./lib/firebase.js";
import { env } from "./config/env.js";
import { log } from "./lib/logger.js";
import { commitBatch, type Op } from "./lib/upsert.js";
import type { CollectionResult } from "./lib/report.js";

function placeholderEmail(uid: string): string {
  return `migrated+${uid}@no-email.nurushop.local`;
}

/**
 * Resolve "same person in both stores" email collisions. A pre-existing
 * Postgres user (created by the new API, with a cuid id) may hold an email that
 * also belongs to a Firebase identity (uid). Since email is UNIQUE and Firebase
 * is the source of truth for this cutover, we free the email by tombstoning the
 * pre-existing row (kept, not deleted) so the Firebase user migrates under its
 * uid with all relationships intact. Idempotent: a second run finds none.
 */
export async function freeCollidingEmails(result: CollectionResult): Promise<void> {
  const auth = firebaseAuth();
  const emailToFbId = new Map<string, string>();

  let token: string | undefined;
  do {
    const page = await auth.listUsers(1000, token);
    for (const u of page.users) {
      const e = u.email?.toLowerCase().trim();
      if (e) emailToFbId.set(e, u.uid);
    }
    token = page.pageToken;
  } while (token);

  for (const [email, fbId] of emailToFbId) {
    result.read++;
    try {
      const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
      if (existing && existing.id !== fbId) {
        await prisma.user.update({
          where: { id: existing.id },
          data: { email: `replaced+${existing.id}@premigration.local` },
        });
        result.inserted++;
        log.warn(`Freed email "${email}" from pre-existing user ${existing.id} for Firebase uid ${fbId}`);
      }
    } catch (e) {
      result.failed++;
      result.errors.push({ id: email, reason: String((e as Error).message ?? e) });
    }
  }
}

export interface AuthExportResult {
  result: CollectionResult;
  total: number;
  withPasswords: number;
  placeholderEmails: number;
}

export async function migrateAuthUsers(result: CollectionResult): Promise<AuthExportResult> {
  const auth = firebaseAuth();
  const passwordHashes: Record<
    string,
    { hash: string; salt: string | undefined; email: string | null }
  > = {};
  let pageToken: string | undefined;
  let total = 0;
  let withPasswords = 0;
  let placeholderEmails = 0;

  do {
    const page = await auth.listUsers(1000, pageToken);
    pageToken = page.pageToken;

    const ops: Op[] = [];
    const ids: string[] = [];
    for (const u of page.users) {
      total++;
      const emailRaw = u.email?.toLowerCase().trim();
      const email = emailRaw || placeholderEmail(u.uid);
      if (!emailRaw) placeholderEmails++;

      const safeDate = (v: string | undefined): Date | undefined => {
        if (!v) return undefined;
        const d = new Date(v);
        return Number.isNaN(d.getTime()) ? undefined : d;
      };
      const created = safeDate(u.metadata.creationTime) ?? new Date();
      const create = {
        id: u.uid,
        email,
        name: u.displayName ?? null,
        phone: u.phoneNumber ?? null,
        avatarUrl: u.photoURL ?? null,
        emailVerified: u.emailVerified ? created : null,
        isActive: !u.disabled,
        createdAt: created,
        updatedAt: safeDate(u.metadata.lastSignInTime) ?? created,
      };
      // Don't clobber profile fields set by the users-collection pass on re-run.
      const update = {
        email,
        name: create.name,
        phone: create.phone,
        avatarUrl: create.avatarUrl,
        emailVerified: create.emailVerified,
        isActive: create.isActive,
      };
      ops.push(prisma.user.upsert({ where: { id: u.uid }, create, update }));
      ids.push(u.uid);

      if (env.exportPasswordHashes && u.passwordHash) {
        withPasswords++;
        passwordHashes[u.uid] = {
          hash: u.passwordHash,
          salt: u.passwordSalt,
          email: emailRaw ?? null,
        };
        // Also persist into Postgres so the API's lazy-rehash login shim can
        // verify the user's existing password on their first return. The user
        // upsert above precedes this in the same transaction, satisfying the FK.
        if (u.passwordSalt) {
          const legacy = { hash: u.passwordHash, salt: u.passwordSalt };
          ops.push(
            prisma.legacyPasswordImport.upsert({
              where: { userId: u.uid },
              create: { userId: u.uid, ...legacy },
              update: legacy,
            }),
          );
          ids.push(`legacy:${u.uid}`);
        }
      }
    }

    const outcome = await commitBatch(ops, ids);
    result.read += page.users.length;
    result.inserted += outcome.committed;
    result.retries += outcome.retries;
    for (const f of outcome.failures) {
      result.failed++;
      result.errors.push({ id: ids[f.index] ?? "?", reason: f.reason });
    }
    log.info(`Auth users: +${outcome.committed} (total read ${result.read})`);
  } while (pageToken);

  if (env.exportPasswordHashes) {
    const file = path.join(env.outDir, "firebase-password-hashes.json");
    writeFileSync(
      file,
      JSON.stringify(
        {
          algorithm: "scrypt (firebase)",
          params: env.scrypt,
          note: "Feed into the lazy-rehash login shim. See apps/migrate/README.md.",
          users: passwordHashes,
        },
        null,
        2,
      ),
    );
    log.success(`Exported ${withPasswords} password hashes -> ${file}`);
  }

  return { result, total, withPasswords, placeholderEmails };
}

/**
 * Derive Referral rows + referrer links from already-migrated users. A user's
 * `referredById` (set from the Firestore profile) produces one Referral row
 * (unique on referredId) crediting the referrer. Idempotent via deterministic id.
 */
export async function deriveReferrals(result: CollectionResult): Promise<void> {
  const PAGE = 1000;
  let cursor: string | undefined;
  for (;;) {
    const users = await prisma.user.findMany({
      where: { referredById: { not: null } },
      select: { id: true, referredById: true, createdAt: true },
      orderBy: { id: "asc" },
      take: PAGE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    if (users.length === 0) break;

    const ops: Op[] = [];
    const ids: string[] = [];
    for (const u of users) {
      if (!u.referredById) continue;
      const id = `ref_${u.id}`;
      const data = {
        referrerId: u.referredById,
        referredId: u.id,
        rewardAmount: new (await import("@nuru/db")).Prisma.Decimal(0),
        rewarded: false,
        createdAt: u.createdAt,
      };
      ops.push(prisma.referral.upsert({ where: { id }, create: { id, ...data }, update: data }));
      ids.push(id);
    }
    const outcome = await commitBatch(ops, ids);
    result.read += users.length;
    result.inserted += outcome.committed;
    result.retries += outcome.retries;
    for (const f of outcome.failures) {
      result.failed++;
      result.errors.push({ id: ids[f.index] ?? "?", reason: f.reason });
    }
    cursor = users[users.length - 1]!.id;
    if (users.length < PAGE) break;
  }
}

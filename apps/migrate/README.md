# NuruShop — Firebase → PostgreSQL migration utility

A **self-contained, one-shot** migration tool that reads the old Firebase
project (Firestore + Firebase Auth) and writes into the new PostgreSQL database
behind the Express API. It lives in `apps/migrate` and is **never imported by
the production app or API** — it is the only place in the repo that touches
Firebase, and it connects **read-only** (Firestore is never modified).

> The web app and API are already 100% Firebase-free. This tool moves the
> *data*; it does not reintroduce Firebase into the runtime.

---

## What it guarantees

| Requirement | How it's met |
| --- | --- |
| No data loss | Every top-level collection has a migrator; `discover` flags any unmapped collection before you run. |
| Relationships preserved | The **Firestore document id / Auth UID is reused as the Postgres primary key**, so every FK (`userId`, `productId`, `categoryId`, order items, referrals…) resolves with no translation table. |
| Transactions / rollback | Each batch is one `prisma.$transaction([...])` — commit-or-rollback. A dedicated `rollback` script empties the target atomically; Firestore is untouched. |
| Batch / memory-safe | Firestore is paged with `startAfter` cursors (`BATCH_SIZE` docs at a time). The full dataset is never loaded into memory. |
| No duplicates | Every write is an `upsert` keyed by id → re-running is idempotent and safe. |
| Verifiable | `validate` compares Firestore vs Postgres counts per entity and runs orphan/FK integrity queries; `smoke` hits the live API. A combined PASS/FAIL report is produced. |
| Auth migration | Firebase Auth users → `users` (UID, email, phone, name, photo, disabled, verified, metadata). Password hashes exported for a zero-friction login shim (see below). |

---

## Prerequisites

1. **A Firebase service account** with read access to Firestore + Auth
   (Firebase console → Project settings → Service accounts → *Generate new
   private key*).
2. **The target Postgres URL** (the same one the API uses). Use `DIRECT_URL`
   (unpooled) for the bulk load.
3. The Postgres schema must already exist — run once from the repo root:
   ```bash
   pnpm --filter @nuru/db run db:generate
   pnpm --filter @nuru/db run db:push      # creates the tables if not present
   ```

## Setup

```bash
cd apps/migrate
cp .env.example .env        # then fill in DATABASE_URL/DIRECT_URL + Firebase creds
pnpm install                # from repo root: pnpm install
```

---

## Run order (the runbook)

Run these from the repo root. **Always dry-run first.**

```bash
# 1. DISCOVER — connect read-only, list every collection, infer field types,
#    detect sub-collections, and print the collection→table plan.
#    Review out/discovery-*.md and confirm nothing is "UNMAPPED".
pnpm --filter migrate discover

# 2. DRY RUN — transform every document and log what WOULD be written. No
#    Postgres writes happen. Reads the whole dataset, so it also surfaces any
#    transform errors safely.
pnpm --filter migrate migrate:dry

# 3. MIGRATE — the real run. Idempotent: safe to re-run after fixing issues.
#    Auto-runs validation at the end and writes the PASS/FAIL report.
pnpm --filter migrate migrate

# 4. VALIDATE (standalone, re-runnable) — counts + integrity only.
pnpm --filter migrate validate

# 5. SMOKE — black-box test the live API against the migrated data.
#    Requires the API running and API_BASE_URL set.
pnpm --filter api dev          # in another terminal
pnpm --filter migrate smoke
```

### If something fails
The reports list the exact failing checks and the offending document ids. Fix
the cause (data anomaly, env, etc.) and **re-run `migrate`** — because every
write is an upsert keyed by id, re-running only repairs what changed; it never
duplicates. To start completely fresh, run the rollback (below) then migrate.

---

## Reports (written to `OUT_DIR`, default `apps/migrate/out`)

| File | Purpose |
| --- | --- |
| `discovery-*.md` / `.json` | Auto-discovered collections, field types, sub-collections, mapping plan. |
| `report-*.md` / `.json` | **Migration + verification + error + PASS/FAIL** report (sections 1–5). |
| `migration-*.log` | Full structured run log. |
| `firebase-password-hashes.json` | Exported scrypt hashes for the login shim. **Secret — do not commit.** |

The migration exits `0` on PASS and `1` on FAIL (CI-friendly).

---

## Collection → table mapping

| Firestore | → Postgres | Notes |
| --- | --- | --- |
| `categories` | `categories` | Missing categories referenced by `product.category` are auto-synthesised so no product loses its category. |
| `products` (`mode != "wholesale"`) | `products` | `category` string → `categoryId` via slug. |
| `products` (`mode == "wholesale"`) | `wholesale_items` | Old app stored wholesale as products. |
| Firebase **Auth** users | `users` | Keyed by UID; runs before Firestore `users`. |
| `users` (profile docs) | `users` | Enriches the Auth rows (name, phone, address, wallet, referredBy…). |
| `orders` (embedded `items[]`) | `orders` + `order_items` | Lowercase statuses mapped (`received`→`DELIVERED` etc.); item rows get id `${orderId}__item_${i}`. |
| `reviews` | `reviews` | Requires resolvable user **and** product (else skipped + logged). |
| `wallet_transactions` | `wallet_transactions` | |
| `wallet_redemptions` | `wallet_redemptions` | |
| `notifications` | `notifications` | |
| `messages` | `messages` | `threadId` keyed by customer id; admin↔admin DMs collapse to support threads. |
| `contacts` | `contacts` | |
| `vendorApplications` / `vendors` | `vendor_applications` | |
| `banners` | `banners` | |
| `hero_announcements` | `hero_announcements` | |
| `sabbathMessages` | `sabbath_messages` | |
| `admins` | `admins` | See password note below. |
| `admin_logs` | `admin_logs` | |
| *(derived from `user.referredBy`)* | `referrals` | One row per referred user. |

If `discover` finds a collection not in this table, it is logged as **UNMAPPED**
— add a migrator in `src/migrators.ts` and re-run. Nothing is silently dropped.

---

## Password migration (important)

Firebase Auth hashes passwords with a **modified scrypt**. bcrypt (what the API
uses) **cannot verify** these, and fabricating a bcrypt hash would lock everyone
out. So the tool:

1. Imports every Auth user keyed by UID with email/phone/verified/etc. **No user
   is lost** — they all exist in `users`.
2. Exports each user's scrypt hash + salt to
   `out/firebase-password-hashes.json` (plus the project-wide scrypt params you
   set in `.env`, from Firebase console → Authentication → ⋯ → *Password hash
   parameters*).

### Recommended: zero-friction "lazy rehash" login (no password resets)
Add a one-time verifier so existing users log in with their **current password**;
on first successful login the password is transparently re-hashed to bcrypt.

1. Install `firebase-scrypt` in the API and import the hashes (a tiny seed
   script can load `firebase-password-hashes.json` into a `legacy_password`
   table, or store them on the user — your call).
2. In `apps/api/src/modules/auth/auth.service.ts` login, when
   `user.passwordHash` is null/legacy, verify against the firebase scrypt hash;
   on success, `hashPassword()` the plaintext and persist it (drop the legacy
   hash). Pseudocode:
   ```ts
   import { FirebaseScrypt } from "firebase-scrypt";
   const scrypt = new FirebaseScrypt({
     signerKey: env.FIREBASE_SCRYPT_SIGNER_KEY,
     saltSeparator: env.FIREBASE_SCRYPT_SALT_SEPARATOR,
     rounds: env.FIREBASE_SCRYPT_ROUNDS,
     memCost: env.FIREBASE_SCRYPT_MEM_COST,
   });
   // in login, if no bcrypt hash but a legacy scrypt hash exists:
   if (await scrypt.verify(password, legacy.salt, legacy.hash)) {
     await prisma.user.update({ where: { id: user.id },
       data: { passwordHash: await hashPassword(password) } });
     // …issue tokens as normal
   }
   ```

### Simpler alternative: password-reset flow
Import users with `passwordHash = null` and rely on the existing
`PasswordResetToken` flow / "forgot password" so users set a new password on
first return. No code change, but it asks users to reset.

### Admins
Admin login uses bcrypt with a NOT-NULL hash. If a Firestore admin has no
bcrypt-shaped hash, the tool stores a locked sentinel and logs it — those admins
must use the senior-code signup / reset path. Admins with a real `$2…` bcrypt
hash migrate as-is.

---

## Rollback

Reverses the migration by truncating the migrated tables in one transaction.
**Firestore is never touched.** Guarded so it can't fire by accident:

```bash
ROLLBACK_CONFIRM=DELETE_ALL_MIGRATED pnpm --filter migrate rollback
```

Intended for migrating into a **fresh** Postgres (clean reset → re-run). If the
target also holds non-migrated production rows, prefer a point-in-time DB
restore instead.

---

## Storage / images

Product/banner/avatar images are already Cloudinary (or absolute) URLs stored as
strings — they migrate verbatim, so no file copy is needed. The `smoke` step and
the discovery report surface the URLs; to actively verify each one resolves
(HEAD 200), extend `src/api-smoke.ts` with a URL-reachability pass over
`product.images` if you want a broken-link report.

---

## Notes / limits

- This tool requires **live credentials** for your Firebase project and Postgres
  — it cannot be exercised without them. The final PASS/FAIL numbers come from
  *your* run; the tool produces them deterministically.
- `count()` aggregates are used for Firestore totals (cheap, exact).
- Re-runs are safe and incremental thanks to id-keyed upserts.

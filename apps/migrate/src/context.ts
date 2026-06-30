/**
 * Shared lookup context used by transformers to preserve relationships:
 *  - category slug -> categoryId (so product.category strings resolve to FKs)
 *  - sets of known user / product / admin ids (so we can decide whether a
 *    foreign key resolves or must be nulled / the row skipped).
 *
 * Ids are the ORIGINAL Firestore document ids / Firebase Auth UIDs. We reuse
 * them verbatim as Postgres primary keys, which is what makes the migration
 * idempotent (re-runnable via upsert) and keeps every relationship intact
 * without a translation table.
 */
export interface Context {
  categoryIdBySlug: Map<string, string>;
  userIds: Set<string>;
  productIds: Set<string>;
  adminIds: Set<string>;
}

export function emptyContext(): Context {
  return {
    categoryIdBySlug: new Map(),
    userIds: new Set(),
    productIds: new Set(),
    adminIds: new Set(),
  };
}

/** Stable slug used to key categories by name (mirrors the old app's behaviour). */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

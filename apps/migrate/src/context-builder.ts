/**
 * Builds the lookup Context up-front from Firestore + Firebase Auth, using
 * cheap projected reads (ids/select only). This lets transformers resolve
 * foreign keys deterministically and lets us synthesise any Category that
 * products reference by name but that is missing from the `categories`
 * collection — so no product ever loses its category.
 */
import { firestore, firebaseAuth } from "./lib/firebase.js";
import { log } from "./lib/logger.js";
import { emptyContext, slugify, type Context } from "./context.js";
import { toStr, pick } from "./lib/coerce.js";

export interface BuiltContext {
  ctx: Context;
  /** categories referenced by products but absent from the categories collection */
  syntheticCategories: { id: string; name: string; slug: string }[];
}

const COLLECTIONS = {
  categories: "categories",
  products: "products",
  users: "users",
  admins: "admins",
};

export async function buildContext(): Promise<BuiltContext> {
  const ctx = emptyContext();
  const db = firestore();
  

  // --- categories collection -> slug map ---
  const catSnap = await db.collection(COLLECTIONS.categories).get();
  for (const d of catSnap.docs) {
    const data = d.data();
    const slug = toStr(pick(data, "slug")) ?? slugify(toStr(pick(data, "name")) ?? d.id);
    if (slug) ctx.categoryIdBySlug.set(slug, d.id);
  }
  log.info(`Context: ${ctx.categoryIdBySlug.size} categories from collection`);

  // --- products: ids + synthesise missing categories ---
  const synthetic = new Map<string, { id: string; name: string; slug: string }>();
  const prodSnap = await db.collection(COLLECTIONS.products).select("category", "mode").get();
  for (const d of prodSnap.docs) {
    const data = d.data();
    const mode = (toStr(data.mode) ?? "retail").toLowerCase();
    if (mode !== "wholesale") ctx.productIds.add(d.id);
    const catName = toStr(data.category);
    if (catName) {
      const slug = slugify(catName);
      if (slug && !ctx.categoryIdBySlug.has(slug) && !synthetic.has(slug)) {
        const id = `cat_${slug}`;
        synthetic.set(slug, { id, name: catName, slug });
        ctx.categoryIdBySlug.set(slug, id);
      }
    }
  }
  log.info(
    `Context: ${ctx.productIds.size} retail product ids; ${synthetic.size} synthetic categories`,
  );

  // --- users (Firestore docs) ---
  // Pull email too so we can build the email -> userId bridge (used to relink
  // pre-Firebase-auth orders by email). First writer wins for an email so a
  // Firestore profile id is preferred and the map stays stable across re-runs.
  const userSnap = await db.collection(COLLECTIONS.users).select("email").get();
  userSnap.docs.forEach((d) => {
    ctx.userIds.add(d.id);
    const email = toStr(pick(d.data(), "email"))?.toLowerCase();
    if (email && !ctx.userIdByEmail.has(email)) ctx.userIdByEmail.set(email, d.id);
  });

  // --- users (Firebase Auth UIDs) ---
  let authCount = 0;
  let pageToken: string | undefined;
  do {
    const res = await firebaseAuth().listUsers(1000, pageToken);
    res.users.forEach((u) => {
      ctx.userIds.add(u.uid);
      const email = u.email?.toLowerCase();
      if (email && !ctx.userIdByEmail.has(email)) ctx.userIdByEmail.set(email, u.uid);
    });
    authCount += res.users.length;
    pageToken = res.pageToken;
  } while (pageToken);
  log.info(
    `Context: ${ctx.userIds.size} user ids (${authCount} from Auth); ${ctx.userIdByEmail.size} email->id`,
  );

  // --- admins ---
  const adminSnap = await db.collection(COLLECTIONS.admins).select().get();
  adminSnap.docs.forEach((d) => ctx.adminIds.add(d.id));
  log.info(`Context: ${ctx.adminIds.size} admin ids`);

  return { ctx, syntheticCategories: [...synthetic.values()] };
}

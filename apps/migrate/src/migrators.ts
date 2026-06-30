/**
 * Per-collection transformers and the migrator registry.
 *
 * Each migrator turns a batch of Firestore docs into a set of Prisma upsert
 * operations. Design rules honoured throughout:
 *  - The Firestore doc id is reused as the Postgres primary key (idempotent,
 *    preserves relationships, dedupes on re-run).
 *  - upsert (not create) -> re-running never duplicates.
 *  - Foreign keys are resolved against the prebuilt Context; required FKs that
 *    don't resolve cause the row to be SKIPPED and recorded (never a dangling
 *    insert); optional FKs that don't resolve are set to null.
 *  - Transforms are total: a malformed field degrades to a fallback, it never
 *    throws.
 */
import { prisma } from "@nuru/db";
import {
  Prisma,
  OrderStatus,
  PaymentStatus,
  ReviewStatus,
  WalletTxType,
  WalletTxSource,
  WalletTxStatus,
  RedemptionStatus,
  NotificationRecipientType,
  MessageSenderType,
  VendorApplicationStatus,
  AdminRole,
  AdminInviteStatus,
} from "@nuru/db";
import type { BatchDoc } from "./lib/reader.js";
import type { Context } from "./context.js";
import { slugify } from "./context.js";
import type { Op } from "./lib/upsert.js";
import {
  pick,
  toStr,
  toStrOr,
  toDate,
  toDateOrNow,
  toDecimal,
  toDecimalOrNull,
  toInt,
  toBool,
  toStringArray,
  toJson,
  toEnum,
} from "./lib/coerce.js";

export interface BuildResult {
  ops: Op[];
  ids: string[];
  skipped: number;
}

export interface Migrator {
  /** Candidate Firestore collection names, tried in order (first existing wins). */
  collections: string[];
  /** Human label for reports (target table). */
  target: string;
  build(batch: BatchDoc[], ctx: Context): BuildResult;
}

const empty = (): BuildResult => ({ ops: [], ids: [], skipped: 0 });

/**
 * Ensures slugs stay globally unique (the `slug` columns are UNIQUE). Two
 * Firestore docs can yield the same slug; the owner keeps it, others get a
 * deterministic id-based suffix so every row still inserts. The owner map can be
 * SEEDED from the existing DB rows so re-runs respect slugs already assigned to
 * a given id (otherwise a re-run could try to give id A a slug the DB already
 * tied to id B). Category/product FKs use the id, not the slug, so suffixing a
 * slug never breaks a relationship.
 */
function makeSlugDeduper() {
  const owner = new Map<string, string>(); // slug -> id that owns it
  return {
    seed(rows: { id: string; slug: string | null }[]) {
      for (const r of rows) if (r.slug) owner.set(r.slug, r.id);
    },
    pick(slug: string | null, id: string): string | null {
      if (!slug) return slug;
      const cur = owner.get(slug);
      if (!cur || cur === id) {
        owner.set(slug, id);
        return slug;
      }
      const base = `${slug}-${id.slice(0, 8).toLowerCase()}`;
      let final = base;
      let n = 1;
      while (owner.has(final) && owner.get(final) !== id) final = `${base}-${n++}`;
      owner.set(final, id);
      return final;
    },
  };
}
export const dedupeCategorySlug = makeSlugDeduper();
export const dedupeProductSlug = makeSlugDeduper();
export const dedupeWholesaleSlug = makeSlugDeduper();

/** Seed all slug dedupers from current DB state so re-runs stay consistent. */
export async function seedSlugDedupers(): Promise<void> {
  const [cats, prods, whs] = await Promise.all([
    prisma.category.findMany({ select: { id: true, slug: true } }),
    prisma.product.findMany({ select: { id: true, slug: true } }),
    prisma.wholesaleItem.findMany({ select: { id: true, slug: true } }),
  ]);
  dedupeCategorySlug.seed(cats);
  dedupeProductSlug.seed(prods);
  dedupeWholesaleSlug.seed(whs);
}

// ============================================================
// Categories
// ============================================================
export const categoriesMigrator: Migrator = {
  collections: ["categories"],
  target: "categories",
  build(batch) {
    const res = empty();
    for (const d of batch) {
      const name = toStrOr(pick(d.data, "name", "title"), "Unnamed");
      const rawSlug = toStr(pick(d.data, "slug")) ?? (slugify(name) || d.id);
      const slug = dedupeCategorySlug.pick(rawSlug, d.id)!;
      const data = {
        name,
        slug,
        icon: toStr(pick(d.data, "icon")) ?? null,
        description: toStr(pick(d.data, "description")) ?? null,
        sortOrder: toInt(pick(d.data, "sortOrder", "order"), 0),
        createdAt: toDateOrNow(pick(d.data, "createdAt")),
        updatedAt: toDateOrNow(pick(d.data, "updatedAt", "createdAt")),
      };
      res.ops.push(
        prisma.category.upsert({ where: { id: d.id }, create: { id: d.id, ...data }, update: data }),
      );
      res.ids.push(d.id);
    }
    return res;
  },
};

// ============================================================
// Products  (mode:"wholesale" -> wholesale_items, else products)
// ============================================================
export const productsMigrator: Migrator = {
  collections: ["products"],
  target: "products + wholesale_items",
  build(batch, ctx) {
    const res = empty();
    for (const d of batch) {
      const mode = (toStr(d.data.mode) ?? "retail").toLowerCase();
      const name = toStrOr(pick(d.data, "name", "title"), "Untitled");
      const images = toStringArray(pick(d.data, "images", "imageUrls")).slice(0, 3);
      const single = toStr(pick(d.data, "imageUrl", "coverImage"));
      if (images.length === 0 && single) images.push(single);

      if (mode === "wholesale") {
        const data = {
          name,
          slug: dedupeWholesaleSlug.pick(toStr(pick(d.data, "slug")) ?? null, d.id),
          description: toStr(pick(d.data, "description")) ?? null,
          unitPrice: toDecimal(pick(d.data, "wholesalePrice", "unitPrice", "price")),
          minQuantity: toInt(pick(d.data, "wholesaleMinQty", "minQuantity"), 1),
          images,
          isActive: toBool(pick(d.data, "isActive"), true),
          createdAt: toDateOrNow(pick(d.data, "createdAt")),
          updatedAt: toDateOrNow(pick(d.data, "updatedAt", "createdAt")),
        };
        res.ops.push(
          prisma.wholesaleItem.upsert({
            where: { id: d.id },
            create: { id: d.id, ...data },
            update: data,
          }),
        );
        res.ids.push(d.id);
        continue;
      }

      // Retail product
      const catName = toStr(d.data.category);
      const categoryId = catName ? ctx.categoryIdBySlug.get(slugify(catName)) ?? null : null;
      const createdBy = toStr(pick(d.data, "createdBy", "createdById"));
      const data = {
        name,
        slug: dedupeProductSlug.pick(toStr(pick(d.data, "slug")) ?? null, d.id),
        description: toStr(pick(d.data, "description")) ?? null,
        shortDescription: toStr(pick(d.data, "shortDescription")) ?? null,
        price: toDecimal(pick(d.data, "price")),
        originalPrice: toDecimalOrNull(pick(d.data, "originalPrice")),
        sellingPrice: toDecimalOrNull(pick(d.data, "sellingPrice")),
        images,
        stock: toInt(pick(d.data, "stock", "quantity"), 0),
        isActive: toBool(pick(d.data, "isActive"), true),
        isFeatured: toBool(pick(d.data, "isFeatured", "featured"), false),
        categoryId,
        createdById: createdBy && ctx.adminIds.has(createdBy) ? createdBy : null,
        createdAt: toDateOrNow(pick(d.data, "createdAt")),
        updatedAt: toDateOrNow(pick(d.data, "updatedAt", "createdAt")),
      };
      res.ops.push(
        prisma.product.upsert({ where: { id: d.id }, create: { id: d.id, ...data }, update: data }),
      );
      res.ids.push(d.id);
    }
    return res;
  },
};

// ============================================================
// Users (Firestore profile docs; Auth users handled separately in auth.ts)
// ============================================================
export const usersMigrator: Migrator = {
  collections: ["users"],
  target: "users",
  build(batch, ctx) {
    const res = empty();
    for (const d of batch) {
      // Email is a required unique column. Auth users already exist (created by
      // auth.ts); a profile doc with no email gets a stable placeholder so the
      // user is never lost and remains a valid FK target (messages, reviews…).
      const email =
        toStr(pick(d.data, "email"))?.toLowerCase() ||
        `migrated+${d.id}@no-email.nurushop.local`;
      const referredByRaw = toStr(pick(d.data, "referredById", "referredBy"));
      const referredById =
        referredByRaw && referredByRaw !== d.id && ctx.userIds.has(referredByRaw)
          ? referredByRaw
          : null;
      const create = {
        id: d.id,
        email,
        name: toStr(pick(d.data, "name", "fullName", "displayName")) ?? null,
        phone: toStr(pick(d.data, "phone", "phoneNumber")) ?? null,
        address: toStr(pick(d.data, "address")) ?? null,
        avatarUrl: toStr(pick(d.data, "avatarUrl", "photoURL", "photoUrl")) ?? null,
        emailVerified: toDate(pick(d.data, "emailVerified")) ?? null,
        isActive: toBool(pick(d.data, "isActive"), true),
        walletBalance: toDecimal(pick(d.data, "walletBalance"), 0),
        referralCode: toStr(pick(d.data, "referralCode")) ?? null,
        referredById,
        createdAt: toDateOrNow(pick(d.data, "createdAt")),
        updatedAt: toDateOrNow(pick(d.data, "updatedAt", "lastLogin", "createdAt")),
      };
      // On update we DON'T clobber a non-null passwordHash that auth.ts set.
      // We also avoid overwriting a real Auth email with our placeholder.
      const docHadEmail = Boolean(toStr(pick(d.data, "email")));
      const { id: _id, email: _email, ...rest } = create;
      const update = docHadEmail ? { email, ...rest } : rest;
      res.ops.push(prisma.user.upsert({ where: { id: d.id }, create, update }));
      res.ids.push(d.id);
    }
    return res;
  },
};

// ============================================================
// Orders (+ embedded items -> order_items)
// ============================================================
export const ordersMigrator: Migrator = {
  collections: ["orders"],
  target: "orders + order_items",
  build(batch, ctx) {
    const res = empty();
    const statusAlias: Record<string, OrderStatus> = {
      pending: OrderStatus.PENDING,
      confirmed: OrderStatus.CONFIRMED,
      processing: OrderStatus.PROCESSING,
      shipped: OrderStatus.SHIPPED,
      received: OrderStatus.DELIVERED,
      delivered: OrderStatus.DELIVERED,
      completed: OrderStatus.DELIVERED,
      cancelled: OrderStatus.CANCELLED,
      canceled: OrderStatus.CANCELLED,
      refunded: OrderStatus.REFUNDED,
    };
    for (const d of batch) {
      // The legacy data named the buyer inconsistently across order docs; check
      // the known aliases (mirrors the reviews/wallet migrators) so a migrated
      // order still links to its owner and shows up in their "my orders".
      const userId = toStr(pick(d.data, "userId", "uid", "customerId", "buyerId", "userUID"));
      const orderEmail = toStr(pick(d.data, "email", "contactEmail", "userEmail"))?.toLowerCase();
      // Direct id match first; otherwise fall back to email. Orders placed under
      // the shop's previous Clerk auth carry ids like `user_xxx` that don't map
      // to any Firebase uid, so without the email bridge those buyers would
      // never see their order history.
      const resolvedUser =
        userId && ctx.userIds.has(userId)
          ? userId
          : (orderEmail && ctx.userIdByEmail.get(orderEmail)) || null;

      const items = Array.isArray(d.data.items) ? (d.data.items as Record<string, unknown>[]) : [];
      let computedSubtotal = 0;
      const itemOps: { id: string; data: Prisma.OrderItemCreateInput | unknown }[] = [];

      const total = (() => {
        const t = pick(d.data, "totalAmount", "total");
        return t == null ? undefined : Number(t);
      })();

      const status = toEnum(
        pick(d.data, "status"),
        Object.values(OrderStatus) as OrderStatus[],
        OrderStatus.PENDING,
        statusAlias,
      );
      const addressParts = [
        toStr(pick(d.data, "locality")),
        toStr(pick(d.data, "county")),
        toStr(pick(d.data, "country")),
      ].filter(Boolean);
      const address =
        toStr(pick(d.data, "address")) ?? (addressParts.length ? addressParts.join(", ") : null);

      const orderData = {
        orderNumber: toStr(pick(d.data, "orderNumber")) ?? d.id,
        userId: resolvedUser,
        status,
        paymentStatus: toEnum(
          pick(d.data, "paymentStatus"),
          Object.values(PaymentStatus) as PaymentStatus[],
          status === OrderStatus.DELIVERED ? PaymentStatus.PAID : PaymentStatus.UNPAID,
          { paid: PaymentStatus.PAID, unpaid: PaymentStatus.UNPAID, refunded: PaymentStatus.REFUNDED, failed: PaymentStatus.FAILED },
        ),
        contactName: toStr(pick(d.data, "name", "contactName")) ?? null,
        contactPhone: toStr(pick(d.data, "phone", "contactPhone")) ?? null,
        contactEmail: toStr(pick(d.data, "email", "contactEmail")) ?? null,
        address,
        note: toStr(pick(d.data, "note", "cancellationReason")) ?? null,
        walletApplied: toDecimal(pick(d.data, "walletApplied", "affiliateAmount"), 0),
        createdAt: toDateOrNow(pick(d.data, "createdAt")),
        updatedAt: toDateOrNow(pick(d.data, "updatedAt", "createdAt")),
      };

      // Build item rows + compute subtotal from line items when total absent.
      const itemRows = items.map((it, i) => {
        const unit = Number(pick(it, "price", "unitPrice") ?? 0) || 0;
        const qty = toInt(pick(it, "quantity", "qty"), 1);
        computedSubtotal += unit * qty;
        const productId = toStr(pick(it, "productId", "id"));
        return {
          id: `${d.id}__item_${i}`,
          orderId: d.id,
          productId: productId && ctx.productIds.has(productId) ? productId : null,
          productName: toStrOr(pick(it, "name", "productName"), "Item"),
          unitPrice: toDecimal(unit),
          quantity: qty,
          imageUrl: toStr(pick(it, "image", "imageUrl")) ?? null,
        };
      });
      void itemOps;

      const subtotal = total ?? computedSubtotal;
      res.ops.push(
        prisma.order.upsert({
          where: { id: d.id },
          create: {
            id: d.id,
            ...orderData,
            subtotal: toDecimal(subtotal),
            total: toDecimal(total ?? subtotal),
          },
          update: {
            ...orderData,
            subtotal: toDecimal(subtotal),
            total: toDecimal(total ?? subtotal),
          },
        }),
      );
      res.ids.push(d.id);

      for (const row of itemRows) {
        const { id, ...rest } = row;
        res.ops.push(
          prisma.orderItem.upsert({ where: { id }, create: { id, ...rest }, update: rest }),
        );
      }
    }
    return res;
  },
};

// ============================================================
// Reviews (userId + productId both required)
// ============================================================
export const reviewsMigrator: Migrator = {
  collections: ["reviews"],
  target: "reviews",
  build(batch, ctx) {
    const res = empty();
    for (const d of batch) {
      const userId = toStr(pick(d.data, "userId", "uid"));
      const productId = toStr(pick(d.data, "productId"));
      if (!userId || !ctx.userIds.has(userId) || !productId || !ctx.productIds.has(productId)) {
        res.skipped++;
        continue;
      }
      const data = {
        userId,
        productId,
        rating: Math.min(5, Math.max(1, toInt(pick(d.data, "rating", "stars"), 5))),
        comment: toStr(pick(d.data, "comment", "text", "review")) ?? null,
        status: toEnum(
          pick(d.data, "status"),
          Object.values(ReviewStatus) as ReviewStatus[],
          ReviewStatus.APPROVED,
          { approved: ReviewStatus.APPROVED, pending: ReviewStatus.PENDING, rejected: ReviewStatus.REJECTED },
        ),
        createdAt: toDateOrNow(pick(d.data, "createdAt")),
        updatedAt: toDateOrNow(pick(d.data, "updatedAt", "createdAt")),
      };
      res.ops.push(prisma.review.upsert({ where: { id: d.id }, create: { id: d.id, ...data }, update: data }));
      res.ids.push(d.id);
    }
    return res;
  },
};

// ============================================================
// Wallet transactions (userId required)
// ============================================================
export const walletTxMigrator: Migrator = {
  collections: ["wallet_transactions"],
  target: "wallet_transactions",
  build(batch, ctx) {
    const res = empty();
    for (const d of batch) {
      const userId = toStr(pick(d.data, "userId", "uid"));
      if (!userId || !ctx.userIds.has(userId)) {
        res.skipped++;
        continue;
      }
      const amount = toDecimal(pick(d.data, "amount"));
      const type = toEnum(
        pick(d.data, "type"),
        Object.values(WalletTxType) as WalletTxType[],
        Number(pick(d.data, "amount") ?? 0) < 0 ? WalletTxType.DEBIT : WalletTxType.CREDIT,
        { credit: WalletTxType.CREDIT, debit: WalletTxType.DEBIT, earn: WalletTxType.CREDIT, redeem: WalletTxType.DEBIT },
      );
      const data = {
        userId,
        type,
        source: toEnum(
          pick(d.data, "source"),
          Object.values(WalletTxSource) as WalletTxSource[],
          WalletTxSource.ADJUSTMENT,
          {
            affiliate: WalletTxSource.AFFILIATE,
            referral: WalletTxSource.AFFILIATE,
            redeem: WalletTxSource.REDEEM,
            redemption: WalletTxSource.REDEEM,
            adjustment: WalletTxSource.ADJUSTMENT,
            refund: WalletTxSource.REFUND,
          },
        ),
        amount,
        balanceAfter: toDecimal(pick(d.data, "balanceAfter", "walletBalance", "balance"), 0),
        status: toEnum(
          pick(d.data, "status"),
          Object.values(WalletTxStatus) as WalletTxStatus[],
          WalletTxStatus.APPROVED,
          { approved: WalletTxStatus.APPROVED, pending: WalletTxStatus.PENDING, rejected: WalletTxStatus.REJECTED },
        ),
        orderId: toStr(pick(d.data, "orderId")) ?? null,
        redemptionId: toStr(pick(d.data, "redemptionId")) ?? null,
        metadata: toJson(pick(d.data, "metadata", "meta")) ?? Prisma.JsonNull,
        createdAt: toDateOrNow(pick(d.data, "createdAt")),
      };
      res.ops.push(
        prisma.walletTransaction.upsert({ where: { id: d.id }, create: { id: d.id, ...data }, update: data }),
      );
      res.ids.push(d.id);
    }
    return res;
  },
};

// ============================================================
// Wallet redemptions (userId required)
// ============================================================
export const redemptionsMigrator: Migrator = {
  collections: ["wallet_redemptions"],
  target: "wallet_redemptions",
  build(batch, ctx) {
    const res = empty();
    for (const d of batch) {
      const userId = toStr(pick(d.data, "userId", "uid"));
      if (!userId || !ctx.userIds.has(userId)) {
        res.skipped++;
        continue;
      }
      const data = {
        userId,
        amount: toDecimal(pick(d.data, "amount")),
        status: toEnum(
          pick(d.data, "status"),
          Object.values(RedemptionStatus) as RedemptionStatus[],
          RedemptionStatus.PENDING,
          {
            pending: RedemptionStatus.PENDING,
            approved: RedemptionStatus.APPROVED,
            rejected: RedemptionStatus.REJECTED,
            paid: RedemptionStatus.PAID,
          },
        ),
        method: toStr(pick(d.data, "method")) ?? null,
        details:
          toJson(pick(d.data, "details", "bankDetails")) ?? Prisma.JsonNull,
        createdAt: toDateOrNow(pick(d.data, "createdAt")),
        updatedAt: toDateOrNow(pick(d.data, "updatedAt", "createdAt")),
      };
      res.ops.push(
        prisma.walletRedemption.upsert({ where: { id: d.id }, create: { id: d.id, ...data }, update: data }),
      );
      res.ids.push(d.id);
    }
    return res;
  },
};

// ============================================================
// Notifications (recipientId optional)
// ============================================================
export const notificationsMigrator: Migrator = {
  collections: ["notifications"],
  target: "notifications",
  build(batch, ctx) {
    const res = empty();
    for (const d of batch) {
      const recipientId = toStr(pick(d.data, "recipientId", "userId"));
      const recipientType = toEnum(
        pick(d.data, "recipientType"),
        Object.values(NotificationRecipientType) as NotificationRecipientType[],
        recipientId && ctx.adminIds.has(recipientId)
          ? NotificationRecipientType.ADMIN
          : NotificationRecipientType.USER,
        { user: NotificationRecipientType.USER, admin: NotificationRecipientType.ADMIN },
      );
      const data = {
        recipientType,
        recipientId: recipientId ?? null,
        title: toStrOr(pick(d.data, "title"), "Notification"),
        body: toStr(pick(d.data, "body", "message")) ?? null,
        type: toStr(pick(d.data, "type")) ?? null,
        relatedId: toStr(pick(d.data, "relatedId", "orderId", "messageId")) ?? null,
        read: toBool(pick(d.data, "read"), false),
        createdAt: toDateOrNow(pick(d.data, "createdAt")),
      };
      res.ops.push(
        prisma.notification.upsert({ where: { id: d.id }, create: { id: d.id, ...data }, update: data }),
      );
      res.ids.push(d.id);
    }
    return res;
  },
};

// ============================================================
// Messages (threadId required; senderUserId optional FK)
// ============================================================
export const messagesMigrator: Migrator = {
  collections: ["messages"],
  target: "messages",
  build(batch, ctx) {
    const res = empty();
    for (const d of batch) {
      const senderRaw = toStr(pick(d.data, "senderUserId", "senderId"));
      const participants = toStringArray(pick(d.data, "participantIds", "participants"));
      const isAdmin = toBool(pick(d.data, "isAdmin"), false);
      const senderType = toEnum(
        pick(d.data, "senderType"),
        Object.values(MessageSenderType) as MessageSenderType[],
        isAdmin ? MessageSenderType.ADMIN : MessageSenderType.USER,
        { user: MessageSenderType.USER, admin: MessageSenderType.ADMIN },
      );
      // Thread is keyed by the customer's userId in the new model. Prefer an
      // explicit threadId; otherwise the non-admin participant; else the sender.
      const threadId =
        toStr(pick(d.data, "threadId")) ??
        participants.find((p) => p !== senderRaw) ??
        (senderType === MessageSenderType.USER ? senderRaw : participants[0]) ??
        senderRaw ??
        d.id;

      const senderUserId =
        senderType === MessageSenderType.USER && senderRaw && ctx.userIds.has(senderRaw)
          ? senderRaw
          : null;
      const data = {
        threadId: threadId!,
        senderType,
        senderUserId,
        senderAdminId:
          senderType === MessageSenderType.ADMIN ? senderRaw ?? null : null,
        body: toStrOr(pick(d.data, "body", "content", "text", "message"), ""),
        attachments: toStringArray(pick(d.data, "attachments")),
        read: toBool(pick(d.data, "read"), false) || toDate(pick(d.data, "readAt")) != null,
        createdAt: toDateOrNow(pick(d.data, "createdAt")),
      };
      res.ops.push(
        prisma.message.upsert({ where: { id: d.id }, create: { id: d.id, ...data }, update: data }),
      );
      res.ids.push(d.id);
    }
    return res;
  },
};

// ============================================================
// Contacts
// ============================================================
export const contactsMigrator: Migrator = {
  collections: ["contacts"],
  target: "contacts",
  build(batch) {
    const res = empty();
    for (const d of batch) {
      const data = {
        name: toStrOr(pick(d.data, "name"), "Anonymous"),
        email: toStr(pick(d.data, "email")) ?? null,
        phone: toStr(pick(d.data, "phone")) ?? null,
        subject: toStr(pick(d.data, "subject")) ?? null,
        message: toStrOr(pick(d.data, "message", "body"), ""),
        handled: toBool(pick(d.data, "handled", "read"), false),
        createdAt: toDateOrNow(pick(d.data, "createdAt")),
      };
      res.ops.push(
        prisma.contact.upsert({ where: { id: d.id }, create: { id: d.id, ...data }, update: data }),
      );
      res.ids.push(d.id);
    }
    return res;
  },
};

// ============================================================
// Vendor applications. Two distinct Firestore collections both map here:
//   - `vendorApplications` (the apply form)
//   - `vendors` (approved/onboarded vendors)
// Ids are prefixed when merging `vendors` so the two never collide.
// ============================================================
function buildVendor(batch: BatchDoc[], ctx: Context, idPrefix = ""): BuildResult {
  const res = empty();
  for (const d of batch) {
    const id = idPrefix ? `${idPrefix}${d.id}` : d.id;
    const userId = toStr(pick(d.data, "userId", "uid"));
    // Rich vendor docs carry extras (businessType/category/location/products)
    // that the lean schema folds into the free-text description.
    const extra: string[] = [];
    const bt = toStr(pick(d.data, "businessType"));
    const cat = toStr(pick(d.data, "category"));
    const denom = toStr(pick(d.data, "denomination"));
    if (bt) extra.push(`Type: ${bt}`);
    if (cat) extra.push(`Category: ${cat}`);
    if (denom) extra.push(`Denomination: ${denom}`);
    const baseDesc = toStr(pick(d.data, "description", "about", "details"));
    const description =
      [baseDesc, extra.length ? extra.join(" | ") : null].filter(Boolean).join(" — ") || null;

    const approved = pick(d.data, "approvedAt") != null;
    const data = {
      userId: userId && ctx.userIds.has(userId) ? userId : null,
      businessName: toStrOr(pick(d.data, "businessName", "business", "name", "shopName"), "Unknown"),
      contactName: toStr(pick(d.data, "contactName", "ownerName", "name")) ?? null,
      email: toStrOr(pick(d.data, "email"), "unknown@example.com"),
      phone: toStr(pick(d.data, "phone")) ?? null,
      description,
      status: toEnum(
        pick(d.data, "status"),
        Object.values(VendorApplicationStatus) as VendorApplicationStatus[],
        approved ? VendorApplicationStatus.APPROVED : VendorApplicationStatus.PENDING,
        { pending: VendorApplicationStatus.PENDING, approved: VendorApplicationStatus.APPROVED, rejected: VendorApplicationStatus.REJECTED },
      ),
      createdAt: toDateOrNow(pick(d.data, "createdAt", "joinedAt")),
      updatedAt: toDateOrNow(pick(d.data, "updatedAt", "approvedAt", "createdAt")),
    };
    res.ops.push(
      prisma.vendorApplication.upsert({ where: { id }, create: { id, ...data }, update: data }),
    );
    res.ids.push(id);
  }
  return res;
}

export const vendorApplicationsMigrator: Migrator = {
  collections: ["vendorApplications"],
  target: "vendor_applications (applications)",
  build: (batch, ctx) => buildVendor(batch, ctx),
};

export const vendorsMigrator: Migrator = {
  collections: ["vendors"],
  target: "vendor_applications (vendors)",
  build: (batch, ctx) => buildVendor(batch, ctx, "vendor_"),
};

// ============================================================
// Admin invites. Old invites are imported but forced to EXPIRED so a stale
// token can never be used. tokenHash is required+unique; synthesise a unique
// non-usable value when the original isn't present.
// ============================================================
export const adminInvitesMigrator: Migrator = {
  collections: ["admin_invites"],
  target: "admin_invites",
  build(batch, ctx) {
    const res = empty();
    for (const d of batch) {
      const createdBy = toStr(pick(d.data, "createdById", "createdBy"));
      const data = {
        email: toStrOr(pick(d.data, "email"), "unknown@migrated.local").toLowerCase(),
        role: toEnum(pick(d.data, "role"), Object.values(AdminRole) as AdminRole[], AdminRole.SUB, {
          senior: AdminRole.SENIOR,
          sub: AdminRole.SUB,
        }),
        tokenHash: toStr(pick(d.data, "tokenHash")) ?? `migrated:${d.id}`,
        status: AdminInviteStatus.EXPIRED,
        createdById: createdBy && ctx.adminIds.has(createdBy) ? createdBy : null,
        expiresAt: toDateOrNow(pick(d.data, "expiresAt")),
        acceptedAt: toDate(pick(d.data, "acceptedAt")) ?? null,
        createdAt: toDateOrNow(pick(d.data, "createdAt")),
      };
      res.ops.push(
        prisma.adminInvite.upsert({ where: { id: d.id }, create: { id: d.id, ...data }, update: data }),
      );
      res.ids.push(d.id);
    }
    return res;
  },
};

// ============================================================
// Admin login attempts (brute-force counters). Imported defensively: a lockout
// is only carried over if it is still in the future, so stale data can never
// lock a real admin out. Identifier is prefixed "admin:" to match the API's
// admin lockout key and avoid colliding with user login attempts.
// ============================================================
export const adminLoginAttemptsMigrator: Migrator = {
  collections: ["admin_login_attempts"],
  target: "login_attempts",
  build(batch) {
    const res = empty();
    const now = Date.now();
    for (const d of batch) {
      const identifier = `admin:${toStr(pick(d.data, "identifier", "email")) ?? d.id}`.toLowerCase();
      const lockedMs = toInt(pick(d.data, "lockedUntilMs"), 0);
      const data = {
        identifier,
        failedCount: toInt(pick(d.data, "failedAttempts", "failedCount"), 0),
        lockedUntil: lockedMs > now ? new Date(lockedMs) : null,
        lastAttemptAt: toDateOrNow(pick(d.data, "lastFailedAt", "updatedAt")),
      };
      // identifier is the unique key; upsert on it (id is cuid, so key by identifier).
      res.ops.push(
        prisma.loginAttempt.upsert({
          where: { identifier },
          create: data,
          update: data,
        }),
      );
      res.ids.push(identifier);
    }
    return res;
  },
};

// ============================================================
// Banners
// ============================================================
export const bannersMigrator: Migrator = {
  collections: ["banners"],
  target: "banners",
  build(batch) {
    const res = empty();
    for (const d of batch) {
      const imageUrl = toStr(pick(d.data, "imageUrl", "image", "url"));
      if (!imageUrl) {
        res.skipped++;
        continue;
      }
      const data = {
        title: toStr(pick(d.data, "title")) ?? null,
        subtitle: toStr(pick(d.data, "subtitle", "shortDescription")) ?? null,
        imageUrl,
        linkUrl: toStr(pick(d.data, "linkUrl", "link")) ?? null,
        isActive: toBool(pick(d.data, "isActive"), true),
        sortOrder: toInt(pick(d.data, "sortOrder", "order"), 0),
        createdAt: toDateOrNow(pick(d.data, "createdAt")),
        updatedAt: toDateOrNow(pick(d.data, "updatedAt", "createdAt")),
      };
      res.ops.push(
        prisma.banner.upsert({ where: { id: d.id }, create: { id: d.id, ...data }, update: data }),
      );
      res.ids.push(d.id);
    }
    return res;
  },
};

// ============================================================
// Hero announcements
// ============================================================
export const heroMigrator: Migrator = {
  collections: ["hero_announcements"],
  target: "hero_announcements",
  build(batch) {
    const res = empty();
    for (const d of batch) {
      const data = {
        message: toStrOr(pick(d.data, "message", "text"), ""),
        linkUrl: toStr(pick(d.data, "linkUrl", "link")) ?? null,
        gradient: toStr(pick(d.data, "gradient")) ?? null,
        displayOrder: toInt(pick(d.data, "displayOrder", "order"), 0),
        isActive: toBool(pick(d.data, "isActive"), true),
        startsAt: toDate(pick(d.data, "startsAt")) ?? null,
        endsAt: toDate(pick(d.data, "endsAt")) ?? null,
        createdAt: toDateOrNow(pick(d.data, "createdAt")),
        updatedAt: toDateOrNow(pick(d.data, "updatedAt", "createdAt")),
      };
      res.ops.push(
        prisma.heroAnnouncement.upsert({ where: { id: d.id }, create: { id: d.id, ...data }, update: data }),
      );
      res.ids.push(d.id);
    }
    return res;
  },
};

// ============================================================
// Sabbath messages
// ============================================================
export const sabbathMigrator: Migrator = {
  collections: ["sabbathMessages", "sabbath_messages"],
  target: "sabbath_messages",
  build(batch, ctx) {
    const res = empty();
    for (const d of batch) {
      const createdById = toStr(pick(d.data, "createdById"));
      const data = {
        message: toStrOr(pick(d.data, "message", "text"), ""),
        sabbathDate:
          toStr(pick(d.data, "sabbathDate")) ??
          toDateOrNow(pick(d.data, "createdAt")).toISOString().slice(0, 10),
        createdById: createdById && ctx.adminIds.has(createdById) ? createdById : null,
        createdAt: toDateOrNow(pick(d.data, "createdAt")),
        updatedAt: toDateOrNow(pick(d.data, "updatedAt", "createdAt")),
      };
      res.ops.push(
        prisma.sabbathMessage.upsert({ where: { id: d.id }, create: { id: d.id, ...data }, update: data }),
      );
      res.ids.push(d.id);
    }
    return res;
  },
};

// ============================================================
// Admins  (passwordHash is NOT NULL; locked sentinel if none migratable)
// ============================================================
const ADMIN_RESET_SENTINEL = "!migrated:password-reset-required";

export const adminsMigrator: Migrator = {
  collections: ["admins"],
  target: "admins",
  build(batch) {
    const res = empty();
    for (const d of batch) {
      const email = toStr(pick(d.data, "email"))?.toLowerCase();
      if (!email) {
        res.skipped++;
        continue;
      }
      const hash = toStr(pick(d.data, "passwordHash", "password", "hash"));
      const data = {
        email,
        passwordHash: hash && hash.startsWith("$2") ? hash : ADMIN_RESET_SENTINEL,
        name: toStrOr(pick(d.data, "name", "fullName"), email.split("@")[0]!),
        role: toEnum(
          pick(d.data, "role"),
          Object.values(AdminRole) as AdminRole[],
          AdminRole.SUB,
          { senior: AdminRole.SENIOR, sub: AdminRole.SUB, admin: AdminRole.SUB, superadmin: AdminRole.SENIOR },
        ),
        isActive: toBool(pick(d.data, "isActive"), true),
        createdAt: toDateOrNow(pick(d.data, "createdAt")),
        updatedAt: toDateOrNow(pick(d.data, "updatedAt", "createdAt")),
      };
      res.ops.push(
        prisma.admin.upsert({ where: { id: d.id }, create: { id: d.id, ...data }, update: data }),
      );
      res.ids.push(d.id);
    }
    return res;
  },
};

// ============================================================
// Admin logs (adminId optional FK)
// ============================================================
export const adminLogsMigrator: Migrator = {
  collections: ["admin_logs"],
  target: "admin_logs",
  build(batch, ctx) {
    const res = empty();
    for (const d of batch) {
      const adminId = toStr(pick(d.data, "adminId"));
      const data = {
        adminId: adminId && ctx.adminIds.has(adminId) ? adminId : null,
        action: toStrOr(pick(d.data, "action"), "unknown"),
        entity: toStr(pick(d.data, "entity")) ?? null,
        entityId: toStr(pick(d.data, "entityId")) ?? null,
        metadata: toJson(pick(d.data, "metadata", "meta")) ?? Prisma.JsonNull,
        ip: toStr(pick(d.data, "ip", "ipAddress")) ?? null,
        createdAt: toDateOrNow(pick(d.data, "createdAt")),
      };
      res.ops.push(
        prisma.adminLog.upsert({ where: { id: d.id }, create: { id: d.id, ...data }, update: data }),
      );
      res.ids.push(d.id);
    }
    return res;
  },
};

/**
 * Pipeline order respects foreign-key dependencies:
 *  categories -> admins -> products -> (auth users handled before this) ->
 *  user docs -> orders -> reviews -> wallet -> redemptions -> notifications ->
 *  messages -> contacts -> vendors -> banners -> hero -> sabbath -> admin logs.
 */
export const PIPELINE: Migrator[] = [
  categoriesMigrator,
  adminsMigrator,
  productsMigrator,
  usersMigrator,
  ordersMigrator,
  reviewsMigrator,
  walletTxMigrator,
  redemptionsMigrator,
  notificationsMigrator,
  messagesMigrator,
  contactsMigrator,
  vendorApplicationsMigrator,
  vendorsMigrator,
  bannersMigrator,
  heroMigrator,
  sabbathMigrator,
  adminInvitesMigrator,
  adminLogsMigrator,
  adminLoginAttemptsMigrator,
];

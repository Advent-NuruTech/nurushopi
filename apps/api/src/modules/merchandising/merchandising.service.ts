import { createHash } from "node:crypto";
import { prisma, Prisma, type MerchandisingCollection, type Product } from "@nuru/db";
import type {
  CollectionCreateInput,
  CollectionMembershipInput,
  CollectionMembershipImportInput,
  CollectionMembershipDTO,
  CollectionOverrideInput,
  CollectionProductsQuery,
  CollectionUpdateInput,
  CommerceEventInput,
  CursorPage,
  HomepageDTO,
  HomepageSectionCreateInput,
  HomepageSectionReorderInput,
  HomepageSectionUpdateInput,
  MerchandisingLifecycleInput,
  MerchandisingWorkspaceCreateInput,
  MerchandisingProductDTO,
  PromotionCreateInput,
} from "@nuru/types";
import { Errors } from "../../lib/errors.js";
import { env } from "../../env.js";
import { toCollectionDTO, toMerchandisingProductDTO, type PricedProduct } from "./serializers.js";
import { decodeCursor, encodeCursor } from "./cursor.js";
import { loadEffectivePrices, selectEffectivePrice } from "./pricing.service.js";
import { assignmentsFor } from "./experiments.service.js";

const categorySelect = { select: { id: true, name: true, slug: true } } as const;
const publicProductInclude = { category: categorySelect } as const;

function inputJson(value: Record<string, unknown> | null | undefined) {
  if (value === undefined) return undefined;
  return value === null ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
}

function activeAt(now: Date): Prisma.MerchandisingCollectionWhereInput {
  return {
    status: { in: ["ACTIVE", "SCHEDULED"] },
    AND: [
      { OR: [{ startAt: null }, { startAt: { lte: now } }] },
      { OR: [{ endAt: null }, { endAt: { gt: now } }] },
    ],
  };
}

function audit(
  tx: Prisma.TransactionClient,
  adminId: string,
  action: string,
  entity: string,
  entityId: string,
  metadata?: Prisma.InputJsonValue,
) {
  return tx.adminLog.create({
    data: { adminId, action, entity, entityId, metadata },
  });
}

export async function listCollections(options: { activeOnly?: boolean } = {}) {
  const now = new Date();
  const rows = await prisma.merchandisingCollection.findMany({
    where: options.activeOnly ? activeAt(now) : undefined,
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });
  return rows.map(toCollectionDTO);
}

export async function getCollection(idOrKey: string, activeOnly = true) {
  const row = await prisma.merchandisingCollection.findFirst({
    where: {
      OR: [{ id: idOrKey }, { key: idOrKey }],
      ...(activeOnly ? activeAt(new Date()) : {}),
    },
  });
  if (!row) throw Errors.notFound("Collection not found.");
  return row;
}

export async function createCollection(input: CollectionCreateInput, adminId: string) {
  try {
    const row = await prisma.$transaction(async (tx) => {
      const created = await tx.merchandisingCollection.create({
        data: {
          ...(input as unknown as Prisma.MerchandisingCollectionUncheckedCreateInput),
          eligibilityRules: inputJson(input.eligibilityRules),
          configuration: inputJson(input.configuration),
          createdById: adminId,
        },
      });
      await audit(
        tx,
        adminId,
        "merchandising.collection.created",
        "merchandising_collection",
        created.id,
        {
          key: created.key,
        },
      );
      return created;
    });
    return toCollectionDTO(row);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw Errors.conflict("That immutable collection key already exists.");
    }
    throw error;
  }
}

export async function createMerchandisingWorkspace(
  input: MerchandisingWorkspaceCreateInput,
  adminId: string,
) {
  try {
    return await prisma.$transaction(async (tx) => {
      const collection = await tx.merchandisingCollection.create({
        data: {
          ...(input.collection as unknown as Prisma.MerchandisingCollectionUncheckedCreateInput),
          status: "DRAFT",
          eligibilityRules: inputJson(input.collection.eligibilityRules),
          configuration: inputJson(input.collection.configuration),
          createdById: adminId,
        },
      });
      const occupiedPosition = await tx.homepageSection.findFirst({
        where: { position: input.homepage.position },
        select: { id: true },
      });
      if (occupiedPosition) {
        await tx.homepageSection.updateMany({
          where: { position: { gte: input.homepage.position } },
          data: { position: { increment: 1 } },
        });
      }
      const section = await tx.homepageSection.create({
        data: {
          collectionId: collection.id,
          position: input.homepage.position,
          status: "DRAFT",
          device: input.homepage.device,
          startAt: input.collection.startAt,
          endAt: input.collection.endAt,
          configuration: inputJson(input.homepage.configuration),
        },
        include: { collection: true },
      });
      await audit(
        tx,
        adminId,
        "merchandising.workspace.created",
        "merchandising_collection",
        collection.id,
        { key: collection.key, homepageSectionId: section.id, position: section.position },
      );
      return { collection: toCollectionDTO(collection), section };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw Errors.conflict("That immutable collection key already exists.");
    }
    throw error;
  }
}

export async function changeCollectionLifecycle(
  id: string,
  input: MerchandisingLifecycleInput,
  adminId: string,
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.merchandisingCollection.findUnique({ where: { id } });
    if (!existing) throw Errors.notFound("Collection not found.");

    const changes = input.collection ?? {};
    const effectiveStart = changes.startAt === undefined ? existing.startAt : changes.startAt;
    const effectiveEnd = changes.endAt === undefined ? existing.endAt : changes.endAt;
    if (
      input.action !== "UNPUBLISH" &&
      effectiveStart &&
      effectiveEnd &&
      effectiveEnd <= effectiveStart
    ) {
      throw Errors.badRequest("Collection end time must be after its start time.");
    }
    if (input.action === "PUBLISH" && effectiveEnd && effectiveEnd <= new Date()) {
      throw Errors.badRequest("Choose a future end time before publishing this collection.");
    }

    const sectionCount = await tx.homepageSection.count({ where: { collectionId: id } });
    if (input.action === "PUBLISH" && sectionCount === 0) {
      throw Errors.badRequest("Add this collection to a homepage slot before publishing it.");
    }

    if (input.action === "PUBLISH") {
      const productCount = await tx.collectionMembership.count({
        where: { collectionId: id, product: { isActive: true, stock: { gt: 0 } } },
      });
      if (productCount === 0) {
        throw Errors.badRequest("Import at least one active, in-stock product before publishing.");
      }
    }

    const futureStart = effectiveStart && effectiveStart > new Date();
    const status =
      input.action === "SAVE_DRAFT"
        ? "DRAFT"
        : input.action === "UNPUBLISH"
          ? "PAUSED"
          : futureStart
            ? "SCHEDULED"
            : "ACTIVE";
    const collection = await tx.merchandisingCollection.update({
      where: { id },
      data: {
        ...(changes as unknown as Prisma.MerchandisingCollectionUpdateInput),
        status,
        ...(changes.eligibilityRules !== undefined
          ? { eligibilityRules: inputJson(changes.eligibilityRules) }
          : {}),
        ...(changes.configuration !== undefined
          ? { configuration: inputJson(changes.configuration) }
          : {}),
        cacheVersion: { increment: 1 },
      },
    });
    await tx.homepageSection.updateMany({
      where: { collectionId: id },
      data: {
        status,
        ...(changes.startAt !== undefined ? { startAt: changes.startAt } : {}),
        ...(changes.endAt !== undefined ? { endAt: changes.endAt } : {}),
      },
    });
    await audit(
      tx,
      adminId,
      `merchandising.collection.${input.action.toLowerCase()}`,
      "merchandising_collection",
      id,
      { immutableKey: existing.key, status, changedFields: Object.keys(changes) },
    );
    return { collection: toCollectionDTO(collection), status };
  });
}

export async function updateCollection(id: string, input: CollectionUpdateInput, adminId: string) {
  const existing = await prisma.merchandisingCollection.findUnique({ where: { id } });
  if (!existing) throw Errors.notFound("Collection not found.");

  const row = await prisma.$transaction(async (tx) => {
    const updated = await tx.merchandisingCollection.update({
      where: { id },
      data: {
        ...(input as unknown as Prisma.MerchandisingCollectionUpdateInput),
        ...(input.eligibilityRules !== undefined
          ? { eligibilityRules: inputJson(input.eligibilityRules) }
          : {}),
        ...(input.configuration !== undefined
          ? { configuration: inputJson(input.configuration) }
          : {}),
        cacheVersion: { increment: 1 },
      },
    });
    await audit(tx, adminId, "merchandising.collection.updated", "merchandising_collection", id, {
      immutableKey: existing.key,
      changedFields: Object.keys(input),
    });
    return updated;
  });
  return toCollectionDTO(row);
}

export async function upsertMembership(
  collectionId: string,
  input: CollectionMembershipInput,
  adminId: string,
) {
  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    select: { id: true },
  });
  if (!product) throw Errors.badRequest("Product does not exist.");
  return prisma.$transaction(async (tx) => {
    const rank = input.rank ?? (await nextMembershipRank(tx, collectionId));
    const membership = await tx.collectionMembership.upsert({
      where: { collectionId_productId: { collectionId, productId: input.productId } },
      create: {
        collectionId,
        ...input,
        rank,
        metadata: inputJson(input.metadata),
      } as Prisma.CollectionMembershipUncheckedCreateInput,
      update: {
        ...input,
        ...(input.rank !== undefined ? { rank } : {}),
        metadata: inputJson(input.metadata),
      } as Prisma.CollectionMembershipUpdateInput,
    });
    await tx.merchandisingCollection.update({
      where: { id: collectionId },
      data: { cacheVersion: { increment: 1 } },
    });
    await audit(
      tx,
      adminId,
      "merchandising.membership.upserted",
      "collection_membership",
      membership.id,
      {
        collectionId,
        productId: input.productId,
        source: input.source,
      },
    );
    return membership;
  });
}

async function nextMembershipRank(
  tx: Prisma.TransactionClient,
  collectionId: string,
): Promise<number> {
  const aggregate = await tx.collectionMembership.aggregate({
    where: { collectionId },
    _max: { rank: true },
  });
  return (aggregate._max.rank ?? 0) + 1;
}

export async function listMemberships(
  collectionId: string,
  vendorId?: string,
): Promise<CollectionMembershipDTO[]> {
  await getCollection(collectionId, Boolean(vendorId));
  const rows = await prisma.collectionMembership.findMany({
    where: { collectionId, ...(vendorId ? { product: { vendorId } } : {}) },
    orderBy: [{ rank: "asc" }, { createdAt: "asc" }],
    include: { product: true },
  });
  return rows.map((row) => ({
    id: row.id,
    collectionId: row.collectionId,
    productId: row.productId,
    source: row.source,
    score: row.score,
    rank: row.rank,
    startsAt: row.startsAt?.toISOString() ?? null,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    product: {
      id: row.product.id,
      name: row.product.name,
      sku: row.product.sku,
      images: row.product.images,
      stock: row.product.stock,
      isActive: row.product.isActive,
      vendorId: row.product.vendorId,
    },
  }));
}

export async function importMemberships(
  collectionId: string,
  input: CollectionMembershipImportInput,
  actor: { adminId?: string; vendorId?: string },
) {
  const collection = await getCollection(collectionId, false);
  if (actor.vendorId && !["ACTIVE", "SCHEDULED"].includes(collection.status)) {
    throw Errors.forbidden("Vendors can only add products to available collections.");
  }
  const deduplicated = [...new Map(input.items.map((item) => [item.productId, item])).values()];
  const productIds = deduplicated.map((item) => item.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, ...(actor.vendorId ? { vendorId: actor.vendorId } : {}) },
    select: { id: true },
  });
  if (products.length !== productIds.length) {
    if (actor.vendorId)
      throw Errors.forbidden("One or more products do not exist or are not owned by this vendor.");
    throw Errors.badRequest("One or more products do not exist.");
  }

  return prisma.$transaction(async (tx) => {
    let rank = await nextMembershipRank(tx, collectionId);
    for (const item of deduplicated) {
      const assignedRank = item.rank ?? rank++;
      await tx.collectionMembership.upsert({
        where: { collectionId_productId: { collectionId, productId: item.productId } },
        create: {
          collectionId,
          ...item,
          rank: assignedRank,
          metadata: inputJson(item.metadata),
        } as Prisma.CollectionMembershipUncheckedCreateInput,
        update: {
          ...item,
          ...(item.rank !== undefined ? { rank: assignedRank } : {}),
          metadata: inputJson(item.metadata),
        } as Prisma.CollectionMembershipUpdateInput,
      });
    }
    await tx.merchandisingCollection.update({
      where: { id: collectionId },
      data: { cacheVersion: { increment: 1 } },
    });
    if (actor.adminId) {
      await audit(
        tx,
        actor.adminId,
        "merchandising.memberships.imported",
        "merchandising_collection",
        collectionId,
        {
          productIds,
          immutableKey: collection.key,
        },
      );
    }
    return { imported: deduplicated.length, collectionKey: collection.key };
  });
}

export async function importCurrentProducts(
  collectionId: string,
  actor: { adminId?: string; vendorId?: string },
) {
  const collection = await getCollection(collectionId, false);
  if (actor.vendorId && !["ACTIVE", "SCHEDULED"].includes(collection.status)) {
    throw Errors.forbidden("Vendors can only add products to available collections.");
  }

  const products = await prisma.product.findMany({
    where: { isActive: true, ...(actor.vendorId ? { vendorId: actor.vendorId } : {}) },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    select: { id: true },
  });
  const existing = await prisma.collectionMembership.findMany({
    where: { collectionId },
    select: { productId: true },
  });
  const assigned = new Set(existing.map((membership) => membership.productId));
  const productIds = products.map((product) => product.id).filter((id) => !assigned.has(id));

  if (productIds.length === 0) {
    return { imported: 0, eligible: products.length, collectionKey: collection.key };
  }

  return prisma.$transaction(async (tx) => {
    let rank = await nextMembershipRank(tx, collectionId);
    let imported = 0;
    for (let offset = 0; offset < productIds.length; offset += 500) {
      const chunk = productIds.slice(offset, offset + 500);
      const result = await tx.collectionMembership.createMany({
        data: chunk.map((productId) => ({
          collectionId,
          productId,
          source: "MANUAL",
          score: 0,
          rank: rank++,
        })),
        skipDuplicates: true,
      });
      imported += result.count;
    }
    await tx.merchandisingCollection.update({
      where: { id: collectionId },
      data: { cacheVersion: { increment: 1 } },
    });
    if (actor.adminId) {
      await audit(
        tx,
        actor.adminId,
        "merchandising.current_products.imported",
        "merchandising_collection",
        collectionId,
        { imported, eligible: products.length },
      );
    }
    return {
      imported,
      eligible: products.length,
      collectionKey: collection.key,
    };
  });
}

export async function removeVendorMembership(
  collectionId: string,
  productId: string,
  vendorId: string,
): Promise<void> {
  await getCollection(collectionId, true);
  const product = await prisma.product.findFirst({
    where: { id: productId, vendorId },
    select: { id: true },
  });
  if (!product) throw Errors.notFound("Product not found.");
  await prisma.$transaction(async (tx) => {
    await tx.collectionMembership.deleteMany({ where: { collectionId, productId } });
    await tx.merchandisingCollection.update({
      where: { id: collectionId },
      data: { cacheVersion: { increment: 1 } },
    });
  });
}

export async function removeMembership(collectionId: string, productId: string, adminId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.collectionMembership.deleteMany({ where: { collectionId, productId } });
    await tx.merchandisingCollection.update({
      where: { id: collectionId },
      data: { cacheVersion: { increment: 1 } },
    });
    await audit(
      tx,
      adminId,
      "merchandising.membership.removed",
      "merchandising_collection",
      collectionId,
      {
        productId,
      },
    );
  });
}

export async function createOverride(
  collectionId: string,
  input: CollectionOverrideInput,
  adminId: string,
) {
  return prisma.$transaction(async (tx) => {
    const override = await tx.collectionOverride.create({
      data: {
        collectionId,
        ...input,
        createdById: adminId,
      } as Prisma.CollectionOverrideUncheckedCreateInput,
    });
    await tx.merchandisingCollection.update({
      where: { id: collectionId },
      data: { cacheVersion: { increment: 1 } },
    });
    await audit(tx, adminId, "merchandising.override.created", "collection_override", override.id, {
      collectionId,
      productId: input.productId,
      type: input.type,
      expiresAt: input.expiresAt?.toISOString() ?? null,
    });
    return override;
  });
}

type CandidateProduct = Product & {
  category: { id: string; name: string; slug: string } | null;
  rank: number;
  score: number;
  source: "ranking" | "membership" | "fallback";
  snapshotAt?: string;
};

function productWhere(query: CollectionProductsQuery): Prisma.ProductWhereInput {
  return {
    isActive: true,
    ...(query.inStock ? { stock: { gt: 0 } } : {}),
    ...(query.category ? { category: { slug: query.category } } : {}),
    ...(query.minPrice !== undefined || query.maxPrice !== undefined
      ? {
          price: {
            ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
            ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
          },
        }
      : {}),
  };
}

async function rankingCandidates(
  collectionId: string,
  query: CollectionProductsQuery,
): Promise<CandidateProduct[]> {
  const cursor = decodeCursor(query.cursor);
  const now = new Date();
  const latest =
    cursor?.source === "ranking" && cursor.snapshotAt
      ? { snapshotAt: new Date(cursor.snapshotAt) }
      : await prisma.productRanking.findFirst({
          where: {
            collectionId,
            segmentKey: query.segment,
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
          orderBy: { snapshotAt: "desc" },
          select: { snapshotAt: true },
        });
  if (!latest) return [];

  const rows = await prisma.productRanking.findMany({
    where: {
      collectionId,
      segmentKey: query.segment,
      snapshotAt: latest.snapshotAt,
      OR:
        cursor?.source === "ranking"
          ? [
              { rank: { gt: cursor.rank } },
              { rank: cursor.rank, productId: { gt: cursor.productId } },
            ]
          : undefined,
      product: productWhere(query),
    },
    orderBy: [{ rank: "asc" }, { productId: "asc" }],
    take: query.limit * 3 + 1,
    include: { product: { include: publicProductInclude } },
  });
  return rows.map((r) => ({
    ...r.product,
    rank: r.rank,
    score: r.score,
    source: "ranking" as const,
    snapshotAt: r.snapshotAt.toISOString(),
  }));
}

async function membershipCandidates(
  collectionId: string,
  query: CollectionProductsQuery,
): Promise<CandidateProduct[]> {
  const cursor = decodeCursor(query.cursor);
  const now = new Date();
  const rows = await prisma.collectionMembership.findMany({
    where: {
      collectionId,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        ...(cursor?.source === "membership"
          ? [
              {
                OR: [
                  { rank: { gt: cursor.rank } },
                  { rank: cursor.rank, productId: { gt: cursor.productId } },
                ],
              },
            ]
          : []),
      ],
      product: productWhere(query),
    },
    orderBy: [{ rank: { sort: "asc", nulls: "last" } }, { productId: "asc" }],
    take: query.limit * 3 + 1,
    include: { product: { include: publicProductInclude } },
  });
  return rows.map((r) => ({
    ...r.product,
    rank: r.rank ?? Number.MAX_SAFE_INTEGER,
    score: r.score,
    source: "membership" as const,
  }));
}

async function fallbackCandidates(query: CollectionProductsQuery): Promise<CandidateProduct[]> {
  const cursor = decodeCursor(query.cursor);
  const rows = await prisma.product.findMany({
    where: {
      ...productWhere(query),
      ...(cursor?.source === "fallback" ? { id: { gt: cursor.productId } } : {}),
    },
    orderBy: { id: "asc" },
    take: query.limit + 1,
    include: publicProductInclude,
  });
  return rows.map((product, index) => ({
    ...product,
    rank: (cursor?.rank ?? 0) + index + 1,
    score: 0,
    source: "fallback" as const,
  }));
}

function diversityLimit(collection: MerchandisingCollection): number {
  const config = collection.configuration;
  if (config && typeof config === "object" && !Array.isArray(config)) {
    const value = (config as Record<string, unknown>).maxPerCategory;
    if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  }
  return 4;
}

export async function listCollectionProducts(
  idOrKey: string,
  query: CollectionProductsQuery,
  context: { userId?: string; activeOnly?: boolean } = {},
): Promise<CursorPage<MerchandisingProductDTO>> {
  const collection = await getCollection(idOrKey, context.activeOnly ?? true);
  const now = new Date();
  let candidates = await rankingCandidates(collection.id, query);
  if (candidates.length === 0) candidates = await membershipCandidates(collection.id, query);
  if (candidates.length === 0) candidates = await fallbackCandidates(query);

  const rawLast = candidates[Math.min(candidates.length, query.limit) - 1];
  const hasMore = candidates.length > query.limit;
  candidates = candidates.slice(0, query.limit * 3);

  const overrides = await prisma.collectionOverride.findMany({
    where: {
      collectionId: collection.id,
      OR: [
        { productId: { in: candidates.map((c) => c.id) } },
        ...(!query.cursor ? [{ type: "PIN" as const, product: productWhere(query) }] : []),
      ],
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      ],
    },
    include: { product: { include: publicProductInclude } },
  });
  const candidateIds = new Set(candidates.map((candidate) => candidate.id));
  for (const override of overrides) {
    if (override.type !== "PIN" || candidateIds.has(override.productId)) continue;
    candidates.push({
      ...override.product,
      rank: 0,
      score: 0,
      source: "membership",
    });
    candidateIds.add(override.productId);
  }
  const excluded = new Set(overrides.filter((o) => o.type === "EXCLUDE").map((o) => o.productId));
  const adjustment = new Map<string, number>();
  const pinned = new Set<string>();
  for (const override of overrides) {
    if (override.type === "PIN") pinned.add(override.productId);
    if (override.type === "BOOST") adjustment.set(override.productId, override.value || 1000);
    if (override.type === "LOWER") adjustment.set(override.productId, -(override.value || 1000));
  }

  const affinities =
    context.userId && collection.isPersonalized
      ? await prisma.userProductAffinity.findMany({
          where: {
            userId: context.userId,
            productId: { in: candidates.map((c) => c.id) },
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
          select: { productId: true, score: true },
        })
      : [];
  const affinity = new Map(affinities.map((a) => [a.productId, a.score]));

  candidates = candidates
    .filter((c) => !excluded.has(c.id))
    .sort((a, b) => {
      const scoreA =
        (pinned.has(a.id) ? 1_000_000 : 0) +
        a.score +
        (adjustment.get(a.id) ?? 0) +
        (affinity.get(a.id) ?? 0);
      const scoreB =
        (pinned.has(b.id) ? 1_000_000 : 0) +
        b.score +
        (adjustment.get(b.id) ?? 0) +
        (affinity.get(b.id) ?? 0);
      return scoreB - scoreA || a.rank - b.rank || a.id.localeCompare(b.id);
    });

  const perCategory = new Map<string, number>();
  const diversified: CandidateProduct[] = [];
  const maxPerCategory = diversityLimit(collection);
  for (const candidate of candidates) {
    const category = candidate.categoryId ?? "uncategorized";
    const count = perCategory.get(category) ?? 0;
    if (count >= maxPerCategory) continue;
    diversified.push(candidate);
    perCategory.set(category, count + 1);
    if (diversified.length === query.limit) break;
  }

  const prices = await loadEffectivePrices(prisma, diversified);
  const items = diversified.map((product) => {
    const price = prices.get(product.id) ?? selectEffectivePrice(product, []);
    return toMerchandisingProductDTO({
      ...product,
      effectivePrice: price.effectivePrice,
      promotionId: price.promotionId,
      promotionEndsAt: price.promotionEndsAt,
      rankingScore: product.score,
      rankingSource: product.source,
    } as PricedProduct);
  });

  return {
    items,
    hasMore,
    nextCursor:
      hasMore && rawLast
        ? encodeCursor({
            rank: rawLast.rank,
            productId: rawLast.id,
            source: rawLast.source,
            ...(rawLast.source === "ranking" ? { snapshotAt: rawLast.snapshotAt } : {}),
          })
        : null,
  };
}

export async function getHomepage(context: {
  userId?: string;
  anonymousId?: string;
  device?: "all" | "desktop" | "mobile";
}): Promise<HomepageDTO> {
  const now = new Date();
  const sections = await prisma.homepageSection.findMany({
    where: {
      status: { in: ["ACTIVE", "SCHEDULED"] },
      AND: [
        { OR: [{ startAt: null }, { startAt: { lte: now } }] },
        { OR: [{ endAt: null }, { endAt: { gt: now } }] },
      ],
      device: { in: ["all", context.device ?? "all"] },
      collection: activeAt(now),
    },
    orderBy: [{ position: "asc" }, { id: "asc" }],
    include: { collection: true },
  });
  const experimentVariants = await assignmentsFor(
    sections.flatMap((section) => (section.experimentKey ? [section.experimentKey] : [])),
    { userId: context.userId, anonymousId: context.anonymousId },
  );

  const attempts = await Promise.allSettled(
    sections.map(async (section) => {
      const config =
        section.configuration && typeof section.configuration === "object"
          ? (section.configuration as Record<string, unknown>)
          : {};
      const experimentConfig = section.experimentKey
        ? (experimentVariants.get(section.experimentKey)?.configuration ?? {})
        : {};
      const mergedConfig = { ...config, ...experimentConfig };
      const limit =
        typeof mergedConfig.productLimit === "number"
          ? Math.min(Math.max(Math.trunc(mergedConfig.productLimit), 1), 100)
          : section.collection.maxProducts;
      let page;
      try {
        page = await listCollectionProducts(
          section.collection.id,
          { limit, inStock: true, segment: "global" },
          { userId: context.userId },
        );
      } catch (error) {
        if (!context.userId) throw error;
        // Personalization is optional: retry the independently-computed global
        // candidate set instead of taking down this section or the homepage.
        page = await listCollectionProducts(section.collection.id, {
          limit,
          inStock: true,
          segment: "global",
        });
      }
      return {
        id: section.id,
        position: section.position,
        device: section.device,
        configuration: mergedConfig,
        collection: toCollectionDTO(section.collection),
        products: page.items,
        nextCursor: page.nextCursor,
      };
    }),
  );
  const rendered = attempts.flatMap((attempt) =>
    attempt.status === "fulfilled" ? [attempt.value] : [],
  );

  return {
    generatedAt: now.toISOString(),
    personalization:
      context.userId && sections.some((s) => s.collection.isPersonalized) ? "user" : "global",
    experimentAssignments: Object.fromEntries(
      [...experimentVariants].map(([key, variant]) => [key, variant.key]),
    ),
    sections: rendered.filter((s) => s.products.length > 0),
  };
}

export async function listHomepageSections() {
  return prisma.homepageSection.findMany({
    orderBy: [{ position: "asc" }, { id: "asc" }],
    include: { collection: true },
  });
}

export async function createHomepageSection(input: HomepageSectionCreateInput, adminId: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.homepageSection.findFirst({
      where: { collectionId: input.collectionId },
      select: { id: true },
    });
    if (existing) throw Errors.conflict("That collection already has a homepage placement.");
    const occupiedPosition = await tx.homepageSection.findFirst({
      where: { position: input.position },
      select: { id: true },
    });
    if (occupiedPosition) {
      await tx.homepageSection.updateMany({
        where: { position: { gte: input.position } },
        data: { position: { increment: 1 } },
      });
    }
    const row = await tx.homepageSection.create({
      data: {
        ...input,
        audience: inputJson(input.audience),
        configuration: inputJson(input.configuration),
      } as Prisma.HomepageSectionUncheckedCreateInput,
      include: { collection: true },
    });
    await audit(tx, adminId, "merchandising.homepage_section.created", "homepage_section", row.id, {
      collectionId: row.collectionId,
      position: row.position,
    });
    return row;
  });
}

export async function updateHomepageSection(
  id: string,
  input: HomepageSectionUpdateInput,
  adminId: string,
) {
  return prisma.$transaction(async (tx) => {
    const row = await tx.homepageSection.update({
      where: { id },
      data: {
        ...input,
        ...(input.audience !== undefined ? { audience: inputJson(input.audience) } : {}),
        ...(input.configuration !== undefined
          ? { configuration: inputJson(input.configuration) }
          : {}),
      } as Prisma.HomepageSectionUncheckedUpdateInput,
      include: { collection: true },
    });
    await audit(tx, adminId, "merchandising.homepage_section.updated", "homepage_section", id, {
      changedFields: Object.keys(input),
    });
    return row;
  });
}

export async function reorderHomepageSections(input: HomepageSectionReorderInput, adminId: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.homepageSection.findMany({
      where: { id: { in: input.sectionIds } },
      select: { id: true },
    });
    const total = await tx.homepageSection.count();
    if (existing.length !== input.sectionIds.length || total !== input.sectionIds.length) {
      throw Errors.badRequest("The homepage order changed. Refresh before reordering it again.");
    }
    for (const [position, id] of input.sectionIds.entries()) {
      await tx.homepageSection.update({ where: { id }, data: { position } });
    }
    await audit(
      tx,
      adminId,
      "merchandising.homepage_sections.reordered",
      "homepage_layout",
      "homepage",
      { sectionIds: input.sectionIds },
    );
    return tx.homepageSection.findMany({
      orderBy: [{ position: "asc" }, { id: "asc" }],
      include: { collection: true },
    });
  });
}

export async function createPromotion(input: PromotionCreateInput, adminId: string) {
  return prisma.$transaction(async (tx) => {
    const promotion = await tx.promotion.create({
      data: {
        key: input.key,
        name: input.name,
        status: input.status,
        discountType: input.discountType,
        discountValue: input.discountValue,
        fundingType: input.fundingType,
        sellerFundingPct: input.sellerFundingPct,
        collectionId: input.collectionId,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        inventoryLimit: input.inventoryLimit,
        perCustomerLimit: input.perCustomerLimit,
        configuration: inputJson(input.configuration),
        createdById: adminId,
        products: {
          create: input.products.map((product) => ({
            productId: product.productId,
            promotionalPrice: product.promotionalPrice,
            inventoryLimit: product.inventoryLimit,
            perCustomerLimit: product.perCustomerLimit,
          })),
        },
      },
      include: { products: true },
    });
    await audit(tx, adminId, "merchandising.promotion.created", "promotion", promotion.id, {
      key: promotion.key,
      productCount: promotion.products.length,
    });
    return promotion;
  });
}

export async function ingestEvents(
  events: CommerceEventInput[],
  context: { userId?: string; ip?: string; userAgent?: string },
) {
  const now = Date.now();
  const seen = new Set<string>();
  const hash = (value?: string) =>
    value ? createHash("sha256").update(`${env.JWT_ACCESS_SECRET}:${value}`).digest("hex") : null;
  const ipHash = hash(context.ip);
  const userAgentHash = hash(context.userAgent);
  const data = events.map((event) => {
    const actor = context.userId ?? event.anonymousId ?? event.sessionId ?? ipHash ?? "unknown";
    const signature = `${actor}:${event.eventType}:${event.productId ?? ""}:${event.collectionId ?? ""}`;
    const duplicateInBatch = seen.has(signature);
    seen.add(signature);
    const clockSkew = Math.abs(now - event.timestamp.getTime());
    const protectedOutcome = ["purchase_completed", "order_cancelled", "product_returned"].includes(
      event.eventType,
    );
    const suspicious = duplicateInBatch || clockSkew > 24 * 60 * 60 * 1000 || protectedOutcome;
    return {
      eventId: event.eventId,
      eventType: event.eventType,
      userId: context.userId ?? null,
      anonymousId: event.anonymousId,
      sessionId: event.sessionId,
      productId: event.productId,
      sellerId: event.sellerId,
      collectionId: event.collectionId,
      searchQueryId: event.searchQueryId,
      recommendationId: event.recommendationId,
      experimentKey: event.experimentKey,
      variantKey: event.variantKey,
      position: event.position,
      source: event.source,
      device: event.device,
      ipHash,
      userAgentHash,
      trusted: !suspicious,
      abuseScore: suspicious ? 1 : 0,
      occurredAt: event.timestamp,
      metadata: event.metadata as Prisma.InputJsonValue | undefined,
    };
  });
  const created = await prisma.commerceEvent.createMany({ data, skipDuplicates: true });
  return { accepted: created.count, duplicates: events.length - created.count };
}

export async function collectionAnalytics(collectionId: string, days = 30) {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - Math.min(Math.max(days, 1), 365));
  const totals = await prisma.collectionMetricDaily.aggregate({
    where: { collectionId, bucketDate: { gte: since } },
    _sum: {
      impressions: true,
      uniqueViewers: true,
      clicks: true,
      productViews: true,
      cartAdds: true,
      purchases: true,
      orders: true,
      revenue: true,
    },
  });
  const value = totals._sum;
  const impressions = value.impressions ?? 0;
  const clicks = value.clicks ?? 0;
  return {
    ...value,
    ctr: impressions > 0 ? clicks / impressions : 0,
    conversionRate: clicks > 0 ? (value.purchases ?? 0) / clicks : 0,
    revenuePerImpression: impressions > 0 ? Number(value.revenue ?? 0) / impressions : 0,
  };
}

export async function quoteBundle(bundleId: string, selectedProductIds: string[]) {
  const now = new Date();
  const bundle = await prisma.bundle.findFirst({
    where: {
      id: bundleId,
      status: { in: ["ACTIVE", "SCHEDULED"] },
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
      ],
    },
    include: { items: { include: { product: true }, orderBy: { sortOrder: "asc" } } },
  });
  if (!bundle) throw Errors.notFound("Bundle is unavailable or expired.");
  if (bundle.maxPurchases != null && bundle.purchasedCount >= bundle.maxPurchases) {
    throw Errors.conflict("Bundle purchase limit reached.");
  }
  const selected = new Set(selectedProductIds);
  for (const item of bundle.items) {
    if (item.required && !selected.has(item.productId))
      throw Errors.badRequest("All required bundle items must be selected.");
    if (
      selected.has(item.productId) &&
      (!item.product.isActive || item.product.stock < item.quantity)
    ) {
      throw Errors.conflict(`"${item.product.name}" is unavailable for this bundle.`);
    }
  }
  const chosen = bundle.items.filter((item) => selected.has(item.productId));
  if (chosen.length !== selected.size)
    throw Errors.badRequest("Bundle contains an invalid product.");
  const base = chosen.reduce(
    (sum, item) =>
      sum.add(
        new Prisma.Decimal((item.product.sellingPrice ?? item.product.price).toString()).mul(
          item.quantity,
        ),
      ),
    new Prisma.Decimal(0),
  );
  const value = new Prisma.Decimal(bundle.discountValue.toString());
  let total = base;
  if (bundle.discountType === "FIXED_PRICE") total = value;
  if (bundle.discountType === "PERCENTAGE")
    total = base.mul(new Prisma.Decimal(100).sub(value)).div(100);
  if (bundle.discountType === "FIXED_AMOUNT") total = base.sub(value);
  if (total.lessThan(0)) total = new Prisma.Decimal(0);
  return {
    bundleId: bundle.id,
    basePrice: base.toString(),
    total: total.toString(),
    expiresAt: bundle.endsAt?.toISOString() ?? null,
  };
}

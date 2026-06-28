import { prisma, Prisma } from "@nuru/db";
import type {
  Paginated,
  ProductReviewQuery,
  ReviewCreateInput,
  ReviewDTO,
  ReviewModerateInput,
  ReviewQuery,
  ReviewSort,
  ReviewSummaryDTO,
  ReviewUpdateInput,
} from "@nuru/types";
import { Errors } from "../../lib/errors.js";
import { toReviewDTO, type ReviewWithUser } from "./serializers.js";

const withUser = { include: { user: { select: { name: true } } } } as const;

function buildOrderBy(sort: ReviewSort): Prisma.ReviewOrderByWithRelationInput {
  switch (sort) {
    case "oldest":
      return { createdAt: "asc" };
    case "rating_high":
      return { rating: "desc" };
    case "rating_low":
      return { rating: "asc" };
    case "newest":
    default:
      return { createdAt: "desc" };
  }
}

async function paginate(
  where: Prisma.ReviewWhereInput,
  sort: ReviewSort,
  page: number,
  pageSize: number,
): Promise<Paginated<ReviewDTO>> {
  const [total, rows] = await prisma.$transaction([
    prisma.review.count({ where }),
    prisma.review.findMany({
      where,
      orderBy: buildOrderBy(sort),
      skip: (page - 1) * pageSize,
      take: pageSize,
      ...withUser,
    }),
  ]);

  return {
    items: rows.map((r) => toReviewDTO(r as ReviewWithUser)),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

// ---------------------------------------------------------------------------
// Public — approved reviews for a product
// ---------------------------------------------------------------------------

export function listForProduct(
  productId: string,
  query: ProductReviewQuery,
): Promise<Paginated<ReviewDTO>> {
  const where: Prisma.ReviewWhereInput = { productId, status: "APPROVED" };
  if (query.rating) where.rating = query.rating;
  return paginate(where, query.sort, query.page, query.pageSize);
}

/** Aggregate rating snapshot over a product's APPROVED reviews. */
export async function summaryForProduct(productId: string): Promise<ReviewSummaryDTO> {
  const where: Prisma.ReviewWhereInput = { productId, status: "APPROVED" };
  const [agg, byStar] = await prisma.$transaction([
    prisma.review.aggregate({ where, _avg: { rating: true }, _count: true }),
    prisma.review.groupBy({
      by: ["rating"],
      where,
      _count: { _all: true },
      orderBy: { rating: "asc" },
    }),
  ]);

  const distribution: ReviewSummaryDTO["distribution"] = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
  for (const bucket of byStar) {
    const key = String(bucket.rating) as keyof ReviewSummaryDTO["distribution"];
    if (key in distribution) distribution[key] = (bucket._count as { _all: number })._all;
  }

  return {
    average: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : 0,
    count: agg._count,
    distribution,
  };
}

// ---------------------------------------------------------------------------
// Customer — own reviews
// ---------------------------------------------------------------------------

export function listForUser(
  userId: string,
  query: ProductReviewQuery,
): Promise<Paginated<ReviewDTO>> {
  const where: Prisma.ReviewWhereInput = { userId };
  if (query.rating) where.rating = query.rating;
  return paginate(where, query.sort, query.page, query.pageSize);
}

/**
 * Create a review. Enforces that the product exists, that the user has actually
 * bought it (a non-cancelled order line referencing it), and that they have not
 * already reviewed it. New reviews enter PENDING moderation.
 */
export async function create(userId: string, input: ReviewCreateInput): Promise<ReviewDTO> {
  const [product, purchased, existing] = await prisma.$transaction([
    prisma.product.findUnique({ where: { id: input.productId }, select: { id: true } }),
    prisma.orderItem.findFirst({
      where: {
        productId: input.productId,
        order: { userId, status: { notIn: ["CANCELLED", "REFUNDED"] } },
      },
      select: { id: true },
    }),
    prisma.review.findFirst({
      where: { userId, productId: input.productId },
      select: { id: true },
    }),
  ]);

  if (!product) throw Errors.notFound("Product not found.");
  if (!purchased) {
    throw Errors.forbidden("You can only review a product you have purchased.");
  }
  if (existing) throw Errors.conflict("You have already reviewed this product.");

  const created = await prisma.review.create({
    data: {
      userId,
      productId: input.productId,
      rating: input.rating,
      comment: input.comment ?? null,
      status: "PENDING",
    },
    ...withUser,
  });
  return toReviewDTO(created as ReviewWithUser);
}

/**
 * Edit the caller's own review. Any edit re-enters moderation (PENDING) so a
 * previously-approved review can't be silently swapped for new content.
 */
export async function update(
  userId: string,
  id: string,
  input: ReviewUpdateInput,
): Promise<ReviewDTO> {
  const current = await prisma.review.findUnique({ where: { id }, select: { userId: true } });
  if (!current) throw Errors.notFound("Review not found.");
  if (current.userId !== userId) throw Errors.forbidden("This is not your review.");

  const data: Prisma.ReviewUpdateInput = { status: "PENDING" };
  if (input.rating !== undefined) data.rating = input.rating;
  if (input.comment !== undefined) data.comment = input.comment ?? null;

  const updated = await prisma.review.update({ where: { id }, data, ...withUser });
  return toReviewDTO(updated as ReviewWithUser);
}

/** Delete the caller's own review. */
export async function remove(userId: string, id: string): Promise<void> {
  const current = await prisma.review.findUnique({ where: { id }, select: { userId: true } });
  if (!current) throw Errors.notFound("Review not found.");
  if (current.userId !== userId) throw Errors.forbidden("This is not your review.");
  await prisma.review.delete({ where: { id } });
}

// ---------------------------------------------------------------------------
// Admin — moderation
// ---------------------------------------------------------------------------

export function adminList(query: ReviewQuery): Promise<Paginated<ReviewDTO>> {
  const where: Prisma.ReviewWhereInput = {};
  if (query.status) where.status = query.status;
  if (query.productId) where.productId = query.productId;
  if (query.userId) where.userId = query.userId;
  if (query.rating) where.rating = query.rating;
  return paginate(where, query.sort, query.page, query.pageSize);
}

export async function moderate(id: string, input: ReviewModerateInput): Promise<ReviewDTO> {
  const current = await prisma.review.findUnique({ where: { id }, select: { id: true } });
  if (!current) throw Errors.notFound("Review not found.");

  const updated = await prisma.review.update({
    where: { id },
    data: { status: input.status },
    ...withUser,
  });
  return toReviewDTO(updated as ReviewWithUser);
}

export async function adminRemove(id: string): Promise<void> {
  const current = await prisma.review.findUnique({ where: { id }, select: { id: true } });
  if (!current) throw Errors.notFound("Review not found.");
  await prisma.review.delete({ where: { id } });
}

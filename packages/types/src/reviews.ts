import { z } from "zod";
import { paginationQuerySchema } from "./catalog.js";

// ---------------------------------------------------------------------------
// Product reviews
//
// A review is a 1..5 star rating plus an optional comment, written by a user
// against a product. Reviews are moderated: they enter PENDING and only become
// publicly visible once an admin APPROVES them. A user may only review a product
// they have actually purchased (a non-cancelled order containing it), enforced
// server-side, and only once per product (editing resets it to PENDING).
// ---------------------------------------------------------------------------

/** Moderation state of a review. Mirrors the Prisma `ReviewStatus` enum. */
export const REVIEW_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

const ratingSchema = z.coerce
  .number({ invalid_type_error: "Rating must be a number." })
  .int("Rating must be a whole number.")
  .min(1, "Rating must be at least 1.")
  .max(5, "Rating may be at most 5.");

const commentSchema = z.string().trim().max(2000, "Comment is too long.");

/** Customer payload to create a review. */
export const reviewCreateSchema = z
  .object({
    productId: z.string().cuid("Invalid product reference."),
    rating: ratingSchema,
    comment: commentSchema.optional().nullable(),
  })
  .strict();
export type ReviewCreateInput = z.infer<typeof reviewCreateSchema>;

/** Customer payload to edit their own review (re-enters moderation). */
export const reviewUpdateSchema = z
  .object({
    rating: ratingSchema.optional(),
    comment: commentSchema.optional().nullable(),
  })
  .strict()
  .refine((v) => v.rating !== undefined || v.comment !== undefined, {
    message: "Nothing to update.",
  });
export type ReviewUpdateInput = z.infer<typeof reviewUpdateSchema>;

/** Admin moderation transition. */
export const reviewModerateSchema = z
  .object({ status: z.enum(REVIEW_STATUSES) })
  .strict();
export type ReviewModerateInput = z.infer<typeof reviewModerateSchema>;

export const reviewSortSchema = z
  .enum(["newest", "oldest", "rating_high", "rating_low"])
  .default("newest");
export type ReviewSort = z.infer<typeof reviewSortSchema>;

/** Public per-product review listing (APPROVED only, server-enforced). */
export const productReviewQuerySchema = paginationQuerySchema.extend({
  rating: ratingSchema.optional(),
  sort: reviewSortSchema,
});
export type ProductReviewQuery = z.infer<typeof productReviewQuerySchema>;

/** Admin review listing across all products / statuses. */
export const reviewQuerySchema = paginationQuerySchema.extend({
  status: z.enum(REVIEW_STATUSES).optional(),
  productId: z.string().cuid().optional(),
  userId: z.string().cuid().optional(),
  rating: ratingSchema.optional(),
  sort: reviewSortSchema,
});
export type ReviewQuery = z.infer<typeof reviewQuerySchema>;

// ---- DTOs ----

export interface ReviewDTO {
  id: string;
  productId: string;
  userId: string;
  /** Display name of the author (null for anonymous/deleted profiles). */
  userName: string | null;
  rating: number;
  comment: string | null;
  status: ReviewStatus;
  createdAt: string;
  updatedAt: string;
}

/** Aggregate rating snapshot for a product (APPROVED reviews only). */
export interface ReviewSummaryDTO {
  /** Mean rating rounded to one decimal place, or 0 when there are none. */
  average: number;
  /** Number of approved reviews. */
  count: number;
  /** Count of approved reviews per star bucket, keyed "1".."5". */
  distribution: Record<"1" | "2" | "3" | "4" | "5", number>;
}

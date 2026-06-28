import type { Review } from "@nuru/db";
import type { ReviewDTO, ReviewStatus } from "@nuru/types";

/** A review row with the author's display name eagerly loaded. */
export type ReviewWithUser = Review & { user?: { name: string | null } | null };

export function toReviewDTO(r: ReviewWithUser): ReviewDTO {
  return {
    id: r.id,
    productId: r.productId,
    userId: r.userId,
    userName: r.user?.name ?? null,
    rating: r.rating,
    comment: r.comment,
    status: r.status as ReviewStatus,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

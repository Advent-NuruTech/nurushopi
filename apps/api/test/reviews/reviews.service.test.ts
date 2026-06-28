import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@nuru/db", async () => {
  const { makeDbMock } = await import("../helpers/dbMock.js");
  return makeDbMock();
});

import { prisma } from "@nuru/db";
import * as reviews from "../../src/modules/reviews/reviews.service.js";

/* eslint-disable @typescript-eslint/no-explicit-any */
const p = prisma as any;

function reviewRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "rv1",
    userId: "u1",
    productId: "p1",
    rating: 5,
    comment: "Great",
    status: "PENDING",
    createdAt: new Date(),
    updatedAt: new Date(),
    user: { name: "Alice" },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  p.$transaction.mockImplementation((arg: unknown) =>
    typeof arg === "function"
      ? (arg as (tx: unknown) => unknown)(p)
      : Promise.all(arg as Promise<unknown>[]),
  );
});

describe("reviews.listForProduct", () => {
  it("only ever lists APPROVED reviews for the product and maps userName", async () => {
    p.review.count.mockResolvedValue(1);
    p.review.findMany.mockResolvedValue([reviewRow({ status: "APPROVED" })]);

    const res = await reviews.listForProduct("p1", { page: 1, pageSize: 20, sort: "newest" } as never);

    expect(res.total).toBe(1);
    expect(res.items[0]?.userName).toBe("Alice");
    expect(p.review.findMany.mock.calls[0][0].where).toEqual({ productId: "p1", status: "APPROVED" });
  });

  it("applies a rating filter when supplied", async () => {
    p.review.count.mockResolvedValue(0);
    p.review.findMany.mockResolvedValue([]);
    await reviews.listForProduct("p1", { page: 1, pageSize: 20, sort: "newest", rating: 4 } as never);
    expect(p.review.findMany.mock.calls[0][0].where).toMatchObject({ rating: 4, status: "APPROVED" });
  });
});

describe("reviews.summaryForProduct", () => {
  it("computes a rounded average, count and per-star distribution", async () => {
    p.review.aggregate.mockResolvedValue({ _avg: { rating: 4.333 }, _count: 3 });
    p.review.groupBy.mockResolvedValue([
      { rating: 5, _count: { _all: 2 } },
      { rating: 3, _count: { _all: 1 } },
    ]);

    const summary = await reviews.summaryForProduct("p1");

    expect(summary).toEqual({
      average: 4.3,
      count: 3,
      distribution: { "1": 0, "2": 0, "3": 1, "4": 0, "5": 2 },
    });
  });

  it("returns a zeroed summary when there are no reviews", async () => {
    p.review.aggregate.mockResolvedValue({ _avg: { rating: null }, _count: 0 });
    p.review.groupBy.mockResolvedValue([]);
    const summary = await reviews.summaryForProduct("p1");
    expect(summary.average).toBe(0);
    expect(summary.count).toBe(0);
  });
});

describe("reviews.create", () => {
  const input = { productId: "p1", rating: 5, comment: "Nice" } as never;

  function arm({ product = { id: "p1" }, purchased = { id: "oi1" }, existing = null } = {}) {
    p.product.findUnique.mockResolvedValue(product);
    p.orderItem.findFirst.mockResolvedValue(purchased);
    p.review.findFirst.mockResolvedValue(existing);
  }

  it("creates a PENDING review for a purchased, not-yet-reviewed product", async () => {
    arm();
    p.review.create.mockResolvedValue(reviewRow());

    const dto = await reviews.create("u1", input);

    expect(dto.status).toBe("PENDING");
    expect(p.review.create.mock.calls[0][0].data).toMatchObject({
      userId: "u1",
      productId: "p1",
      rating: 5,
      status: "PENDING",
    });
  });

  it("404s when the product does not exist", async () => {
    arm({ product: null as never });
    await expect(reviews.create("u1", input)).rejects.toMatchObject({ status: 404 });
    expect(p.review.create).not.toHaveBeenCalled();
  });

  it("403s when the user has not purchased the product", async () => {
    arm({ purchased: null as never });
    await expect(reviews.create("u1", input)).rejects.toMatchObject({ status: 403 });
    expect(p.review.create).not.toHaveBeenCalled();
  });

  it("409s when the user already reviewed the product", async () => {
    arm({ existing: { id: "rv0" } as never });
    await expect(reviews.create("u1", input)).rejects.toMatchObject({ status: 409 });
    expect(p.review.create).not.toHaveBeenCalled();
  });
});

describe("reviews.update", () => {
  it("re-enters moderation (PENDING) and only changes supplied fields", async () => {
    p.review.findUnique.mockResolvedValue({ userId: "u1" });
    p.review.update.mockResolvedValue(reviewRow({ rating: 3, status: "PENDING" }));

    await reviews.update("u1", "rv1", { rating: 3 } as never);

    const data = p.review.update.mock.calls[0][0].data;
    expect(data).toEqual({ status: "PENDING", rating: 3 });
    expect(data).not.toHaveProperty("comment");
  });

  it("403s when editing someone else's review", async () => {
    p.review.findUnique.mockResolvedValue({ userId: "other" });
    await expect(reviews.update("u1", "rv1", { rating: 3 } as never)).rejects.toMatchObject({
      status: 403,
    });
    expect(p.review.update).not.toHaveBeenCalled();
  });

  it("404s for a missing review", async () => {
    p.review.findUnique.mockResolvedValue(null);
    await expect(reviews.update("u1", "gone", { rating: 3 } as never)).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe("reviews.remove", () => {
  it("deletes the caller's own review", async () => {
    p.review.findUnique.mockResolvedValue({ userId: "u1" });
    p.review.delete.mockResolvedValue({});
    await reviews.remove("u1", "rv1");
    expect(p.review.delete).toHaveBeenCalledWith({ where: { id: "rv1" } });
  });

  it("403s when deleting another user's review", async () => {
    p.review.findUnique.mockResolvedValue({ userId: "other" });
    await expect(reviews.remove("u1", "rv1")).rejects.toMatchObject({ status: 403 });
    expect(p.review.delete).not.toHaveBeenCalled();
  });
});

describe("reviews.adminList / moderate", () => {
  it("filters by status, product and rating", async () => {
    p.review.count.mockResolvedValue(0);
    p.review.findMany.mockResolvedValue([]);
    await reviews.adminList({
      page: 1,
      pageSize: 50,
      sort: "rating_high",
      status: "PENDING",
      productId: "p1",
      rating: 5,
    } as never);
    const args = p.review.findMany.mock.calls[0][0];
    expect(args.where).toEqual({ status: "PENDING", productId: "p1", rating: 5 });
    expect(args.orderBy).toEqual({ rating: "desc" });
  });

  it("moderate sets the new status", async () => {
    p.review.findUnique.mockResolvedValue({ id: "rv1" });
    p.review.update.mockResolvedValue(reviewRow({ status: "APPROVED" }));
    const dto = await reviews.moderate("rv1", { status: "APPROVED" } as never);
    expect(dto.status).toBe("APPROVED");
    expect(p.review.update.mock.calls[0][0].data).toEqual({ status: "APPROVED" });
  });

  it("moderate 404s for a missing review", async () => {
    p.review.findUnique.mockResolvedValue(null);
    await expect(reviews.moderate("gone", { status: "APPROVED" } as never)).rejects.toMatchObject({
      status: 404,
    });
  });
});

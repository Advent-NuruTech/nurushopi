import { describe, it, expect } from "vitest";
import {
  checkoutSchema,
  orderPaymentUpdateSchema,
  orderQuerySchema,
  orderStatusUpdateSchema,
} from "@nuru/types";

const cuid = "ckabcdefghijklmnopqrstuvwx";

describe("checkoutSchema", () => {
  const base = {
    items: [{ productId: cuid, quantity: 2 }],
    contactName: "Jane Doe",
    contactPhone: "+254700000000",
    address: "123 Market St, Nairobi",
  };

  it("accepts a valid cart and coerces quantity", () => {
    const r = checkoutSchema.parse({ ...base, items: [{ productId: cuid, quantity: "3" }] });
    expect(r.items[0]?.quantity).toBe(3);
    expect(r.contactName).toBe("Jane Doe");
  });

  it("rejects an empty cart", () => {
    expect(checkoutSchema.safeParse({ ...base, items: [] }).success).toBe(false);
  });

  it("accepts a legacy (non-cuid) productId but rejects an empty one", () => {
    // Migrated products keep their original Firebase ids, which are not cuids;
    // the schema must accept them so legacy items can still be checked out.
    expect(
      checkoutSchema.safeParse({
        ...base,
        items: [{ productId: "8f3kFireBaseId20chars", quantity: 1 }],
      }).success,
    ).toBe(true);
    expect(
      checkoutSchema.safeParse({ ...base, items: [{ productId: "", quantity: 1 }] }).success,
    ).toBe(false);
  });

  it("rejects a zero / fractional quantity", () => {
    expect(
      checkoutSchema.safeParse({ ...base, items: [{ productId: cuid, quantity: 0 }] }).success,
    ).toBe(false);
    expect(
      checkoutSchema.safeParse({ ...base, items: [{ productId: cuid, quantity: 1.5 }] }).success,
    ).toBe(false);
  });

  it("requires contact name, phone and address", () => {
    expect(checkoutSchema.safeParse({ ...base, contactName: "" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, contactPhone: "" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, address: "" }).success).toBe(false);
  });

  it("normalises an optional contact email", () => {
    const r = checkoutSchema.parse({ ...base, contactEmail: "BUYER@Example.com " });
    expect(r.contactEmail).toBe("buyer@example.com");
  });

  it("rejects unknown keys (strict)", () => {
    expect(checkoutSchema.safeParse({ ...base, walletApplied: 9999 }).success).toBe(false);
  });
});

describe("orderQuerySchema", () => {
  it("applies pagination + sort defaults", () => {
    expect(orderQuerySchema.parse({})).toMatchObject({ page: 1, pageSize: 20, sort: "newest" });
  });

  it("accepts status / paymentStatus filters", () => {
    const q = orderQuerySchema.parse({ status: "SHIPPED", paymentStatus: "PAID" });
    expect(q.status).toBe("SHIPPED");
    expect(q.paymentStatus).toBe("PAID");
  });

  it("rejects an invalid status", () => {
    expect(orderQuerySchema.safeParse({ status: "BOGUS" }).success).toBe(false);
  });
});

describe("order transition schemas", () => {
  it("validates a status transition", () => {
    expect(orderStatusUpdateSchema.parse({ status: "DELIVERED" }).status).toBe("DELIVERED");
    expect(orderStatusUpdateSchema.safeParse({ status: "NOPE" }).success).toBe(false);
    expect(orderStatusUpdateSchema.safeParse({ status: "PAID" }).success).toBe(false);
  });

  it("validates a payment transition", () => {
    expect(orderPaymentUpdateSchema.parse({ paymentStatus: "PAID" }).paymentStatus).toBe("PAID");
    expect(orderPaymentUpdateSchema.safeParse({ paymentStatus: "SHIPPED" }).success).toBe(false);
  });
});

import { describe, it, expect } from "vitest";
import type { Order, OrderItem } from "@nuru/db";
import { toOrderDTO, toOrderItemDTO, type OrderWithItems } from "../../src/modules/orders/serializers.js";

const decimal = (s: string) => ({ toString: () => s }) as unknown as Order["total"];

function makeItem(overrides: Partial<OrderItem> = {}): OrderItem {
  return {
    id: "oi1",
    orderId: "o1",
    productId: "p1",
    productName: "Widget",
    unitPrice: decimal("19.99") as unknown as OrderItem["unitPrice"],
    quantity: 3,
    imageUrl: "https://img/1",
    ...overrides,
  } as OrderItem;
}

function makeOrder(overrides: Partial<OrderWithItems> = {}): OrderWithItems {
  return {
    id: "o1",
    orderNumber: "ord_abc123",
    userId: null,
    status: "PENDING",
    paymentStatus: "UNPAID",
    subtotal: decimal("59.97"),
    walletApplied: decimal("0"),
    total: decimal("59.97"),
    contactName: "Jane",
    contactPhone: "+254700000000",
    contactEmail: null,
    address: "123 St",
    note: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-02T00:00:00Z"),
    items: [makeItem()],
    ...overrides,
  } as OrderWithItems;
}

describe("toOrderItemDTO", () => {
  it("serialises unitPrice and computes lineTotal without float drift", () => {
    const dto = toOrderItemDTO(makeItem({ quantity: 3 }));
    expect(dto.unitPrice).toBe("19.99");
    // 19.99 * 3 = 59.97 exactly (float math would give 59.97000000000001)
    expect(dto.lineTotal).toBe("59.97");
  });

  it("preserves a null productId / imageUrl (snapshot survives deletion)", () => {
    const dto = toOrderItemDTO(makeItem({ productId: null, imageUrl: null }));
    expect(dto.productId).toBeNull();
    expect(dto.imageUrl).toBeNull();
    expect(dto.productName).toBe("Widget");
  });
});

describe("toOrderDTO", () => {
  it("serialises money fields to strings", () => {
    const dto = toOrderDTO(makeOrder());
    expect(dto.subtotal).toBe("59.97");
    expect(dto.walletApplied).toBe("0");
    expect(dto.total).toBe("59.97");
  });

  it("sums quantities into itemCount", () => {
    const dto = toOrderDTO(
      makeOrder({ items: [makeItem({ quantity: 2 }), makeItem({ id: "oi2", quantity: 5 })] }),
    );
    expect(dto.itemCount).toBe(7);
    expect(dto.items).toHaveLength(2);
  });

  it("emits ISO date strings and passes through status", () => {
    const dto = toOrderDTO(makeOrder({ status: "SHIPPED", paymentStatus: "PAID" }));
    expect(dto.createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(dto.status).toBe("SHIPPED");
    expect(dto.paymentStatus).toBe("PAID");
  });
});

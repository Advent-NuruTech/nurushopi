import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@nuru/db", async () => {
  const { makeDbMock } = await import("../helpers/dbMock.js");
  return makeDbMock();
});

import { prisma } from "@nuru/db";
import * as fulfillment from "../../src/modules/fulfillment/fulfillment.service.js";

/* eslint-disable @typescript-eslint/no-explicit-any */
const p = prisma as any;
const decimal = (value: string) => ({ toString: () => value });

function station(overrides: Record<string, unknown> = {}) {
  return {
    id: "station1",
    name: "Nairobi CBD",
    address: "Market Street, Nairobi",
    city: "Nairobi",
    region: "Nairobi County",
    latitude: null,
    longitude: null,
    contactPhone: "+254700000000",
    operatingHours: "Mon-Sat, 8am-6pm",
    deliveryFee: decimal("100.00"),
    estimatedDeliveryTime: "Next business day",
    instructions: "Bring your order number",
    isActive: true,
    archivedAt: null,
    displayOrder: 1,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-02T00:00:00Z"),
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

describe("public fulfillment configuration", () => {
  it("returns the safe disabled state when no configuration exists", async () => {
    p.fulfillmentConfiguration.findUnique.mockResolvedValue(null);
    await expect(fulfillment.getPublicConfiguration()).resolves.toEqual({
      featureEnabled: false,
      pickupEnabled: false,
      doorstepEnabled: false,
      dispatchCounty: null,
      dispatchArea: null,
      stations: [],
    });
    expect(p.pickupStation.findMany).not.toHaveBeenCalled();
  });

  it("only queries active, non-archived customer stations in display order", async () => {
    p.fulfillmentConfiguration.findUnique.mockResolvedValue({
      featureEnabled: true,
      pickupEnabled: true,
      doorstepEnabled: true,
      doorstepFee: decimal("250.00"),
      doorstepEstimatedDeliveryTime: "1-2 days",
      dispatchCounty: "Nairobi",
      dispatchArea: "CBD",
    });
    p.pickupStation.findMany.mockResolvedValue([station()]);

    const result = await fulfillment.getPublicConfiguration();

    expect(p.pickupStation.findMany).toHaveBeenCalledWith({
      where: { isActive: true, archivedAt: null },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }, { id: "asc" }],
    });
    expect(result.stations[0]).toMatchObject({ name: "Nairobi CBD", deliveryFee: "100.00" });
  });
});

describe("pickup station administration", () => {
  it("creates a database-backed station and audit record", async () => {
    p.pickupStation.create.mockResolvedValue(station());
    p.adminLog.create.mockResolvedValue({});

    const result = await fulfillment.createStation(
      {
        name: "Nairobi CBD",
        address: "Market Street, Nairobi",
        deliveryFee: 100,
        isActive: true,
        displayOrder: 1,
      },
      "admin1",
    );

    expect(result.id).toBe("station1");
    expect(p.adminLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        adminId: "admin1",
        action: "fulfillment.pickup_station.created",
        entityId: "station1",
      }),
    });
  });

  it("archives instead of deleting a station", async () => {
    p.pickupStation.findUnique.mockResolvedValue(station());
    p.pickupStation.update.mockResolvedValue(station({ isActive: false, archivedAt: new Date() }));
    p.adminLog.create.mockResolvedValue({});

    await fulfillment.archiveStation("station1", "admin1");

    expect(p.pickupStation.delete).not.toHaveBeenCalled();
    expect(p.pickupStation.update).toHaveBeenCalledWith({
      where: { id: "station1" },
      data: { archivedAt: expect.any(Date), isActive: false },
    });
  });
});

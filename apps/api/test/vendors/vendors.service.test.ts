import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@nuru/db", async () => {
  const { makeDbMock } = await import("../helpers/dbMock.js");
  return makeDbMock();
});

import { prisma } from "@nuru/db";
import * as vendors from "../../src/modules/vendors/vendors.service.js";

/* eslint-disable @typescript-eslint/no-explicit-any */
const p = prisma as any;

function appRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "va1",
    userId: "u1",
    businessName: "Acme",
    contactName: "Bob",
    email: "bob@acme.com",
    phone: null,
    description: null,
    status: "PENDING",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const baseInput = { businessName: "Acme", email: "bob@acme.com" } as never;

beforeEach(() => {
  vi.clearAllMocks();
  p.$transaction.mockImplementation((arg: unknown) =>
    typeof arg === "function"
      ? (arg as (tx: unknown) => unknown)(p)
      : Promise.all(arg as Promise<unknown>[]),
  );
});

describe("vendors.apply", () => {
  it("creates a PENDING application linked to a signed-in user", async () => {
    p.vendorApplication.findFirst.mockResolvedValue(null);
    p.vendorApplication.create.mockResolvedValue(appRow());

    const dto = await vendors.apply(baseInput, "u1");

    expect(dto.status).toBe("PENDING");
    expect(dto.userId).toBe("u1");
    // Dedupe check is scoped to the user when authenticated.
    expect(p.vendorApplication.findFirst.mock.calls[0][0].where).toEqual({
      userId: "u1",
      status: "PENDING",
    });
    expect(p.vendorApplication.create.mock.calls[0][0].data).toMatchObject({ userId: "u1" });
  });

  it("dedupes a guest application by email", async () => {
    p.vendorApplication.findFirst.mockResolvedValue(null);
    p.vendorApplication.create.mockResolvedValue(appRow({ userId: null }));

    await vendors.apply(baseInput);

    expect(p.vendorApplication.findFirst.mock.calls[0][0].where).toEqual({
      email: "bob@acme.com",
      status: "PENDING",
    });
    expect(p.vendorApplication.create.mock.calls[0][0].data).toMatchObject({ userId: null });
  });

  it("409s when an open application already exists", async () => {
    p.vendorApplication.findFirst.mockResolvedValue({ id: "old" });
    await expect(vendors.apply(baseInput, "u1")).rejects.toMatchObject({ status: 409 });
    expect(p.vendorApplication.create).not.toHaveBeenCalled();
  });
});

describe("vendors.adminList", () => {
  it("filters by status + search and sorts newest by default", async () => {
    p.vendorApplication.count.mockResolvedValue(0);
    p.vendorApplication.findMany.mockResolvedValue([]);
    await vendors.adminList({
      page: 1,
      pageSize: 20,
      sort: "newest",
      status: "PENDING",
      search: "acme",
    } as never);
    const args = p.vendorApplication.findMany.mock.calls[0][0];
    expect(args.where.status).toBe("PENDING");
    expect(args.where.OR).toBeTruthy();
    expect(args.orderBy).toEqual({ createdAt: "desc" });
  });
});

describe("vendors.moderate", () => {
  it("approves a pending application and notifies the linked user", async () => {
    p.vendorApplication.findUnique.mockResolvedValue({ id: "va1", status: "PENDING", userId: "u1" });
    p.vendorApplication.update.mockResolvedValue(appRow({ status: "APPROVED" }));
    p.notification.create.mockResolvedValue({});

    const dto = await vendors.moderate("va1", { status: "APPROVED" } as never);

    expect(dto.status).toBe("APPROVED");
    expect(p.notification.create.mock.calls[0][0].data).toMatchObject({
      recipientType: "USER",
      recipientId: "u1",
      type: "vendor",
    });
  });

  it("does not notify a guest (unlinked) application", async () => {
    p.vendorApplication.findUnique.mockResolvedValue({ id: "va1", status: "PENDING", userId: null });
    p.vendorApplication.update.mockResolvedValue(appRow({ status: "REJECTED", userId: null }));

    await vendors.moderate("va1", { status: "REJECTED" } as never);
    expect(p.notification.create).not.toHaveBeenCalled();
  });

  it("409s when the application is already decided", async () => {
    p.vendorApplication.findUnique.mockResolvedValue({ id: "va1", status: "APPROVED", userId: "u1" });
    await expect(vendors.moderate("va1", { status: "REJECTED" } as never)).rejects.toMatchObject({
      status: 409,
    });
    expect(p.vendorApplication.update).not.toHaveBeenCalled();
  });

  it("404s for a missing application", async () => {
    p.vendorApplication.findUnique.mockResolvedValue(null);
    await expect(vendors.moderate("gone", { status: "APPROVED" } as never)).rejects.toMatchObject({
      status: 404,
    });
  });
});

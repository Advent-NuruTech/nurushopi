import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@nuru/db", async () => {
  const { makeDbMock } = await import("../helpers/dbMock.js");
  return makeDbMock();
});

import { prisma } from "@nuru/db";
import * as auth from "../../src/modules/auth/auth.service.js";

/* eslint-disable @typescript-eslint/no-explicit-any */
const p = prisma as any;

function userRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "u1",
    email: "jane@example.com",
    passwordHash: "hash",
    name: "Jane",
    phone: null,
    address: null,
    avatarUrl: null,
    emailVerified: new Date(),
    isActive: true,
    walletBalance: { toString: () => "0.00" },
    referralCode: "ABCD1234",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("auth.updateProfile", () => {
  it("writes only the provided fields, trimming values", async () => {
    p.user.update.mockResolvedValue(userRow({ name: "Jane Doe", phone: "0712" }));

    const user = await auth.updateProfile("u1", {
      name: "  Jane Doe  ",
      phone: "0712",
    } as never);

    expect(user.name).toBe("Jane Doe");
    const args = p.user.update.mock.calls[0][0];
    expect(args.where).toEqual({ id: "u1" });
    expect(args.data).toEqual({ name: "Jane Doe", phone: "0712" });
    // address / avatarUrl were not supplied, so they must not be touched.
    expect(args.data).not.toHaveProperty("address");
    expect(args.data).not.toHaveProperty("avatarUrl");
  });

  it("clears a field when an empty string is sent", async () => {
    p.user.update.mockResolvedValue(userRow({ phone: null }));

    await auth.updateProfile("u1", { phone: "   " } as never);

    expect(p.user.update.mock.calls[0][0].data).toEqual({ phone: null });
  });

  it("maps a vanished user row to 401", async () => {
    p.user.update.mockRejectedValue(new Error("record not found"));

    await expect(auth.updateProfile("gone", { name: "x" } as never)).rejects.toMatchObject({
      status: 401,
    });
  });
});

describe("auth.toAuthUser", () => {
  it("serialises the address and wallet balance", () => {
    const dto = auth.toAuthUser(userRow({ address: "1 Main St" }) as never);
    expect(dto.address).toBe("1 Main St");
    expect(dto.walletBalance).toBe("0.00");
  });
});

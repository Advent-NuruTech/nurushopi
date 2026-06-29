import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@nuru/db", async () => {
  const { makeDbMock } = await import("../helpers/dbMock.js");
  return makeDbMock();
});

vi.mock("@nuru/auth/password", () => ({
  hashPassword: vi.fn(async (p: string) => `hashed:${p}`),
  verifyPassword: vi.fn(async (p: string, h: string) => h === `hashed:${p}`),
}));

import { prisma } from "@nuru/db";
import * as admin from "../../src/modules/admin/admin.service.js";

/* eslint-disable @typescript-eslint/no-explicit-any */
const p = prisma as any;

function adminRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "a1",
    email: "boss@nuru.com",
    passwordHash: "hashed:Password1",
    name: "Boss",
    role: "SENIOR",
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  p.$transaction.mockImplementation((arg: unknown) =>
    typeof arg === "function" ? (arg as (tx: unknown) => unknown)(p) : Promise.all(arg as Promise<unknown>[]),
  );
});

describe("admin.login", () => {
  it("returns the admin on valid credentials and clears lock state", async () => {
    p.loginAttempt.findUnique.mockResolvedValue(null);
    p.admin.findUnique.mockResolvedValue(adminRow());
    p.loginAttempt.deleteMany.mockResolvedValue({ count: 0 });

    const result = await admin.login("boss@nuru.com", "Password1");

    expect(result.id).toBe("a1");
    expect(p.loginAttempt.deleteMany).toHaveBeenCalledWith({
      where: { identifier: "admin:boss@nuru.com" },
    });
  });

  it("records a failed attempt and 401s on a bad password", async () => {
    p.loginAttempt.findUnique.mockResolvedValue(null);
    p.admin.findUnique.mockResolvedValue(adminRow());
    p.loginAttempt.upsert.mockResolvedValue({});

    await expect(admin.login("boss@nuru.com", "wrong")).rejects.toMatchObject({ status: 401 });
    expect(p.loginAttempt.upsert).toHaveBeenCalled();
  });

  it("423s when the account is locked", async () => {
    p.loginAttempt.findUnique.mockResolvedValue({
      identifier: "admin:boss@nuru.com",
      lockedUntil: new Date(Date.now() + 60_000),
    });
    await expect(admin.login("boss@nuru.com", "Password1")).rejects.toMatchObject({ status: 423 });
    expect(p.admin.findUnique).not.toHaveBeenCalled();
  });

  it("403s a disabled admin", async () => {
    p.loginAttempt.findUnique.mockResolvedValue(null);
    p.admin.findUnique.mockResolvedValue(adminRow({ isActive: false }));
    await expect(admin.login("boss@nuru.com", "Password1")).rejects.toMatchObject({ status: 403 });
  });
});

describe("admin.signup", () => {
  // Matches SENIOR_ADMIN_CODE set in test/setup.ts.
  const SENIOR_CODE = "test-senior-admin-code-0123456789";

  it("creates a SENIOR when the senior code matches (and allows many)", async () => {
    p.admin.findUnique.mockResolvedValue(null);
    p.admin.create.mockResolvedValue(adminRow({ role: "SENIOR" }));

    const created = await admin.signup({
      name: "Boss",
      email: "boss@nuru.com",
      password: "Password1",
      seniorCode: SENIOR_CODE,
    } as never);

    expect(created.role).toBe("SENIOR");
    expect(p.admin.create.mock.calls[0][0].data.role).toBe("SENIOR");
    // No invite is touched on the senior path.
    expect(p.adminInvite.findUnique).not.toHaveBeenCalled();
  });

  it("rejects a wrong senior code with 401 and creates nothing", async () => {
    p.admin.findUnique.mockResolvedValue(null);

    await expect(
      admin.signup({
        name: "Imposter",
        email: "imposter@nuru.com",
        password: "Password1",
        seniorCode: "not-the-real-code",
      } as never),
    ).rejects.toMatchObject({ status: 401 });
    expect(p.admin.create).not.toHaveBeenCalled();
  });

  it("requires an invite token when no credential identifies the path", async () => {
    p.admin.findUnique.mockResolvedValue(null);

    await expect(
      admin.signup({ name: "Sub", email: "sub@nuru.com", password: "Password1" } as never),
    ).rejects.toMatchObject({ status: 400 });
    expect(p.admin.create).not.toHaveBeenCalled();
  });

  it("redeems a valid invite, taking its role, and marks it ACCEPTED", async () => {
    p.admin.findUnique.mockResolvedValue(null);
    p.adminInvite.findUnique.mockResolvedValue({
      id: "inv1",
      email: "sub@nuru.com",
      role: "SUB",
      status: "PENDING",
      expiresAt: new Date(Date.now() + 60_000),
    });
    p.admin.create.mockResolvedValue(adminRow({ id: "a2", email: "sub@nuru.com", role: "SUB" }));
    p.adminInvite.update.mockResolvedValue({});

    const created = await admin.signup({
      name: "Sub",
      email: "sub@nuru.com",
      password: "Password1",
      inviteToken: "tok",
    } as never);

    expect(created.role).toBe("SUB");
    expect(p.adminInvite.update.mock.calls[0][0].data).toMatchObject({ status: "ACCEPTED" });
  });

  it("rejects an invite issued for a different email", async () => {
    p.admin.findUnique.mockResolvedValue(null);
    p.adminInvite.findUnique.mockResolvedValue({
      id: "inv1",
      email: "other@nuru.com",
      role: "SUB",
      status: "PENDING",
      expiresAt: new Date(Date.now() + 60_000),
    });

    await expect(
      admin.signup({
        name: "Sub",
        email: "sub@nuru.com",
        password: "Password1",
        inviteToken: "tok",
      } as never),
    ).rejects.toMatchObject({ status: 400 });
    expect(p.admin.create).not.toHaveBeenCalled();
  });

  it("409s when the email already belongs to an admin", async () => {
    p.admin.findUnique.mockResolvedValue(adminRow());
    await expect(
      admin.signup({ name: "Boss", email: "boss@nuru.com", password: "Password1" } as never),
    ).rejects.toMatchObject({ status: 409 });
  });
});

describe("admin.createInvite", () => {
  it("creates a pending invite, revoking prior ones, and returns the raw token", async () => {
    p.admin.findUnique.mockResolvedValue(null);
    p.adminInvite.updateMany.mockResolvedValue({ count: 0 });
    p.adminInvite.create.mockResolvedValue({
      id: "inv1",
      email: "new@nuru.com",
      role: "SUB",
      status: "PENDING",
      expiresAt: new Date(Date.now() + 1000),
      createdAt: new Date(),
    });

    const dto = await admin.createInvite("a1", { email: "new@nuru.com", role: "SUB" } as never);

    expect(dto.token).toBeTruthy();
    expect(p.adminInvite.updateMany).toHaveBeenCalledWith({
      where: { email: "new@nuru.com", status: "PENDING" },
      data: { status: "REVOKED" },
    });
    // The stored token is hashed, never the raw value.
    expect(p.adminInvite.create.mock.calls[0][0].data.tokenHash).not.toBe(dto.token);
  });

  it("409s when inviting an existing admin email", async () => {
    p.admin.findUnique.mockResolvedValue(adminRow());
    await expect(
      admin.createInvite("a1", { email: "boss@nuru.com", role: "SUB" } as never),
    ).rejects.toMatchObject({ status: 409 });
  });
});

describe("admin.removeAdmin", () => {
  it("deletes another admin", async () => {
    p.admin.delete.mockResolvedValue({});
    await admin.removeAdmin("a2", "a1");
    expect(p.admin.delete).toHaveBeenCalledWith({ where: { id: "a2" } });
  });

  it("refuses to remove your own account", async () => {
    await expect(admin.removeAdmin("a1", "a1")).rejects.toMatchObject({ status: 400 });
    expect(p.admin.delete).not.toHaveBeenCalled();
  });

  it("404s a missing admin", async () => {
    p.admin.delete.mockRejectedValue(new Error("not found"));
    await expect(admin.removeAdmin("gone", "a1")).rejects.toMatchObject({ status: 404 });
  });
});

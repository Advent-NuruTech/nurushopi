import { describe, it, expect, vi, beforeEach } from "vitest";

// The DB is fully mocked.
vi.mock("@nuru/db", async () => {
  const { makeDbMock } = await import("../helpers/dbMock.js");
  return makeDbMock();
});

// Control the password primitives so we can drive the legacy-rehash branch
// deterministically without running real bcrypt/scrypt. Defined via vi.hoisted
// so they exist when the (hoisted) vi.mock factory runs.
const { hashPassword, verifyPassword, verifyFirebaseScrypt } = vi.hoisted(() => ({
  hashPassword: vi.fn(async () => "new-bcrypt-hash"),
  verifyPassword: vi.fn(async () => false), // bcrypt always misses -> legacy path
  verifyFirebaseScrypt: vi.fn(async () => true), // scrypt verifies by default
}));
vi.mock("@nuru/auth/password", () => ({ hashPassword, verifyPassword, verifyFirebaseScrypt }));

import { prisma } from "@nuru/db";
import * as auth from "../../src/modules/auth/auth.service.js";

/* eslint-disable @typescript-eslint/no-explicit-any */
const p = prisma as any;

function userRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "u1",
    email: "jane@example.com",
    passwordHash: null, // imported Firebase user: no bcrypt hash yet
    name: "Jane",
    isActive: true,
    walletBalance: { toString: () => "0.00" },
    referralCode: "ABCD1234",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  verifyPassword.mockResolvedValue(false);
  verifyFirebaseScrypt.mockResolvedValue(true);
  hashPassword.mockResolvedValue("new-bcrypt-hash");
  p.loginAttempt.findUnique.mockResolvedValue(null);
  p.loginAttempt.deleteMany.mockResolvedValue({ count: 0 });
});

describe("auth.login — legacy Firebase password (lazy rehash)", () => {
  it("logs in a migrated user with their old password and upgrades them to bcrypt", async () => {
    p.user.findUnique.mockResolvedValue(userRow());
    p.legacyPasswordImport.findUnique.mockResolvedValue({
      userId: "u1",
      hash: "fb-hash",
      salt: "fb-salt",
    });
    // $transaction runs Promise.all; make the two ops resolve to [updatedUser, deleted].
    p.user.update.mockResolvedValue(userRow({ passwordHash: "new-bcrypt-hash" }));
    p.legacyPasswordImport.delete.mockResolvedValue({});

    const user = await auth.login("jane@example.com", "OldPassw0rd");

    expect(user.id).toBe("u1");
    // It verified against the firebase scrypt hash + salt.
    expect(verifyFirebaseScrypt).toHaveBeenCalledWith(
      "OldPassw0rd",
      "fb-salt",
      "fb-hash",
      expect.objectContaining({ signerKey: expect.any(String) }),
    );
    // It re-hashed to bcrypt and persisted the upgrade.
    expect(hashPassword).toHaveBeenCalledWith("OldPassw0rd");
    expect(p.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { passwordHash: "new-bcrypt-hash" },
    });
    // It removed the legacy record (atomically, in the same transaction).
    expect(p.legacyPasswordImport.delete).toHaveBeenCalledWith({ where: { userId: "u1" } });
    expect(p.$transaction).toHaveBeenCalledTimes(1);
    // Successful login clears the lockout counter.
    expect(p.loginAttempt.deleteMany).toHaveBeenCalledWith({ where: { identifier: "jane@example.com" } });
  });

  it("rejects a wrong password and never upgrades", async () => {
    p.user.findUnique.mockResolvedValue(userRow());
    p.legacyPasswordImport.findUnique.mockResolvedValue({ userId: "u1", hash: "h", salt: "s" });
    verifyFirebaseScrypt.mockResolvedValue(false); // wrong password

    await expect(auth.login("jane@example.com", "wrong")).rejects.toMatchObject({
      status: 401,
    });
    expect(p.user.update).not.toHaveBeenCalled();
    expect(p.legacyPasswordImport.delete).not.toHaveBeenCalled();
    // A failed attempt is recorded for lockout tracking.
    expect(p.loginAttempt.upsert).toHaveBeenCalled();
  });

  it("does not touch the legacy path when bcrypt already verifies", async () => {
    verifyPassword.mockResolvedValue(true);
    p.user.findUnique.mockResolvedValue(userRow({ passwordHash: "$2a$bcrypt" }));

    const user = await auth.login("jane@example.com", "current");

    expect(user.id).toBe("u1");
    expect(p.legacyPasswordImport.findUnique).not.toHaveBeenCalled();
    expect(verifyFirebaseScrypt).not.toHaveBeenCalled();
  });
});

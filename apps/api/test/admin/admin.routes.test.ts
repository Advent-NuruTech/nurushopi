import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";

vi.mock("@nuru/db", async () => {
  const { makeDbMock } = await import("../helpers/dbMock.js");
  return makeDbMock();
});

import request from "supertest";
import { prisma } from "@nuru/db";
import { signAccessToken, signAdminAccessToken } from "@nuru/auth/tokens";
import { createApp } from "../../src/app.js";

/* eslint-disable @typescript-eslint/no-explicit-any */
const p = prisma as any;
const app = createApp();

let userAuth: string;
let seniorAuth: string;
let subAuth: string;

beforeAll(async () => {
  const secret = process.env.JWT_ACCESS_SECRET as string;
  userAuth = `Bearer ${await signAccessToken({ sub: "u1", email: "u@e.com" }, { secret, ttlSeconds: 3600 })}`;
  seniorAuth = `Bearer ${await signAdminAccessToken({ sub: "a1", email: "boss@nuru.com", role: "SENIOR" }, { secret, ttlSeconds: 3600 })}`;
  subAuth = `Bearer ${await signAdminAccessToken({ sub: "a2", email: "sub@nuru.com", role: "SUB" }, { secret, ttlSeconds: 3600 })}`;
});

beforeEach(() => {
  vi.clearAllMocks();
  p.$transaction.mockImplementation((arg: unknown) =>
    typeof arg === "function"
      ? (arg as (tx: unknown) => unknown)(p)
      : Promise.all(arg as Promise<unknown>[]),
  );
});

describe("POST /api/v1/admin/auth/invite", () => {
  it("rejects an unauthenticated request with 401", async () => {
    const res = await request(app)
      .post("/api/v1/admin/auth/invite")
      .send({ email: "new@nuru.com", role: "SUB" });
    expect(res.status).toBe(401);
  });

  it("rejects a non-admin user token with 401", async () => {
    const res = await request(app)
      .post("/api/v1/admin/auth/invite")
      .set("Authorization", userAuth)
      .send({ email: "new@nuru.com", role: "SUB" });
    expect(res.status).toBe(401);
  });

  it("rejects a SUB admin (senior only) with 403", async () => {
    const res = await request(app)
      .post("/api/v1/admin/auth/invite")
      .set("Authorization", subAuth)
      .send({ email: "new@nuru.com", role: "SUB" });
    expect(res.status).toBe(403);
  });

  it("creates an invite for a SENIOR and returns a usable token (201)", async () => {
    p.admin.findUnique.mockResolvedValue(null);
    p.adminInvite.updateMany.mockResolvedValue({ count: 0 });
    p.adminInvite.create.mockResolvedValue({
      id: "inv1",
      email: "new@nuru.com",
      role: "SUB",
      status: "PENDING",
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      createdAt: new Date(),
    });

    const res = await request(app)
      .post("/api/v1/admin/auth/invite")
      .set("Authorization", seniorAuth)
      .send({ email: "new@nuru.com", role: "SUB" });

    expect(res.status).toBe(201);
    expect(res.body.data.invite.token).toBeTruthy();
    expect(res.body.data.invite.email).toBe("new@nuru.com");
  });
});

describe("POST /api/v1/admin/auth/signup (invite redemption)", () => {
  const pendingInvite = (overrides: Record<string, unknown> = {}) => ({
    id: "inv1",
    email: "new@nuru.com",
    role: "SUB",
    status: "PENDING",
    expiresAt: new Date(Date.now() + 60_000),
    ...overrides,
  });

  it("redeems a valid invite with the matching email, creating the admin (201)", async () => {
    p.admin.findUnique.mockResolvedValue(null);
    p.adminInvite.findUnique.mockResolvedValue(pendingInvite());
    p.admin.create.mockResolvedValue({
      id: "a3",
      email: "new@nuru.com",
      name: "New Admin",
      role: "SUB",
      isActive: true,
      createdAt: new Date(),
    });
    p.adminInvite.update.mockResolvedValue({});

    const res = await request(app).post("/api/v1/admin/auth/signup").send({
      name: "New Admin",
      email: "new@nuru.com",
      password: "Password1",
      inviteToken: "raw-token",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.admin.role).toBe("SUB");
    expect(p.adminInvite.update.mock.calls[0][0].data).toMatchObject({ status: "ACCEPTED" });
    // The session cookie is issued on success.
    expect(res.headers["set-cookie"]?.join(";")).toContain("nuru_admin_access");
  });

  it("rejects redemption when the email does not match the invite (400)", async () => {
    p.admin.findUnique.mockResolvedValue(null);
    p.adminInvite.findUnique.mockResolvedValue(pendingInvite({ email: "new@nuru.com" }));

    const res = await request(app).post("/api/v1/admin/auth/signup").send({
      name: "Imposter",
      email: "someone-else@nuru.com",
      password: "Password1",
      inviteToken: "raw-token",
    });

    expect(res.status).toBe(400);
    expect(p.admin.create).not.toHaveBeenCalled();
  });

  it("rejects an expired invite (400)", async () => {
    p.admin.findUnique.mockResolvedValue(null);
    p.adminInvite.findUnique.mockResolvedValue(
      pendingInvite({ expiresAt: new Date(Date.now() - 60_000) }),
    );

    const res = await request(app).post("/api/v1/admin/auth/signup").send({
      name: "Late",
      email: "new@nuru.com",
      password: "Password1",
      inviteToken: "raw-token",
    });

    expect(res.status).toBe(400);
    expect(p.admin.create).not.toHaveBeenCalled();
  });

  it("rejects sending both a senior code and an invite token (400 validation)", async () => {
    const res = await request(app).post("/api/v1/admin/auth/signup").send({
      name: "Confused",
      email: "new@nuru.com",
      password: "Password1",
      inviteToken: "raw-token",
      seniorCode: "some-senior-code-1234567890",
    });

    expect(res.status).toBe(400);
  });
});

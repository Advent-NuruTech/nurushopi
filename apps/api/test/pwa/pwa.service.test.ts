import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@nuru/db", async () => {
  const { makeDbMock } = await import("../helpers/dbMock.js");
  return makeDbMock();
});

import { prisma } from "@nuru/db";
import * as pwa from "../../src/modules/pwa/pwa.service.js";

/* eslint-disable @typescript-eslint/no-explicit-any */
const p = prisma as any;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("pwa.record", () => {
  it("records an anonymous install", async () => {
    p.pwaInstall.create.mockResolvedValue({ id: "i1" });
    await pwa.record(null, { platform: "android", userAgent: "UA" });
    expect(p.pwaInstall.findFirst).not.toHaveBeenCalled();
    expect(p.pwaInstall.create.mock.calls[0][0].data).toEqual({
      userId: null,
      platform: "android",
      userAgent: "UA",
    });
  });

  it("records a signed-in user's first install", async () => {
    p.pwaInstall.findFirst.mockResolvedValue(null);
    p.pwaInstall.create.mockResolvedValue({ id: "i1" });
    await pwa.record("u1", { platform: null, userAgent: null });
    expect(p.pwaInstall.findFirst).toHaveBeenCalledWith({
      where: { userId: "u1" },
      select: { id: true },
    });
    expect(p.pwaInstall.create.mock.calls[0][0].data).toMatchObject({ userId: "u1" });
  });

  it("is idempotent — a repeat install by the same user does not create a row", async () => {
    p.pwaInstall.findFirst.mockResolvedValue({ id: "existing" });
    await pwa.record("u1", { platform: null, userAgent: null });
    expect(p.pwaInstall.create).not.toHaveBeenCalled();
  });

  it("coerces missing platform/userAgent to null", async () => {
    p.pwaInstall.create.mockResolvedValue({ id: "i1" });
    await pwa.record(null, {});
    expect(p.pwaInstall.create.mock.calls[0][0].data).toEqual({
      userId: null,
      platform: null,
      userAgent: null,
    });
  });
});

describe("pwa.stats", () => {
  it("returns the total install count", async () => {
    p.pwaInstall.count.mockResolvedValue(42);
    expect(await pwa.stats()).toEqual({ totalInstalled: 42 });
  });
});

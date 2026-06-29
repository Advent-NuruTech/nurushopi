import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@nuru/db", async () => {
  const { makeDbMock } = await import("../helpers/dbMock.js");
  return makeDbMock();
});

import { prisma, Prisma } from "@nuru/db";
import * as hero from "../../src/modules/catalog/hero.service.js";

/* eslint-disable @typescript-eslint/no-explicit-any */
const p = prisma as any;

function heroRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "h1",
    message: "Big sale",
    linkUrl: null,
    gradient: "sunset",
    displayOrder: 2,
    isActive: true,
    startsAt: null,
    endsAt: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-02T00:00:00Z"),
    ...overrides,
  };
}

beforeEach(() => vi.clearAllMocks());

describe("hero.listActive", () => {
  it("filters to the active window and orders by displayOrder then recency", async () => {
    p.heroAnnouncement.findMany.mockResolvedValue([heroRow()]);

    const result = await hero.listActive();

    expect(result[0]).toMatchObject({ id: "h1", gradient: "sunset", order: 2 });
    const args = p.heroAnnouncement.findMany.mock.calls[0][0];
    expect(args.where.isActive).toBe(true);
    expect(args.orderBy).toEqual([{ displayOrder: "asc" }, { createdAt: "desc" }]);
  });
});

describe("hero.create", () => {
  it("persists gradient and order", async () => {
    p.heroAnnouncement.create.mockResolvedValue(heroRow({ gradient: "ocean", displayOrder: 5 }));

    const dto = await hero.create({
      message: "Hello",
      gradient: "ocean",
      order: 5,
      isActive: true,
    } as never);

    expect(p.heroAnnouncement.create.mock.calls[0][0].data).toMatchObject({
      message: "Hello",
      gradient: "ocean",
      displayOrder: 5,
    });
    expect(dto).toMatchObject({ gradient: "ocean", order: 5 });
  });

  it("defaults gradient to null and order to 0 when omitted", async () => {
    p.heroAnnouncement.create.mockResolvedValue(heroRow({ gradient: null, displayOrder: 0 }));

    await hero.create({ message: "Plain", isActive: true } as never);

    expect(p.heroAnnouncement.create.mock.calls[0][0].data).toMatchObject({
      gradient: null,
      displayOrder: 0,
    });
  });
});

describe("hero.update", () => {
  it("writes only the provided fields, mapping order to displayOrder", async () => {
    p.heroAnnouncement.update.mockResolvedValue(heroRow({ gradient: "forest", displayOrder: 3 }));

    await hero.update("h1", { gradient: "forest", order: 3 } as never);

    const data = p.heroAnnouncement.update.mock.calls[0][0].data;
    expect(data).toEqual({ gradient: "forest", displayOrder: 3 });
    expect(data).not.toHaveProperty("message");
  });

  it("404s when the row is missing (P2025)", async () => {
    p.heroAnnouncement.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("missing", { code: "P2025" }),
    );

    await expect(hero.update("gone", { message: "x" } as never)).rejects.toMatchObject({
      status: 404,
    });
  });
});

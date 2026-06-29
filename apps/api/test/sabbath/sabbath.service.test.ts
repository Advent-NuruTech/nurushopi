import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@nuru/db", async () => {
  const { makeDbMock } = await import("../helpers/dbMock.js");
  return makeDbMock();
});

import { isFridayDate, sabbathMessageCreateSchema } from "@nuru/types";
import { prisma } from "@nuru/db";
import * as sabbath from "../../src/modules/sabbath/sabbath.service.js";

/* eslint-disable @typescript-eslint/no-explicit-any */
const p = prisma as any;

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "s1",
    message: "Happy Sabbath",
    sabbathDate: "2026-07-03",
    createdById: "a1",
    createdAt: new Date("2026-06-28T10:00:00Z"),
    updatedAt: new Date("2026-06-28T10:00:00Z"),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("sabbath schema (Friday rule)", () => {
  it("accepts a Friday date", () => {
    // 2026-07-03 is a Friday.
    expect(isFridayDate("2026-07-03")).toBe(true);
    expect(sabbathMessageCreateSchema.safeParse({ message: "Hi", sabbathDate: "2026-07-03" }).success).toBe(
      true,
    );
  });

  it("rejects a non-Friday date and malformed input", () => {
    // 2026-07-04 is a Saturday.
    expect(isFridayDate("2026-07-04")).toBe(false);
    expect(sabbathMessageCreateSchema.safeParse({ message: "Hi", sabbathDate: "2026-07-04" }).success).toBe(
      false,
    );
    expect(sabbathMessageCreateSchema.safeParse({ message: "", sabbathDate: "2026-07-03" }).success).toBe(
      false,
    );
  });
});

describe("sabbath.list (public)", () => {
  it("returns the current message for a date plus a history page with a cursor", async () => {
    p.sabbathMessage.findFirst.mockResolvedValue(row());
    p.sabbathMessage.findMany.mockResolvedValue([row(), row({ id: "s2", sabbathDate: "2026-06-26" })]);

    const res = await sabbath.list({ date: "2026-07-03", limit: 2 } as never);

    expect(res.currentMessage?.id).toBe("s1");
    expect(res.messages).toHaveLength(2);
    // Full page → a cursor pointing at the last row is returned.
    expect(res.nextCursor).toEqual({
      sabbathDate: "2026-06-26",
      createdAt: row().createdAt.toISOString(),
    });
    // No cursor supplied → unfiltered history query.
    expect(p.sabbathMessage.findMany.mock.calls[0][0].where).toBeUndefined();
  });

  it("omits currentMessage when no date is requested and returns no cursor on a short page", async () => {
    p.sabbathMessage.findMany.mockResolvedValue([row()]);
    const res = await sabbath.list({ limit: 5 } as never);
    expect(p.sabbathMessage.findFirst).not.toHaveBeenCalled();
    expect(res.currentMessage).toBeNull();
    expect(res.nextCursor).toBeNull();
  });

  it("builds a keyset predicate from the cursor", async () => {
    p.sabbathMessage.findMany.mockResolvedValue([]);
    await sabbath.list({
      limit: 5,
      cursorDate: "2026-06-26",
      cursorCreatedAt: "2026-06-20T10:00:00Z",
    } as never);
    const where = p.sabbathMessage.findMany.mock.calls[0][0].where;
    expect(where.OR[0]).toEqual({ sabbathDate: { lt: "2026-06-26" } });
    expect(where.OR[1].sabbathDate).toBe("2026-06-26");
    expect(where.OR[1].createdAt.lt).toBeInstanceOf(Date);
  });
});

describe("sabbath.adminList", () => {
  it("lists newest Sabbath first, capped by limit", async () => {
    p.sabbathMessage.findMany.mockResolvedValue([row()]);
    const res = await sabbath.adminList({ limit: 200 } as never);
    expect(res).toHaveLength(1);
    const args = p.sabbathMessage.findMany.mock.calls[0][0];
    expect(args.take).toBe(200);
    expect(args.orderBy).toEqual([{ sabbathDate: "desc" }, { createdAt: "desc" }]);
  });
});

describe("sabbath.create", () => {
  it("persists the message with the authoring admin", async () => {
    p.sabbathMessage.create.mockResolvedValue(row());
    const dto = await sabbath.create("a1", { message: "Hi", sabbathDate: "2026-07-03" } as never);
    expect(dto.sabbathDate).toBe("2026-07-03");
    expect(p.sabbathMessage.create.mock.calls[0][0].data).toEqual({
      message: "Hi",
      sabbathDate: "2026-07-03",
      createdById: "a1",
    });
  });
});

describe("sabbath.update", () => {
  it("updates only the supplied fields", async () => {
    p.sabbathMessage.findUnique.mockResolvedValue({ id: "s1" });
    p.sabbathMessage.update.mockResolvedValue(row({ message: "Edited" }));
    await sabbath.update("s1", { message: "Edited" } as never);
    expect(p.sabbathMessage.update.mock.calls[0][0].data).toEqual({ message: "Edited" });
  });

  it("404s for a missing message", async () => {
    p.sabbathMessage.findUnique.mockResolvedValue(null);
    await expect(sabbath.update("gone", { message: "x" } as never)).rejects.toMatchObject({
      status: 404,
    });
    expect(p.sabbathMessage.update).not.toHaveBeenCalled();
  });
});

describe("sabbath.remove", () => {
  it("deletes an existing message", async () => {
    p.sabbathMessage.findUnique.mockResolvedValue({ id: "s1" });
    p.sabbathMessage.delete.mockResolvedValue({});
    await sabbath.remove("s1");
    expect(p.sabbathMessage.delete).toHaveBeenCalledWith({ where: { id: "s1" } });
  });

  it("404s for a missing message", async () => {
    p.sabbathMessage.findUnique.mockResolvedValue(null);
    await expect(sabbath.remove("gone")).rejects.toMatchObject({ status: 404 });
    expect(p.sabbathMessage.delete).not.toHaveBeenCalled();
  });
});

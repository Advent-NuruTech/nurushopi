import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@nuru/db", async () => {
  const { makeDbMock } = await import("../helpers/dbMock.js");
  return makeDbMock();
});

import request from "supertest";
import { prisma } from "@nuru/db";
import { createApp } from "../../src/app.js";

/* eslint-disable @typescript-eslint/no-explicit-any */
const p = prisma as any;
const app = createApp();

beforeEach(() => vi.clearAllMocks());

describe("merchandising route security", () => {
  it("rejects an unauthenticated admin collection mutation", async () => {
    const response = await request(app)
      .post("/api/v1/admin/merchandising/collections")
      .send({ key: "weekend_picks", displayName: "Weekend Picks" });
    expect(response.status).toBe(401);
    expect(p.merchandisingCollection.create).not.toHaveBeenCalled();
  });

  it("requires a customer session for retention preferences", async () => {
    const response = await request(app).get("/api/v1/retention/preferences");
    expect(response.status).toBe(401);
  });

  it("accepts idempotent client events but never trusts client purchase outcomes", async () => {
    p.commerceEvent.createMany.mockResolvedValue({ count: 1 });
    const response = await request(app).post("/api/v1/events").send({
      events: [{
        eventId: "b3229433-ada8-4e78-9331-49365d0a18d6",
        eventType: "purchase_completed",
        anonymousId: "anonymous-123",
        sessionId: "session-123",
        productId: "p1",
        timestamp: new Date().toISOString(),
      }],
    });
    expect(response.status).toBe(202);
    expect(p.commerceEvent.createMany.mock.calls[0][0].data[0].trusted).toBe(false);
  });
});


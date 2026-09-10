import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@nuru/db", async () => {
  const { makeDbMock } = await import("../helpers/dbMock.js");
  return makeDbMock();
});

import request from "supertest";
import { Webhook } from "svix";
import { prisma } from "@nuru/db";
import { createApp } from "../../src/app.js";

/* eslint-disable @typescript-eslint/no-explicit-any */
const p = prisma as any;
const app = createApp();
const secret = process.env.RESEND_WEBHOOK_SECRET!;

function signedHeaders(payload: string, eventId = "evt_resend_1") {
  const timestamp = new Date();
  return {
    "svix-id": eventId,
    "svix-timestamp": Math.floor(timestamp.getTime() / 1_000).toString(),
    "svix-signature": new Webhook(secret).sign(eventId, timestamp, payload),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  p.emailWebhookEvent.findUnique.mockResolvedValue(null);
  p.emailWebhookEvent.create.mockResolvedValue({ id: "evt_resend_1" });
  p.emailWebhookEvent.update.mockResolvedValue({ id: "evt_resend_1" });
  p.emailSuppression.upsert.mockResolvedValue({ id: "suppression_1" });
  p.user.findMany.mockResolvedValue([{ id: "user_1" }]);
  p.notificationPreference.updateMany.mockResolvedValue({ count: 1 });
  p.retentionTrigger.updateMany.mockResolvedValue({ count: 1 });
});

describe("Resend delivery webhook", () => {
  it("verifies a bounce, suppresses its recipient, and disables pending email", async () => {
    const payload = JSON.stringify({
      type: "email.bounced",
      created_at: "2026-09-10T08:00:00.000Z",
      data: {
        email_id: "email_123",
        from: "NuruShop <hello@nurushop.co.ke>",
        to: [" Customer@Example.com "],
        subject: "September picks from NuruShop",
      },
    });

    const response = await request(app)
      .post("/api/v1/webhooks/resend")
      .set(signedHeaders(payload))
      .set("Content-Type", "application/json")
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ duplicate: false, received: true });
    expect(p.emailSuppression.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: "customer@example.com" },
        create: expect.objectContaining({ reason: "email.bounced" }),
      }),
    );
    expect(p.notificationPreference.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ channel: "email", enabled: true }),
        data: { enabled: false },
      }),
    );
    expect(p.retentionTrigger.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "SKIPPED" }) }),
    );
  });

  it("rejects a tampered payload before touching the database", async () => {
    const payload = JSON.stringify({ type: "email.failed", data: { to: ["a@example.com"] } });
    const response = await request(app)
      .post("/api/v1/webhooks/resend")
      .set(signedHeaders(payload))
      .set("Content-Type", "application/json")
      .send(payload.replace("email.failed", "email.bounced"));

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("BAD_REQUEST");
    expect(p.emailWebhookEvent.create).not.toHaveBeenCalled();
  });

  it("acknowledges a retried event without processing it twice", async () => {
    p.emailWebhookEvent.findUnique.mockResolvedValue({ id: "evt_duplicate" });
    const payload = JSON.stringify({
      type: "email.complained",
      data: { email_id: "email_456", to: ["buyer@example.com"] },
    });
    const response = await request(app)
      .post("/api/v1/webhooks/resend")
      .set(signedHeaders(payload, "evt_duplicate"))
      .set("Content-Type", "application/json")
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body.data.duplicate).toBe(true);
    expect(p.emailSuppression.upsert).not.toHaveBeenCalled();
  });

  it("records a transient failure without permanently suppressing the address", async () => {
    const payload = JSON.stringify({
      type: "email.failed",
      data: { email_id: "email_789", to: ["buyer@example.com"] },
    });
    const response = await request(app)
      .post("/api/v1/webhooks/resend")
      .set(signedHeaders(payload, "evt_failed"))
      .set("Content-Type", "application/json")
      .send(payload);

    expect(response.status).toBe(200);
    expect(p.emailWebhookEvent.create).toHaveBeenCalled();
    expect(p.emailSuppression.upsert).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@nuru/db", async () => {
  const { makeDbMock } = await import("../helpers/dbMock.js");
  return makeDbMock();
});

const { sendConfirmation } = vi.hoisted(() => ({ sendConfirmation: vi.fn() }));
vi.mock("../../src/modules/auth/email.js", () => ({
  sendMarketingOptInConfirmationEmail: sendConfirmation,
  EmailSendError: class EmailSendError extends Error {},
  sendEmail: vi.fn(),
}));

import { prisma } from "@nuru/db";
import * as retention from "../../src/modules/merchandising/retention.service.js";

/* eslint-disable @typescript-eslint/no-explicit-any */
const p = prisma as any;

const input = {
  channel: "email",
  topic: "monthly_promotion",
  enabled: true,
  maxPerDay: 1,
  maxPerWeek: 1,
  quietHours: null,
} as const;

beforeEach(() => {
  vi.clearAllMocks();
  p.notificationPreference.upsert.mockResolvedValue({
    id: "pref-1",
    userId: "u1",
    ...input,
    consentedAt: new Date(),
  });
  p.user.findUnique.mockResolvedValue({ email: "customer@example.com" });
  p.retentionTrigger.findFirst.mockResolvedValue(null);
  sendConfirmation.mockResolvedValue({ id: "email-1", provider: "development" });
});

describe("retention.savePreference", () => {
  it("sends a dated thank-you every time monthly email is enabled", async () => {
    const first = await retention.savePreference("u1", input as never);
    const second = await retention.savePreference("u1", input as never);

    expect(sendConfirmation).toHaveBeenCalledTimes(2);
    expect(sendConfirmation).toHaveBeenCalledWith(
      "customer@example.com",
      expect.stringMatching(/at 8:00 AM EAT$/),
    );
    expect(first.nextDeliveryAt).toBeTruthy();
    expect(first.nextDeliveryLabel).toMatch(/at 8:00 AM EAT$/);
    expect(second.preference.enabled).toBe(true);
  });

  it("does not send a confirmation when the customer opts out", async () => {
    const result = await retention.savePreference("u1", { ...input, enabled: false } as never);

    expect(sendConfirmation).not.toHaveBeenCalled();
    expect(result.nextDeliveryAt).toBeNull();
  });
});

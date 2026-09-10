import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@nuru/db", async () => {
  const { makeDbMock } = await import("../helpers/dbMock.js");
  return makeDbMock();
});

vi.mock("@nuru/auth/password", () => ({
  hashPassword: vi.fn().mockResolvedValue("password-hash"),
  verifyPassword: vi.fn(),
  verifyFirebaseScrypt: vi.fn(),
}));

const { sendConfirmation, sendVerification } = vi.hoisted(() => ({
  sendConfirmation: vi.fn(),
  sendVerification: vi.fn(),
}));

vi.mock("../../src/modules/auth/email.js", () => ({
  sendMarketingOptInConfirmationEmail: sendConfirmation,
  sendPasswordResetEmail: vi.fn(),
  sendVerificationEmail: sendVerification,
}));

vi.mock("../../src/modules/merchandising/monthly-email.service.js", () => ({
  getNextMonthlyPromotionDelivery: vi.fn().mockResolvedValue(new Date("2026-10-01T05:00:00.000Z")),
  formatKenyaDeliveryDate: vi.fn().mockReturnValue("Thursday, 1 October 2026 at 8:00 AM EAT"),
}));

import { prisma } from "@nuru/db";
import * as auth from "../../src/modules/auth/auth.service.js";

/* eslint-disable @typescript-eslint/no-explicit-any */
const p = prisma as any;

beforeEach(() => {
  vi.clearAllMocks();
  p.user.findUnique.mockResolvedValue(null);
  p.user.create.mockResolvedValue({
    id: "u1",
    email: "customer@example.com",
    passwordHash: "password-hash",
    name: "Customer",
    phone: null,
    address: null,
    avatarUrl: null,
    emailVerified: null,
    isActive: true,
    walletBalance: { toString: () => "0.00" },
    referralCode: "ABCD1234",
  });
  p.notificationPreference.create.mockResolvedValue({});
  p.emailVerificationToken.create.mockResolvedValue({});
  sendVerification.mockResolvedValue({ id: "verify-1", provider: "development" });
  sendConfirmation.mockResolvedValue({ id: "confirm-1", provider: "development" });
});

describe("auth.signup marketing consent", () => {
  it("stores affirmative consent and sends a dated thank-you confirmation", async () => {
    await auth.signup({
      email: "customer@example.com",
      password: "Password1",
      name: "Customer",
      marketingOptIn: true,
    });

    expect(p.notificationPreference.create.mock.calls[0][0].data).toMatchObject({
      userId: "u1",
      channel: "email",
      topic: "monthly_promotion",
      enabled: true,
    });
    expect(sendConfirmation).toHaveBeenCalledWith(
      "customer@example.com",
      "Thursday, 1 October 2026 at 8:00 AM EAT",
      expect.stringMatching(/^marketing-opt-in:u1:/),
    );
  });

  it("does not send marketing confirmation without affirmative consent", async () => {
    await auth.signup({
      email: "customer@example.com",
      password: "Password1",
      name: "Customer",
      marketingOptIn: false,
    });

    expect(p.notificationPreference.create).not.toHaveBeenCalled();
    expect(sendConfirmation).not.toHaveBeenCalled();
  });
});

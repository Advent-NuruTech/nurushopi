import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { sendMail, createTransport, logger } = vi.hoisted(() => ({
  sendMail: vi.fn(),
  createTransport: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn() },
}));

vi.mock("nodemailer", () => ({
  default: { createTransport },
}));
vi.mock("../../src/lib/logger.js", () => ({ logger }));

const baseEnv = {
  NODE_ENV: "production" as const,
  EMAIL_FROM: "NuruShop <hello@nurushop.co.ke>",
  EMAIL_REPLY_TO: "support@nurushop.co.ke",
  SMTP_PORT: 587,
};

async function loadEmail(overrides: Record<string, unknown> = {}) {
  vi.doMock("../../src/env.js", () => ({ env: { ...baseEnv, ...overrides } }));
  return import("../../src/modules/auth/email.js");
}

const input = {
  to: "customer@example.com",
  subject: "Subscription confirmed",
  html: "<p>Confirmed</p>",
  text: "Confirmed",
};

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  createTransport.mockReturnValue({ sendMail });
});

afterEach(() => vi.unstubAllGlobals());

describe("production email transport", () => {
  it("rejects instead of reporting a fake success when no provider is configured", async () => {
    const { assertEmailTransportReady, emailTransportConfigured, sendEmail } = await loadEmail();

    expect(emailTransportConfigured).toBe(false);
    expect(() => assertEmailTransportReady()).toThrow("Email delivery is not configured");
    await expect(sendEmail(input)).rejects.toMatchObject({
      name: "EmailSendError",
      code: "email_transport_unavailable",
    });
  });

  it("passes a stable idempotency key to Resend", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "resend-message-1" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { sendEmail } = await loadEmail({ RESEND_API_KEY: "configured-at-runtime" });

    await expect(
      sendEmail({ ...input, idempotencyKey: "marketing-opt-in:user:timestamp" }),
    ).resolves.toEqual({
      id: "resend-message-1",
      provider: "resend",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        headers: expect.objectContaining({
          "Idempotency-Key": "marketing-opt-in:user:timestamp",
        }),
      }),
    );
  });

  it("uses SMTP when Resend has a transient failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network unavailable")));
    sendMail.mockResolvedValue({ messageId: "smtp-message-1" });
    const { sendEmail } = await loadEmail({
      RESEND_API_KEY: "configured-at-runtime",
      SMTP_HOST: "smtp.example.com",
      SMTP_USER: "user",
      SMTP_PASSWORD: "password",
    });

    await expect(sendEmail(input)).resolves.toEqual({
      id: "smtp-message-1",
      provider: "smtp",
    });
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: input.to }));
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ status: undefined }),
      "Resend delivery failed; trying SMTP fallback",
    );
  });
});

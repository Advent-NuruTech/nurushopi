import { createApp } from "./app.js";
import { env, marketingEmailConfigured } from "./env.js";
import { logger } from "./lib/logger.js";
import { prisma } from "@nuru/db";
import {
  dispatchMonthlyPromotionEmails,
  scheduleMonthlyPromotionEmails,
} from "./modules/merchandising/monthly-email.service.js";
import { assertEmailTransportReady } from "./modules/auth/email.js";

// Never let production accept signups or opt-ins while silently discarding
// verification, reset, or subscription-confirmation emails.
if (env.NODE_ENV === "production") assertEmailTransportReady();

const app = createApp();

const server = app.listen(env.API_PORT, () => {
  logger.info(`🚀 NuruShop API listening on ${env.API_PUBLIC_URL} (port ${env.API_PORT})`);
});

let marketingEmailRunning = false;
async function pollMarketingEmail(): Promise<void> {
  if (marketingEmailRunning) return;
  marketingEmailRunning = true;
  try {
    const scheduled = await scheduleMonthlyPromotionEmails();
    const sent = await dispatchMonthlyPromotionEmails();
    if (scheduled || sent) logger.info({ scheduled, sent }, "Monthly product email poll completed");
  } catch (error) {
    logger.error({ error }, "Monthly product email poll failed");
  } finally {
    marketingEmailRunning = false;
  }
}

const initialMarketingEmailPoll = marketingEmailConfigured
  ? setTimeout(() => void pollMarketingEmail(), 10_000)
  : null;
initialMarketingEmailPoll?.unref();
const marketingEmailTimer = marketingEmailConfigured
  ? setInterval(() => void pollMarketingEmail(), env.MARKETING_EMAIL_POLL_MINUTES * 60_000)
  : null;
marketingEmailTimer?.unref();

async function shutdown(signal: string): Promise<void> {
  logger.info(`${signal} received, shutting down...`);
  if (initialMarketingEmailPoll) clearTimeout(initialMarketingEmailPoll);
  if (marketingEmailTimer) clearInterval(marketingEmailTimer);
  server.close(() => logger.info("HTTP server closed"));
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

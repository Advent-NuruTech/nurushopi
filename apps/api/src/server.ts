import { createApp } from "./app.js";
import { env } from "./env.js";
import { logger } from "./lib/logger.js";
import { prisma } from "@nuru/db";

const app = createApp();

const server = app.listen(env.API_PORT, () => {
  logger.info(`🚀 NuruShop API listening on ${env.API_PUBLIC_URL} (port ${env.API_PORT})`);
});

async function shutdown(signal: string): Promise<void> {
  logger.info(`${signal} received, shutting down...`);
  server.close(() => logger.info("HTTP server closed"));
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

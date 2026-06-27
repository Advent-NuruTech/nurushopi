import express, { type Express } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { pinoHttp } from "pino-http";
import { randomUUID } from "node:crypto";
import { allowedOrigins } from "./env.js";
import { logger } from "./lib/logger.js";
import { sendOk } from "./lib/response.js";
import { apiRouter } from "./routes.js";
import { apiLimiter } from "./middleware/rateLimit.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";

export function createApp(): Express {
  const app = express();

  app.set("trust proxy", 1);

  // Request id + structured logging
  app.use((req, _res, next) => {
    req.id = (req.headers["x-request-id"] as string) ?? randomUUID();
    next();
  });
  app.use(pinoHttp({ logger, genReqId: (req) => (req as { id?: string }).id ?? randomUUID() }));

  // Security + parsing
  app.use(helmet());
  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Health check (unauthenticated, unthrottled)
  app.get("/health", (_req, res) => sendOk(res, { status: "ok", uptime: process.uptime() }));

  // Versioned API
  app.use("/api/v1", apiLimiter, apiRouter);

  // 404 + error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

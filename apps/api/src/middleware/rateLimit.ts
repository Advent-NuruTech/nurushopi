import rateLimit from "express-rate-limit";
import type { ApiError } from "@nuru/types";

const tooMany: ApiError = {
  ok: false,
  error: { code: "TOO_MANY_REQUESTS", message: "Too many requests. Please try again later." },
};

/** Generous limiter for general API traffic. */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: tooMany,
});

/** Strict limiter for auth endpoints (login/signup/reset). */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: tooMany,
});

import type { RequestHandler } from "express";
import type { ZodTypeAny, infer as ZodInfer } from "zod";

/**
 * Validates `req.body` against a Zod schema and replaces it with the parsed
 * (and coerced) value. Throws ZodError → handled by the error middleware.
 */
export function validateBody<T extends ZodTypeAny>(schema: T): RequestHandler {
  return (req, _res, next) => {
    const parsed = schema.parse(req.body) as ZodInfer<T>;
    req.body = parsed;
    next();
  };
}

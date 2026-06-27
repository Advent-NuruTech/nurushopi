/** Application error with an HTTP status + stable machine-readable code. */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const Errors = {
  badRequest: (msg = "Bad request", details?: unknown) =>
    new AppError(400, "BAD_REQUEST", msg, details),
  unauthorized: (msg = "Authentication required") =>
    new AppError(401, "UNAUTHORIZED", msg),
  forbidden: (msg = "You do not have permission to do this") =>
    new AppError(403, "FORBIDDEN", msg),
  notFound: (msg = "Resource not found") => new AppError(404, "NOT_FOUND", msg),
  conflict: (msg = "Resource already exists") => new AppError(409, "CONFLICT", msg),
  locked: (msg = "Account locked") => new AppError(423, "LOCKED", msg),
  tooMany: (msg = "Too many requests") => new AppError(429, "TOO_MANY_REQUESTS", msg),
  internal: (msg = "Something went wrong") => new AppError(500, "INTERNAL", msg),
};

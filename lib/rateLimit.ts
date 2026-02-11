type RateLimitOptions = {
  limit: number;
  windowMs: number;
  keyPrefix?: string;
};

type RateLimitState = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitState>();

function nowMs() {
  return Date.now();
}

export function rateLimit(key: string, options: RateLimitOptions) {
  const prefix = options.keyPrefix ?? "rl";
  const fullKey = `${prefix}:${key}`;
  const current = store.get(fullKey);
  const now = nowMs();

  if (!current || now >= current.resetAt) {
    const next: RateLimitState = {
      count: 1,
      resetAt: now + options.windowMs,
    };
    store.set(fullKey, next);
    return { ok: true, remaining: options.limit - 1, resetAt: next.resetAt };
  }

  current.count += 1;
  if (current.count > options.limit) {
    return { ok: false, remaining: 0, resetAt: current.resetAt };
  }

  return { ok: true, remaining: options.limit - current.count, resetAt: current.resetAt };
}

export function getClientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") ?? "local";
}

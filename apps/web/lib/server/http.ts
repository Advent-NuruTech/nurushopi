import "server-only";

import type { ApiResponse } from "@nuru/types";

/**
 * Server-only HTTP client for the public storefront.
 *
 * Why a separate client from `lib/api.ts`?
 *  - `lib/api.ts` runs in the browser, forwards cookies (`credentials: include`)
 *    and is used for authenticated/mutating calls.
 *  - This client runs **only** on the server (React Server Components, route
 *    handlers). It performs anonymous reads of public catalog data and opts
 *    into Next.js's Data Cache via `next: { tags, revalidate }` so the
 *    storefront can be served from cache and scale independently of the API.
 *
 * The base URL prefers an internal address (`API_INTERNAL_URL`) so server↔API
 * traffic can stay on a private network in production, falling back to the
 * public URL for local dev.
 */
const API_BASE = (
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:4000/api/v1"
).replace(/\/$/, "");

/** Default freshness window for cached storefront reads (seconds). */
export const DEFAULT_REVALIDATE = 300;

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(message: string, code: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }

  /** A 404 from the API — callers usually map this to `notFound()`. */
  get isNotFound(): boolean {
    return this.status === 404 || this.code === "NOT_FOUND";
  }
}

export interface ServerFetchOptions {
  /** Next.js Data Cache tags — purge with `revalidateTag(tag)` on writes. */
  tags?: string[];
  /**
   * Seconds before the cached entry is considered stale. `false` opts out of
   * caching entirely (per-request fetch). Defaults to {@link DEFAULT_REVALIDATE}.
   */
  revalidate?: number | false;
  signal?: AbortSignal;
}

/**
 * Perform a cached GET against the API and unwrap the standard
 * `{ ok, data } | { ok, error }` envelope, throwing {@link ApiError} on failure.
 */
export async function apiGet<T>(path: string, options: ServerFetchOptions = {}): Promise<T> {
  const { tags, revalidate = DEFAULT_REVALIDATE, signal } = options;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: "GET",
      headers: { accept: "application/json" },
      signal,
      next: { tags, revalidate },
    });
  } catch (cause) {
    throw new ApiError(
      "The storefront could not reach the catalog service.",
      "UPSTREAM_UNREACHABLE",
      503,
      cause,
    );
  }

  let body: ApiResponse<T> | null = null;
  try {
    body = (await res.json()) as ApiResponse<T>;
  } catch {
    // Non-JSON response (e.g. proxy error page) — handled below.
  }

  if (!res.ok || !body || body.ok === false) {
    const err = body && body.ok === false ? body.error : undefined;
    throw new ApiError(
      err?.message ?? `Request to ${path} failed.`,
      err?.code ?? "UNKNOWN",
      res.status,
      err?.details,
    );
  }

  return body.data;
}

/** Build a `?key=value` query string, skipping null/undefined/empty values. */
export function buildQuery(
  params: Record<string, string | number | boolean | undefined | null>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const str = search.toString();
  return str ? `?${str}` : "";
}

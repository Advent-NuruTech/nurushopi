/**
 * Defensive value coercion for messy real-world Firestore data.
 *
 * Firestore documents can hold: Timestamps, GeoPoints, DocumentReferences,
 * nested maps, arrays, numbers-as-strings, nulls, and missing fields. Every
 * helper here is total (never throws) and returns a sane fallback, because a
 * single malformed document must never abort a whole batch.
 */
import { Timestamp, GeoPoint, DocumentReference } from "firebase-admin/firestore";
import { Prisma } from "@nuru/db";

export type Doc = Record<string, unknown>;

/** First defined, non-null value among the given keys. */
export function pick(doc: Doc, ...keys: string[]): unknown {
  for (const k of keys) {
    const v = doc[k];
    if (v !== undefined && v !== null) return v;
  }
  return undefined;
}

/** Coerce any Firestore date-ish value to a JS Date, or undefined. */
export function toDate(v: unknown): Date | undefined {
  if (v == null) return undefined;
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  // Firestore-admin sometimes hands back {_seconds,_nanoseconds} after JSON hops.
  if (typeof v === "object") {
    const o = v as { _seconds?: number; seconds?: number; _nanoseconds?: number };
    const secs = o._seconds ?? o.seconds;
    if (typeof secs === "number") return new Date(secs * 1000);
  }
  if (typeof v === "number") {
    // Heuristic: seconds vs milliseconds.
    return new Date(v < 1e12 ? v * 1000 : v);
  }
  if (typeof v === "string") {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return undefined;
}

/** A Date or `now`, for required createdAt columns. */
export function toDateOrNow(v: unknown): Date {
  return toDate(v) ?? new Date();
}

export function toStr(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (v instanceof DocumentReference) return v.id;
  return undefined;
}

/** Required string with a fallback (for NOT NULL columns). */
export function toStrOr(v: unknown, fallback: string): string {
  const s = toStr(v);
  return s != null && s.trim() !== "" ? s : fallback;
}

export function toNum(v: unknown): number | undefined {
  if (v == null) return undefined;
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

export function toInt(v: unknown, fallback = 0): number {
  const n = toNum(v);
  return n == null ? fallback : Math.trunc(n);
}

export function toBool(v: unknown, fallback = false): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return ["true", "1", "yes"].includes(v.toLowerCase());
  if (typeof v === "number") return v !== 0;
  return fallback;
}

/** Money -> Prisma.Decimal with 2dp. Defaults to 0 for required columns. */
export function toDecimal(v: unknown, fallback = 0): Prisma.Decimal {
  const n = toNum(v);
  return new Prisma.Decimal((n ?? fallback).toFixed(2));
}

/** Optional money -> Decimal | null. */
export function toDecimalOrNull(v: unknown): Prisma.Decimal | null {
  const n = toNum(v);
  return n == null ? null : new Prisma.Decimal(n.toFixed(2));
}

/** Coerce to a clean string[] (drops empties; flattens single strings). */
export function toStringArray(v: unknown): string[] {
  if (v == null) return [];
  const arr = Array.isArray(v) ? v : [v];
  const out: string[] = [];
  for (const item of arr) {
    const s = toStr(item);
    if (s && s.trim() !== "") out.push(s.trim());
  }
  return out;
}

/** Coerce to JSON-safe value for Prisma Json columns (handles Timestamp/GeoPoint/Ref). */
export function toJson(v: unknown): Prisma.InputJsonValue | undefined {
  const cleaned = jsonSafe(v);
  return cleaned === undefined ? undefined : (cleaned as Prisma.InputJsonValue);
}

function jsonSafe(v: unknown): unknown {
  if (v == null) return null;
  if (v instanceof Timestamp) return v.toDate().toISOString();
  if (v instanceof Date) return v.toISOString();
  if (v instanceof GeoPoint) return { lat: v.latitude, lng: v.longitude };
  if (v instanceof DocumentReference) return { __ref: v.path };
  if (Array.isArray(v)) return v.map(jsonSafe);
  if (typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      out[k] = jsonSafe(val);
    }
    return out;
  }
  return v;
}

/** Normalise an arbitrary status string to UPPERCASE token, mapped if needed. */
export function toEnum<T extends string>(
  v: unknown,
  allowed: readonly T[],
  fallback: T,
  aliases: Record<string, T> = {},
): T {
  const raw = toStr(v);
  if (!raw) return fallback;
  const up = raw.trim().toUpperCase();
  if ((allowed as readonly string[]).includes(up)) return up as T;
  const lower = raw.trim().toLowerCase();
  if (aliases[lower]) return aliases[lower];
  if (aliases[up]) return aliases[up];
  return fallback;
}

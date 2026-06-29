// Node-only random/opaque-token helpers (node:crypto).
import { randomBytes, createHash, timingSafeEqual } from "node:crypto";

/** URL-safe opaque token for refresh / email-verification / password-reset. */
export function generateOpaqueToken(bytes = 48): string {
  return randomBytes(bytes).toString("base64url");
}

/** Deterministic SHA-256 hash, used to store opaque tokens without keeping the plaintext. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Constant-time string equality for comparing secrets (shared codes, tokens).
 * Hashing both sides first gives fixed-length buffers, so the comparison never
 * leaks length and is safe even when the inputs differ in size. An empty
 * `expected` always returns false, so an unset secret can never match.
 */
export function timingSafeEqualStr(actual: string, expected: string): boolean {
  if (!expected) return false;
  const a = createHash("sha256").update(actual).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/** Short random code (e.g. referral codes). */
export function generateCode(length = 8): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const buf = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[buf[i]! % alphabet.length];
  }
  return out;
}

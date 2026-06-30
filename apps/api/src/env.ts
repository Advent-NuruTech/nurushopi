import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  // Hosts like Render inject the listening port via PORT; prefer it, then
  // fall back to an explicit API_PORT, then the local-dev default.
  API_PORT: z.preprocess(
    (v) => v ?? process.env.PORT,
    z.coerce.number().default(4000),
  ),

  WEB_ORIGIN: z.string().default("http://localhost:3000"),
  API_PUBLIC_URL: z.string().url().default("http://localhost:4000"),
  WEB_APP_URL: z.string().url().default("http://localhost:3000"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  JWT_ACCESS_SECRET: z.string().min(16, "JWT_ACCESS_SECRET must be at least 16 chars"),
  JWT_REFRESH_SECRET: z.string().min(16, "JWT_REFRESH_SECRET must be at least 16 chars"),

  // Shared secret that authorizes self-service SENIOR admin signup. When unset
  // (or blank), senior signup is disabled entirely (fail closed) and admins can
  // only join via a single-use invite. Must be strong enough to resist guessing.
  // A blank value is treated as unset so an empty `.env` placeholder is valid.
  SENIOR_ADMIN_CODE: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().min(16, "SENIOR_ADMIN_CODE must be at least 16 chars").optional(),
  ),
  ACCESS_TOKEN_TTL: z.coerce.number().default(900),
  REFRESH_TOKEN_TTL: z.coerce.number().default(2_592_000),
  COOKIE_DOMAIN: z.string().optional(),

  // Firebase scrypt password-hash params (Firebase console → Authentication →
  // ⋯ → Password hash parameters). Only needed during the migration window so
  // imported users can log in with their existing password (lazily re-hashed to
  // bcrypt on first login). When SIGNER_KEY is blank, legacy login is disabled.
  FIREBASE_SCRYPT_SIGNER_KEY: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().optional(),
  ),
  FIREBASE_SCRYPT_SALT_SEPARATOR: z.string().default("Bw=="),
  FIREBASE_SCRYPT_ROUNDS: z.coerce.number().default(8),
  FIREBASE_SCRYPT_MEM_COST: z.coerce.number().default(14),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional(),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().default("NuruShop <no-reply@nurushop.com>"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const isProd = env.NODE_ENV === "production";

/** Comma-separated allowlist of browser origins permitted to send credentials. */
export const allowedOrigins = env.WEB_ORIGIN.split(",").map((o) => o.trim());

/** Whether self-service senior admin signup (via SENIOR_ADMIN_CODE) is enabled. */
export const seniorSignupEnabled = Boolean(env.SENIOR_ADMIN_CODE);

/**
 * Whether one-time legacy (Firebase scrypt) password verification is enabled.
 * True only while the migration signer key is configured; once all imported
 * users have logged in (and `legacy_password_imports` is empty) it can be unset.
 */
export const legacyPasswordLoginEnabled = Boolean(env.FIREBASE_SCRYPT_SIGNER_KEY);

/** Firebase scrypt params bundle for `verifyFirebaseScrypt`. */
export const firebaseScryptParams = {
  signerKey: env.FIREBASE_SCRYPT_SIGNER_KEY ?? "",
  saltSeparator: env.FIREBASE_SCRYPT_SALT_SEPARATOR,
  rounds: env.FIREBASE_SCRYPT_ROUNDS,
  memCost: env.FIREBASE_SCRYPT_MEM_COST,
};

export const googleOAuthConfigured = Boolean(
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REDIRECT_URI,
);

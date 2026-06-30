/**
 * Environment loading + validation for the migration utility.
 * Fails fast with a readable message rather than crashing deep inside the SDK.
 */
import { config as loadDotenv } from "dotenv";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

// Load env from the migration tool's own .env first (highest priority), then
// reuse the API's .env (DATABASE_URL/DIRECT_URL) and the web app's .env.local
// (Firebase admin creds), so credentials don't have to be copied around.
// dotenv does not override already-set vars, so earlier files win.
const cwd = process.cwd();
for (const p of [
  path.join(cwd, ".env"),
  path.resolve(cwd, "../api/.env"),
  path.resolve(cwd, "../../apps/api/.env"),
  path.resolve(cwd, "../web/.env.local"),
  path.resolve(cwd, "../../apps/web/.env.local"),
]) {
  if (existsSync(p)) loadDotenv({ path: p });
}

function required(name: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) {
    throw new Error(
      `Missing required env var ${name}. Copy apps/migrate/.env.example to .env and fill it in.`,
    );
  }
  return v.trim();
}

function bool(name: string, fallback: boolean): boolean {
  const v = process.env[name];
  if (v == null || v.trim() === "") return fallback;
  return v.trim().toLowerCase() === "true";
}

function int(name: string, fallback: number): number {
  const v = process.env[name];
  if (v == null || v.trim() === "") return fallback;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`Env var ${name} must be a positive number, got "${v}".`);
  }
  return Math.floor(n);
}

/**
 * Resolve the Firebase service-account credential from any of:
 *  1. GOOGLE_APPLICATION_CREDENTIALS / FIREBASE_SERVICE_ACCOUNT_PATH — file path to JSON
 *  2. FIREBASE_SERVICE_ACCOUNT_JSON — inline JSON
 *  3. FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY (+ project id) — separate fields
 */
function resolveServiceAccount(): {
  projectId: string;
  clientEmail: string;
  privateKey: string;
} {
  const projectId =
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  if (!projectId) {
    throw new Error("Missing FIREBASE_PROJECT_ID / NEXT_PUBLIC_FIREBASE_PROJECT_ID.");
  }

  const normalizeKey = (k: string) => k.replace(/\\n/g, "\n").trim();

  // 1. JSON file path. FIREBASE_SERVICE_ACCOUNT_PATH is only treated as a path
  //    if it actually points at an existing file (some setups accidentally put
  //    the key contents here — fall through to field-based resolution then).
  const pathCandidates = [
    process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim(),
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim(),
    // Convention: drop the downloaded JSON here and it's picked up automatically.
    path.join(process.cwd(), "firebase-service-account.json"),
  ].filter(Boolean) as string[];
  for (const credPath of pathCandidates) {
    const abs = path.isAbsolute(credPath) ? credPath : path.resolve(process.cwd(), credPath);
    if (existsSync(abs)) {
      const parsed = JSON.parse(readFileSync(abs, "utf8")) as {
        client_email?: string;
        private_key?: string;
        project_id?: string;
      };
      if (parsed.client_email && parsed.private_key) {
        return {
          projectId: parsed.project_id ?? projectId,
          clientEmail: parsed.client_email,
          privateKey: normalizeKey(parsed.private_key),
        };
      }
    }
  }

  // 2. Inline JSON.
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (inline) {
    const parsed = JSON.parse(inline) as {
      client_email?: string;
      private_key?: string;
      project_id?: string;
    };
    if (parsed.client_email && parsed.private_key) {
      return {
        projectId: parsed.project_id ?? projectId,
        clientEmail: parsed.client_email,
        privateKey: normalizeKey(parsed.private_key),
      };
    }
  }

  // 3. Separate fields. The private key may live under FIREBASE_PRIVATE_KEY or
  //    FIREBASE_SERVICE_ACCOUNT_KEY.
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = (
    process.env.FIREBASE_PRIVATE_KEY?.trim() ||
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim()
  );
  if (clientEmail && privateKey) {
    if (!clientEmail.includes("@") || !clientEmail.includes(".iam.gserviceaccount.com")) {
      throw new Error(
        `FIREBASE_CLIENT_EMAIL is "${clientEmail}", which is not a service-account email. ` +
          "It must be the `client_email` from the downloaded service-account JSON, e.g. " +
          `firebase-adminsdk-xxxxx@${projectId}.iam.gserviceaccount.com (the numeric value ` +
          "you have is the client_id, not the email).",
      );
    }
    return { projectId, clientEmail, privateKey: normalizeKey(privateKey) };
  }

  throw new Error(
    "Could not resolve Firebase admin credentials. Easiest fix: download the service-account " +
      "JSON (Firebase console → Project settings → Service accounts → Generate new private key) " +
      "and set FIREBASE_SERVICE_ACCOUNT_JSON to its full contents, OR put its path in " +
      "GOOGLE_APPLICATION_CREDENTIALS. Otherwise set FIREBASE_CLIENT_EMAIL (the …@….iam." +
      "gserviceaccount.com address) + FIREBASE_PRIVATE_KEY.",
  );
}

export const env = {
  databaseUrl: required("DATABASE_URL"),
  // Prefer the direct (non-pooled) URL for bulk work if present.
  directUrl: process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL!.trim(),

  firebase: resolveServiceAccount(),

  batchSize: int("BATCH_SIZE", 400),
  dryRun: bool("DRY_RUN", false),
  maxRetries: int("MAX_RETRIES", 3),
  outDir: path.resolve(process.cwd(), process.env.OUT_DIR?.trim() || "./out"),

  apiBaseUrl: process.env.API_BASE_URL?.trim() || "",

  exportPasswordHashes: bool("EXPORT_PASSWORD_HASHES", true),
  scrypt: {
    signerKey: process.env.FIREBASE_SCRYPT_SIGNER_KEY?.trim() || "",
    saltSeparator: process.env.FIREBASE_SCRYPT_SALT_SEPARATOR?.trim() || "Bw==",
    rounds: int("FIREBASE_SCRYPT_ROUNDS", 8),
    memCost: int("FIREBASE_SCRYPT_MEM_COST", 14),
  },
} as const;

// The migration writes to the DIRECT url so the Prisma client (which reads
// DATABASE_URL) targets the unpooled connection during bulk inserts.
process.env.DATABASE_URL = env.directUrl;

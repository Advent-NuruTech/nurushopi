// Node-only password hashing (bcryptjs). Do NOT import from Edge runtime.
import bcrypt from "bcryptjs";
import { FirebaseScrypt } from "firebase-scrypt";

const SALT_ROUNDS = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Project-wide Firebase scrypt parameters (Firebase console → Auth → password hash params). */
export interface FirebaseScryptParams {
  signerKey: string;
  saltSeparator: string;
  rounds: number;
  memCost: number;
}

/**
 * Verify a plaintext password against a Firebase Auth scrypt hash. Used once
 * per migrated user during the lazy-rehash login: on success the caller
 * re-hashes with bcrypt and discards the legacy record. Never throws — a
 * malformed hash/param just fails to verify.
 */
export async function verifyFirebaseScrypt(
  password: string,
  salt: string,
  knownHash: string,
  params: FirebaseScryptParams,
): Promise<boolean> {
  try {
    if (!salt || !knownHash || !params.signerKey) return false;
    const scrypt = new FirebaseScrypt(params);
    return await scrypt.verify(password, salt, knownHash);
  } catch {
    return false;
  }
}

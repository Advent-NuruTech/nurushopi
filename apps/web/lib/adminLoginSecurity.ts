import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
} from "firebase/firestore";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 30;

type LockState = {
  failedAttempts: number;
  lockedUntilMs: number | null;
};

const normalizeLockedUntil = (value: unknown): number | null => {
  if (!value) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof (value as { toMillis?: () => number }).toMillis === "function") {
    return (value as Timestamp).toMillis();
  }
  return null;
};

const attemptDocId = (email: string) => encodeURIComponent(email.toLowerCase());

export async function getAdminLockState(email: string): Promise<LockState> {
  const ref = doc(db, "admin_login_attempts", attemptDocId(email));
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    return { failedAttempts: 0, lockedUntilMs: null };
  }
  const data = snap.data();
  const failedAttempts = Number(data.failedAttempts ?? 0);
  const lockedUntilMs = normalizeLockedUntil(data.lockedUntilMs ?? data.lockedUntil);
  return { failedAttempts, lockedUntilMs };
}

export async function clearAdminLockState(email: string) {
  const ref = doc(db, "admin_login_attempts", attemptDocId(email));
  await setDoc(
    ref,
    {
      failedAttempts: 0,
      lockedUntilMs: null,
      updatedAt: serverTimestamp(),
      lastSuccessAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function recordAdminFailedAttempt(email: string) {
  const ref = doc(db, "admin_login_attempts", attemptDocId(email));
  const nowMs = Date.now();

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists() ? snap.data() : {};
    const currentLockedUntil = normalizeLockedUntil(data.lockedUntilMs ?? data.lockedUntil);

    if (currentLockedUntil && currentLockedUntil > nowMs) {
      tx.set(
        ref,
        { updatedAt: serverTimestamp(), lastFailedAt: serverTimestamp() },
        { merge: true }
      );
      return {
        locked: true,
        lockedUntilMs: currentLockedUntil,
        failedAttempts: Number(data.failedAttempts ?? 0),
      };
    }

    const nextFailedAttempts = Number(data.failedAttempts ?? 0) + 1;
    const shouldLock = nextFailedAttempts >= MAX_FAILED_ATTEMPTS;
    const nextLockedUntil = shouldLock
      ? nowMs + LOCKOUT_MINUTES * 60 * 1000
      : null;

    tx.set(
      ref,
      {
        failedAttempts: shouldLock ? 0 : nextFailedAttempts,
        lockedUntilMs: nextLockedUntil,
        updatedAt: serverTimestamp(),
        lastFailedAt: serverTimestamp(),
        lockCount: shouldLock
          ? Number(data.lockCount ?? 0) + 1
          : Number(data.lockCount ?? 0),
      },
      { merge: true }
    );

    return {
      locked: shouldLock,
      lockedUntilMs: nextLockedUntil,
      failedAttempts: shouldLock ? 0 : nextFailedAttempts,
    };
  });
}

export const ADMIN_LOCKOUT_POLICY = {
  maxFailedAttempts: MAX_FAILED_ATTEMPTS,
  lockoutMinutes: LOCKOUT_MINUTES,
};

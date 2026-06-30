import { prisma, type User } from "@nuru/db";
import { hashPassword, verifyPassword, verifyFirebaseScrypt } from "@nuru/auth/password";
import { generateOpaqueToken, hashToken, generateCode } from "@nuru/auth/crypto";
import type { AuthUser, ProfileUpdateInput, SignupInput } from "@nuru/types";
import { Errors } from "../../lib/errors.js";
import { legacyPasswordLoginEnabled, firebaseScryptParams } from "../../env.js";
import { sendPasswordResetEmail, sendVerificationEmail } from "./email.js";

const LOCKOUT = { maxFailedAttempts: 5, lockMs: 15 * 60 * 1000 };
const RESET_TTL_MS = 60 * 60 * 1000; // 1h
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24h

export function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    address: user.address,
    avatarUrl: user.avatarUrl,
    emailVerified: Boolean(user.emailVerified),
    walletBalance: user.walletBalance.toString(),
    referralCode: user.referralCode,
  };
}

/**
 * Self-service profile edit. Only the provided fields are written; a field set
 * to an empty string clears it (stored as null). `email`/`password` are
 * deliberately out of scope here (they have their own verified flows).
 */
export async function updateProfile(userId: string, input: ProfileUpdateInput): Promise<User> {
  const data: Record<string, string | null> = {};
  if (input.name !== undefined) data.name = input.name?.trim() || null;
  if (input.phone !== undefined) data.phone = input.phone?.trim() || null;
  if (input.address !== undefined) data.address = input.address?.trim() || null;
  if (input.avatarUrl !== undefined) data.avatarUrl = input.avatarUrl?.trim() || null;

  try {
    return await prisma.user.update({ where: { id: userId }, data });
  } catch {
    // The only realistic failure here is the user row vanishing mid-session.
    throw Errors.unauthorized();
  }
}

async function uniqueReferralCode(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = generateCode(8);
    const existing = await prisma.user.findUnique({ where: { referralCode: code } });
    if (!existing) return code;
  }
  return generateCode(12);
}

export async function signup(input: SignupInput): Promise<User> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw Errors.conflict("An account already exists with this email.");

  const passwordHash = await hashPassword(input.password);
  const referralCode = await uniqueReferralCode();

  let referredById: string | null = null;
  if (input.referralCode) {
    const referrer = await prisma.user.findUnique({
      where: { referralCode: input.referralCode },
    });
    referredById = referrer?.id ?? null;
  }

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      name: input.name ?? null,
      phone: input.phone ?? null,
      referralCode,
      referredById,
    },
  });

  if (referredById) {
    await prisma.referral.create({
      data: { referrerId: referredById, referredId: user.id },
    });
  }

  await createAndSendVerification(user.id, user.email);
  return user;
}

export async function createAndSendVerification(userId: string, email: string): Promise<void> {
  const token = generateOpaqueToken();
  await prisma.emailVerificationToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + VERIFY_TTL_MS),
    },
  });
  await sendVerificationEmail(email, token);
}

export async function login(email: string, password: string): Promise<User> {
  const attempt = await prisma.loginAttempt.findUnique({ where: { identifier: email } });
  if (attempt?.lockedUntil && attempt.lockedUntil > new Date()) {
    throw Errors.locked("Account locked due to failed attempts. Try again later or reset your password.");
  }

  let user = await prisma.user.findUnique({ where: { email } });
  let valid = user?.passwordHash
    ? await verifyPassword(password, user.passwordHash)
    : false;

  // Migration fallback: a user imported from Firebase has no bcrypt hash (or it
  // doesn't match). Verify once against their Firebase scrypt hash and, on
  // success, transparently upgrade them to bcrypt so the legacy record is gone.
  if (user && !valid && legacyPasswordLoginEnabled) {
    const upgraded = await tryLegacyLogin(user, password);
    if (upgraded) {
      user = upgraded;
      valid = true;
    }
  }

  if (!user || !valid) {
    await recordFailedAttempt(email);
    throw Errors.unauthorized("Invalid email or password.");
  }
  if (!user.isActive) throw Errors.forbidden("This account has been disabled.");

  await prisma.loginAttempt.deleteMany({ where: { identifier: email } });
  return user;
}

/**
 * One-time Firebase-scrypt → bcrypt password upgrade. Returns the updated user
 * on a correct password, else null. The bcrypt write + legacy-row delete happen
 * in a single transaction so the upgrade is atomic; the user never needs to
 * reset their password.
 */
async function tryLegacyLogin(user: User, password: string): Promise<User | null> {
  const legacy = await prisma.legacyPasswordImport.findUnique({
    where: { userId: user.id },
  });
  if (!legacy) return null;

  const ok = await verifyFirebaseScrypt(
    password,
    legacy.salt,
    legacy.hash,
    firebaseScryptParams,
  );
  if (!ok) return null;

  const passwordHash = await hashPassword(password);
  const [updated] = await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
    prisma.legacyPasswordImport.delete({ where: { userId: user.id } }),
  ]);
  return updated;
}

async function recordFailedAttempt(email: string): Promise<void> {
  const existing = await prisma.loginAttempt.findUnique({ where: { identifier: email } });
  const failedCount = (existing?.failedCount ?? 0) + 1;
  const locked = failedCount >= LOCKOUT.maxFailedAttempts;
  await prisma.loginAttempt.upsert({
    where: { identifier: email },
    update: {
      failedCount,
      lastAttemptAt: new Date(),
      lockedUntil: locked ? new Date(Date.now() + LOCKOUT.lockMs) : null,
    },
    create: {
      identifier: email,
      failedCount,
      lockedUntil: locked ? new Date(Date.now() + LOCKOUT.lockMs) : null,
    },
  });
}

export async function verifyEmail(token: string): Promise<void> {
  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw Errors.badRequest("This verification link is invalid or has expired.");
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { emailVerified: new Date() } }),
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);
}

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  // Always return success to avoid leaking which emails exist.
  if (!user) return;

  const token = generateOpaqueToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + RESET_TTL_MS),
    },
  });
  await sendPasswordResetEmail(user.email, token);
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw Errors.badRequest("This reset link is invalid or has expired.");
  }
  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    // Revoke all refresh tokens so existing sessions are invalidated.
    prisma.refreshToken.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
}

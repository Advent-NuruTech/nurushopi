import { prisma, type VendorAccount } from "@nuru/db";
import { hashPassword, verifyPassword } from "@nuru/auth/password";
import { generateOpaqueToken, hashToken } from "@nuru/auth/crypto";
import type { VendorLoginInput, VendorSignupInput, VendorUserDTO } from "@nuru/types";
import { env } from "../../env.js";
import { Errors } from "../../lib/errors.js";

const LOCKOUT = { maxFailedAttempts: 5, lockMs: 15 * 60 * 1000 };
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const lockKey = (email: string) => `vendor:${email}`;

export function toVendorUser(vendor: VendorAccount): VendorUserDTO {
  return {
    id: vendor.id,
    email: vendor.email,
    name: vendor.name,
    applicationId: vendor.applicationId,
    isActive: vendor.isActive,
    createdAt: vendor.createdAt.toISOString(),
  };
}

export async function login(email: string, password: string): Promise<VendorAccount> {
  const key = lockKey(email);
  const attempt = await prisma.loginAttempt.findUnique({ where: { identifier: key } });
  if (attempt?.lockedUntil && attempt.lockedUntil > new Date()) {
    throw Errors.locked("Account locked due to failed attempts. Try again later.");
  }

  const vendor = await prisma.vendorAccount.findUnique({ where: { email } });
  const valid = vendor ? await verifyPassword(password, vendor.passwordHash) : false;

  if (!vendor || !valid) {
    await recordFailedAttempt(key);
    throw Errors.unauthorized("Invalid email or password.");
  }
  if (!vendor.isActive) throw Errors.forbidden("This vendor account has been disabled.");

  await prisma.loginAttempt.deleteMany({ where: { identifier: key } });
  return vendor;
}

async function recordFailedAttempt(key: string): Promise<void> {
  const existing = await prisma.loginAttempt.findUnique({ where: { identifier: key } });
  const failedCount = (existing?.failedCount ?? 0) + 1;
  const locked = failedCount >= LOCKOUT.maxFailedAttempts;
  await prisma.loginAttempt.upsert({
    where: { identifier: key },
    update: {
      failedCount,
      lastAttemptAt: new Date(),
      lockedUntil: locked ? new Date(Date.now() + LOCKOUT.lockMs) : null,
    },
    create: {
      identifier: key,
      failedCount,
      lockedUntil: locked ? new Date(Date.now() + LOCKOUT.lockMs) : null,
    },
  });
}

/**
 * Vendor signup via invite token. The invite must be PENDING, not expired,
 * and the email must match. Creates a VendorAccount linked to the application.
 */
export async function signup(input: VendorSignupInput): Promise<VendorAccount> {
  const existingForEmail = await prisma.vendorAccount.findUnique({ where: { email: input.email } });
  if (existingForEmail) throw Errors.conflict("A vendor account already exists with this email.");

  if (!input.inviteToken) {
    throw Errors.badRequest("An invite token is required. Ask an admin to invite you.");
  }

  const invite = await prisma.vendorInvite.findUnique({
    where: { tokenHash: hashToken(input.inviteToken) },
  });
  if (!invite || invite.status !== "PENDING" || invite.expiresAt < new Date()) {
    throw Errors.badRequest("This invite is invalid or has expired.");
  }
  if (invite.email !== input.email) {
    throw Errors.badRequest("This invite was issued for a different email address.");
  }

  const passwordHash = await hashPassword(input.password);

  return prisma.$transaction(async (tx) => {
    const vendor = await tx.vendorAccount.create({
      data: {
        name: input.name.trim(),
        email: input.email,
        passwordHash,
        applicationId: invite.applicationId,
      },
    });
    await tx.vendorInvite.update({
      where: { id: invite.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });
    return vendor;
  });
}

export async function getById(id: string): Promise<VendorAccount> {
  const vendor = await prisma.vendorAccount.findUnique({ where: { id } });
  if (!vendor) throw Errors.unauthorized();
  return vendor;
}

/**
 * Create a vendor invite (called from the admin vendors module).
 * Returns the raw token once — never stored in plaintext.
 */
export async function createInvite(email: string, applicationId: string) {
  // Supersede any earlier pending invite for the same email.
  await prisma.vendorInvite.updateMany({
    where: { email, status: "PENDING" },
    data: { status: "REVOKED" },
  });

  const token = generateOpaqueToken();
  const invite = await prisma.vendorInvite.create({
    data: {
      email,
      applicationId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    },
  });

  return {
    id: invite.id,
    email: invite.email,
    applicationId: invite.applicationId,
    token,
    status: invite.status,
    expiresAt: invite.expiresAt.toISOString(),
    createdAt: invite.createdAt.toISOString(),
  };
}

import { prisma, type Admin } from "@nuru/db";
import { hashPassword, verifyPassword } from "@nuru/auth/password";
import { generateOpaqueToken, hashToken, timingSafeEqualStr } from "@nuru/auth/crypto";
import type {
  AdminInviteDTO,
  AdminInviteInput,
  AdminRole,
  AdminSignupInput,
  AdminUserDTO,
} from "@nuru/types";
import { env } from "../../env.js";
import { Errors } from "../../lib/errors.js";

const LOCKOUT = { maxFailedAttempts: 5, lockMs: 15 * 60 * 1000 };
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
/** LoginAttempt rows are shared with customer auth; namespace admin identifiers. */
const lockKey = (email: string) => `admin:${email}`;

export function toAdminUser(admin: Admin): AdminUserDTO {
  return {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
    isActive: admin.isActive,
    createdAt: admin.createdAt.toISOString(),
  };
}

export async function login(email: string, password: string): Promise<Admin> {
  const key = lockKey(email);
  const attempt = await prisma.loginAttempt.findUnique({ where: { identifier: key } });
  if (attempt?.lockedUntil && attempt.lockedUntil > new Date()) {
    throw Errors.locked("Account locked due to failed attempts. Try again later.");
  }

  const admin = await prisma.admin.findUnique({ where: { email } });
  const valid = admin ? await verifyPassword(password, admin.passwordHash) : false;

  if (!admin || !valid) {
    await recordFailedAttempt(key);
    throw Errors.unauthorized("Invalid email or password.");
  }
  if (!admin.isActive) throw Errors.forbidden("This admin account has been disabled.");

  await prisma.loginAttempt.deleteMany({ where: { identifier: key } });
  return admin;
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
 * Creates an admin via exactly one of two paths (the schema guarantees exactly
 * one credential is present):
 *   - `seniorCode` matches SENIOR_ADMIN_CODE  → a new SENIOR (any number allowed).
 *   - `inviteToken` redeems a PENDING invite  → role taken from the invite.
 * The server alone decides the role; a client can never claim SENIOR directly.
 */
export async function signup(input: AdminSignupInput): Promise<Admin> {
  const existingForEmail = await prisma.admin.findUnique({ where: { email: input.email } });
  if (existingForEmail) throw Errors.conflict("An admin already exists with this email.");

  const passwordHash = await hashPassword(input.password);

  if (input.seniorCode !== undefined) {
    return signupSenior(input, passwordHash);
  }
  return signupFromInvite(input, passwordHash);
}

/** Self-service SENIOR registration, gated by the shared SENIOR_ADMIN_CODE. */
async function signupSenior(input: AdminSignupInput, passwordHash: string): Promise<Admin> {
  // Fail closed: with no code configured, senior signup is disabled outright.
  if (!env.SENIOR_ADMIN_CODE) {
    throw Errors.forbidden("Senior admin signup is not enabled.");
  }
  if (!timingSafeEqualStr(input.seniorCode ?? "", env.SENIOR_ADMIN_CODE)) {
    throw Errors.unauthorized("Invalid senior admin code.");
  }
  return prisma.admin.create({
    data: { name: input.name.trim(), email: input.email, passwordHash, role: "SENIOR" },
  });
}

/** Invited registration: redeem a valid, email-matched, PENDING invite. */
async function signupFromInvite(input: AdminSignupInput, passwordHash: string): Promise<Admin> {
  if (!input.inviteToken) {
    throw Errors.badRequest("An invite token is required. Ask a senior admin to invite you.");
  }

  const invite = await prisma.adminInvite.findUnique({
    where: { tokenHash: hashToken(input.inviteToken) },
  });
  if (!invite || invite.status !== "PENDING" || invite.expiresAt < new Date()) {
    throw Errors.badRequest("This invite is invalid or has expired.");
  }
  if (invite.email !== input.email) {
    throw Errors.badRequest("This invite was issued for a different email address.");
  }

  return prisma.$transaction(async (tx) => {
    const admin = await tx.admin.create({
      data: { name: input.name.trim(), email: input.email, passwordHash, role: invite.role },
    });
    await tx.adminInvite.update({
      where: { id: invite.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });
    return admin;
  });
}

export async function createInvite(
  createdById: string,
  input: AdminInviteInput,
): Promise<AdminInviteDTO> {
  const existing = await prisma.admin.findUnique({ where: { email: input.email } });
  if (existing) throw Errors.conflict("An admin already exists with this email.");

  // Supersede any earlier pending invite for the same email.
  await prisma.adminInvite.updateMany({
    where: { email: input.email, status: "PENDING" },
    data: { status: "REVOKED" },
  });

  const token = generateOpaqueToken();
  const invite = await prisma.adminInvite.create({
    data: {
      email: input.email,
      role: input.role,
      tokenHash: hashToken(token),
      createdById,
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    },
  });

  return {
    id: invite.id,
    email: invite.email,
    role: invite.role,
    token, // only returned here, at creation time
    status: invite.status,
    expiresAt: invite.expiresAt.toISOString(),
    createdAt: invite.createdAt.toISOString(),
  };
}

export async function listAdmins(): Promise<AdminUserDTO[]> {
  const admins = await prisma.admin.findMany({ orderBy: { createdAt: "asc" } });
  return admins.map(toAdminUser);
}

export async function updateRole(targetId: string, role: AdminRole): Promise<AdminUserDTO> {
  try {
    const admin = await prisma.admin.update({ where: { id: targetId }, data: { role } });
    return toAdminUser(admin);
  } catch {
    throw Errors.notFound("Admin not found.");
  }
}

/** Remove another admin. A SENIOR cannot remove their own account this way. */
export async function removeAdmin(targetId: string, actingAdminId: string): Promise<void> {
  if (targetId === actingAdminId) throw Errors.badRequest("You cannot remove your own account.");
  try {
    await prisma.admin.delete({ where: { id: targetId } });
  } catch {
    throw Errors.notFound("Admin not found.");
  }
}

export async function getById(id: string): Promise<Admin> {
  const admin = await prisma.admin.findUnique({ where: { id } });
  if (!admin) throw Errors.unauthorized();
  return admin;
}

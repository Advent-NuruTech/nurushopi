import { z } from "zod";
import { emailSchema, passwordSchema } from "./auth.js";

// ---------------------------------------------------------------------------
// Admin authentication & management
//
// Admins are a separate principal from customers (their own table, their own
// session cookie). Roles are normalized to one role per admin: SENIOR can invite
// other admins and manage everything; SUB is scoped down.
//
// There are exactly two ways to become an admin:
//   1. SENIOR — present the shared `SENIOR_ADMIN_CODE`. Any number of seniors
//      may register this way; the code is verified server-side in constant time.
//   2. Invited — redeem a single-use invite token created by a SENIOR; the role
//      is taken from the invite (SENIOR or SUB).
// ---------------------------------------------------------------------------

/** Admin roles. Mirrors the Prisma `AdminRole` enum. */
export const ADMIN_ROLES = ["SENIOR", "SUB"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const adminLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required."),
});
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

/**
 * Admin signup. Exactly one credential must be supplied: `seniorCode` to self-
 * register as SENIOR, or `inviteToken` to redeem an invite. The server is the
 * sole authority on which path applies — never trust a client-claimed role.
 */
export const adminSignupSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required.").max(120),
    email: emailSchema,
    password: passwordSchema,
    seniorCode: z.string().min(1).max(200).optional(),
    inviteToken: z.string().trim().min(1).max(200).optional(),
  })
  .refine((v) => Boolean(v.seniorCode) !== Boolean(v.inviteToken), {
    message: "Provide either a senior admin code or an invite token, not both.",
    path: ["seniorCode"],
  });
export type AdminSignupInput = z.infer<typeof adminSignupSchema>;

/** A SENIOR admin invites a new admin by email + role. */
export const adminInviteSchema = z.object({
  email: emailSchema,
  role: z.enum(ADMIN_ROLES).default("SUB"),
});
export type AdminInviteInput = z.infer<typeof adminInviteSchema>;

/** SENIOR changes another admin's role. */
export const adminRoleUpdateSchema = z.object({
  role: z.enum(ADMIN_ROLES),
});
export type AdminRoleUpdateInput = z.infer<typeof adminRoleUpdateSchema>;

/** Public shape of an admin returned by the API (never includes the hash). */
export interface AdminUserDTO {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  isActive: boolean;
  createdAt: string;
}

/** A created invite, returned to the SENIOR who made it (with the shareable token). */
export interface AdminInviteDTO {
  id: string;
  email: string;
  role: AdminRole;
  /** The raw single-use token (only returned at creation time). */
  token?: string;
  status: "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";
  expiresAt: string;
  createdAt: string;
}

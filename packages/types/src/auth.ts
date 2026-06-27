import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Please enter a valid email address.");

// Strong-ish password policy: min 8, at least one letter and one number.
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password is too long.")
  .regex(/[A-Za-z]/, "Password must contain a letter.")
  .regex(/[0-9]/, "Password must contain a number.");

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().trim().min(1, "Name is required.").max(120).optional(),
  phone: z.string().trim().max(32).optional(),
  referralCode: z.string().trim().max(64).optional(),
});
export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required."),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required."),
  password: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const verifyEmailSchema = z.object({
  token: z.string().min(1, "Verification token is required."),
});
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

/** Public shape of an authenticated user returned by the API. */
export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  walletBalance: string; // Decimal serialized as string
  referralCode: string | null;
}

/** JWT access-token claims. */
export interface AccessTokenClaims {
  sub: string; // userId
  email: string;
  type: "access";
}

export interface AdminAccessTokenClaims {
  sub: string; // adminId
  email: string;
  role: "SENIOR" | "SUB";
  type: "admin_access";
}

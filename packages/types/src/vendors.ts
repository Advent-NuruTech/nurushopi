import { z } from "zod";
import { emailSchema, passwordSchema } from "./auth";
import { paginationQuerySchema } from "./catalog";

// ---------------------------------------------------------------------------
// Vendor applications
//
// A "sell with us" application. It may be submitted by a guest or an
// authenticated user (linked to their account when present). An applicant may
// have only one open (PENDING) application at a time; admins approve or reject.
// ---------------------------------------------------------------------------

/** Lifecycle of an application. Mirrors `VendorApplicationStatus`. */
export const VENDOR_APPLICATION_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type VendorApplicationStatus = (typeof VENDOR_APPLICATION_STATUSES)[number];

export const vendorApplicationCreateSchema = z
  .object({
    businessName: z.string().trim().min(1, "Business name is required.").max(160),
    contactName: z.string().trim().max(120).optional().nullable(),
    email: emailSchema,
    phone: z.string().trim().max(32).optional().nullable(),
    description: z.string().trim().max(2000).optional().nullable(),
  })
  .strict();
export type VendorApplicationCreateInput = z.infer<typeof vendorApplicationCreateSchema>;

export const vendorApplicationModerateSchema = z
  .object({ status: z.enum(VENDOR_APPLICATION_STATUSES) })
  .strict();
export type VendorApplicationModerateInput = z.infer<typeof vendorApplicationModerateSchema>;

export const vendorApplicationQuerySchema = paginationQuerySchema.extend({
  status: z.enum(VENDOR_APPLICATION_STATUSES).optional(),
  search: z.string().trim().max(120).optional(),
  sort: z.enum(["newest", "oldest"]).default("newest"),
});
export type VendorApplicationQuery = z.infer<typeof vendorApplicationQuerySchema>;

export interface VendorApplicationDTO {
  id: string;
  userId: string | null;
  businessName: string;
  contactName: string | null;
  email: string;
  phone: string | null;
  description: string | null;
  status: VendorApplicationStatus;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Vendor authentication
//
// Vendors are invited by admins after their application is approved. They get
// their own login system separate from admin auth.
// ---------------------------------------------------------------------------

export const vendorLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required."),
});
export type VendorLoginInput = z.infer<typeof vendorLoginSchema>;

export const vendorSignupSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  email: emailSchema,
  password: passwordSchema,
  inviteToken: z.string().trim().min(1, "Invite token is required.").max(200),
});
export type VendorSignupInput = z.infer<typeof vendorSignupSchema>;

/** Public shape of a vendor account returned by the API. */
export interface VendorUserDTO {
  id: string;
  email: string;
  name: string;
  applicationId: string;
  isActive: boolean;
  createdAt: string;
}

/** A created vendor invite, returned to the admin who made it. */
export interface VendorInviteDTO {
  id: string;
  email: string;
  applicationId: string;
  token?: string;
  status: "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";
  expiresAt: string;
  createdAt: string;
}

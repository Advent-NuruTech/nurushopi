import { z } from "zod";
import { emailSchema } from "./auth.js";
import { paginationQuerySchema } from "./catalog.js";

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

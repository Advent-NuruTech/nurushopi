import type { VendorApplication } from "@nuru/db";
import type { VendorApplicationDTO, VendorApplicationStatus } from "@nuru/types";

export function toVendorApplicationDTO(v: VendorApplication): VendorApplicationDTO {
  return {
    id: v.id,
    userId: v.userId,
    businessName: v.businessName,
    contactName: v.contactName,
    email: v.email,
    phone: v.phone,
    description: v.description,
    status: v.status as VendorApplicationStatus,
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
  };
}

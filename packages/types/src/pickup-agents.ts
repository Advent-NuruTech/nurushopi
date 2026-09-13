import { z } from "zod";
import { emailSchema, passwordSchema } from "./auth";
import { idSchema, paginationQuerySchema } from "./catalog";

export const pickupAgentLoginSchema = z
  .object({ email: emailSchema, password: z.string().min(1, "Password is required.") })
  .strict();
export type PickupAgentLoginInput = z.infer<typeof pickupAgentLoginSchema>;

export const pickupAgentCreateSchema = z
  .object({
    stationId: idSchema,
    name: z.string().trim().min(2).max(120),
    email: emailSchema,
    phone: z.string().trim().max(32).optional().nullable(),
    password: passwordSchema,
    isActive: z.boolean().default(true),
  })
  .strict();
export type PickupAgentCreateInput = z.infer<typeof pickupAgentCreateSchema>;

export const pickupAgentUpdateSchema = z
  .object({
    stationId: idSchema.optional(),
    name: z.string().trim().min(2).max(120).optional(),
    phone: z.string().trim().max(32).optional().nullable(),
    password: passwordSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: "Nothing to update." });
export type PickupAgentUpdateInput = z.infer<typeof pickupAgentUpdateSchema>;

export const pickupOrderQuerySchema = paginationQuerySchema.extend({
  status: z
    .enum(["CONFIRMED", "PROCESSING", "SHIPPED", "AT_PICKUP_STATION", "PICKED_UP"])
    .optional(),
  search: z.string().trim().max(120).optional(),
});
export type PickupOrderQuery = z.infer<typeof pickupOrderQuerySchema>;

export const pickupOrderStatusUpdateSchema = z
  .object({
    status: z.enum(["AT_PICKUP_STATION", "PICKED_UP"]),
    note: z.string().trim().max(500).optional().nullable(),
  })
  .strict();
export type PickupOrderStatusUpdateInput = z.infer<typeof pickupOrderStatusUpdateSchema>;

export interface PickupAgentDTO {
  id: string;
  stationId: string;
  stationName: string;
  stationAddress: string;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface PickupAgentAccessTokenClaims {
  sub: string;
  email: string;
  stationId: string;
  type: "pickup_agent_access";
}

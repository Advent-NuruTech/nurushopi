import { z } from "zod";
import { idSchema, moneySchema, paginationQuerySchema } from "./catalog";

export const FULFILLMENT_METHODS = ["LEGACY", "PICKUP_STATION", "DOORSTEP"] as const;
export type FulfillmentMethod = (typeof FULFILLMENT_METHODS)[number];

export const CUSTOMER_FULFILLMENT_METHODS = ["PICKUP_STATION", "DOORSTEP"] as const;
export type CustomerFulfillmentMethod = (typeof CUSTOMER_FULFILLMENT_METHODS)[number];

export const fulfillmentConfigurationUpdateSchema = z
  .object({
    featureEnabled: z.boolean(),
    pickupEnabled: z.boolean(),
    doorstepEnabled: z.boolean(),
    doorstepFee: moneySchema,
    doorstepEstimatedDeliveryTime: z.string().trim().max(160).optional().nullable(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.featureEnabled && !value.pickupEnabled && !value.doorstepEnabled) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enable at least one delivery method before enabling the feature.",
        path: ["featureEnabled"],
      });
    }
  });
export type FulfillmentConfigurationUpdateInput = z.infer<
  typeof fulfillmentConfigurationUpdateSchema
>;

export interface FulfillmentConfigurationDTO {
  featureEnabled: boolean;
  pickupEnabled: boolean;
  doorstepEnabled: boolean;
  doorstepFee: string;
  doorstepEstimatedDeliveryTime: string | null;
}

const coordinateSchema = z.coerce.number().finite();

export const pickupStationCreateSchema = z
  .object({
    name: z.string().trim().min(1, "Station name is required.").max(160),
    address: z.string().trim().min(1, "Station address is required.").max(500),
    city: z.string().trim().max(120).optional().nullable(),
    region: z.string().trim().max(120).optional().nullable(),
    latitude: coordinateSchema.min(-90).max(90).optional().nullable(),
    longitude: coordinateSchema.min(-180).max(180).optional().nullable(),
    contactPhone: z.string().trim().max(32).optional().nullable(),
    operatingHours: z.string().trim().max(500).optional().nullable(),
    deliveryFee: moneySchema,
    estimatedDeliveryTime: z.string().trim().max(160).optional().nullable(),
    instructions: z.string().trim().max(1000).optional().nullable(),
    isActive: z.boolean().default(true),
    displayOrder: z.coerce.number().int().min(0).max(1_000_000).default(0),
  })
  .strict();
export type PickupStationCreateInput = z.infer<typeof pickupStationCreateSchema>;

export const pickupStationUpdateSchema = pickupStationCreateSchema.partial().strict();
export type PickupStationUpdateInput = z.infer<typeof pickupStationUpdateSchema>;

export const pickupStationQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(120).optional(),
  includeArchived: z
    .union([z.boolean(), z.enum(["true", "false"]).transform((value) => value === "true")])
    .default(false),
});
export type PickupStationQuery = z.infer<typeof pickupStationQuerySchema>;

export interface PickupStationDTO {
  id: string;
  name: string;
  address: string;
  city: string | null;
  region: string | null;
  latitude: string | null;
  longitude: string | null;
  contactPhone: string | null;
  operatingHours: string | null;
  deliveryFee: string;
  estimatedDeliveryTime: string | null;
  instructions: string | null;
  isActive: boolean;
  archivedAt: string | null;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PublicFulfillmentDTO extends FulfillmentConfigurationDTO {
  stations: PickupStationDTO[];
}

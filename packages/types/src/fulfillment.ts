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
    dispatchCounty: z.string().trim().max(120).optional().nullable(),
    dispatchArea: z.string().trim().max(160).optional().nullable(),
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
  dispatchCounty: string | null;
  dispatchArea: string | null;
}

const coordinateSchema = z.coerce.number().finite();

export const pickupStationCreateSchema = z
  .object({
    name: z.string().trim().min(1, "Station name is required.").max(160),
    address: z.string().trim().min(1, "Station address is required.").max(500),
    city: z.string().trim().min(2, "Town or city is required.").max(120),
    region: z.string().trim().min(2, "County is required.").max(120),
    latitude: coordinateSchema.min(-90).max(90).optional().nullable(),
    longitude: coordinateSchema.min(-180).max(180).optional().nullable(),
    contactPhone: z.string().trim().max(32).optional().nullable(),
    operatingHours: z.string().trim().min(1, "Operating hours are required.").max(500),
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
  quote?: DeliveryQuoteDTO;
}

export interface PublicFulfillmentDTO extends FulfillmentConfigurationDTO {
  stations: PickupStationDTO[];
}

export const DELIVERY_RATE_METHODS = ["PICKUP_STATION", "DOORSTEP"] as const;
export type DeliveryRateMethod = (typeof DELIVERY_RATE_METHODS)[number];

export const deliveryRateCreateSchema = z
  .object({
    name: z.string().trim().min(2, "Route name is required.").max(160),
    method: z.enum(DELIVERY_RATE_METHODS),
    originCounty: z.string().trim().min(2, "Origin county is required.").max(120),
    originArea: z.string().trim().max(160).optional().nullable(),
    destinationCounty: z.string().trim().min(2, "Destination county is required.").max(120),
    destinationArea: z.string().trim().max(160).optional().nullable(),
    fee: moneySchema,
    estimatedDeliveryTime: z.string().trim().min(2, "Delivery estimate is required.").max(160),
    priority: z.coerce.number().int().min(0).max(1_000_000).default(0),
    isActive: z.boolean().default(true),
  })
  .strict();
export type DeliveryRateCreateInput = z.infer<typeof deliveryRateCreateSchema>;

export const deliveryRateUpdateSchema = deliveryRateCreateSchema.partial().strict();
export type DeliveryRateUpdateInput = z.infer<typeof deliveryRateUpdateSchema>;

export const deliveryRateQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(120).optional(),
  method: z.enum(DELIVERY_RATE_METHODS).optional(),
  includeArchived: z
    .union([z.boolean(), z.enum(["true", "false"]).transform((value) => value === "true")])
    .default(false),
});
export type DeliveryRateQuery = z.infer<typeof deliveryRateQuerySchema>;

export type DeliveryRateDTO = Omit<DeliveryRateCreateInput, "fee"> & {
  id: string;
  fee: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export const deliveryQuoteRequestSchema = z
  .object({
    method: z.enum(DELIVERY_RATE_METHODS),
    destinationCounty: z.string().trim().min(2).max(120),
    destinationArea: z.string().trim().max(160).optional().nullable(),
  })
  .strict();
export type DeliveryQuoteRequest = z.infer<typeof deliveryQuoteRequestSchema>;

export interface DeliveryQuoteDTO {
  status: "CONFIRMED" | "PENDING_QUOTE";
  fee: string | null;
  estimatedDeliveryTime: string | null;
  rateId: string | null;
  origin: string | null;
  destination: string;
}

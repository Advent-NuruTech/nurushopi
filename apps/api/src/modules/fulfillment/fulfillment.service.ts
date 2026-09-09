import { prisma, Prisma, type DeliveryRate, type PickupStation } from "@nuru/db";
import type {
  DeliveryQuoteDTO,
  DeliveryQuoteRequest,
  DeliveryRateCreateInput,
  DeliveryRateDTO,
  DeliveryRateQuery,
  DeliveryRateUpdateInput,
  FulfillmentConfigurationDTO,
  FulfillmentConfigurationUpdateInput,
  Paginated,
  PickupStationCreateInput,
  PickupStationDTO,
  PickupStationQuery,
  PickupStationUpdateInput,
  PublicFulfillmentDTO,
} from "@nuru/types";
import { Errors } from "../../lib/errors.js";

export const DISABLED_FULFILLMENT_CONFIGURATION: FulfillmentConfigurationDTO = {
  featureEnabled: false,
  pickupEnabled: false,
  doorstepEnabled: false,
  dispatchCounty: null,
  dispatchArea: null,
};

const DEFAULT_ADMIN_CONFIGURATION: FulfillmentConfigurationDTO = {
  featureEnabled: false,
  pickupEnabled: true,
  doorstepEnabled: true,
  dispatchCounty: null,
  dispatchArea: null,
};

function isMissingFulfillmentTable(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021";
}

export function toPickupStationDTO(station: PickupStation): PickupStationDTO {
  return {
    id: station.id,
    name: station.name,
    address: station.address,
    city: station.city,
    region: station.region,
    latitude: station.latitude?.toString() ?? null,
    longitude: station.longitude?.toString() ?? null,
    contactPhone: station.contactPhone,
    operatingHours: station.operatingHours,
    deliveryFee: station.deliveryFee.toString(),
    estimatedDeliveryTime: station.estimatedDeliveryTime,
    instructions: station.instructions,
    isActive: station.isActive,
    archivedAt: station.archivedAt?.toISOString() ?? null,
    displayOrder: station.displayOrder,
    createdAt: station.createdAt.toISOString(),
    updatedAt: station.updatedAt.toISOString(),
  };
}

function toConfigurationDTO(
  row: {
    featureEnabled: boolean;
    pickupEnabled: boolean;
    doorstepEnabled: boolean;
    dispatchCounty: string | null;
    dispatchArea: string | null;
  } | null,
): FulfillmentConfigurationDTO {
  if (!row) return DISABLED_FULFILLMENT_CONFIGURATION;
  return {
    featureEnabled: row.featureEnabled,
    pickupEnabled: row.pickupEnabled,
    doorstepEnabled: row.doorstepEnabled,
    dispatchCounty: row.dispatchCounty,
    dispatchArea: row.dispatchArea,
  };
}

/**
 * Public reads fail closed. During a rolling deployment, an application
 * instance can safely serve the legacy checkout until the migration exists.
 */
export async function getPublicConfiguration(): Promise<PublicFulfillmentDTO> {
  try {
    const configuration = await prisma.fulfillmentConfiguration.findUnique({
      where: { id: "default" },
    });
    const dto = toConfigurationDTO(configuration);
    if (!dto.featureEnabled || (!dto.pickupEnabled && !dto.doorstepEnabled)) {
      return { ...DISABLED_FULFILLMENT_CONFIGURATION, stations: [] };
    }
    const stations = dto.pickupEnabled
      ? await prisma.pickupStation.findMany({
          where: { isActive: true, archivedAt: null },
          orderBy: [{ displayOrder: "asc" }, { name: "asc" }, { id: "asc" }],
        })
      : [];
    // Manual pickup details remain available when a customer's preferred
    // station has not been added to the directory yet.
    const pickupEnabled = dto.pickupEnabled;
    const featureEnabled = dto.featureEnabled && (pickupEnabled || dto.doorstepEnabled);
    if (!featureEnabled) return { ...DISABLED_FULFILLMENT_CONFIGURATION, stations: [] };
    return { ...dto, featureEnabled, pickupEnabled, stations: stations.map(toPickupStationDTO) };
  } catch (error) {
    if (isMissingFulfillmentTable(error)) {
      return { ...DISABLED_FULFILLMENT_CONFIGURATION, stations: [] };
    }
    throw error;
  }
}

export async function getAdminConfiguration(): Promise<FulfillmentConfigurationDTO> {
  const row = await prisma.fulfillmentConfiguration.findUnique({ where: { id: "default" } });
  return row ? toConfigurationDTO(row) : DEFAULT_ADMIN_CONFIGURATION;
}

export async function updateConfiguration(
  input: FulfillmentConfigurationUpdateInput,
  adminId: string,
): Promise<FulfillmentConfigurationDTO> {
  const row = await prisma.$transaction(async (tx) => {
    const configuration = await tx.fulfillmentConfiguration.upsert({
      where: { id: "default" },
      create: { id: "default", ...input },
      update: input,
    });
    await tx.adminLog.create({
      data: {
        adminId,
        action: "fulfillment.configuration.updated",
        entity: "fulfillment_configuration",
        entityId: configuration.id,
        metadata: {
          featureEnabled: configuration.featureEnabled,
          pickupEnabled: configuration.pickupEnabled,
          doorstepEnabled: configuration.doorstepEnabled,
        },
      },
    });
    return configuration;
  });
  return toConfigurationDTO(row);
}

function stationWhere(query: PickupStationQuery): Prisma.PickupStationWhereInput {
  return {
    ...(query.includeArchived ? {} : { archivedAt: null }),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: "insensitive" as const } },
            { address: { contains: query.search, mode: "insensitive" as const } },
            { city: { contains: query.search, mode: "insensitive" as const } },
            { region: { contains: query.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
}

export async function listStations(
  query: PickupStationQuery,
): Promise<Paginated<PickupStationDTO>> {
  const where = stationWhere(query);
  const [total, rows] = await prisma.$transaction([
    prisma.pickupStation.count({ where }),
    prisma.pickupStation.findMany({
      where,
      orderBy: [{ archivedAt: "asc" }, { displayOrder: "asc" }, { name: "asc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);
  return {
    items: rows.map(toPickupStationDTO),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

export async function createStation(
  input: PickupStationCreateInput,
  adminId: string,
): Promise<PickupStationDTO> {
  const station = await prisma.$transaction(async (tx) => {
    const created = await tx.pickupStation.create({ data: input });
    await tx.adminLog.create({
      data: {
        adminId,
        action: "fulfillment.pickup_station.created",
        entity: "pickup_station",
        entityId: created.id,
        metadata: { name: created.name, isActive: created.isActive },
      },
    });
    return created;
  });
  return toPickupStationDTO(station);
}

export async function updateStation(
  id: string,
  input: PickupStationUpdateInput,
  adminId: string,
): Promise<PickupStationDTO> {
  const existing = await prisma.pickupStation.findUnique({ where: { id } });
  if (!existing) throw Errors.notFound("Pickup station not found.");
  if (existing.archivedAt) throw Errors.badRequest("Archived pickup stations cannot be edited.");

  const station = await prisma.$transaction(async (tx) => {
    const updated = await tx.pickupStation.update({ where: { id }, data: input });
    await tx.adminLog.create({
      data: {
        adminId,
        action: "fulfillment.pickup_station.updated",
        entity: "pickup_station",
        entityId: id,
        metadata: { changedFields: Object.keys(input) },
      },
    });
    return updated;
  });
  return toPickupStationDTO(station);
}

/** Archive instead of deleting so order relations and operational history survive. */
export async function archiveStation(id: string, adminId: string): Promise<void> {
  const existing = await prisma.pickupStation.findUnique({ where: { id } });
  if (!existing) throw Errors.notFound("Pickup station not found.");
  if (existing.archivedAt) return;
  await prisma.$transaction(async (tx) => {
    await tx.pickupStation.update({
      where: { id },
      data: { archivedAt: new Date(), isActive: false },
    });
    await tx.adminLog.create({
      data: {
        adminId,
        action: "fulfillment.pickup_station.archived",
        entity: "pickup_station",
        entityId: id,
        metadata: { name: existing.name },
      },
    });
  });
}

function toDeliveryRateDTO(rate: DeliveryRate): DeliveryRateDTO {
  return {
    id: rate.id,
    name: rate.name,
    method: rate.method as DeliveryRateDTO["method"],
    originCounty: rate.originCounty,
    originArea: rate.originArea,
    destinationCounty: rate.destinationCounty,
    destinationArea: rate.destinationArea,
    fee: rate.fee.toString(),
    estimatedDeliveryTime: rate.estimatedDeliveryTime,
    priority: rate.priority,
    isActive: rate.isActive,
    archivedAt: rate.archivedAt?.toISOString() ?? null,
    createdAt: rate.createdAt.toISOString(),
    updatedAt: rate.updatedAt.toISOString(),
  };
}

const normalized = (value: string | null | undefined): string => value?.trim().toLowerCase() ?? "";
const locationLabel = (area: string | null | undefined, county: string): string =>
  [area?.trim(), county.trim()].filter(Boolean).join(", ");

/**
 * Find the most specific active route for the configured dispatch origin.
 * Area-to-area beats county-wide, then admins can resolve overlaps by priority.
 */
export async function resolveDeliveryQuote(
  client: Prisma.TransactionClient | typeof prisma,
  request: DeliveryQuoteRequest,
): Promise<DeliveryQuoteDTO> {
  const configuration = await client.fulfillmentConfiguration.findUnique({
    where: { id: "default" },
    select: { dispatchCounty: true, dispatchArea: true },
  });
  const destination = locationLabel(request.destinationArea, request.destinationCounty);
  if (!configuration?.dispatchCounty) {
    return {
      status: "PENDING_QUOTE",
      fee: null,
      estimatedDeliveryTime: null,
      rateId: null,
      origin: null,
      destination,
    };
  }
  const candidates = await client.deliveryRate.findMany({
    where: {
      method: request.method,
      isActive: true,
      archivedAt: null,
      originCounty: { equals: configuration.dispatchCounty, mode: "insensitive" },
      destinationCounty: { equals: request.destinationCounty, mode: "insensitive" },
    },
    orderBy: [{ priority: "desc" }, { updatedAt: "desc" }, { id: "asc" }],
  });
  const originArea = normalized(configuration.dispatchArea);
  const destinationArea = normalized(request.destinationArea);
  const compatible = candidates
    .filter((rate) => !rate.originArea || normalized(rate.originArea) === originArea)
    .filter((rate) => !rate.destinationArea || normalized(rate.destinationArea) === destinationArea)
    .sort((a, b) => {
      const specificity = (rate: DeliveryRate) =>
        Number(Boolean(rate.originArea)) + Number(Boolean(rate.destinationArea));
      return specificity(b) - specificity(a) || b.priority - a.priority;
    })[0];
  if (!compatible) {
    return {
      status: "PENDING_QUOTE",
      fee: null,
      estimatedDeliveryTime: null,
      rateId: null,
      origin: locationLabel(configuration.dispatchArea, configuration.dispatchCounty),
      destination,
    };
  }
  return {
    status: "CONFIRMED",
    fee: compatible.fee.toString(),
    estimatedDeliveryTime: compatible.estimatedDeliveryTime,
    rateId: compatible.id,
    origin: locationLabel(compatible.originArea, compatible.originCounty),
    destination,
  };
}

export function getDeliveryQuote(request: DeliveryQuoteRequest): Promise<DeliveryQuoteDTO> {
  return resolveDeliveryQuote(prisma, request);
}

function rateWhere(query: DeliveryRateQuery): Prisma.DeliveryRateWhereInput {
  return {
    ...(query.includeArchived ? {} : { archivedAt: null }),
    ...(query.method ? { method: query.method } : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: "insensitive" as const } },
            { originCounty: { contains: query.search, mode: "insensitive" as const } },
            { originArea: { contains: query.search, mode: "insensitive" as const } },
            { destinationCounty: { contains: query.search, mode: "insensitive" as const } },
            { destinationArea: { contains: query.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
}

export async function listDeliveryRates(
  query: DeliveryRateQuery,
): Promise<Paginated<DeliveryRateDTO>> {
  const where = rateWhere(query);
  const [total, rows] = await prisma.$transaction([
    prisma.deliveryRate.count({ where }),
    prisma.deliveryRate.findMany({
      where,
      orderBy: [{ archivedAt: "asc" }, { priority: "desc" }, { name: "asc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);
  return {
    items: rows.map(toDeliveryRateDTO),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

export async function createDeliveryRate(
  input: DeliveryRateCreateInput,
  adminId: string,
): Promise<DeliveryRateDTO> {
  const rate = await prisma.$transaction(async (tx) => {
    const created = await tx.deliveryRate.create({ data: input });
    await tx.adminLog.create({
      data: {
        adminId,
        action: "fulfillment.delivery_rate.created",
        entity: "delivery_rate",
        entityId: created.id,
        metadata: { name: created.name, method: created.method },
      },
    });
    return created;
  });
  return toDeliveryRateDTO(rate);
}

export async function updateDeliveryRate(
  id: string,
  input: DeliveryRateUpdateInput,
  adminId: string,
): Promise<DeliveryRateDTO> {
  const existing = await prisma.deliveryRate.findUnique({ where: { id } });
  if (!existing) throw Errors.notFound("Delivery route not found.");
  if (existing.archivedAt) throw Errors.badRequest("Archived delivery routes cannot be edited.");
  const rate = await prisma.$transaction(async (tx) => {
    const updated = await tx.deliveryRate.update({ where: { id }, data: input });
    await tx.adminLog.create({
      data: {
        adminId,
        action: "fulfillment.delivery_rate.updated",
        entity: "delivery_rate",
        entityId: id,
        metadata: { changedFields: Object.keys(input) },
      },
    });
    return updated;
  });
  return toDeliveryRateDTO(rate);
}

export async function archiveDeliveryRate(id: string, adminId: string): Promise<void> {
  const existing = await prisma.deliveryRate.findUnique({ where: { id } });
  if (!existing) throw Errors.notFound("Delivery route not found.");
  if (existing.archivedAt) return;
  await prisma.$transaction(async (tx) => {
    await tx.deliveryRate.update({
      where: { id },
      data: { archivedAt: new Date(), isActive: false },
    });
    await tx.adminLog.create({
      data: {
        adminId,
        action: "fulfillment.delivery_rate.archived",
        entity: "delivery_rate",
        entityId: id,
        metadata: { name: existing.name },
      },
    });
  });
}

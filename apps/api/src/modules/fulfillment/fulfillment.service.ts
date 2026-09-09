import { prisma, Prisma, type PickupStation } from "@nuru/db";
import type {
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
  doorstepFee: "0.00",
  doorstepEstimatedDeliveryTime: null,
};

const DEFAULT_ADMIN_CONFIGURATION: FulfillmentConfigurationDTO = {
  featureEnabled: false,
  pickupEnabled: true,
  doorstepEnabled: true,
  doorstepFee: "0.00",
  doorstepEstimatedDeliveryTime: null,
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
    doorstepFee: { toString(): string };
    doorstepEstimatedDeliveryTime: string | null;
  } | null,
): FulfillmentConfigurationDTO {
  if (!row) return DISABLED_FULFILLMENT_CONFIGURATION;
  return {
    featureEnabled: row.featureEnabled,
    pickupEnabled: row.pickupEnabled,
    doorstepEnabled: row.doorstepEnabled,
    doorstepFee: row.doorstepFee.toString(),
    doorstepEstimatedDeliveryTime: row.doorstepEstimatedDeliveryTime,
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
    const pickupEnabled = dto.pickupEnabled && stations.length > 0;
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
  if (input.featureEnabled && input.pickupEnabled && !input.doorstepEnabled) {
    const activeStations = await prisma.pickupStation.count({
      where: { isActive: true, archivedAt: null },
    });
    if (activeStations === 0) {
      throw Errors.badRequest("Add an active pickup station before enabling pickup-only delivery.");
    }
  }
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

async function disableUnavailablePickupOnlyFeature(
  tx: Prisma.TransactionClient,
  adminId: string,
): Promise<void> {
  const configuration = await tx.fulfillmentConfiguration.findUnique({
    where: { id: "default" },
  });
  if (
    !configuration?.featureEnabled ||
    !configuration.pickupEnabled ||
    configuration.doorstepEnabled
  ) {
    return;
  }
  const activeStations = await tx.pickupStation.count({
    where: { isActive: true, archivedAt: null },
  });
  if (activeStations > 0) return;
  await tx.fulfillmentConfiguration.update({
    where: { id: "default" },
    data: { featureEnabled: false },
  });
  await tx.adminLog.create({
    data: {
      adminId,
      action: "fulfillment.configuration.auto_disabled",
      entity: "fulfillment_configuration",
      entityId: "default",
      metadata: { reason: "no_active_pickup_stations" },
    },
  });
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
    if (input.isActive === false) {
      await disableUnavailablePickupOnlyFeature(tx, adminId);
    }
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
    await disableUnavailablePickupOnlyFeature(tx, adminId);
  });
}

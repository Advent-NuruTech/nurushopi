import { hashPassword, verifyPassword } from "@nuru/auth/password";
import { prisma, Prisma, type PickupAgent } from "@nuru/db";
import type {
  OrderDTO,
  Paginated,
  PickupAgentCreateInput,
  PickupAgentDTO,
  PickupAgentUpdateInput,
  PickupOrderQuery,
  PickupOrderStatusUpdateInput,
} from "@nuru/types";
import { Errors } from "../../lib/errors.js";
import { dispatchPickupReadyEmail, updateStatus } from "../orders/orders.service.js";
import { toOrderDTO, type OrderWithItems } from "../orders/serializers.js";

const LOCKOUT = { maxFailedAttempts: 5, lockMs: 15 * 60 * 1000 };
const lockKey = (email: string) => `pickup-agent:${email}`;
const orderRelations = {
  items: true,
  statusHistory: { orderBy: { createdAt: "asc" as const } },
  notificationDeliveries: true,
} as const;

type AgentWithStation = PickupAgent & {
  station: { name: string; address: string };
};

export function toPickupAgentDTO(agent: AgentWithStation): PickupAgentDTO {
  return {
    id: agent.id,
    stationId: agent.stationId,
    stationName: agent.station.name,
    stationAddress: agent.station.address,
    name: agent.name,
    email: agent.email,
    phone: agent.phone,
    isActive: agent.isActive,
    lastLoginAt: agent.lastLoginAt?.toISOString() ?? null,
    createdAt: agent.createdAt.toISOString(),
  };
}

export async function login(email: string, password: string): Promise<AgentWithStation> {
  const key = lockKey(email);
  const attempt = await prisma.loginAttempt.findUnique({ where: { identifier: key } });
  if (attempt?.lockedUntil && attempt.lockedUntil > new Date()) {
    throw Errors.locked("Account locked due to failed attempts. Try again later.");
  }
  const agent = await prisma.pickupAgent.findUnique({
    where: { email },
    include: { station: { select: { name: true, address: true, archivedAt: true } } },
  });
  const valid = agent ? await verifyPassword(password, agent.passwordHash) : false;
  if (!agent || !valid) {
    const current = (attempt?.failedCount ?? 0) + 1;
    await prisma.loginAttempt.upsert({
      where: { identifier: key },
      create: {
        identifier: key,
        failedCount: current,
        lockedUntil:
          current >= LOCKOUT.maxFailedAttempts ? new Date(Date.now() + LOCKOUT.lockMs) : null,
      },
      update: {
        failedCount: current,
        lastAttemptAt: new Date(),
        lockedUntil:
          current >= LOCKOUT.maxFailedAttempts ? new Date(Date.now() + LOCKOUT.lockMs) : null,
      },
    });
    throw Errors.unauthorized("Invalid email or password.");
  }
  if (!agent.isActive || agent.station.archivedAt) {
    throw Errors.forbidden("This pickup agent account is not active.");
  }
  await prisma.loginAttempt.deleteMany({ where: { identifier: key } });
  return prisma.pickupAgent.update({
    where: { id: agent.id },
    data: { lastLoginAt: new Date() },
    include: { station: { select: { name: true, address: true } } },
  });
}

export async function getById(id: string): Promise<AgentWithStation> {
  const agent = await prisma.pickupAgent.findUnique({
    where: { id },
    include: { station: { select: { name: true, address: true } } },
  });
  if (!agent || !agent.isActive) throw Errors.unauthorized();
  return agent;
}

export async function listAgents(): Promise<PickupAgentDTO[]> {
  const agents = await prisma.pickupAgent.findMany({
    include: { station: { select: { name: true, address: true } } },
    orderBy: [{ station: { name: "asc" } }, { name: "asc" }],
  });
  return agents.map(toPickupAgentDTO);
}

export async function createAgent(
  input: PickupAgentCreateInput,
  actingAdminId: string,
): Promise<PickupAgentDTO> {
  const station = await prisma.pickupStation.findFirst({
    where: { id: input.stationId, archivedAt: null },
    select: { id: true },
  });
  if (!station) throw Errors.badRequest("Choose an active pickup station.");
  const existing = await prisma.pickupAgent.findUnique({ where: { email: input.email } });
  if (existing) throw Errors.conflict("A pickup agent already exists with this email.");
  const passwordHash = await hashPassword(input.password);
  const agent = await prisma.$transaction(async (tx) => {
    const created = await tx.pickupAgent.create({
      data: {
        stationId: input.stationId,
        name: input.name,
        email: input.email,
        phone: input.phone || null,
        passwordHash,
        isActive: input.isActive,
      },
      include: { station: { select: { name: true, address: true } } },
    });
    await tx.adminLog.create({
      data: {
        adminId: actingAdminId,
        action: "pickup_agent.created",
        entity: "pickup_agent",
        entityId: created.id,
        metadata: { stationId: input.stationId, email: input.email },
      },
    });
    return created;
  });
  return toPickupAgentDTO(agent);
}

export async function updateAgent(
  id: string,
  input: PickupAgentUpdateInput,
  actingAdminId: string,
): Promise<PickupAgentDTO> {
  if (input.stationId) {
    const station = await prisma.pickupStation.findFirst({
      where: { id: input.stationId, archivedAt: null },
      select: { id: true },
    });
    if (!station) throw Errors.badRequest("Choose an active pickup station.");
  }
  try {
    const passwordHash = input.password ? await hashPassword(input.password) : undefined;
    const agent = await prisma.$transaction(async (tx) => {
      const updated = await tx.pickupAgent.update({
        where: { id },
        data: {
          stationId: input.stationId,
          name: input.name,
          phone: input.phone,
          isActive: input.isActive,
          passwordHash,
        },
        include: { station: { select: { name: true, address: true } } },
      });
      await tx.adminLog.create({
        data: {
          adminId: actingAdminId,
          action: "pickup_agent.updated",
          entity: "pickup_agent",
          entityId: id,
          metadata: {
            stationId: input.stationId,
            isActive: input.isActive,
            passwordReset: Boolean(input.password),
          },
        },
      });
      return updated;
    });
    return toPickupAgentDTO(agent);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      throw Errors.notFound("Pickup agent not found.");
    }
    throw error;
  }
}

export async function listStationOrders(
  agent: AgentWithStation,
  query: PickupOrderQuery,
): Promise<Paginated<OrderDTO>> {
  const where: Prisma.OrderWhereInput = {
    pickupStationId: agent.stationId,
    fulfillmentMethod: "PICKUP_STATION",
    ...(query.status ? { status: query.status } : {}),
    ...(query.search
      ? {
          OR: [
            { orderNumber: { contains: query.search, mode: "insensitive" as const } },
            { contactName: { contains: query.search, mode: "insensitive" as const } },
            { contactPhone: { contains: query.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const skip = (query.page - 1) * query.pageSize;
  const [total, rows] = await prisma.$transaction([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: orderRelations,
      orderBy: [{ pickupReadyAt: "desc" }, { createdAt: "desc" }],
      skip,
      take: query.pageSize,
    }),
  ]);
  return {
    items: rows.map((row) => toOrderDTO(row as OrderWithItems, { includeActorIdentity: true })),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

export async function updateStationOrderStatus(
  agent: AgentWithStation,
  orderId: string,
  input: PickupOrderStatusUpdateInput,
): Promise<OrderDTO> {
  const order = await prisma.order.findFirst({
    where: { id: orderId, pickupStationId: agent.stationId, fulfillmentMethod: "PICKUP_STATION" },
    select: { status: true },
  });
  if (!order) throw Errors.notFound("Order not found at your station.");
  const allowed =
    input.status === "AT_PICKUP_STATION"
      ? ["CONFIRMED", "PROCESSING", "SHIPPED"].includes(order.status)
      : order.status === "AT_PICKUP_STATION";
  if (!allowed) throw Errors.conflict("This order cannot move to that pickup stage.");
  return updateStatus(orderId, input.status, {
    type: "PICKUP_AGENT",
    id: agent.id,
    name: agent.name,
    note: input.note,
  });
}

export async function retryReadyEmail(agent: AgentWithStation, orderId: string): Promise<void> {
  const order = await prisma.order.findFirst({
    where: { id: orderId, pickupStationId: agent.stationId, status: "AT_PICKUP_STATION" },
    select: { id: true },
  });
  if (!order) throw Errors.notFound("Ready order not found at your station.");
  await dispatchPickupReadyEmail(order.id);
}

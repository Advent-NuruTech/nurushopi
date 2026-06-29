import { prisma, Prisma, type User } from "@nuru/db";
import type {
  AdminUserBundleDTO,
  AdminUserDetailDTO,
  AdminUserListQuery,
  AdminUserSummaryDTO,
  OrderStatus,
} from "@nuru/types";
import { Errors } from "../../lib/errors.js";
import { toOrderDTO, type OrderWithItems } from "../orders/serializers.js";
import {
  toWalletRedemptionDTO,
  toWalletTransactionDTO,
} from "../wallet/serializers.js";

/** Orders in these states are excluded from lifetime spend/order counts. */
const SPEND_EXCLUDED: OrderStatus[] = ["CANCELLED", "REFUNDED"];
const DETAIL_TAKE = 50;

function money(value: Prisma.Decimal | null | undefined): string {
  return (value ?? new Prisma.Decimal(0)).toString();
}

function toDetailDTO(user: User, totalOrders: number, totalSpend: string): AdminUserDetailDTO {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    address: user.address,
    walletBalance: user.walletBalance.toString(),
    totalOrders,
    totalSpend,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
  };
}

/**
 * Searchable customer list with lifetime order aggregates. Aggregates are
 * computed in a single grouped query over the listed users (cancelled and
 * refunded orders excluded). Capped by `limit` (newest first).
 */
export async function list(query: AdminUserListQuery): Promise<AdminUserSummaryDTO[]> {
  const where: Prisma.UserWhereInput = {};
  if (query.search) {
    const search = query.search;
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: query.limit,
  });
  if (users.length === 0) return [];

  const grouped = await prisma.order.groupBy({
    by: ["userId"],
    where: { userId: { in: users.map((u) => u.id) }, status: { notIn: SPEND_EXCLUDED } },
    _count: { _all: true },
    _sum: { total: true },
  });
  const stats = new Map(
    grouped.map((g) => [g.userId, { count: g._count._all, sum: money(g._sum.total) }]),
  );

  return users.map((u) => {
    const stat = stats.get(u.id);
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      walletBalance: u.walletBalance.toString(),
      totalOrders: stat?.count ?? 0,
      totalSpend: stat?.sum ?? "0",
      isActive: u.isActive,
      createdAt: u.createdAt.toISOString(),
    };
  });
}

/** Full customer profile: recent orders, wallet ledger and redemptions. */
export async function getBundle(id: string): Promise<AdminUserBundleDTO> {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw Errors.notFound("User not found.");

  const [orders, transactions, redemptions, agg] = await prisma.$transaction([
    prisma.order.findMany({
      where: { userId: id },
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: DETAIL_TAKE,
    }),
    prisma.walletTransaction.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: DETAIL_TAKE,
    }),
    prisma.walletRedemption.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: DETAIL_TAKE,
    }),
    prisma.order.aggregate({
      where: { userId: id, status: { notIn: SPEND_EXCLUDED } },
      _count: { _all: true },
      _sum: { total: true },
    }),
  ]);

  return {
    user: toDetailDTO(user, agg._count._all, money(agg._sum.total)),
    orders: orders.map((o) => toOrderDTO(o as OrderWithItems)),
    transactions: transactions.map(toWalletTransactionDTO),
    redemptions: redemptions.map(toWalletRedemptionDTO),
  };
}

/** Hard-delete a customer account. Blocked by FK when order history exists. */
export async function remove(id: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!user) throw Errors.notFound("User not found.");
  try {
    await prisma.user.delete({ where: { id } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
      throw Errors.conflict(
        "This user has order or wallet history and cannot be deleted. Deactivate them instead.",
      );
    }
    throw err;
  }
}

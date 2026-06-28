import { prisma, Prisma } from "@nuru/db";
import {
  ORDER_STATUSES,
  type DashboardStatsDTO,
  type OrderStatus,
} from "@nuru/types";
import { toOrderDTO, type OrderWithItems } from "../orders/serializers.js";

/** In-stock products at/below this level are flagged "low stock". */
const LOW_STOCK_THRESHOLD = 5;

/** How many recent orders to surface in the activity feed. */
const RECENT_ORDERS = 10;

const moneyOf = (v: Prisma.Decimal | null | undefined): string =>
  (v ?? new Prisma.Decimal(0)).toString();

/**
 * Single batched snapshot for the admin home. Every figure is derived from live
 * data inside one `$transaction`, so the dashboard is internally consistent and
 * cheap (no per-widget round trips).
 */
export async function getStats(): Promise<DashboardStatsDTO> {
  const [
    products,
    activeProducts,
    lowStock,
    outOfStock,
    customers,
    orderTotal,
    ordersByStatus,
    paidAgg,
    pendingRedemptionAgg,
    outstandingAgg,
    recentRows,
  ] = await prisma.$transaction([
    prisma.product.count(),
    prisma.product.count({ where: { isActive: true } }),
    prisma.product.count({ where: { stock: { gt: 0, lte: LOW_STOCK_THRESHOLD } } }),
    prisma.product.count({ where: { stock: { lte: 0 } } }),
    prisma.user.count(),
    prisma.order.count(),
    prisma.order.groupBy({ by: ["status"], orderBy: { status: "asc" }, _count: { _all: true } }),
    prisma.order.aggregate({ _sum: { total: true }, _count: { _all: true }, where: { paymentStatus: "PAID" } }),
    prisma.walletRedemption.aggregate({ _sum: { amount: true }, _count: { _all: true }, where: { status: "PENDING" } }),
    prisma.user.aggregate({ _sum: { walletBalance: true } }),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: RECENT_ORDERS, include: { items: true } }),
  ]);

  // Zero-fill every status, then overlay the grouped counts.
  const byStatus = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as Record<
    OrderStatus,
    number
  >;
  for (const row of ordersByStatus as Array<{ status: OrderStatus; _count: { _all: number } }>) {
    byStatus[row.status] = row._count._all;
  }
  const pendingFulfilment = byStatus.PENDING + byStatus.CONFIRMED + byStatus.PROCESSING;

  return {
    revenue: {
      paidTotal: moneyOf(paidAgg._sum.total),
      paidOrders: paidAgg._count._all,
    },
    orders: {
      total: orderTotal,
      byStatus,
      pendingFulfilment,
    },
    catalog: { products, activeProducts, lowStock, outOfStock },
    customers: { total: customers },
    wallet: {
      pendingRedemptions: pendingRedemptionAgg._count._all,
      pendingRedemptionAmount: moneyOf(pendingRedemptionAgg._sum.amount),
      outstandingBalance: moneyOf(outstandingAgg._sum.walletBalance),
    },
    recentOrders: (recentRows as OrderWithItems[]).map(toOrderDTO),
  };
}

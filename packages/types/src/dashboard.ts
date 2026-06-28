import type { OrderDTO, OrderStatus } from "./orders.js";

// ---------------------------------------------------------------------------
// Admin dashboard
//
// A single read-only snapshot powering the admin home: revenue, order pipeline,
// catalog health, customers, wallet liabilities and the latest orders. Every
// figure is computed server-side from the live data in one batched read. Money
// is carried as strings to avoid float precision loss.
// ---------------------------------------------------------------------------

export interface DashboardRevenue {
  /** Sum of `total` across PAID orders. */
  paidTotal: string;
  /** Count of PAID orders. */
  paidOrders: number;
}

export interface DashboardOrders {
  total: number;
  /** Count keyed by every order status (zero-filled). */
  byStatus: Record<OrderStatus, number>;
  /** Orders awaiting fulfilment (PENDING + CONFIRMED + PROCESSING). */
  pendingFulfilment: number;
}

export interface DashboardCatalog {
  products: number;
  activeProducts: number;
  /** In-stock but at/below the low-stock threshold. */
  lowStock: number;
  outOfStock: number;
}

export interface DashboardWallet {
  /** Number of PENDING cash-out requests awaiting admin action. */
  pendingRedemptions: number;
  /** Total amount tied up in PENDING cash-out requests. */
  pendingRedemptionAmount: string;
  /** Total spendable wallet balance held across all users (a liability). */
  outstandingBalance: string;
}

export interface DashboardStatsDTO {
  revenue: DashboardRevenue;
  orders: DashboardOrders;
  catalog: DashboardCatalog;
  customers: { total: number };
  wallet: DashboardWallet;
  /** Most recent orders for the activity feed. */
  recentOrders: OrderDTO[];
}

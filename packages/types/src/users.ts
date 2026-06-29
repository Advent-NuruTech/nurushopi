import { z } from "zod";
import type { OrderDTO } from "./orders.js";
import type { WalletRedemptionDTO, WalletTransactionDTO } from "./wallet.js";

// ---------------------------------------------------------------------------
// Admin customer management
//
// Read-mostly views over the customer base: a searchable list with per-user
// order aggregates, and a per-user detail with recent orders, wallet ledger
// and redemptions. Wallet adjustments live in the wallet module; senior admins
// may additionally remove an account.
// ---------------------------------------------------------------------------

/** Admin customer-list filters (client may search by name/email/phone). */
export const adminUserListQuerySchema = z
  .object({
    search: z.string().trim().max(120).optional(),
    limit: z.coerce.number().int().min(1).max(1000).default(500),
  })
  .strict();
export type AdminUserListQuery = z.infer<typeof adminUserListQuerySchema>;

/** A customer row with lifetime order aggregates (cancelled/refunded excluded). */
export interface AdminUserSummaryDTO {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  walletBalance: string;
  totalOrders: number;
  totalSpend: string;
  isActive: boolean;
  createdAt: string;
}

export interface AdminUserDetailDTO {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  walletBalance: string;
  totalOrders: number;
  totalSpend: string;
  isActive: boolean;
  createdAt: string;
}

/** Full customer profile bundle for the admin detail view. */
export interface AdminUserBundleDTO {
  user: AdminUserDetailDTO;
  orders: OrderDTO[];
  transactions: WalletTransactionDTO[];
  redemptions: WalletRedemptionDTO[];
}

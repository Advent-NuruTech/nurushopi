// app/profile/types.ts (simplified)
export type OrderStatusFilter = "all" | "pending" | "received" | "cancelled";

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface ApiOrder {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  country: string;
  county: string;
  locality: string;
  items: OrderItem[];
  totalAmount: number;
  status: string;
  createdAt: string;
}

export type UserProfile = {
  fullName?: string;
  phone?: string;
  address?: string;
  inviteCount?: number;
  [key: string]: unknown;
};

export type MessageType = {
  type: "success" | "error";
  text: string;
};

// No AppUser type here - let the hook handle it
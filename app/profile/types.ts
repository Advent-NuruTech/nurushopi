// Order related types
export type OrderStatusFilter = "all" | "pending" | "shipped" | "received" | "cancelled";

export interface OrderItem {
  id: string;
  productId?: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  mode?: "wholesale" | "retail";
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

// User profile types
export type UserProfile = {
  fullName?: string;
  phone?: string;
  address?: string;
  inviteCount?: number;
  walletBalance?: number;
  referredBy?: string | null;
  lastLogin?: unknown;
  createdAt?: unknown;
  [key: string]: unknown;
};

// Message and notification types
export type MessageType = {
  type: "success" | "error" | "info" | "warning" | "message";
  text: string;
  title?: string;
  id?: string;
  timestamp?: Date;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
};

// Chat message types
export interface ChatMessage {
  id: string;
  senderId?: string;
  senderName?: string;
  recipientId?: string;
  recipientName?: string;
  content?: string;
  createdAt?: unknown;
  readAt?: unknown;
  isAdmin?: boolean;
  status?: "sent" | "delivered" | "read" | "failed";
}

// Chat user/participant types
export interface ChatUser {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  isAdmin?: boolean;
  isOnline?: boolean;
  lastActive?: unknown;
  unreadCount?: number;
}

// Chat conversation types
export interface ChatConversation {
  id: string;
  participants: ChatUser[];
  lastMessage?: ChatMessage;
  unreadCount: number;
  updatedAt: unknown;
  isArchived?: boolean;
  isPinned?: boolean;
}

// Filter types for messages
export type MessageFilterType = "all" | "unread" | "sent" | "received";

// Notification types
export interface Notification {
  id: string;
  type: "order_update" | "message" | "system" | "promotion";
  title: string;
  message: string;
  read: boolean;
  createdAt: unknown;
  metadata?: {
    orderId?: string;
    messageId?: string;
    userId?: string;
    [key: string]: unknown;
  };
  action?: {
    label: string;
    url?: string;
    onClick?: () => void;
  };
}

// Pagination types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
}

// Settings and preferences
export interface UserPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  autoRefreshMessages: boolean;
  messageSound: boolean;
  theme: "light" | "dark" | "system";
  language: string;
}

// Activity log types
export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  description: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  createdAt: unknown;
}

// No AppUser type here - let the hook handle it

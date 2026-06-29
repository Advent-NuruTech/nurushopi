import type {
  AdminInviteDTO,
  AdminInviteInput,
  AdminLoginInput,
  AdminRole,
  AdminSignupInput,
  AdminUserDTO,
  AdminUserBundleDTO,
  AdminUserSummaryDTO,
  ApiResponse,
  AuthUser,
  BannerCreateInput,
  BannerDTO,
  BannerUpdateInput,
  CategoryCreateInput,
  CategoryDTO,
  CategoryUpdateInput,
  CheckoutInput,
  ContactCreateInput,
  ContactDTO,
  ContactQuery,
  HeroAnnouncementDTO,
  MessageCreateInput,
  MessageDTO,
  MessageThreadDTO,
  NotificationCreateInput,
  ProfileUpdateInput,
  PwaInstallRecordInput,
  PwaInstallStatsDTO,
  SabbathMessageCreateInput,
  SabbathMessageDTO,
  SabbathMessageListDTO,
  SabbathMessageUpdateInput,
  ProductReviewQuery,
  ReviewCreateInput,
  ReviewDTO,
  ReviewModerateInput,
  ReviewQuery,
  ReviewSummaryDTO,
  ReviewUpdateInput,
  VendorApplicationCreateInput,
  VendorApplicationDTO,
  VendorApplicationModerateInput,
  VendorApplicationQuery,
  HeroCreateInput,
  HeroUpdateInput,
  NotificationDTO,
  NotificationQuery,
  OrderDTO,
  OrderStatus,
  Paginated,
  PaymentStatus,
  ProductCreateInput,
  ProductDTO,
  ProductUpdateInput,
  DashboardStatsDTO,
  RedemptionRequestInput,
  RedemptionStatus,
  ReferralSummaryDTO,
  WalletAdjustmentInput,
  WalletRedemptionDTO,
  WalletSummaryDTO,
  WalletTransactionDTO,
  WalletTxSource,
  WalletTxType,
  WholesaleItemCreateInput,
  WholesaleItemDTO,
  WholesaleItemUpdateInput,
} from "@nuru/types";

/** Public wholesale list filters accepted by the API (all optional on the client). */
type WholesaleQuery = Partial<{
  page: number;
  pageSize: number;
  search: string;
  minPrice: number;
  maxPrice: number;
  minQuantity: number;
  sort: "newest" | "oldest" | "price_asc" | "price_desc" | "name";
}>;

/** Order list filters accepted by the API (all optional on the client). */
type OrderQuery = Partial<{
  page: number;
  pageSize: number;
  search: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  userId: string;
  sort: "newest" | "oldest" | "total_asc" | "total_desc";
}>;

/** Wallet ledger filters accepted by the API (all optional on the client). */
type WalletTransactionQuery = Partial<{
  page: number;
  pageSize: number;
  type: WalletTxType;
  source: WalletTxSource;
  userId: string;
  sort: "newest" | "oldest";
}>;

/** Redemption list filters accepted by the API (all optional on the client). */
type RedemptionQuery = Partial<{
  page: number;
  pageSize: number;
  status: RedemptionStatus;
  userId: string;
  sort: "newest" | "oldest";
}>;

/** Public product list filters accepted by the API (all optional on the client). */
type ProductQuery = Partial<{
  page: number;
  pageSize: number;
  search: string;
  categoryId: string;
  categorySlug: string;
  isFeatured: boolean;
  minPrice: number;
  maxPrice: number;
  inStock: boolean;
  sort: "newest" | "oldest" | "price_asc" | "price_desc" | "name";
}>;

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:4000/api/v1";

export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;
  constructor(message: string, code: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  let body: ApiResponse<T> | null = null;
  try {
    body = (await res.json()) as ApiResponse<T>;
  } catch {
    // non-JSON response
  }

  if (!res.ok || !body || body.ok === false) {
    const err = body && body.ok === false ? body.error : undefined;
    throw new ApiClientError(
      err?.message ?? "Request failed",
      err?.code ?? "UNKNOWN",
      res.status,
      err?.details,
    );
  }

  return body.data;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "POST", body: data ? JSON.stringify(data) : undefined }),
  put: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "PUT", body: data ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "PATCH", body: data ? JSON.stringify(data) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

/** Build a `?key=value` query string, skipping null/undefined/empty values. */
function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const str = search.toString();
  return str ? `?${str}` : "";
}

/** Absolute URL for browser redirects (e.g. Google OAuth start). */
export function apiUrl(path: string): string {
  return `${API_URL}${path}`;
}

// ---- Auth endpoints ----
type AuthUserResponse = { user: AuthUser };

export const authApi = {
  me: () => api.get<AuthUserResponse>("/auth/me"),
  updateProfile: (input: ProfileUpdateInput) =>
    api.patch<AuthUserResponse>("/auth/me", input),
  login: (email: string, password: string) =>
    api.post<AuthUserResponse>("/auth/login", { email, password }),
  signup: (input: { email: string; password: string; name?: string; referralCode?: string }) =>
    api.post<AuthUserResponse>("/auth/signup", input),
  logout: () => api.post<{ success: boolean }>("/auth/logout"),
  refresh: () => api.post<{ success: boolean }>("/auth/refresh"),
  forgotPassword: (email: string) =>
    api.post<{ success: boolean }>("/auth/forgot-password", { email }),
  resetPassword: (token: string, password: string) =>
    api.post<{ success: boolean }>("/auth/reset-password", { token, password }),
  verifyEmail: (token: string) =>
    api.post<{ success: boolean }>("/auth/verify-email", { token }),
  googleUrl: () => apiUrl("/auth/google"),
};

// ---- Admin authentication ----
type AdminUserResponse = { admin: AdminUserDTO };

export const adminAuthApi = {
  me: () => api.get<AdminUserResponse>("/admin/auth/me"),
  login: (input: AdminLoginInput) =>
    api.post<AdminUserResponse>("/admin/auth/login", input),
  signup: (input: AdminSignupInput) =>
    api.post<AdminUserResponse>("/admin/auth/signup", input),
  logout: () => api.post<{ success: boolean }>("/admin/auth/logout"),
  invite: (input: AdminInviteInput) =>
    api.post<{ invite: AdminInviteDTO }>("/admin/auth/invite", input),
  listAdmins: () => api.get<{ admins: AdminUserDTO[] }>("/admin/auth/admins"),
  updateRole: (id: string, role: AdminRole) =>
    api.patch<AdminUserResponse>(`/admin/auth/admins/${encodeURIComponent(id)}/role`, { role }),
  removeAdmin: (id: string) =>
    api.del<{ success: boolean }>(`/admin/auth/admins/${encodeURIComponent(id)}`),
};

// ---- Catalog endpoints ----

export const catalogApi = {
  // Public reads
  listProducts: (query: ProductQuery = {}) =>
    api.get<Paginated<ProductDTO>>(`/catalog/products${qs(query)}`),
  getProduct: (idOrSlug: string) =>
    api.get<{ product: ProductDTO }>(`/catalog/products/${encodeURIComponent(idOrSlug)}`),
  listCategories: (withCounts = false) =>
    api.get<{ categories: CategoryDTO[] }>(`/catalog/categories${withCounts ? "?withCounts=true" : ""}`),
  getCategory: (idOrSlug: string) =>
    api.get<{ category: CategoryDTO }>(`/catalog/categories/${encodeURIComponent(idOrSlug)}`),
  listBanners: () => api.get<{ banners: BannerDTO[] }>("/catalog/banners"),
  listHero: () => api.get<{ announcements: HeroAnnouncementDTO[] }>("/catalog/hero"),

  // Admin writes (require an admin session cookie)
  admin: {
    listProducts: (query: ProductQuery = {}) =>
      api.get<Paginated<ProductDTO>>(`/admin/catalog/products${qs(query)}`),
    createProduct: (input: ProductCreateInput) =>
      api.post<{ product: ProductDTO }>("/admin/catalog/products", input),
    updateProduct: (id: string, input: ProductUpdateInput) =>
      api.put<{ product: ProductDTO }>(`/admin/catalog/products/${id}`, input),
    deleteProduct: (id: string) =>
      api.del<{ success: boolean }>(`/admin/catalog/products/${id}`),

    createCategory: (input: CategoryCreateInput) =>
      api.post<{ category: CategoryDTO }>("/admin/catalog/categories", input),
    updateCategory: (id: string, input: CategoryUpdateInput) =>
      api.put<{ category: CategoryDTO }>(`/admin/catalog/categories/${id}`, input),
    deleteCategory: (id: string) =>
      api.del<{ success: boolean }>(`/admin/catalog/categories/${id}`),

    listBanners: () => api.get<{ banners: BannerDTO[] }>("/admin/catalog/banners"),
    createBanner: (input: BannerCreateInput) =>
      api.post<{ banner: BannerDTO }>("/admin/catalog/banners", input),
    updateBanner: (id: string, input: BannerUpdateInput) =>
      api.put<{ banner: BannerDTO }>(`/admin/catalog/banners/${id}`, input),
    deleteBanner: (id: string) =>
      api.del<{ success: boolean }>(`/admin/catalog/banners/${id}`),

    listHero: () => api.get<{ announcements: HeroAnnouncementDTO[] }>("/admin/catalog/hero"),
    createHero: (input: HeroCreateInput) =>
      api.post<{ announcement: HeroAnnouncementDTO }>("/admin/catalog/hero", input),
    updateHero: (id: string, input: HeroUpdateInput) =>
      api.put<{ announcement: HeroAnnouncementDTO }>(`/admin/catalog/hero/${id}`, input),
    deleteHero: (id: string) =>
      api.del<{ success: boolean }>(`/admin/catalog/hero/${id}`),
  },
};

// ---- Wholesale endpoints ----

export const wholesaleApi = {
  // Public reads
  listItems: (query: WholesaleQuery = {}) =>
    api.get<Paginated<WholesaleItemDTO>>(`/wholesale/items${qs(query)}`),
  getItem: (idOrSlug: string) =>
    api.get<{ item: WholesaleItemDTO }>(`/wholesale/items/${encodeURIComponent(idOrSlug)}`),

  // Admin writes (require an admin session cookie)
  admin: {
    listItems: (query: WholesaleQuery = {}) =>
      api.get<Paginated<WholesaleItemDTO>>(`/admin/wholesale/items${qs(query)}`),
    getItem: (id: string) =>
      api.get<{ item: WholesaleItemDTO }>(`/admin/wholesale/items/${id}`),
    createItem: (input: WholesaleItemCreateInput) =>
      api.post<{ item: WholesaleItemDTO }>("/admin/wholesale/items", input),
    updateItem: (id: string, input: WholesaleItemUpdateInput) =>
      api.put<{ item: WholesaleItemDTO }>(`/admin/wholesale/items/${id}`, input),
    deleteItem: (id: string) =>
      api.del<{ success: boolean }>(`/admin/wholesale/items/${id}`),
  },
};

// ---- Orders & checkout endpoints ----

export const orderApi = {
  // Checkout works for guests and signed-in users (the cookie session, if any,
  // links the order to the user).
  checkout: (input: CheckoutInput) =>
    api.post<{ order: OrderDTO }>("/orders/checkout", input),
  // Track a single order by its (unguessable) order number.
  track: (orderNumber: string) =>
    api.get<{ order: OrderDTO }>(`/orders/${encodeURIComponent(orderNumber)}`),
  // The signed-in user's own order history.
  myOrders: (query: OrderQuery = {}) =>
    api.get<Paginated<OrderDTO>>(`/orders/mine${qs(query)}`),
  // Customer self-cancel (own order, pre-shipment, within 24h — enforced server-side).
  cancel: (orderNumber: string) =>
    api.patch<{ order: OrderDTO }>(`/orders/${encodeURIComponent(orderNumber)}/cancel`),

  // Admin order management (require an admin session cookie)
  admin: {
    list: (query: OrderQuery = {}) =>
      api.get<Paginated<OrderDTO>>(`/admin/orders${qs(query)}`),
    get: (id: string) => api.get<{ order: OrderDTO }>(`/admin/orders/${id}`),
    updateStatus: (id: string, status: OrderStatus) =>
      api.patch<{ order: OrderDTO }>(`/admin/orders/${id}/status`, { status }),
    updatePayment: (id: string, paymentStatus: PaymentStatus) =>
      api.patch<{ order: OrderDTO }>(`/admin/orders/${id}/payment`, { paymentStatus }),
  },
};

// ---- Wallet & referral endpoints ----

export const walletApi = {
  // Customer (require a user session cookie)
  summary: () => api.get<{ wallet: WalletSummaryDTO }>("/wallet"),
  transactions: (query: WalletTransactionQuery = {}) =>
    api.get<Paginated<WalletTransactionDTO>>(`/wallet/transactions${qs(query)}`),
  redemptions: (query: RedemptionQuery = {}) =>
    api.get<Paginated<WalletRedemptionDTO>>(`/wallet/redemptions${qs(query)}`),
  requestRedemption: (input: RedemptionRequestInput) =>
    api.post<{ redemption: WalletRedemptionDTO }>("/wallet/redemptions", input),
  referrals: () => api.get<{ referral: ReferralSummaryDTO }>("/wallet/referrals"),
  applyReferral: (code: string) =>
    api.post<{ success: boolean }>("/wallet/referrals/apply", { code }),

  // Admin wallet management (require an admin session cookie)
  admin: {
    transactions: (query: WalletTransactionQuery = {}) =>
      api.get<Paginated<WalletTransactionDTO>>(`/admin/wallet/transactions${qs(query)}`),
    redemptions: (query: RedemptionQuery = {}) =>
      api.get<Paginated<WalletRedemptionDTO>>(`/admin/wallet/redemptions${qs(query)}`),
    updateRedemption: (id: string, status: RedemptionStatus) =>
      api.patch<{ redemption: WalletRedemptionDTO }>(`/admin/wallet/redemptions/${id}`, { status }),
    adjustBalance: (input: WalletAdjustmentInput) =>
      api.post<{ transaction: WalletTransactionDTO }>("/admin/wallet/adjustments", input),
  },
};

// ---- Contact form (public) ----

export const contactApi = {
  // Unauthenticated "get in touch" form → POST /contact.
  submit: (input: ContactCreateInput) =>
    api.post<{ contact: ContactDTO }>("/contact", input),

  // Admin contact inbox (require an admin session cookie)
  admin: {
    list: (query: Partial<ContactQuery> = {}) =>
      api.get<Paginated<ContactDTO>>(`/admin/contacts${qs(query)}`),
    setHandled: (id: string, handled: boolean) =>
      api.patch<{ contact: ContactDTO }>(`/admin/contacts/${id}`, { handled }),
  },
};

// ---- Product reviews ----

/** Public/customer per-product review listing filters (all optional). */
type ProductReviewFilter = Partial<Pick<ProductReviewQuery, "page" | "pageSize" | "rating" | "sort">>;
/** Admin review listing filters (all optional). */
type ReviewFilter = Partial<
  Pick<ReviewQuery, "page" | "pageSize" | "status" | "productId" | "userId" | "rating" | "sort">
>;

export const reviewsApi = {
  // Public reads (APPROVED reviews only, server-enforced)
  listForProduct: (productId: string, query: ProductReviewFilter = {}) =>
    api.get<Paginated<ReviewDTO>>(
      `/reviews/product/${encodeURIComponent(productId)}${qs(query)}`,
    ),
  summaryForProduct: (productId: string) =>
    api.get<{ summary: ReviewSummaryDTO }>(
      `/reviews/product/${encodeURIComponent(productId)}/summary`,
    ),

  // Customer (require a user session cookie)
  mine: (query: ProductReviewFilter = {}) =>
    api.get<Paginated<ReviewDTO>>(`/reviews/mine${qs(query)}`),
  create: (input: ReviewCreateInput) =>
    api.post<{ review: ReviewDTO }>("/reviews", input),
  update: (id: string, input: ReviewUpdateInput) =>
    api.put<{ review: ReviewDTO }>(`/reviews/${encodeURIComponent(id)}`, input),
  remove: (id: string) =>
    api.del<{ success: boolean }>(`/reviews/${encodeURIComponent(id)}`),

  // Admin moderation (require an admin session cookie)
  admin: {
    list: (query: ReviewFilter = {}) =>
      api.get<Paginated<ReviewDTO>>(`/admin/reviews${qs(query)}`),
    moderate: (id: string, input: ReviewModerateInput) =>
      api.patch<{ review: ReviewDTO }>(`/admin/reviews/${id}`, input),
    remove: (id: string) =>
      api.del<{ success: boolean }>(`/admin/reviews/${id}`),
  },
};

// ---- Support messages ----

export const messagesApi = {
  // Customer support thread (require a user session cookie). The thread is
  // keyed by the user's id server-side, so no id is needed here.
  list: () => api.get<{ messages: MessageDTO[] }>("/messages"),
  send: (input: MessageCreateInput) =>
    api.post<{ message: MessageDTO }>("/messages", input),

  // Admin support inbox (require an admin session cookie)
  admin: {
    listThreads: (query: Partial<{ page: number; pageSize: number }> = {}) =>
      api.get<Paginated<MessageThreadDTO>>(`/admin/messages/threads${qs(query)}`),
    listThread: (threadId: string) =>
      api.get<{ messages: MessageDTO[] }>(
        `/admin/messages/threads/${encodeURIComponent(threadId)}`,
      ),
    reply: (threadId: string, input: MessageCreateInput) =>
      api.post<{ message: MessageDTO }>(
        `/admin/messages/threads/${encodeURIComponent(threadId)}`,
        input,
      ),
  },
};

// ---- Vendor applications ----

/** Admin vendor application listing filters (all optional). */
type VendorFilter = Partial<
  Pick<VendorApplicationQuery, "page" | "pageSize" | "status" | "search" | "sort">
>;

export const vendorsApi = {
  // Apply works for guests and signed-in users alike.
  apply: (input: VendorApplicationCreateInput) =>
    api.post<{ application: VendorApplicationDTO }>("/vendors/apply", input),
  mine: (query: VendorFilter = {}) =>
    api.get<Paginated<VendorApplicationDTO>>(`/vendors/mine${qs(query)}`),

  // Admin vendor management (require an admin session cookie)
  admin: {
    list: (query: VendorFilter = {}) =>
      api.get<Paginated<VendorApplicationDTO>>(`/admin/vendors${qs(query)}`),
    get: (id: string) =>
      api.get<{ application: VendorApplicationDTO }>(`/admin/vendors/${id}`),
    moderate: (id: string, input: VendorApplicationModerateInput) =>
      api.patch<{ application: VendorApplicationDTO }>(`/admin/vendors/${id}`, input),
  },
};

// ---- Notifications (signed-in user) ----

/** The signed-in user's own notification feed filters (all optional). */
type NotificationFilter = Partial<Pick<NotificationQuery, "page" | "pageSize" | "read" | "type">>;

export const notificationsApi = {
  list: (query: NotificationFilter = {}) =>
    api.get<Paginated<NotificationDTO>>(`/notifications${qs(query)}`),
  unreadCount: () => api.get<{ unreadCount: number }>("/notifications/unread-count"),
  markRead: (id: string) =>
    api.patch<{ notification: NotificationDTO }>(`/notifications/${encodeURIComponent(id)}/read`),
  markAllRead: () => api.post<{ updated: number }>("/notifications/read-all"),

  // Admin notification feed + dispatch (require an admin session cookie)
  admin: {
    list: (query: NotificationFilter = {}) =>
      api.get<Paginated<NotificationDTO>>(`/admin/notifications${qs(query)}`),
    unreadCount: () => api.get<{ unreadCount: number }>("/admin/notifications/unread-count"),
    create: (input: NotificationCreateInput) =>
      api.post<{ notification: NotificationDTO }>("/admin/notifications", input),
    markRead: (id: string) =>
      api.patch<{ notification: NotificationDTO }>(
        `/admin/notifications/${encodeURIComponent(id)}/read`,
      ),
    markAllRead: () => api.post<{ updated: number }>("/admin/notifications/read-all"),
  },
};

// ---- Admin customer management ----

/** Admin customer-list filters (all optional). */
type AdminUserFilter = Partial<{ search: string; limit: number }>;

export const usersApi = {
  admin: {
    list: (query: AdminUserFilter = {}) =>
      api.get<{ users: AdminUserSummaryDTO[] }>(`/admin/users${qs(query)}`),
    get: (id: string) => api.get<AdminUserBundleDTO>(`/admin/users/${encodeURIComponent(id)}`),
    remove: (id: string) =>
      api.del<{ success: boolean }>(`/admin/users/${encodeURIComponent(id)}`),
  },
};

// ---- PWA installs ----

export const pwaApi = {
  // Public: record an install (links to the user when one is signed in).
  record: (input: PwaInstallRecordInput = {}) =>
    api.post<{ success: boolean }>("/pwa-installs", input),

  // Admin install stats (require an admin session cookie)
  admin: {
    stats: () => api.get<PwaInstallStatsDTO>("/admin/pwa-installs"),
  },
};

// ---- Sabbath messages ----

/** Public Sabbath listing filters (all optional). */
type SabbathQuery = Partial<{
  date: string;
  limit: number;
  cursorDate: string;
  cursorCreatedAt: string;
}>;

export const sabbathApi = {
  // Public: current message for a date + paginated history.
  list: (query: SabbathQuery = {}) =>
    api.get<SabbathMessageListDTO>(`/sabbath-messages${qs(query)}`),

  // Admin authoring (read: any admin; write: senior admin — enforced server-side)
  admin: {
    list: (limit?: number) =>
      api.get<{ messages: SabbathMessageDTO[] }>(`/admin/sabbath-messages${qs({ limit })}`),
    create: (input: SabbathMessageCreateInput) =>
      api.post<{ message: SabbathMessageDTO }>("/admin/sabbath-messages", input),
    update: (id: string, input: SabbathMessageUpdateInput) =>
      api.put<{ message: SabbathMessageDTO }>(
        `/admin/sabbath-messages/${encodeURIComponent(id)}`,
        input,
      ),
    remove: (id: string) =>
      api.del<{ success: boolean }>(`/admin/sabbath-messages/${encodeURIComponent(id)}`),
  },
};

// ---- Admin dashboard endpoints ----

export const dashboardApi = {
  stats: () => api.get<{ stats: DashboardStatsDTO }>("/admin/dashboard"),
};

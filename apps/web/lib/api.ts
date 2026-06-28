import type {
  ApiResponse,
  AuthUser,
  BannerCreateInput,
  BannerDTO,
  BannerUpdateInput,
  CategoryCreateInput,
  CategoryDTO,
  CategoryUpdateInput,
  CheckoutInput,
  HeroAnnouncementDTO,
  HeroCreateInput,
  HeroUpdateInput,
  OrderDTO,
  OrderStatus,
  Paginated,
  PaymentStatus,
  ProductCreateInput,
  ProductDTO,
  ProductUpdateInput,
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

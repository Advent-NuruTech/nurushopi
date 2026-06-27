import type { ApiResponse, AuthUser } from "@nuru/types";

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
};

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

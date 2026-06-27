import type { Route } from "next";

export const ADMIN_BASE_PATH = "/np-manage-8f3k" as const;
export const ADMIN_LOGIN_PATH = "/np-manage-8f3k/login" as Route;
export const ADMIN_SIGNUP_PATH = "/np-manage-8f3k/signup" as Route;
export const ADMIN_DASHBOARD_PATH = "/np-manage-8f3k/dashboard" as Route;

export const adminPath = (path: string): string => {
  if (!path) return ADMIN_BASE_PATH;
  return `${ADMIN_BASE_PATH}${path.startsWith("/") ? path : `/${path}`}`;
};

export const adminRoute = (path: string) => path as Route;

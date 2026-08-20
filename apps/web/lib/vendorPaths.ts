import type { Route } from "next";

export const VENDOR_BASE_PATH = "/np-vendor-8f3k" as const;
export const VENDOR_LOGIN_PATH = "/np-vendor-8f3k/login" as Route;
export const VENDOR_SIGNUP_PATH = "/np-vendor-8f3k/signup" as Route;
export const VENDOR_DASHBOARD_PATH = "/np-vendor-8f3k/dashboard" as Route;

export const vendorPath = (path: string): string => {
  if (!path) return VENDOR_BASE_PATH;
  return `${VENDOR_BASE_PATH}${path.startsWith("/") ? path : `/${path}`}`;
};

export const vendorRoute = (path: string) => path as Route;

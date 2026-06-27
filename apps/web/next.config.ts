import type { NextConfig } from "next";
import withPWAInit from "next-pwa";

const runtimeCaching = [
  {
    urlPattern: ({ request }: { request: Request }) => request.destination === "document",
    handler: "NetworkFirst",
    options: {
      cacheName: "pages",
      networkTimeoutSeconds: 8,
      expiration: { maxEntries: 50, maxAgeSeconds: 7 * 24 * 60 * 60 },
      cacheableResponse: { statuses: [0, 200] },
    },
  },
  {
    urlPattern: ({ request }: { request: Request }) =>
      ["style", "script", "worker"].includes(request.destination),
    handler: "StaleWhileRevalidate",
    options: {
      cacheName: "static-resources",
      expiration: { maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 },
      cacheableResponse: { statuses: [0, 200] },
    },
  },
  {
    urlPattern: ({ request }: { request: Request }) => request.destination === "font",
    handler: "CacheFirst",
    options: {
      cacheName: "fonts",
      expiration: { maxEntries: 30, maxAgeSeconds: 365 * 24 * 60 * 60 },
      cacheableResponse: { statuses: [0, 200] },
    },
  },
  {
    urlPattern: ({ request }: { request: Request }) => request.destination === "image",
    handler: "CacheFirst",
    options: {
      cacheName: "images",
      expiration: { maxEntries: 120, maxAgeSeconds: 30 * 24 * 60 * 60 },
      cacheableResponse: { statuses: [0, 200] },
    },
  },
  {
    urlPattern: ({ url }: { url: URL }) => url.pathname.startsWith("/_next/image"),
    handler: "CacheFirst",
    options: {
      cacheName: "next-image",
      expiration: { maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 },
      cacheableResponse: { statuses: [0, 200] },
    },
  },
  {
    urlPattern: ({ url }: { url: URL }) => url.pathname.startsWith("/_next/static/"),
    handler: "StaleWhileRevalidate",
    options: {
      cacheName: "next-static",
      expiration: { maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 },
      cacheableResponse: { statuses: [0, 200] },
    },
  },
  {
    urlPattern: ({ url, request }: { url: URL; request: Request }) =>
      request.method === "GET" &&
      url.pathname.startsWith("/api/") &&
      !url.pathname.startsWith("/api/admin") &&
      !url.pathname.startsWith("/api/auth"),
    handler: "NetworkFirst",
    options: {
      cacheName: "api",
      networkTimeoutSeconds: 6,
      expiration: { maxEntries: 50, maxAgeSeconds: 5 * 60 },
      cacheableResponse: { statuses: [0, 200] },
    },
  },
];

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  runtimeCaching,
  fallbacks: {
    document: "/offline",
  },
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  poweredByHeader: false,

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },

  typescript: {
    ignoreBuildErrors: false,
  },

  headers: async () => [
    {
      source: "/_next/:path*",
      headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
    },
    {
      source: "/np-manage-8f3k/:path*",
      headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
    },
  ],
};

export default withPWA(nextConfig);

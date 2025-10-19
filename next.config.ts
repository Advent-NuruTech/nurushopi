import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  typedRoutes: true,
  // ✅ Allow Cloudinary + external images
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },

  turbopack: {
    rules: {
      "*.svg": ["file-loader"],
    },
  },
  // ✅ Ignore build errors from ESLint during deployment
  eslint: {
    ignoreDuringBuilds: true,
  },

  // ✅ TypeScript build optimization
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;

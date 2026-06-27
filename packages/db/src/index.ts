import { PrismaClient } from "../generated/client/index.js";

// Re-export the generated client types/enums so consumers import from "@nuru/db".
export * from "../generated/client/index.js";

// Singleton with a global cache to survive dev hot-reloads (avoids exhausting
// the Postgres connection pool with new clients on every reload).
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

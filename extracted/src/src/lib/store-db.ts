import { PrismaClient } from "@/lib/generated/store-client";

/**
 * HEAVIX Store Prisma Client (singleton).
 *
 * The HEAVIX auto-parts marketplace has its OWN PostgreSQL database
 * (`STORE_DATABASE_URL`) and its own Prisma schema
 * (`prisma/store-schema.prisma`). The generated client lives at
 * `src/lib/generated/store-client` so it does NOT clash with the
 * main HEAVIX `@prisma/client`.
 *
 * The instance is cached on `globalThis` to avoid connection
 * exhaustion in dev-mode hot reloads (same pattern as `@/lib/db`).
 */
const globalForStore = globalThis as unknown as {
  storeDb: PrismaClient | undefined;
};

export const storeDb =
  globalForStore.storeDb ??
  new PrismaClient({
    log: ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForStore.storeDb = storeDb;
}

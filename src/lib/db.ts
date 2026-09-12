// Prisma Client singleton for Next.js (Prisma 7 with driver adapter)
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

type PrismaGlobal = typeof globalThis & {
  prisma?: PrismaClient;
};

const globalForPrisma = globalThis as PrismaGlobal;

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const adapter = new PrismaPg({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

/**
 * Initialize Prisma only when a request actually uses the database.
 *
 * Next.js evaluates API route modules during `next build` to collect their
 * configuration. Creating Prisma at module scope made a production build
 * fail whenever the build environment did not also expose DATABASE_URL,
 * even though the database is only needed at request time.
 */
function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

// Keep the existing `db.user.findMany()` call sites unchanged while avoiding
// any environment access during module evaluation/build-time route collection.
export const db = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getPrismaClient();
    const value = Reflect.get(client, property, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
}) as PrismaClient;

export default db;

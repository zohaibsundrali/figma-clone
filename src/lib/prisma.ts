import { Pool } from "pg";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required to initialize Prisma. Set it in .env.local or .env."
    );
  }

  return databaseUrl;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

function createPrismaClient() {
  let pool = globalForPrisma.pool;

  if (!pool) {
    pool = new Pool({
      connectionString: getDatabaseUrl(),
      max: 5, // Small headroom above the 3 concurrent queries the dashboard fires on load
      idleTimeoutMillis: 30000, // Was 5000 — that tore down connections every 5s, forcing
      // a full reconnect (+ possible Neon compute cold-start) on nearly every request.
      connectionTimeoutMillis: 30000, // Allow 30 seconds for cold database wake-ups
    });

    if (process.env.NODE_ENV !== "production") {
      globalForPrisma.pool = pool;
    }
  }

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

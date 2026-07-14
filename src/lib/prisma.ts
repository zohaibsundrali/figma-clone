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

const g = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
};

// Reuse the Pool across hot-reloads in dev — avoids exhausting Neon's
// connection limit and eliminates cold-start penalty on every save.
if (!g.pgPool) {
  g.pgPool = new Pool({
    connectionString: getDatabaseUrl(),
    max: 5,              // Neon free tier: keep pool small
    idleTimeoutMillis: 30_000,  // Was 5000 — too aggressive, forced reconnects
    connectionTimeoutMillis: 10_000, // 10s is enough; cold Neon wake ~3-5s
  });
}

if (!g.prisma) {
  const adapter = new PrismaPg(g.pgPool);
  g.prisma = new PrismaClient({ adapter });

  // Warm up the connection in the background immediately on module load.
  // This fires a cheap SELECT 1 so the TCP + TLS handshake to Neon is done
  // before the first real request arrives (eliminates cold-start latency).
  void g.pgPool.query("SELECT 1").catch(() => {/* ignore warm-up failures */});
}

export const prisma = g.prisma;
export const pool = g.pgPool;

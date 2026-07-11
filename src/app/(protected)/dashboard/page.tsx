// Server component — no "use client" directive.
// Fetches files directly from Prisma at request time.

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/file-access";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import type { DesignFileSummary } from "@/types";

export default async function DashboardPage() {
  console.log("[DashboardPage] Route entered, starting auth check...");
  console.time("[DashboardPage] Clerk auth");
  const userId = await getCurrentUserId();
  console.timeEnd("[DashboardPage] Clerk auth");

  if (!userId) {
    console.log("[DashboardPage] Unauthorized, redirecting...");
    redirect("/sign-in");
  }

  console.log(`[DashboardPage] User authenticated: ${userId}. Fetching design files...`);
  console.time("[DashboardPage] Prisma findMany");
  let rows;
  try {
    rows = await prisma.designFile.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        isPublic: true,
        thumbnail: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } catch (err) {
    console.error("[DashboardPage] Prisma query failed:", err);
    throw err;
  }
  console.timeEnd("[DashboardPage] Prisma findMany");

  console.log(`[DashboardPage] Fetched ${rows.length} files. Mapping data...`);
  const files: DesignFileSummary[] = rows.map((f) => ({
    ...f,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  }));

  console.log("[DashboardPage] Rendering DashboardClient component...");
  return <DashboardClient initialFiles={files} />;
}

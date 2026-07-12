// Server component — no "use client" directive.
// Fetches files directly from Prisma at request time.

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/file-access";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import type { DesignFileSummary } from "@/types";

export default async function DashboardPage() {
  const userId = await getCurrentUserId();

  if (!userId) {
    redirect("/sign-in");
  }

  let rows;
  try {
    rows = await prisma.designFile.findMany({
      where: { ownerId: userId, isDeleted: false },
      orderBy: { updatedAt: "desc" },
      take: 100, // Limit to 100 recent files for speed
      select: {
        id: true,
        title: true,
        isPublic: true,
        thumbnail: true,
        isDeleted: true,
        isStarred: true,
        workspaceId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } catch (err) {
    console.error("[DashboardPage] Prisma query failed:", err);
    throw err;
  }

  const files: DesignFileSummary[] = rows.map((f) => ({
    ...f,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  }));

  return <DashboardClient initialFiles={files} />;
}

// Server component — no "use client" directive.
// Uses React Suspense + streaming so the sidebar/header paint instantly
// while the DB query resolves in the background.

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { getCurrentUserId, listFileSummaries } from "@/lib/file-access";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { FileGridSkeleton } from "@/components/dashboard/FileGridSkeleton";
import type { DesignFileSummary } from "@/types";

// Build a per-user cached fetcher (60-second TTL).
// This eliminates repeated DB hits when the user navigates back to /dashboard
// within the same minute (very common). The cache is invalidated by tag on mutations.
function makeFileFetcher(userId: string) {
  return unstable_cache(
    async (): Promise<DesignFileSummary[]> => {
      return listFileSummaries({
        where: Prisma.sql`"ownerId" = ${userId} AND "isDeleted" = false`,
        orderBy: Prisma.sql`"updatedAt" DESC`,
        limit: 50, // 50 is plenty; any more slows serialisation
      });
    },
    [`dashboard-files-${userId}`],
    {
      revalidate: 60, // seconds
      tags: [`user-files-${userId}`],
    }
  );
}

// Async component that fetches files — Suspense wraps this so the parent
// shell renders without waiting for it.
async function FilesLoader({ userId }: { userId: string }) {
  const fetchFiles = makeFileFetcher(userId);
  let files: DesignFileSummary[] = [];
  try {
    files = await fetchFiles();
  } catch (err) {
    console.error("[DashboardPage] Prisma query failed:", err);
    // Return empty list on error — DashboardClient handles the empty state
  }
  return <DashboardClient initialFiles={files} />;
}

export default async function DashboardPage() {
  const userId = await getCurrentUserId();

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <Suspense fallback={<FileGridSkeleton />}>
      <FilesLoader userId={userId!} />
    </Suspense>
  );
}

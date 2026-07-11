// Next.js App Router automatically renders this while the server component
// in page.tsx is fetching data. Replaces the blank screen the user saw before.

export default function DashboardLoading() {
  return (
    <div>
      {/* Header skeleton */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-7 w-36 animate-pulse rounded-lg bg-surface-elevated" />
          <div className="h-4 w-52 animate-pulse rounded bg-surface-elevated" />
        </div>
        <div className="h-9 w-32 animate-pulse rounded-lg bg-surface-elevated" />
      </div>

      {/* Search bar skeleton */}
      <div className="mb-6">
        <div className="h-10 w-full max-w-md animate-pulse rounded-lg bg-surface-elevated" />
      </div>

      {/* File card skeletons */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-xl border border-border bg-surface"
          >
            {/* Thumbnail area */}
            <div className="aspect-[4/3] animate-pulse bg-surface-elevated" />
            {/* Title + date */}
            <div className="space-y-2 p-3">
              <div className="h-4 w-3/4 animate-pulse rounded bg-surface-elevated" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-surface-elevated" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

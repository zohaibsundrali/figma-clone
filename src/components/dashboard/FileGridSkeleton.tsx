// Skeleton that matches the exact layout of DashboardClient so there is
// zero layout-shift when the real content streams in.
export function FileGridSkeleton() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground select-none">
      {/* Sidebar skeleton */}
      <aside className="w-64 border-r border-border bg-surface flex flex-col justify-between flex-shrink-0 h-full">
        <div className="flex flex-col gap-4 p-4">
          {/* User avatar + name */}
          <div className="flex items-center gap-2.5 p-1.5">
            <div className="h-6 w-6 rounded-full bg-surface-elevated animate-pulse flex-shrink-0" />
            <div className="h-3.5 w-28 rounded bg-surface-elevated animate-pulse" />
          </div>

          {/* Search bar */}
          <div className="h-7 w-full rounded bg-surface-elevated animate-pulse" />

          {/* Nav items */}
          <div className="space-y-1 pt-1">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-2.5 px-2.5 py-2">
                <div className="h-4 w-4 rounded bg-surface-elevated animate-pulse flex-shrink-0" />
                <div className={`h-3 rounded bg-surface-elevated animate-pulse`} style={{ width: `${55 + i * 8}px` }} />
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="h-px bg-border/40" />

          {/* Folder section */}
          <div className="space-y-1">
            <div className="h-2.5 w-14 rounded bg-surface-elevated animate-pulse mx-2" />
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-2.5 px-2.5 py-2">
                <div className="h-4 w-4 rounded bg-surface-elevated animate-pulse flex-shrink-0" />
                <div className="h-3 w-20 rounded bg-surface-elevated animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Upgrade card skeleton */}
        <div className="p-4 border-t border-border">
          <div className="rounded-lg border border-border p-3.5 space-y-2">
            <div className="h-2.5 w-20 rounded bg-surface-elevated animate-pulse" />
            <div className="h-3 w-full rounded bg-surface-elevated animate-pulse" />
            <div className="h-3 w-4/5 rounded bg-surface-elevated animate-pulse" />
            <div className="h-6 w-full rounded-md bg-surface-elevated animate-pulse mt-1" />
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 flex flex-col min-w-0 bg-background h-full">
        {/* Header */}
        <header className="h-14 border-b border-border bg-surface px-6 flex items-center justify-between flex-shrink-0">
          <div className="h-4 w-24 rounded bg-surface-elevated animate-pulse" />
          <div className="h-7 w-20 rounded bg-surface-elevated animate-pulse" />
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Sub-nav tabs */}
          <div className="flex items-center gap-6 border-b border-border/60 pb-3">
            {["Recently viewed", "Shared files", "All drafts"].map((label) => (
              <div key={label} className="h-3 w-24 rounded bg-surface-elevated animate-pulse" />
            ))}
          </div>

          {/* Search bar row */}
          <div className="h-9 w-full max-w-md rounded-lg bg-surface-elevated animate-pulse" />

          {/* File card grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-lg border border-border bg-surface-elevated/40"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                {/* Thumbnail area */}
                <div className="aspect-[1.5] animate-pulse bg-surface-elevated" />
                {/* Info bar */}
                <div className="p-3.5 bg-surface flex items-start gap-3">
                  <div className="h-7 w-7 rounded flex-shrink-0 bg-surface-elevated animate-pulse" />
                  <div className="flex-1 space-y-2 pt-0.5">
                    <div className="h-3 w-3/4 rounded bg-surface-elevated animate-pulse" />
                    <div className="h-2.5 w-1/3 rounded bg-surface-elevated animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

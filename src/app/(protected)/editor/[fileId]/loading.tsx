// Shown by Next.js App Router immediately when navigating to /editor/[fileId]
// — appears before the server component resolves, eliminating the blank flash.
export default function EditorLoading() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#0f0f12]">
      {/* Toolbar skeleton */}
      <div className="flex h-12 items-center gap-3 border-b border-[#3f3f46] bg-[#18181b] px-3 flex-shrink-0">
        <div className="h-4 w-20 rounded bg-[#27272a] animate-pulse" />
        <div className="h-4 w-px bg-[#3f3f46]" />
        <div className="h-4 w-36 rounded bg-[#27272a] animate-pulse" />
        <div className="flex-1" />
        <div className="flex items-center gap-1 rounded-lg border border-[#3f3f46] bg-[#27272a] p-1">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-8 w-8 rounded-md bg-[#3f3f46] animate-pulse" style={{ animationDelay: `${i * 30}ms` }} />
          ))}
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-7 w-16 rounded-md bg-[#27272a] animate-pulse" style={{ animationDelay: `${i * 40}ms` }} />
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <div className="w-52 border-r border-[#3f3f46] bg-[#18181b] p-3 space-y-2 flex-shrink-0">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-8 rounded-md bg-[#27272a] animate-pulse" style={{ animationDelay: `${i * 40}ms` }} />
          ))}
        </div>

        {/* Canvas */}
        <div className="relative flex-1 bg-[#1e1e1e] flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="mx-auto h-10 w-10 rounded-full border-2 border-[#3f3f46] border-t-[#7c3aed] animate-spin" />
            <p className="text-sm text-[#a1a1aa] font-medium">Opening design…</p>
          </div>
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: "linear-gradient(#3f3f46 1px, transparent 1px), linear-gradient(90deg, #3f3f46 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
        </div>

        {/* Right panel */}
        <div className="w-72 border-l border-[#3f3f46] bg-[#18181b] flex flex-col flex-shrink-0">
          <div className="flex border-b border-[#3f3f46] p-1 gap-1">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-7 flex-1 rounded bg-[#27272a] animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
            ))}
          </div>
          <div className="flex-1 p-3 space-y-4">
            {[...Array(5)].map((_, g) => (
              <div key={g} className="space-y-2">
                <div className="h-3 w-16 rounded bg-[#27272a] animate-pulse" />
                <div className="grid grid-cols-2 gap-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-8 rounded bg-[#27272a] animate-pulse" style={{ animationDelay: `${(g * 4 + i) * 25}ms` }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

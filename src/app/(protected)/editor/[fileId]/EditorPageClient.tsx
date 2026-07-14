"use client";

import dynamic from "next/dynamic";
import type { DesignFile } from "@/types";
import { PRESENCE_COLORS } from "@/lib/liveblocks";

interface EditorPageClientProps {
  initialFile: DesignFile;
  readonly?: boolean;
  userInfo: {
    name: string;
    avatar: string;
    userId: string;
  };
}

// EditorLayout is the heaviest chunk (tldraw + liveblocks + 36 components).
// Dynamic import puts it in its own split chunk so:
// 1. The dashboard JS bundle never includes it.
// 2. Next.js starts downloading it in parallel while the server page streams.
// 3. The skeleton fallback shows immediately while it parses.
const EditorLayout = dynamic(
  () => import("@/components/editor/EditorLayout").then((m) => ({ default: m.EditorLayout })),
  {
    loading: () => <EditorSkeleton />,
    ssr: false, // tldraw is browser-only; skipping SSR eliminates hydration mismatch
  }
);

function EditorSkeleton() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#0f0f12]">
      {/* Top toolbar skeleton */}
      <div className="flex h-12 items-center gap-3 border-b border-[#3f3f46] bg-[#18181b] px-3 flex-shrink-0">
        <div className="h-4 w-24 rounded bg-[#27272a] animate-pulse" />
        <div className="h-4 w-px bg-[#3f3f46]" />
        <div className="h-4 w-32 rounded bg-[#27272a] animate-pulse" />
        <div className="flex-1" />
        {/* Tool icons */}
        <div className="flex items-center gap-1 rounded-lg border border-[#3f3f46] bg-[#27272a] p-1">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-8 w-8 rounded-md bg-[#3f3f46] animate-pulse" style={{ animationDelay: `${i * 30}ms` }} />
          ))}
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-7 w-16 rounded-md bg-[#27272a] animate-pulse" style={{ animationDelay: `${i * 40}ms` }} />
          ))}
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel skeleton */}
        <div className="w-52 border-r border-[#3f3f46] bg-[#18181b] p-3 flex flex-col gap-3 flex-shrink-0">
          <div className="h-6 w-3/4 rounded bg-[#27272a] animate-pulse" />
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-8 w-full rounded-md bg-[#27272a] animate-pulse" style={{ animationDelay: `${i * 50}ms` }} />
            ))}
          </div>
        </div>

        {/* Canvas skeleton */}
        <div className="relative flex-1 bg-[#1e1e1e] flex items-center justify-center">
          <div className="text-center space-y-3">
            {/* Spinning loader */}
            <div className="mx-auto h-10 w-10 rounded-full border-2 border-[#3f3f46] border-t-[#7c3aed] animate-spin" />
            <p className="text-sm text-[#a1a1aa] font-medium">Loading canvas…</p>
          </div>
          {/* Faint grid overlay */}
          <div className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: "linear-gradient(#3f3f46 1px, transparent 1px), linear-gradient(90deg, #3f3f46 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
        </div>

        {/* Right panel skeleton */}
        <div className="w-72 border-l border-[#3f3f46] bg-[#18181b] flex flex-col flex-shrink-0">
          {/* Tab bar */}
          <div className="flex border-b border-[#3f3f46] p-1 gap-1">
            {["Design", "Proto", "Inspect"].map((t) => (
              <div key={t} className="h-7 flex-1 rounded bg-[#27272a] animate-pulse" />
            ))}
          </div>
          {/* Panel content */}
          <div className="flex-1 p-3 space-y-4">
            {[...Array(4)].map((_, g) => (
              <div key={g} className="space-y-2">
                <div className="h-3 w-20 rounded bg-[#27272a] animate-pulse" />
                <div className="grid grid-cols-2 gap-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-8 rounded bg-[#27272a] animate-pulse" style={{ animationDelay: `${(g * 4 + i) * 30}ms` }} />
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

export function EditorPageClient({ initialFile, userInfo, readonly = false }: EditorPageClientProps) {
  const colorIndex =
    Math.abs(userInfo.userId.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) %
    PRESENCE_COLORS.length;

  return (
    <EditorLayout
      file={initialFile}
      readonly={readonly}
      userInfo={{
        name: userInfo.name,
        avatar: userInfo.avatar,
        color: PRESENCE_COLORS[colorIndex],
      }}
    />
  );
}

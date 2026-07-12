"use client";

// Next.js App Router error boundary for the dashboard route segment.
// Catches any unhandled error thrown inside page.tsx (e.g. DB connection failure)
// and shows a recoverable UI instead of a hard crash.

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("[Dashboard error]", error);
  }, [error]);

  // Next.js redacts `error.message` for server-side errors in production builds
  // (to avoid leaking internals to the client), but preserves it in dev — so
  // showing it here only exposes real detail during local development.
  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-red-800/40 bg-red-500/5 py-20 text-center">
      <AlertCircle className="mb-4 h-10 w-10 text-red-400" />
      <p className="text-base font-medium text-foreground">
        Failed to load your files
      </p>
      <p className="mt-2 max-w-sm text-sm text-muted">
        There was a problem loading your data. Your files are safe.
      </p>
      {isDev && (
        <div className="mt-4 max-w-lg rounded-lg border border-red-800/40 bg-red-950/30 px-4 py-3 text-left">
          <p className="text-xs font-mono text-red-300 break-all">
            {error.message || "Unknown error"}
          </p>
          {error.digest && (
            <p className="mt-1 text-[10px] text-red-400/70">digest: {error.digest}</p>
          )}
        </div>
      )}
      <button
        onClick={reset}
        className="mt-6 rounded-lg bg-accent px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
      >
        Try again
      </button>
    </div>
  );
}

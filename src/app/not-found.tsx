import Link from "next/link";
import { Layers } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent/20">
        <Layers className="h-7 w-7 text-accent" />
      </div>

      <div>
        <h1 className="text-6xl font-bold text-accent">404</h1>
        <p className="mt-3 text-lg font-medium">Page not found</p>
        <p className="mt-2 text-sm text-muted">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
      </div>

      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}

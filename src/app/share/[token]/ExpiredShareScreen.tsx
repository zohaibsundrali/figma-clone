import { Clock } from "lucide-react";
import Link from "next/link";

export function ExpiredShareScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0f0f12] px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
        <Clock className="h-8 w-8 text-amber-400" />
      </div>
      <h1 className="mt-6 text-xl font-semibold text-white">This link has expired</h1>
      <p className="mt-2 max-w-sm text-sm text-zinc-400">
        The owner set an expiration date for this share link and it has now passed.
        Ask them to extend the link or send you a new one.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
      >
        Go home
      </Link>
    </div>
  );
}

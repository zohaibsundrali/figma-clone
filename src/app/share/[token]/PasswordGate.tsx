"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Loader2 } from "lucide-react";

export function PasswordGate({
  token,
  fileTitle,
}: {
  token: string;
  fileTitle: string;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/share/${token}/verify-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        // Session cookie set — reload the page to render the file.
        router.refresh();
        return;
      }
      if (res.status === 429) {
        setError("Too many attempts. Please wait a moment and try again.");
      } else if (res.status === 410) {
        setError("This link is no longer available.");
      } else {
        setError("Incorrect password. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0f0f12] px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-[#18181b] p-8 text-center shadow-xl"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-violet-500/10">
          <Lock className="h-7 w-7 text-violet-400" />
        </div>
        <h1 className="mt-5 text-lg font-semibold text-white">Password required</h1>
        <p className="mt-1 truncate text-sm text-zinc-400">
          "{fileTitle}" is protected
        </p>

        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
          className="mt-6 w-full rounded-lg border border-zinc-700 bg-[#0f0f12] px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
        />

        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading || !password}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Unlock
        </button>
      </form>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

type State =
  | { kind: "accepting" }
  | { kind: "success" }
  | { kind: "error"; message: string };

export function InviteAcceptClient({ token }: { token: string }) {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "accepting" });
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      try {
        const res = await fetch(`/api/invitations/${token}/accept`, {
          method: "POST",
        });
        const data = (await res.json().catch(() => ({}))) as {
          fileId?: string;
          error?: string;
        };
        if (res.ok && data.fileId) {
          setState({ kind: "success" });
          setTimeout(() => router.replace(`/editor/${data.fileId}`), 800);
        } else {
          setState({
            kind: "error",
            message: data.error ?? "This invitation could not be accepted.",
          });
        }
      } catch {
        setState({ kind: "error", message: "Something went wrong. Please try again." });
      }
    })();
  }, [token, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0f0f12] px-6 text-center">
      {state.kind === "accepting" && (
        <>
          <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
          <p className="mt-4 text-sm text-zinc-400">Accepting your invitation…</p>
        </>
      )}
      {state.kind === "success" && (
        <>
          <CheckCircle2 className="h-10 w-10 text-emerald-400" />
          <p className="mt-4 text-sm text-zinc-300">Access granted. Opening the file…</p>
        </>
      )}
      {state.kind === "error" && (
        <>
          <XCircle className="h-10 w-10 text-red-400" />
          <h1 className="mt-4 text-lg font-semibold text-white">Invitation unavailable</h1>
          <p className="mt-1 max-w-sm text-sm text-zinc-400">{state.message}</p>
          <Link
            href="/dashboard"
            className="mt-6 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Go to dashboard
          </Link>
        </>
      )}
    </div>
  );
}

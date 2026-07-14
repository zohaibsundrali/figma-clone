"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { useEditorContext } from "./EditorContext";
import type { CommentAccess } from "@/types";

/**
 * Polls the caller's access to the open file. If access is revoked or downgraded
 * while the file is open, it safely stops write access:
 *  - canView lost      → redirect out of the editor
 *  - canEdit lost       → flip the canvas to read-only + show a banner
 *
 * The server is authoritative: even before this fires, the next Liveblocks
 * re-auth and every API mutation already re-check permissions.
 */
export function AccessWatcher({ fileId }: { fileId: string }) {
  const { editor } = useEditorContext();
  const router = useRouter();
  const [downgraded, setDowngraded] = useState(false);

  useEffect(() => {
    let active = true;

    const check = async () => {
      try {
        const res = await fetch(`/api/files/${fileId}/access`, {
          cache: "no-store",
        });
        if (!res.ok || !active) return;
        const a = (await res.json()) as CommentAccess;

        if (!a.canView) {
          router.replace("/dashboard?error=access-revoked");
          return;
        }
        if (!a.canEdit && editor && !editor.getInstanceState().isReadonly) {
          editor.updateInstanceState({ isReadonly: true });
          setDowngraded(true);
        }
      } catch {
        /* transient network error — retry next tick */
      }
    };

    const interval = setInterval(check, 20_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [fileId, editor, router]);

  if (!downgraded) return null;

  return (
    <div className="pointer-events-none absolute left-1/2 top-3 z-[100] -translate-x-1/2">
      <div className="pointer-events-auto flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-2 text-xs font-medium text-amber-300 shadow-lg backdrop-blur">
        <AlertTriangle className="h-4 w-4" />
        Your edit access was changed. You are now in view-only mode.
      </div>
    </div>
  );
}

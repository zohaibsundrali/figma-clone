"use client";

import { useCallback, useEffect, useRef } from "react";
import type { SaveStatus } from "@/types";

export function useAutoSave(
  fileId: string,
  onStatusChange: (status: SaveStatus) => void
) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const statusResetRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const save = useCallback(
    (canvasData: unknown, getThumbnail?: () => Promise<string | null>) => {
      onStatusChange("saving");
      clearTimeout(timerRef.current);
      clearTimeout(statusResetRef.current);

      timerRef.current = setTimeout(async () => {
        try {
          const thumbnail = getThumbnail ? await getThumbnail() : null;
          const body: Record<string, unknown> = { canvasData };

          if (thumbnail) {
            body.thumbnail = thumbnail;
          }

          const res = await fetch(`/api/files/${fileId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          if (!res.ok) {
            onStatusChange("error");
            return;
          }

          onStatusChange("saved");
          statusResetRef.current = setTimeout(() => onStatusChange("idle"), 2000);
        } catch {
          onStatusChange("error");
        }
      }, 2000);
    },
    [fileId, onStatusChange]
  );

  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current);
      clearTimeout(statusResetRef.current);
    };
  }, []);

  return save;
}

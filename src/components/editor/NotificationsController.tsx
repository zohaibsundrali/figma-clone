"use client";

import { useCallback, useEffect, useRef } from "react";
import { useEventListener } from "@/lib/liveblocks";
import type { NotificationRecord } from "@/types";

interface NotificationsControllerProps {
  setDbNotifications: React.Dispatch<React.SetStateAction<NotificationRecord[]>>;
  bindRefresh: (fn: () => void) => void;
}

/**
 * Headless controller (rendered inside the Liveblocks room) that keeps the
 * current user's DB-backed notifications fresh: fetches on mount, when another
 * client broadcasts a comment change, and on a slow poll as a safety net.
 */
export function NotificationsController({
  setDbNotifications,
  bindRefresh,
}: NotificationsControllerProps) {
  const inFlight = useRef(false);

  const fetchNotifications = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        setDbNotifications((await res.json()) as NotificationRecord[]);
      }
    } catch {
      /* transient — next tick retries */
    } finally {
      inFlight.current = false;
    }
  }, [setDbNotifications]);

  useEffect(() => {
    bindRefresh(() => void fetchNotifications());
    void fetchNotifications();
    const interval = setInterval(() => void fetchNotifications(), 30_000);
    return () => clearInterval(interval);
  }, [fetchNotifications, bindRefresh]);

  // A comment change in the room may have produced a mention/reply for us.
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEventListener(({ event }) => {
    if (event.type !== "comments-updated") return;
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => void fetchNotifications(), 300);
  });

  return null;
}

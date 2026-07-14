"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useEditorContext, NotificationItem } from "./EditorContext";
import {
  Bell,
  MessageSquare,
  Save,
  History,
  Share2,
  ImageIcon,
  Trash2,
  X,
  AtSign,
  Reply,
} from "lucide-react";
import type { NotificationRecord } from "@/types";

interface NotificationsPanelProps {
  onClose: () => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationsPanel({ onClose }: NotificationsPanelProps) {
  const {
    notifications,
    setNotifications,
    dbNotifications,
    setDbNotifications,
    refreshNotifications,
    fileId,
    setIsCommentsMode,
    setActiveCommentId,
  } = useEditorContext();
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);

  // Pull the latest as soon as the panel opens.
  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        if (target.closest(".notification-trigger")) return;
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const markDbRead = async (id: string) => {
    setDbNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    try {
      await fetch(`/api/notifications/${id}`, { method: "PATCH" });
    } catch {
      /* optimistic; controller will re-sync */
    }
  };

  const handleOpenNotification = async (n: NotificationRecord) => {
    await markDbRead(n.id);
    if (n.fileId === fileId) {
      // Same file — focus the comment pin directly.
      setIsCommentsMode(true);
      if (n.commentId) setActiveCommentId(n.commentId);
      onClose();
    } else {
      // Different file — navigate and deep-link to the comment.
      const query = n.commentId ? `?comment=${n.commentId}` : "";
      router.push(`/editor/${n.fileId}${query}`);
      onClose();
    }
  };

  const handleMarkAllRead = async () => {
    setDbNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await fetch("/api/notifications/read-all", { method: "POST" });
    } catch {
      /* optimistic */
    }
  };

  const handleClearLocal = () => setNotifications([]);

  const handleDeleteLocal = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const getLocalIcon = (type: NotificationItem["type"]) => {
    switch (type) {
      case "save":
        return <Save className="h-4 w-4 text-muted" />;
      case "comment":
        return <MessageSquare className="h-4 w-4 text-muted" />;
      case "version":
        return <History className="h-4 w-4 text-muted" />;
      case "share":
        return <Share2 className="h-4 w-4 text-muted" />;
      case "image":
        return <ImageIcon className="h-4 w-4 text-muted" />;
      default:
        return <Bell className="h-4 w-4 text-muted" />;
    }
  };

  const getDbIcon = (type: string) =>
    type === "mention" ? (
      <AtSign className="h-4 w-4 text-accent" />
    ) : (
      <Reply className="h-4 w-4 text-muted" />
    );

  const unreadCount =
    dbNotifications.filter((n) => !n.read).length +
    notifications.filter((n) => !n.read).length;

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-10 z-50 flex max-h-[400px] w-80 flex-col overflow-hidden rounded-lg border border-border bg-surface-elevated shadow-xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-surface p-3">
        <div className="flex items-center space-x-2">
          <Bell className="h-4 w-4 text-accent" />
          <span className="text-xs font-bold uppercase tracking-wider text-foreground">
            Notifications
          </span>
          {unreadCount > 0 && (
            <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
              {unreadCount} new
            </span>
          )}
        </div>
        <div className="flex items-center space-x-1">
          {unreadCount > 0 && (
            <button
              onClick={() => void handleMarkAllRead()}
              className="rounded px-2 py-1 text-[11px] font-medium text-accent transition-colors hover:bg-border hover:underline"
              title="Mark all as read"
            >
              Mark read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={handleClearLocal}
              className="rounded p-1 text-muted transition-colors hover:bg-border hover:text-red-400"
              title="Clear activity"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 divide-y divide-border overflow-y-auto">
        {dbNotifications.length === 0 && notifications.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center space-y-2 p-8 text-center text-xs text-muted">
            <Bell className="h-8 w-8 text-muted/30" />
            <span>No notifications yet</span>
          </div>
        ) : (
          <>
            {/* Actionable DB notifications (mentions / replies) */}
            {dbNotifications.map((n) => (
              <button
                key={n.id}
                onClick={() => void handleOpenNotification(n)}
                className={`group relative flex w-full items-start space-x-3 p-3 text-left text-xs transition-colors hover:bg-border ${
                  !n.read ? "bg-accent/5 font-medium" : "text-muted"
                }`}
              >
                {!n.read && (
                  <span className="absolute left-1.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 animate-pulse rounded-full bg-accent" />
                )}
                <div className="mt-0.5 flex-shrink-0">{getDbIcon(n.type)}</div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="truncate font-semibold text-foreground">
                      {n.type === "mention" ? "You were mentioned" : "New reply"}
                    </span>
                    <span className="whitespace-nowrap text-[10px] text-muted">
                      {timeAgo(n.createdAt)}
                    </span>
                  </div>
                  <p className="line-clamp-2 leading-relaxed text-muted">
                    {n.message}
                  </p>
                </div>
              </button>
            ))}

            {/* Local informational activity */}
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() =>
                  setNotifications((prev) =>
                    prev.map((x) => (x.id === n.id ? { ...x, read: true } : x))
                  )
                }
                className={`group relative flex cursor-pointer items-start space-x-3 p-3 text-xs transition-colors hover:bg-border ${
                  !n.read ? "bg-accent/5 font-medium" : "text-muted"
                }`}
              >
                {!n.read && (
                  <span className="absolute left-1.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 animate-pulse rounded-full bg-accent" />
                )}
                <div className="mt-0.5 flex-shrink-0">{getLocalIcon(n.type)}</div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="truncate font-semibold text-foreground">
                      {n.title}
                    </span>
                    <span className="whitespace-nowrap text-[10px] text-muted">
                      {n.timestamp}
                    </span>
                  </div>
                  <p className="line-clamp-2 leading-relaxed text-muted">
                    {n.message}
                  </p>
                </div>
                <button
                  onClick={(e) => handleDeleteLocal(n.id, e)}
                  className="p-0.5 text-muted opacity-0 transition-all duration-150 hover:text-red-400 group-hover:opacity-100"
                  title="Dismiss"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

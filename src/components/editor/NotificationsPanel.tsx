"use client";

import { useEffect, useRef } from "react";
import { useEditorContext, NotificationItem } from "./EditorContext";
import { Bell, MessageSquare, Save, History, Share2, ImageIcon, Trash2, X } from "lucide-react";

interface NotificationsPanelProps {
  onClose: () => void;
}

export function NotificationsPanel({ onClose }: NotificationsPanelProps) {
  const { notifications, setNotifications } = useEditorContext();
  const panelRef = useRef<HTMLDivElement>(null);

  // Close panel on clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        // Also ensure we don't close if clicking the bell button itself (handled via trigger ref/class check)
        const target = event.target as HTMLElement;
        if (target.closest(".notification-trigger")) {
          return;
        }
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  const handleMarkAllRead = () => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read: true }))
    );
  };

  const handleClearAll = () => {
    setNotifications([]);
  };

  const handleMarkRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const getIcon = (type: NotificationItem["type"]) => {
    switch (type) {
      case "save":
        return <Save className="h-4 w-4 text-emerald-400" />;
      case "comment":
        return <MessageSquare className="h-4 w-4 text-blue-400" />;
      case "version":
        return <History className="h-4 w-4 text-violet-400" />;
      case "share":
        return <Share2 className="h-4 w-4 text-amber-400" />;
      case "image":
        return <ImageIcon className="h-4 w-4 text-pink-400" />;
      default:
        return <Bell className="h-4 w-4 text-muted" />;
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-10 z-50 w-80 rounded-lg border border-border bg-surface-elevated shadow-xl flex flex-col max-h-[400px] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-3 bg-surface">
        <div className="flex items-center space-x-2">
          <Bell className="h-4 w-4 text-accent" />
          <span className="text-xs font-bold text-foreground uppercase tracking-wider">Notifications</span>
          {unreadCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/20 text-accent font-semibold">
              {unreadCount} new
            </span>
          )}
        </div>
        <div className="flex items-center space-x-1">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-[11px] text-accent hover:underline font-medium px-2 py-1 rounded hover:bg-border transition-colors"
              title="Mark all as read"
            >
              Mark read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={handleClearAll}
              className="p-1 text-muted hover:text-red-400 rounded hover:bg-border transition-colors"
              title="Clear all"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto divide-y divide-border">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-muted space-y-2 h-48">
            <Bell className="h-8 w-8 text-muted/30" />
            <span>No notifications yet</span>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleMarkRead(n.id)}
              className={`group p-3 text-xs transition-colors cursor-pointer hover:bg-border flex items-start space-x-3 relative ${
                !n.read ? "bg-accent/5 font-medium" : "text-muted"
              }`}
            >
              {/* Unread indicator dot */}
              {!n.read && (
                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              )}
              
              {/* Type Icon */}
              <div className="flex-shrink-0 mt-0.5">{getIcon(n.type)}</div>

              {/* Text */}
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex justify-between items-baseline gap-1">
                  <span className="text-foreground font-semibold truncate">{n.title}</span>
                  <span className="text-[10px] text-muted whitespace-nowrap">{n.timestamp}</span>
                </div>
                <p className="text-muted leading-relaxed line-clamp-2">{n.message}</p>
              </div>

              {/* Close Button to dismiss individual notification */}
              <button
                onClick={(e) => handleDelete(n.id, e)}
                className="opacity-0 group-hover:opacity-100 hover:text-red-400 text-muted p-0.5 transition-all duration-150"
                title="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

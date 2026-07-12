"use client";

import { useEffect, useState } from "react";
import { Clock, User, FileText } from "lucide-react";
import type { Activity } from "@/types";

interface ActivityLogProps {
  fileId: string;
}

const actionIcons: Record<string, React.ReactNode> = {
  file_created: <FileText className="h-4 w-4" />,
  file_updated: <FileText className="h-4 w-4" />,
  member_invited: <User className="h-4 w-4" />,
  member_removed: <User className="h-4 w-4" />,
  file_deleted: <FileText className="h-4 w-4" />,
  file_restored: <FileText className="h-4 w-4" />,
  file_shared: <FileText className="h-4 w-4" />,
};

const actionLabels: Record<string, string> = {
  file_created: "created this file",
  file_updated: "saved changes",
  member_invited: "invited a member",
  member_removed: "removed a member",
  file_deleted: "deleted this file",
  file_restored: "restored this file",
  file_shared: "shared this file",
};

export function ActivityLog({ fileId }: ActivityLogProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const res = await fetch(`/api/files/${fileId}/activity?take=50`);
        if (res.ok) {
          const data = await res.json();
          setActivities(data);
        }
      } catch (err) {
        console.error("Failed to fetch activities:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [fileId]);

  if (loading) {
    return <div className="py-4 text-center text-sm text-muted">Loading activity...</div>;
  }

  if (activities.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted">No activity yet.</div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => {
        const icon = actionIcons[activity.action] || <Clock className="h-4 w-4" />;
        const label = actionLabels[activity.action] || activity.action;
        const timestamp = new Date(activity.createdAt);
        const timeString = timestamp.toLocaleString();

        return (
          <div
            key={activity.id}
            className="flex gap-3 rounded-lg border border-border/50 bg-muted/20 p-3 text-sm"
          >
            <div className="mt-1 flex-shrink-0 text-muted">{icon}</div>
            <div className="flex-1">
              <div className="font-medium text-foreground">
                <span className="text-accent">{activity.authorName}</span> {label}
              </div>
              {activity.details && (
                <p className="mt-1 text-xs text-muted">{activity.details}</p>
              )}
              <time className="mt-1 block text-xs text-muted/70">{timeString}</time>
            </div>
          </div>
        );
      })}
    </div>
  );
}

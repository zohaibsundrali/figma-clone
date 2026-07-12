"use client";

import { useOthers, useSelf } from "@/lib/liveblocks";
import { Users, MapPin, Clock } from "lucide-react";

interface Collaborator {
  id: string;
  name: string;
  avatar: string;
  color: string;
  cursor: { x: number; y: number } | null | undefined;
  isSelf: boolean;
}

export function CollaboratorsPanel() {
  const self = useSelf();
  const others = useOthers();

  const collaborators: Collaborator[] = [
    self
      ? {
          id: `self-${self.connectionId}`,
          name: self.info?.name ?? "You",
          avatar: self.info?.avatar ?? "",
          color: self.info?.color ?? "#0d99ff",
          cursor: self.presence?.cursor,
          isSelf: true,
        }
      : null,
    ...others.map((other) => ({
      id: `other-${other.connectionId}`,
      name: other.info?.name ?? "Anonymous",
      avatar: other.info?.avatar ?? "",
      color: other.info?.color ?? "#0d99ff",
      cursor: other.presence?.cursor,
      isSelf: false,
    })),
  ].filter(Boolean) as Collaborator[];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-3 py-2">
        <Users className="h-4 w-4 text-muted" />
        <h3 className="text-sm font-semibold">
          {collaborators.length} {collaborators.length === 1 ? "person" : "people"} online
        </h3>
      </div>

      <div className="space-y-1.5">
        {collaborators.map((collab) => (
          <div
            key={collab.id}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors ${
              collab.isSelf
                ? "bg-accent/10 border border-accent/20"
                : "hover:bg-surface-elevated border border-transparent"
            }`}
          >
            {/* Avatar */}
            <div
              className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border-2"
              style={{ borderColor: collab.color }}
            >
              {collab.avatar ? (
                <img
                  src={collab.avatar}
                  alt={collab.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: collab.color }}
                >
                  {collab.name
                    .split(" ")
                    .slice(0, 2)
                    .map((n: string) => n[0])
                    .join("")
                    .toUpperCase()}
                </div>
              )}
              <div
                className="absolute bottom-0 right-0 h-2 w-2 rounded-full border border-background"
                style={{ backgroundColor: collab.color }}
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-foreground">
                  {collab.name}
                </p>
                {collab.isSelf && (
                  <span className="inline-flex items-center rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-semibold text-green-400">
                    You
                  </span>
                )}
              </div>

              {/* Activity status */}
              <div className="flex items-center gap-1 text-xs text-muted">
                {collab.cursor ? (
                  <>
                    <MapPin className="h-3 w-3" />
                    <span>Active</span>
                  </>
                ) : (
                  <>
                    <Clock className="h-3 w-3" />
                    <span>Idle</span>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-surface-elevated/30 px-3 py-2 text-xs text-muted">
        <p>
          🟢 <span className="font-medium">Green dot:</span> User cursor is visible
        </p>
        <p className="mt-1">
          All edits are synced in real-time via Liveblocks.
        </p>
      </div>
    </div>
  );
}

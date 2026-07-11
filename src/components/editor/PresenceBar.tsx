"use client";

import { useOthers, useSelf } from "@/lib/liveblocks";

function getInitials(name?: string) {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 1).toUpperCase();
  return `${parts[0]!.slice(0, 1)}${parts[1]!.slice(0, 1)}`.toUpperCase();
}

export function PresenceBar() {
  const others = useOthers();
  const self = useSelf();

  const selfInfo = self?.info;
  const visibleUsers = [
    selfInfo
      ? {
          id: `self-${self.connectionId}`,
          name: selfInfo.name ?? "You",
          avatar: selfInfo.avatar ?? "",
          color: selfInfo.color ?? "#0d99ff",
          isSelf: true,
        }
      : null,
    ...others.map((other) => ({
      id: `other-${other.connectionId}`,
      name: other.info?.name ?? "Anonymous",
      avatar: other.info?.avatar ?? "",
      color: other.info?.color ?? "#0d99ff",
      isSelf: false,
    })),
  ].filter(Boolean) as Array<{
    id: string;
    name: string;
    avatar: string;
    color: string;
    isSelf: boolean;
  }>;

  const onlineCount = visibleUsers.length;

  if (onlineCount === 0) {
    return null;
  }

  const avatarsToShow = visibleUsers.slice(0, 3);
  const remainingCount = Math.max(0, onlineCount - avatarsToShow.length);

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center -space-x-2">
        {avatarsToShow.map((user) => {
          const label = user.isSelf ? `${user.name} (You)` : user.name;

          return (
            <div
              key={user.id}
              title={label}
              className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border-2 border-[#0f141a] bg-[#1b2028] text-[11px] font-semibold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.04)]"
              style={{ borderColor: user.color }}
            >
              {user.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatar}
                  alt={label}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <span
                  className="flex h-full w-full items-center justify-center"
                  style={{ backgroundColor: `${user.color}22`, color: user.color }}
                >
                  {getInitials(user.name)}
                </span>
              )}
              <span
                className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full border border-[#0f141a]"
                style={{ backgroundColor: user.color }}
              />
            </div>
          );
        })}

        {remainingCount > 0 && (
          <div className="ml-1 flex h-8 min-w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 px-2 text-[11px] font-semibold text-white/80">
            +{remainingCount}
          </div>
        )}
      </div>

      <div className="hidden h-8 items-center rounded-full border border-white/10 bg-white/5 px-3 text-xs text-white/70 sm:flex">
        <span className="mr-2 h-2 w-2 rounded-full bg-emerald-400" />
        {onlineCount} online
      </div>
    </div>
  );
}

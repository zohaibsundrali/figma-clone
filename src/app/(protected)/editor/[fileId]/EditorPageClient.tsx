"use client";

import { EditorLayout } from "@/components/editor/EditorLayout";
import { PRESENCE_COLORS } from "@/lib/liveblocks";
import type { DesignFile } from "@/types";

interface EditorPageClientProps {
  initialFile: DesignFile;
  userInfo: {
    name: string;
    avatar: string;
    userId: string;
  };
}

export function EditorPageClient({ initialFile, userInfo }: EditorPageClientProps) {
  const colorIndex =
    Math.abs(userInfo.userId.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) %
    PRESENCE_COLORS.length;

  return (
    <EditorLayout
      file={initialFile}
      userInfo={{
        name: userInfo.name,
        avatar: userInfo.avatar,
        color: PRESENCE_COLORS[colorIndex],
      }}
    />
  );
}

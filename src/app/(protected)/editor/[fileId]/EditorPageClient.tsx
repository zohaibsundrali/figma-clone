"use client";

import { useEffect, useState } from "react";
import { EditorLayout } from "@/components/editor/EditorLayout";
import { PRESENCE_COLORS } from "@/lib/liveblocks";
import type { DesignFile } from "@/types";

interface EditorPageClientProps {
  fileId: string;
  userInfo: {
    name: string;
    avatar: string;
    userId: string;
  };
}

export function EditorPageClient({ fileId, userInfo }: EditorPageClientProps) {
  const [file, setFile] = useState<DesignFile | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/files/${fileId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then(setFile)
      .catch(() => setError(true));
  }, [fileId]);

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted">File not found</p>
      </div>
    );
  }

  if (!file) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  const colorIndex =
    Math.abs(userInfo.userId.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) %
    PRESENCE_COLORS.length;

  return (
    <EditorLayout
      file={file}
      userInfo={{
        name: userInfo.name,
        avatar: userInfo.avatar,
        color: PRESENCE_COLORS[colorIndex],
      }}
    />
  );
}

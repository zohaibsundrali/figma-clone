"use client";

import { EditorLayout } from "@/components/editor/EditorLayout";
import type { DesignFile } from "@/types";

interface SharePageClientProps {
  file: DesignFile;
}

export function SharePageClient({ file }: SharePageClientProps) {
  return (
    <EditorLayout
      file={file}
      userInfo={{ name: "Viewer", avatar: "", color: "#71717a" }}
      readonly
    />
  );
}

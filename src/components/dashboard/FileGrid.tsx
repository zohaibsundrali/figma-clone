"use client";

import { FileCard } from "./FileCard";
import type { DesignFileSummary } from "@/types";

interface FileGridProps {
  files: DesignFileSummary[];
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  folders: Array<{ id: string; name: string }>;
  onMoveToFolder: (fileId: string, folderId: string | null) => void;
  fileFolderMap: Record<string, string>;
  archivedFileIds: string[];
  onArchiveToggle: (fileId: string) => void;
}

export function FileGrid({
  files,
  onDelete,
  onDuplicate,
  folders,
  onMoveToFolder,
  fileFolderMap,
  archivedFileIds,
  onArchiveToggle,
}: FileGridProps) {
  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
        <p className="text-lg font-medium">No designs found</p>
        <p className="mt-2 text-sm text-muted">
          Try clearing your search filters or select a different folder
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {files.map((file) => (
        <FileCard
          key={file.id}
          file={file}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          folders={folders}
          onMoveToFolder={onMoveToFolder}
          currentFolderId={fileFolderMap[file.id] || null}
          isArchived={archivedFileIds.includes(file.id)}
          onArchiveToggle={onArchiveToggle}
        />
      ))}
    </div>
  );
}

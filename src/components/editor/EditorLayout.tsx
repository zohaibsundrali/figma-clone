"use client";

import { useCallback, useState } from "react";
import type React from "react";
import { AssetsPanel } from "./AssetsPanel";
import { CommentsPanel } from "./CommentsPanel";
import { EditorCanvas } from "./EditorCanvas";
import { EditorContext } from "./EditorContext";
import { EditorErrorBoundary } from "./EditorErrorBoundary";
import { PropertiesPanel } from "./PropertiesPanel";
import { PrototypePanel } from "./PrototypePanel";
import { InspectPanel } from "./InspectPanel";
import { ActivityLog } from "./ActivityLog";
import { CollaboratorsPanel } from "./CollaboratorsPanel";
import { TopToolbar } from "./TopToolbar";
import { VersionHistorySidebar } from "./VersionHistorySidebar";
import { RoomProvider } from "@/lib/liveblocks";
import { ClientSideSuspense } from "@liveblocks/react";
import { useAutoSave } from "@/hooks/useAutoSave";
import type { DesignFile, SaveStatus, Comment } from "@/types";
import type { Editor } from "tldraw";

interface EditorLayoutProps {
  file: DesignFile;
  userInfo: {
    name: string;
    avatar: string;
    color: string;
  };
  readonly?: boolean;
}

export function EditorLayout({
  file: initialFile,
  userInfo,
  readonly = false,
}: EditorLayoutProps) {
  const [file, setFile] = useState(initialFile);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [activeRightTab, setActiveRightTab] = useState<"design" | "prototype" | "inspect" | "activity" | "collaborators">("design");
  const handleSave = useAutoSave(file.id, setSaveStatus);

  const handleFileChange = useCallback(
    (updates: Partial<Pick<DesignFile, "isPublic">>) => {
      setFile((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  const handleTitleChange = useCallback(
    async (title: string) => {
      setFile((prev) => ({ ...prev, title }));
      await fetch(`/api/files/${file.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
    },
    [file.id]
  );

  const [isCommentsMode, setIsCommentsMode] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);

  // Notifications State
  const [notifications, setNotifications] = useState<import("./EditorContext").NotificationItem[]>([
    {
      id: "init-1",
      type: "save",
      title: "Workspace loaded",
      message: "Canvas state loaded from PostgreSQL successfully.",
      timestamp: "Just now",
      read: false,
    },
    {
      id: "init-2",
      type: "share",
      title: "Welcome to Figma Clone",
      message: "Collaborators can join using the Share menu.",
      timestamp: "1m ago",
      read: true,
    }
  ]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Listen to autosave completion
  const [lastSaveStatus, setLastSaveStatus] = useState<SaveStatus>("idle");
  useState(() => {
    setLastSaveStatus(saveStatus);
  });
  const handleSaveStatusChange = useCallback((status: SaveStatus) => {
    if (status === "saved" && lastSaveStatus === "saving") {
      setNotifications((prev) => [
        {
          id: `save-${Date.now()}`,
          type: "save",
          title: "File autosaved",
          message: "All canvas modifications saved automatically.",
          timestamp: "Just now",
          read: false,
        },
        ...prev,
      ]);
    }
    setLastSaveStatus(status);
  }, [lastSaveStatus]);

  // Sync saveStatus changes
  if (saveStatus !== lastSaveStatus) {
    handleSaveStatusChange(saveStatus);
  }

  // Listen to comment additions
  const [prevCommentsCount, setPrevCommentsCount] = useState(0);
  if (comments.length > prevCommentsCount) {
    const newComment = comments[comments.length - 1];
    setNotifications((prev) => [
      {
        id: `comment-${Date.now()}`,
        type: "comment",
        title: "New comment added",
        message: `"${newComment.text}" by ${newComment.authorName}`,
        timestamp: "Just now",
        read: false,
      },
      ...prev,
    ]);
    setPrevCommentsCount(comments.length);
  } else if (comments.length < prevCommentsCount) {
    setPrevCommentsCount(comments.length);
  }

  // Stable setter passed through context — useCallback ensures referential stability
  // even though useState setters are already stable; this makes the intent explicit.
  const stableSetComments = useCallback<React.Dispatch<React.SetStateAction<typeof comments>>>(
    (action) => setComments(action),
    []
  );

  const content = (
    <EditorContext.Provider value={{
      editor,
      setEditor,
      isCommentsMode,
      setIsCommentsMode,
      comments,
      setComments: stableSetComments,
      isVersionHistoryOpen,
      setIsVersionHistoryOpen,
      notifications,
      setNotifications,
      isNotificationsOpen,
      setIsNotificationsOpen,
      activeRightTab,
      setActiveRightTab
    }}>
      <div className="flex h-screen flex-col overflow-hidden bg-background">
        <TopToolbar
          file={file}
          saveStatus={saveStatus}
          onTitleChange={handleTitleChange}
          onFileChange={handleFileChange}
          readonly={readonly}
        />
        <div className="flex flex-1 overflow-hidden relative">
          {isCommentsMode ? (
            <CommentsPanel fileId={file.id} />
          ) : (
            <AssetsPanel />
          )}
          <EditorErrorBoundary>
            <EditorCanvas
              initialData={file.canvasData}
              readonly={readonly}
              onSave={handleSave}
            />
          </EditorErrorBoundary>
          <aside className="flex w-72 flex-col border-l border-border bg-surface h-full">
            <div className="flex border-b border-border bg-surface flex-shrink-0">
              <button
                onClick={() => setActiveRightTab("design")}
                className={`flex-grow py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                  activeRightTab === "design"
                    ? "border-accent text-accent"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                Design
              </button>
              <button
                onClick={() => setActiveRightTab("prototype")}
                className={`flex-grow py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                  activeRightTab === "prototype"
                    ? "border-accent text-accent"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                Prototype
              </button>
              <button
                onClick={() => setActiveRightTab("inspect")}
                className={`flex-grow py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                  activeRightTab === "inspect"
                    ? "border-accent text-accent"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                Inspect
              </button>
              <button
                onClick={() => setActiveRightTab("activity")}
                className={`flex-grow py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                  activeRightTab === "activity"
                    ? "border-accent text-accent"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                Activity
              </button>
              <button
                onClick={() => setActiveRightTab("collaborators")}
                className={`flex-grow py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                  activeRightTab === "collaborators"
                    ? "border-accent text-accent"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                People
              </button>
            </div>
            
            <div className="flex-1 overflow-hidden flex flex-col">
              {activeRightTab === "design" && <PropertiesPanel embedded />}
              {activeRightTab === "prototype" && <PrototypePanel />}
              {activeRightTab === "inspect" && <InspectPanel />}
              {activeRightTab === "activity" && (
                <div className="flex-1 overflow-y-auto p-3">
                  <ActivityLog fileId={file.id} />
                </div>
              )}
              {activeRightTab === "collaborators" && (
                <div className="flex-1 overflow-y-auto p-3">
                  <CollaboratorsPanel />
                </div>
              )}
            </div>
          </aside>
          {isVersionHistoryOpen && (
            <VersionHistorySidebar 
              fileId={file.id} 
              onClose={() => setIsVersionHistoryOpen(false)} 
            />
          )}
        </div>
      </div>
    </EditorContext.Provider>
  );

  if (readonly) return content;

  return (
    <RoomProvider
      id={file.id}
      initialPresence={{
        cursor: null,
        name: userInfo.name,
        avatar: userInfo.avatar,
        color: userInfo.color,
      }}
      initialStorage={{
        canvasData: (file.canvasData ?? null) as import("@liveblocks/client").JsonObject | null,
      }}
    >
      <ClientSideSuspense fallback={<div className="flex h-screen w-screen items-center justify-center bg-background text-muted text-sm">Connecting to canvas...</div>}>
        {content}
      </ClientSideSuspense>
    </RoomProvider>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState, lazy, Suspense } from "react";
import type React from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { EditorCanvas } from "./EditorCanvas";
import { EditorContext } from "./EditorContext";
import { NotificationsController } from "./NotificationsController";
import { EditorErrorBoundary } from "./EditorErrorBoundary";
import { TopToolbar } from "./TopToolbar";
import { RoomProvider } from "@/lib/liveblocks";
import { ClientSideSuspense } from "@liveblocks/react";
import { useAutoSave } from "@/hooks/useAutoSave";
import type {
  DesignFile,
  SaveStatus,
  Comment,
  DraftComment,
  MentionMember,
  CommentAccess,
  NotificationRecord,
} from "@/types";
import type { Editor } from "tldraw";

// Left panel — only one is ever visible at a time
const AssetsPanel = dynamic(() => import("./AssetsPanel").then(m => ({ default: m.AssetsPanel })), {
  loading: () => <div className="w-52 border-r border-border bg-surface animate-pulse" />,
});
const CommentsPanel = dynamic(() => import("./CommentsPanel").then(m => ({ default: m.CommentsPanel })), {
  loading: () => <div className="w-52 border-r border-border bg-surface animate-pulse" />,
});
// Version history is opened on demand
const VersionHistorySidebar = dynamic(() => import("./VersionHistorySidebar").then(m => ({ default: m.VersionHistorySidebar })));

// Right sidebar panels — lazy loaded (already were, keeping consistent)
const PropertiesPanel = lazy(() => import("./PropertiesPanel").then(m => ({ default: m.PropertiesPanel })));
const PrototypePanel = lazy(() => import("./PrototypePanel").then(m => ({ default: m.PrototypePanel })));
const InspectPanel = lazy(() => import("./InspectPanel").then(m => ({ default: m.InspectPanel })));
const ActivityLog = lazy(() => import("./ActivityLog").then(m => ({ default: m.ActivityLog })));
const CollaboratorsPanel = lazy(() => import("./CollaboratorsPanel").then(m => ({ default: m.CollaboratorsPanel })));
const GuidesPanel = lazy(() => import("./GuidesPanel").then(m => ({ default: m.GuidesPanel })));
const ConstraintsPanel = lazy(() => import("./ConstraintsPanel").then(m => ({ default: m.ConstraintsPanel })));
const ComponentsLibrary = lazy(() => import("./ComponentsLibrary").then(m => ({ default: m.ComponentsLibrary })));
const TokensPanel = lazy(() => import("./TokensPanel").then(m => ({ default: m.TokensPanel })));

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
  const [activeRightTab, setActiveRightTab] = useState<"design" | "prototype" | "inspect" | "activity" | "collaborators" | "guides" | "constraints" | "components" | "tokens">("design");
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
  const [draftComment, setDraftComment] = useState<DraftComment | null>(null);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [mentionMembers, setMentionMembers] = useState<MentionMember[]>([]);
  const [commentAccess, setCommentAccess] = useState<CommentAccess | null>(null);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);

  // DB-backed notifications (mentions/replies). The controller (mounted inside
  // the room) fetches these; refreshRef lets any component force a refetch.
  const [dbNotifications, setDbNotifications] = useState<NotificationRecord[]>([]);
  const refreshRef = useRef<() => void>(() => {});
  const refreshNotifications = useCallback(() => refreshRef.current(), []);

  // Deep-link: /editor/[id]?comment=<id> opens comments mode + focuses the pin.
  const searchParams = useSearchParams();
  const focusCommentId = searchParams.get("comment");
  useEffect(() => {
    if (focusCommentId) {
      setIsCommentsMode(true);
      setActiveCommentId(focusCommentId);
    }
  }, [focusCommentId]);

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
      fileId: file.id,
      setFileId: () => {},
      isCommentsMode,
      setIsCommentsMode,
      comments,
      setComments: stableSetComments,
      draftComment,
      setDraftComment,
      activeCommentId,
      setActiveCommentId,
      mentionMembers,
      setMentionMembers,
      commentAccess,
      setCommentAccess,
      isVersionHistoryOpen,
      setIsVersionHistoryOpen,
      notifications,
      setNotifications,
      dbNotifications,
      setDbNotifications,
      refreshNotifications,
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
            <CommentsPanel fileId={file.id} readonly={readonly} />
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
              <button
                onClick={() => setActiveRightTab("guides")}
                className={`flex-grow py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                  activeRightTab === "guides"
                    ? "border-accent text-accent"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                Guides
              </button>
              <button
                onClick={() => setActiveRightTab("constraints")}
                className={`flex-grow py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                  activeRightTab === "constraints"
                    ? "border-accent text-accent"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                Constraints
              </button>
              <button
                onClick={() => setActiveRightTab("components")}
                className={`flex-grow py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                  activeRightTab === "components"
                    ? "border-accent text-accent"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                Components
              </button>
              <button
                onClick={() => setActiveRightTab("tokens")}
                className={`flex-grow py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                  activeRightTab === "tokens"
                    ? "border-accent text-accent"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                Tokens
              </button>
            </div>
            
            <div className="flex-1 overflow-hidden flex flex-col">
              <Suspense fallback={<div className="p-4 text-xs text-muted">Loading...</div>}>
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
                {activeRightTab === "guides" && <GuidesPanel />}
                {activeRightTab === "constraints" && <ConstraintsPanel />}
                {activeRightTab === "components" && <ComponentsLibrary />}
                {activeRightTab === "tokens" && <TokensPanel />}
              </Suspense>
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
        <NotificationsController
          setDbNotifications={setDbNotifications}
          bindRefresh={(fn) => (refreshRef.current = fn)}
        />
        {content}
      </ClientSideSuspense>
    </RoomProvider>
  );
}

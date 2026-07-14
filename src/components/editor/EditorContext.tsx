"use client";

import React, { createContext, useContext } from "react";
import type { Editor } from "tldraw";
import type {
  Comment,
  MentionMember,
  CommentAccess,
  DraftComment,
  NotificationRecord,
} from "@/types";

export type { Comment } from "@/types";

export interface NotificationItem {
  id: string;
  type: "save" | "comment" | "version" | "share" | "image";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

interface EditorContextValue {
  editor: Editor | null;
  setEditor: (editor: Editor | null) => void;
  fileId: string | null;
  setFileId: (id: string | null) => void;
  isCommentsMode: boolean;
  setIsCommentsMode: (mode: boolean) => void;
  comments: Comment[];
  setComments: React.Dispatch<React.SetStateAction<Comment[]>>;
  // Comment placement + focus
  draftComment: DraftComment | null;
  setDraftComment: React.Dispatch<React.SetStateAction<DraftComment | null>>;
  activeCommentId: string | null;
  setActiveCommentId: React.Dispatch<React.SetStateAction<string | null>>;
  // Mention autocomplete candidates + current user's permissions
  mentionMembers: MentionMember[];
  setMentionMembers: React.Dispatch<React.SetStateAction<MentionMember[]>>;
  commentAccess: CommentAccess | null;
  setCommentAccess: React.Dispatch<React.SetStateAction<CommentAccess | null>>;
  isVersionHistoryOpen: boolean;
  setIsVersionHistoryOpen: (open: boolean) => void;
  notifications: NotificationItem[];
  setNotifications: React.Dispatch<React.SetStateAction<NotificationItem[]>>;
  // DB-backed mention/reply notifications
  dbNotifications: NotificationRecord[];
  setDbNotifications: React.Dispatch<React.SetStateAction<NotificationRecord[]>>;
  refreshNotifications: () => void;
  isNotificationsOpen: boolean;
  setIsNotificationsOpen: (open: boolean) => void;
  activeRightTab: "design" | "prototype" | "inspect" | "activity" | "collaborators" | "guides" | "constraints" | "components" | "tokens";
  setActiveRightTab: (tab: "design" | "prototype" | "inspect" | "activity" | "collaborators" | "guides" | "constraints" | "components" | "tokens") => void;
}

export const EditorContext = createContext<EditorContextValue>({
  editor: null,
  setEditor: () => {},
  fileId: null,
  setFileId: () => {},
  isCommentsMode: false,
  setIsCommentsMode: () => {},
  comments: [],
  setComments: () => {},
  draftComment: null,
  setDraftComment: () => {},
  activeCommentId: null,
  setActiveCommentId: () => {},
  mentionMembers: [],
  setMentionMembers: () => {},
  commentAccess: null,
  setCommentAccess: () => {},
  isVersionHistoryOpen: false,
  setIsVersionHistoryOpen: () => {},
  notifications: [],
  setNotifications: () => {},
  dbNotifications: [],
  setDbNotifications: () => {},
  refreshNotifications: () => {},
  isNotificationsOpen: false,
  setIsNotificationsOpen: () => {},
  activeRightTab: "design",
  setActiveRightTab: () => {},
});

export function useEditorContext() {
  return useContext(EditorContext);
}

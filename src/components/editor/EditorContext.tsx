"use client";

import React, { createContext, useContext } from "react";
import type { Editor } from "tldraw";

export interface Comment {
  id: string;
  fileId: string;
  authorId: string;
  authorName: string;
  x: number;
  y: number;
  text: string;
  createdAt: string;
}

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
  isCommentsMode: boolean;
  setIsCommentsMode: (mode: boolean) => void;
  comments: Comment[];
  setComments: React.Dispatch<React.SetStateAction<Comment[]>>;
  isVersionHistoryOpen: boolean;
  setIsVersionHistoryOpen: (open: boolean) => void;
  notifications: NotificationItem[];
  setNotifications: React.Dispatch<React.SetStateAction<NotificationItem[]>>;
  isNotificationsOpen: boolean;
  setIsNotificationsOpen: (open: boolean) => void;
  activeRightTab: "design" | "prototype" | "inspect";
  setActiveRightTab: (tab: "design" | "prototype" | "inspect") => void;
}

export const EditorContext = createContext<EditorContextValue>({
  editor: null,
  setEditor: () => {},
  isCommentsMode: false,
  setIsCommentsMode: () => {},
  comments: [],
  setComments: () => {},
  isVersionHistoryOpen: false,
  setIsVersionHistoryOpen: () => {},
  notifications: [],
  setNotifications: () => {},
  isNotificationsOpen: false,
  setIsNotificationsOpen: () => {},
  activeRightTab: "design",
  setActiveRightTab: () => {},
});

export function useEditorContext() {
  return useContext(EditorContext);
}

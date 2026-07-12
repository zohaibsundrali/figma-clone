export interface DesignFile {
  id: string;
  title: string;
  ownerId: string;
  workspaceId: string | null;
  canvasData: unknown | null;
  isPublic: boolean;
  shareToken: string;
  thumbnail: string | null;
  isDeleted: boolean;
  deletedAt: string | null;
  isStarred: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DesignFileSummary {
  id: string;
  title: string;
  isPublic: boolean;
  thumbnail: string | null;
  isDeleted: boolean;
  isStarred: boolean;
  workspaceId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  userEmail: string;
  userName: string | null;
  role: "owner" | "editor" | "viewer";
  createdAt: string;
}

export interface Comment {
  id: string;
  fileId: string;
  authorId: string;
  authorName: string;
  x: number;
  y: number;
  text: string;
  resolved: boolean;
  parentCommentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  fileId: string;
  authorId: string;
  authorName: string;
  action: string;
  details: string | null;
  createdAt: string;
}

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export interface EditorPresence {
  cursor: { x: number; y: number } | null;
  name: string;
  avatar: string;
  color: string;
  // Index signature required by Liveblocks JsonObject constraint
  [key: string]: string | number | boolean | null | undefined | { x: number; y: number };
}

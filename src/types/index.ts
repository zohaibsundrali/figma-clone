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
  // Whether a thumbnail exists. The actual image is loaded lazily from
  // /api/files/[fileId]/thumbnail instead of being inlined as a base64 data
  // URL — inlining bloated the dashboard payload by megabytes and slowed render.
  hasThumbnail: boolean;
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

export interface CommentReactionGroup {
  emoji: string;
  users: { userId: string; userName: string }[];
}

export interface Comment {
  id: string;
  fileId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  x: number;
  y: number;
  text: string;
  shapeId: string | null;
  mentions: string[];
  edited: boolean;
  resolved: boolean;
  parentCommentId: string | null;
  createdAt: string;
  updatedAt: string;
  reactions: CommentReactionGroup[];
}

export interface NotificationRecord {
  id: string;
  type: string;
  fileId: string;
  commentId: string | null;
  actorId: string;
  actorName: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface MentionMember {
  id: string;
  name: string;
  email: string | null;
}

export interface CommentAccess {
  role: "admin" | "editor" | "commenter" | "viewer" | "none";
  canView: boolean;
  canComment: boolean;
  canResolve: boolean;
  isAdmin: boolean;
}

/** A comment being composed at a specific canvas location before it is saved. */
export interface DraftComment {
  x: number;
  y: number;
  shapeId: string | null;
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

export interface Template {
  id: string;
  name: string;
  description: string | null;
  creatorId: string;
  creatorName: string;
  canvasData: unknown;
  thumbnail: string | null;
  isPublic: boolean;
  category: string;
  tags: string;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Guide {
  id: string;
  fileId: string;
  setName: string;
  position: number;
  type: "horizontal" | "vertical";
  locked: boolean;
  color: string;
  createdAt: string;
  updatedAt: string;
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

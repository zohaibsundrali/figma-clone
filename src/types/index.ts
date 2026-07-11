export interface DesignFile {
  id: string;
  title: string;
  ownerId: string;
  canvasData: unknown | null;
  isPublic: boolean;
  shareToken: string;
  thumbnail: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DesignFileSummary {
  id: string;
  title: string;
  isPublic: boolean;
  thumbnail: string | null;
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

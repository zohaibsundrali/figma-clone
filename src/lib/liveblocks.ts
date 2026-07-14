import { createClient } from "@liveblocks/client";
import type { JsonObject } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";
import type { EditorPresence } from "@/types";

// Typed user metadata — what Liveblocks attaches to every other user's `info`
export type UserMeta = {
  info: {
    name: string;
    avatar: string;
    color: string;
  };
};

// Typed storage shape for the room.
// canvasData holds the tldraw JSON snapshot — typed as JsonObject to satisfy LsonObject constraint.
type Storage = {
  canvasData: JsonObject | null;
};

// Realtime room events. Comments/replies/reactions/resolution live in Postgres;
// after a successful mutation the mutating client broadcasts one of these so
// every other client in the room re-syncs. The server stays authoritative, so
// optimistic UI + broadcast can never create duplicate records.
export type RoomEvent =
  | { type: "comments-updated" }
  | { type: "comment-thread"; commentId: string };

const client = createClient({
  authEndpoint: "/api/liveblocks-auth",
});

export const {
  RoomProvider,
  useStorage,
  useMutation,
  useOthers,
  useMyPresence,
  useUpdateMyPresence,
  useSelf,
  useBroadcastEvent,
  useEventListener,
} = createRoomContext<EditorPresence, Storage, UserMeta, RoomEvent>(client);

export { PRESENCE_COLORS } from "./presence-colors";

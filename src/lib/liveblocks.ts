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
} = createRoomContext<EditorPresence, Storage, UserMeta>(client);

export { PRESENCE_COLORS } from "./presence-colors";

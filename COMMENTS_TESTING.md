# Comments & Chat — Implementation & Testing Guide

End-to-end comments: pins, threads/replies, mentions, emoji reactions,
resolve/reopen, real-time sync, permissions, and notifications.

## What changed

### Database (`prisma/schema.prisma`)
- `Comment`: added `authorAvatar`, `shapeId`, `mentions String[]`, `edited`, and
  fixed `updatedAt` to `@updatedAt` (previously never updated).
- New `CommentReaction` — unique `[commentId, userId, emoji]` (a user can never be
  counted twice for the same emoji).
- New `Notification` — unique `[userId, commentId, type]` (prevents duplicate
  notifications for the same mention/reply event). `commentId` cascades on delete.

Already applied to the database with `prisma db push` and the client regenerated.
If you reset the DB, re-run:
```
npm run db:push        # or: npx prisma migrate dev --name comments_system
npx prisma generate
```

### Server libraries
- `src/lib/comment-access.ts` — `getFileAccess()` resolves a user's role
  (admin/editor/commenter/viewer) from file owner, workspace ownership, and
  `WorkspaceMember.role`, plus public-file fallback. Matches membership by **both**
  Clerk id and email (member rows store the email in `userId`).
- `src/lib/comment-validation.ts` — Zod schemas + `sanitizeText()` (strips HTML/
  control chars, caps length) + mention parsing.
- `src/lib/comment-serialize.ts` — groups reactions and shapes the API payload.
- `src/lib/file-access.ts` — `getCurrentUserContext()` (id + email + name + avatar);
  `getFileForCollaboration()` now also admits workspace members.

### API routes (Zod-validated, permissions enforced server-side)
- `GET/POST /api/files/[fileId]/comments` — list / create. POST sanitizes, extracts
  mentions, and creates mention + reply notifications **in a transaction**.
- `PATCH/DELETE /api/files/[fileId]/comments/[commentId]` — resolve/reopen (editor),
  edit text (author/admin, sets `edited`), delete (author/admin).
- `POST/DELETE /api/files/[fileId]/comments/[commentId]/reactions` — toggle emoji.
- `GET /api/files/[fileId]/members` — mention candidates.
- `GET /api/files/[fileId]/access` — the caller's capabilities (drives UI gating).
- `GET /api/notifications`, `PATCH /api/notifications/[id]`, `POST /api/notifications/read-all`.

### Real-time (`src/lib/liveblocks.ts`)
Added a `RoomEvent` type + `useBroadcastEvent`/`useEventListener`. After every
successful mutation the client broadcasts `comments-updated`; other clients refetch
(server is authoritative, so optimistic UI + broadcast never duplicate records).

### UI
- `CommentsPanel` — realtime, optimistic add/reply/edit/delete/resolve, **retry**
  button on failure, resolved filter, permission-aware composer, mention members.
- `CommentsThread` — avatars, timestamps, `(edited)`, reactions with counts, mention
  chips, inline edit, permission-gated actions.
- `MentionInput` — `@` autocomplete inserting `@[Name](id)` tokens.
- `EditorCanvas` — click a point/shape in comment mode to place a comment
  (non-blocking, so pan/zoom/select still work); clickable pins; pins stay anchored
  through zoom/pan (tldraw `track()` + `pageToViewport`).
- `NotificationsPanel` — DB-backed; click opens the file and focuses the pin
  (`?comment=<id>` deep link); mark-read + mark-all-read.

## Setup for testing
1. `npm run dev`
2. Ensure `.env.local` has `DATABASE_URL`, `LIVEBLOCKS_SECRET_KEY`, and Clerk keys.
3. For multi-user tests, open the file in two browsers signed in as **different**
   Clerk users. The second user must be able to open the file, i.e. be the owner,
   a workspace **editor/admin**, or open a public share. Add a member via the
   People panel / workspace settings; give them role `editor` to get full realtime.

> Roles → `admin`/`editor` open the file with full edit + realtime; `commenter`/
> `viewer` open **read-only** (canvas locked) but can still read comments, and
> commenters can still post. Realtime broadcast is active for editor/admin/owner.

## Acceptance tests

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 1 | Comment on empty space | Toolbar → comment mode (💬), click empty canvas, type, **Comment** | Pin appears at the click point; thread in panel |
| 2 | Comment on a shape | In comment mode, click a shape, type, submit | Composer shows "Comment on selected layer"; comment stores `shapeId` |
| 3 | Zoom/pan anchoring | Add pins, then scroll-zoom and drag-pan | Pins stay glued to their canvas coordinates |
| 4 | Two replies, two users | User A comments; A and B each Reply | Both replies show in order with avatar/name/time |
| 5 | Mention + notification | Reply with `@` and pick a member | `@Name` chip renders; mentioned user's bell shows a notification |
| 6 | No duplicate notifications | Mention the same person again in one comment | Only one notification for that comment (`[userId,commentId,type]` unique) |
| 7 | Reactions, two sessions | In A add 👍 on a comment; in B add 👍 then ❤️ | Counts update live; 👍 shows **2**; your own reaction is highlighted; clicking again removes it; a user is never double-counted |
| 8 | Resolve / reopen | Editor clicks **Resolve**, then toggle filter | Resolved thread hidden by default; **Open/All** filter reveals it; history preserved; **Reopen** restores |
| 9 | Persistence | Refresh the page | All comments, replies, reactions, resolved state reload |
| 10 | Permissions | Open as viewer/commenter/editor/owner; try each action | Viewer read-only; commenter can add but not resolve; editor can resolve; only author/admin can edit/delete — **enforced by the API** (returns 403), verify by calling the route directly too |
| 11 | Unauthorized | Open a file you have no access to | Redirected to `/dashboard`; API returns 403 |
| 12 | Failed request + retry | In DevTools set network offline, add a comment | Optimistic entry rolls back, red error banner with **Retry**; go online and click Retry → it saves |
| 13 | Live updates (no refresh) | Two windows side by side; act in one | Comment/reply/reaction/resolve appears in the other within ~1s |
| 14 | Notification focus | Click a mention/reply notification | Opens the correct file, enters comment mode, scrolls to + highlights the pin; notification marked read |

## Manual API permission check (test #10 server enforcement)
```bash
# As a viewer (read-only) session cookie, creating a comment must 403:
curl -i -X POST https://localhost:3000/api/files/<fileId>/comments \
  -H 'Content-Type: application/json' \
  -b '<viewer-session-cookie>' \
  -d '{"text":"hi","x":0,"y":0}'
# Expect: HTTP/1.1 403  {"error":"You do not have permission to comment on this file."}
```

## Notes / known boundaries
- Public/anonymous viewing continues to use the separate `/share/[token]` route
  (unchanged). Comment realtime broadcast requires the Liveblocks room, which
  editors/admins/owner get; read-only viewers load comments over REST.
- Pre-existing TypeScript errors in `src/lib/auto-layout-engine.ts`,
  `src/lib/component-system.ts`, and a few `api/files/*` routes are **unrelated** to
  this feature (tldraw v5 typings / a `clearCache` arity bug) and were present
  before these changes. None of the comments code adds type errors.

# File Sharing & Permissions — Implementation & Testing Guide

Real end-to-end sharing: public/private links, roles, email invites, password
protection, expiring links, member management, audit log, and secured real-time
access. The existing ShareDialog design is preserved.

## New environment variables
```
RESEND_API_KEY=            # optional in dev — emails log to console when unset
EMAIL_FROM="Figma Clone <onboarding@resend.dev>"
SHARE_SESSION_SECRET=      # optional — falls back to LIVEBLOCKS_SECRET_KEY
```
No email provider existed, so **Resend** was added (`src/lib/email.ts`). Without
`RESEND_API_KEY`, invite emails (including the accept URL) are printed to the
server console so the flow is testable locally.

## What changed

### Database (`prisma/schema.prisma`) — pushed with `prisma db push`
- `DesignFile` += `shareRole`, `sharePasswordHash` (bcrypt), `shareExpiresAt`.
- New `FileMember` — per-file invites: `email`, `userId?`, `role`, `status`
  (pending/accepted/expired/revoked), `inviteToken` (unique), `expiresAt`,
  unique `[fileId,email]` (prevents duplicate active invitations).
- New `ShareAuditLog` — records link/permission changes.

### Libraries
- `share-tokens.ts` — `generateSecureToken()` (32 crypto bytes, base64url) for
  regenerated links + invite tokens; HMAC-signed, 30-min, per-file
  verified-share session cookies.
- `rate-limit.ts` — in-memory fixed-window limiter (swap for Redis in multi-instance).
- `email.ts` — Resend send + dev console fallback.
- `share-audit.ts` — audit writer.
- `share-validation.ts` — Zod schemas for every share/member/password body.
- `comment-access.ts` `getFileAccess()` — the single source of truth for
  permissions: owner → admin; workspace member; **FileMember** (accepted);
  **public link** (role = `shareRole`, denied when expired or when password is
  set without a valid session). Adds `canEdit`. Never trusts a client role.

### API routes (all Zod-validated, permission-checked, IDOR-safe)
- `PATCH /api/files/[fileId]` — **editors** may save canvas; sharing fields are
  no longer accepted here. Read-only users get `403`.
- `GET|PATCH /api/files/[fileId]/share` — enable/disable, **regenerate token**,
  set link role, set/remove **password**, set/remove **expiration**. Owner/admin
  only. Rate-limited. Every change is audited.
- `GET|POST /api/files/[fileId]/invitations` — list members / invite one or many
  emails. Detects existing Clerk users (immediate `accepted` access) vs new users
  (`pending` + email link). Upsert prevents duplicates.
- `PATCH|DELETE /api/files/[fileId]/members/[memberId]` — change role / revoke.
  Owner is never a member row, so the only owner can't be removed.
- `POST /api/invitations/[token]/accept` — completes access after sign-in;
  binds to the invited email; handles expired/revoked.
- `POST /api/share/[token]/verify-password` — bcrypt compare, **rate-limited
  (5 / 5 min per token+IP)**, sets the verified-share cookie. Generic responses
  never reveal whether a file exists.
- `POST /api/liveblocks-auth` — resolves role via `getFileAccess`; **WRITE only
  for editors+, READ otherwise, denied when expired/revoked**.

### Pages & UI
- `share/[token]` — enforces expiry (→ `ExpiredShareScreen`), password
  (→ `PasswordGate`); signed-in users with edit rights are redirected into the
  real editor; disabled/regenerated tokens 404 immediately.
- `invite/[token]` — middleware forces sign-in, then auto-accepts and opens the file.
- `ShareDialog` — rewired to the new endpoints (copy/regenerate/disable, link
  role, password add/remove, expiration set/clear, multi-email invite, member
  role dropdown + status badges + revoke). Design unchanged.
- `AccessWatcher` — while a file is open, polls access; on revoke → leaves the
  editor, on downgrade → flips canvas to read-only with a banner.

## Verified automatically
- All share/member/invite/notification routes return `401` unauthenticated.
- `verify-password`: wrong password → `401` (generic); 6th attempt → `429`.
- `share/[token]` unknown token → `404`; `invite/[token]` → sign-in redirect;
  editor page loads through `getFileAccess`.
- TypeScript: no new errors introduced (pre-existing unrelated errors remain).

## Acceptance tests (manual)

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 1 | Read-only public link | Share → toggle Link Sharing on, permission = Can view | URL appears; `/share/<token>` opens the canvas read-only |
| 2 | Anonymous view-only | Open the link in a logged-out/incognito window | File renders; no editing; not connected to the write room |
| 3 | Editable link | Set permission = Can edit; open link **while signed in** | Redirected to `/editor/<id>` with full editing |
| 4 | Disable link | Toggle Link Sharing off; reload old URL | Old URL now `404` |
| 5 | Regenerate token | Click the ↻ button; try the previous URL | Old token `404`; new URL works |
| 6 | Password | Set a password; open link in a fresh session | Password screen; wrong = error, correct = unlocks; 6 rapid wrong tries → rate-limited |
| 7 | Expiration | Set expiry a minute out; open before & after | Works before; after → "This link has expired" screen; API/room also deny |
| 8 | Extend / remove expiry | Update or Clear the expiry | Access restored |
| 9 | Invite existing user | Invite an email that has an account | Status `accepted`; they open the file directly; (email logged/sent) |
| 10 | Invite new email | Invite an unknown email → open the logged/sent link | Forces sign-in, then completes access and opens the file |
| 11 | No duplicate invites | Invite the same email twice | One member row; role refreshed, not duplicated |
| 12 | Change role | Switch a member Viewer → Editor in the dialog | Persists; that user can now edit (canvas save succeeds) |
| 13 | Revoke while open | User B has the file open; owner revokes B | Within ~20s B flips to view-only banner (or is redirected if view lost); B's saves `403` |
| 14 | Direct API 403 | As a viewer, `PATCH /api/files/<id>` with `{canvasData}` | `403` "read-only access" |
| 15 | Persistence | Refresh the dialog | Link state, role, password flag, expiry all reload |

### Manual API checks
```bash
# Read-only user cannot edit canvas:
curl -i -X PATCH http://localhost:3000/api/files/<id> \
  -H 'Content-Type: application/json' -b '<viewer-cookie>' \
  -d '{"canvasData":{}}'          # → 403

# Wrong password is generic + rate-limited:
for i in $(seq 1 6); do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST \
    http://localhost:3000/api/share/<token>/verify-password \
    -H 'Content-Type: application/json' -d '{"password":"nope"}'
done                              # → 401 ×5 then 429
```

## Security notes
- Tokens: `crypto.randomBytes(32)` base64url; regenerate/disable invalidate old URLs instantly.
- Passwords: bcrypt (cost 10); never stored or returned in plaintext.
- Verified-share sessions: HMAC-signed, per-file, 30-min, HttpOnly cookie.
- Every protected route re-checks membership via `getFileAccess` (IDOR-safe);
  internal file IDs are never required — links use opaque tokens.
- Liveblocks role is derived server-side only; expired/revoked access is denied
  at room-join. Public read-only viewers never join the write room.

## Known boundaries
- Rate limiting is in-memory (fine for single instance / dev). For serverless,
  back `src/lib/rate-limit.ts` with Redis/Upstash — the interface is unchanged.
- Live revocation is enforced immediately on the next API call / room re-auth and
  within ~20s in the open editor via `AccessWatcher`.
- Pre-existing `revalidateTag` arity and tldraw-typing errors in unrelated files
  are untouched and not introduced by this work.
```

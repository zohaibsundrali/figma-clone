import { prisma } from "./prisma";

/**
 * Capabilities a given user has for a given file.
 *
 * Roles are derived from, in order of strength:
 *  1. File owner / workspace owner → admin
 *  2. WorkspaceMember.role
 *  3. FileMember.role (per-file invite, status = accepted)
 *  4. Public link (file.isPublic) → file.shareRole, but only when the link is
 *     not expired and — if password-protected — a verified share session was
 *     presented. Expiry/password gate the PUBLIC link only, never an owner or
 *     an explicitly-invited member.
 *
 * NOTE: WorkspaceMember rows in this codebase store the *email* in `userId`,
 * and FileMember may be matched before the Clerk id is known, so membership is
 * matched against BOTH the Clerk id and the (lowercased) email.
 */
export type CommentRole = "admin" | "editor" | "commenter" | "viewer" | "none";
export type AccessSource =
  | "owner"
  | "workspace"
  | "file-member"
  | "public-link"
  | "none";

export interface FileAccess {
  role: CommentRole;
  source: AccessSource;
  userId: string;
  /** Identifiers that count as "this user" (Clerk id + lowercased email). */
  identities: string[];
  canView: boolean;
  canComment: boolean;
  /** Resolve / reopen threads — editors and above. */
  canResolve: boolean;
  /** Modify canvas data — editors and above. */
  canEdit: boolean;
  /** Workspace/file admin — may edit or delete anyone's messages, manage sharing. */
  isAdmin: boolean;
  /** Public link exists but has passed its expiration. */
  linkExpired: boolean;
  /** Public link is password-protected and no valid share session was given. */
  requiresPassword: boolean;
}

export interface AccessOptions {
  /** True when a valid verified-share session cookie was presented. */
  shareSessionValid?: boolean;
}

const ROLE_RANK: Record<CommentRole, number> = {
  none: 0,
  viewer: 1,
  commenter: 2,
  editor: 3,
  admin: 4,
};

function normalizeRole(raw: string): CommentRole {
  const r = raw.toLowerCase();
  if (r === "owner" || r === "admin") return "admin";
  if (r === "editor") return "editor";
  if (r === "commenter") return "commenter";
  if (r === "viewer") return "viewer";
  return "viewer";
}

function stronger(a: CommentRole, b: CommentRole): CommentRole {
  return ROLE_RANK[a] >= ROLE_RANK[b] ? a : b;
}

function capsForRole(role: CommentRole) {
  switch (role) {
    case "admin":
      return { canView: true, canComment: true, canResolve: true, canEdit: true, isAdmin: true };
    case "editor":
      return { canView: true, canComment: true, canResolve: true, canEdit: true, isAdmin: false };
    case "commenter":
      return { canView: true, canComment: true, canResolve: false, canEdit: false, isAdmin: false };
    case "viewer":
      return { canView: true, canComment: false, canResolve: false, canEdit: false, isAdmin: false };
    default:
      return { canView: false, canComment: false, canResolve: false, canEdit: false, isAdmin: false };
  }
}

export async function getFileAccess(
  fileId: string,
  userId: string | null,
  userEmail?: string | null,
  opts: AccessOptions = {}
): Promise<FileAccess> {
  const identities = [userId, userEmail?.toLowerCase()].filter(
    (v): v is string => Boolean(v)
  );

  const file = await prisma.designFile.findUnique({
    where: { id: fileId },
    select: {
      ownerId: true,
      isPublic: true,
      shareRole: true,
      sharePasswordHash: true,
      shareExpiresAt: true,
      workspace: {
        select: {
          ownerId: true,
          members: { select: { userId: true, role: true } },
        },
      },
      members: {
        where: { status: "accepted" },
        select: { userId: true, email: true, role: true },
      },
    },
  });

  const base = (
    role: CommentRole,
    source: AccessSource,
    extra?: Partial<Pick<FileAccess, "linkExpired" | "requiresPassword">>
  ): FileAccess => ({
    role,
    source,
    userId: userId ?? "",
    identities,
    linkExpired: extra?.linkExpired ?? false,
    requiresPassword: extra?.requiresPassword ?? false,
    ...capsForRole(role),
  });

  if (!file) return base("none", "none");

  // Public-link state (gates the link path only).
  const now = Date.now();
  const linkExpired = Boolean(
    file.isPublic && file.shareExpiresAt && file.shareExpiresAt.getTime() < now
  );
  const requiresPassword = Boolean(
    file.isPublic && file.sharePasswordHash && !opts.shareSessionValid
  );
  const linkRole = normalizeRole(file.shareRole);
  const linkUsable = file.isPublic && !linkExpired && !requiresPassword;

  // ── Authenticated membership (never gated by password/expiry) ──────────────
  let memberRole: CommentRole = "none";
  let memberSource: AccessSource = "none";

  if (userId) {
    if (file.ownerId === userId || file.workspace?.ownerId === userId) {
      return base("admin", "owner");
    }
    const wsMember = file.workspace?.members.find((m) =>
      identities.includes(m.userId)
    );
    if (wsMember) {
      memberRole = normalizeRole(wsMember.role);
      memberSource = "workspace";
    }
    const fileMember = file.members.find(
      (m) =>
        (m.userId && identities.includes(m.userId)) ||
        identities.includes(m.email.toLowerCase())
    );
    if (fileMember) {
      const r = normalizeRole(fileMember.role);
      if (ROLE_RANK[r] > ROLE_RANK[memberRole]) {
        memberRole = r;
        memberSource = "file-member";
      }
    }
  } else {
    // Anonymous file members (accepted by email before sign-in are still pending,
    // so anonymous users only ever reach the public-link path below).
  }

  // Combine membership with the public link, taking the stronger grant.
  const linkContribution: CommentRole = linkUsable ? linkRole : "none";
  const finalRole = stronger(memberRole, linkContribution);

  if (finalRole === "none") {
    // No access. Surface WHY for the public path so callers can render the
    // right screen (expired vs. password), but only when the link is the only
    // possible route (i.e. the user isn't an authenticated member).
    return base("none", "none", { linkExpired, requiresPassword });
  }

  const source =
    ROLE_RANK[memberRole] >= ROLE_RANK[linkContribution] && memberRole !== "none"
      ? memberSource
      : "public-link";

  return base(finalRole, source);
}

/** True when the user authored the given record, matching either identity. */
export function isAuthor(
  access: Pick<FileAccess, "identities" | "userId">,
  authorId: string
): boolean {
  return access.identities.includes(authorId) || access.userId === authorId;
}

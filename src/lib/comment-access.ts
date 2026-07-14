import { prisma } from "./prisma";

/**
 * Capabilities a given user has for commenting on a given file.
 *
 * Roles are derived from three sources, in priority order:
 *  1. File owner            → admin (full control)
 *  2. Workspace owner       → admin
 *  3. WorkspaceMember.role  → owner/admin | editor | commenter | viewer
 *  4. Public file fallback  → viewer (read-only) when file.isPublic
 *
 * NOTE: WorkspaceMember rows in this codebase store the *email* in `userId`
 * (see workspaces/[id]/members route), while comment authorId is the Clerk id.
 * We therefore match membership against BOTH the Clerk id and the email.
 */
export type CommentRole = "admin" | "editor" | "commenter" | "viewer" | "none";

export interface FileAccess {
  role: CommentRole;
  userId: string;
  /** Identifiers that count as "this user" (Clerk id + email). */
  identities: string[];
  canView: boolean;
  canComment: boolean;
  /** Resolve / reopen threads — editors and above. */
  canResolve: boolean;
  /** Workspace/file admin — may edit or delete anyone's messages. */
  isAdmin: boolean;
}

const NO_ACCESS: Omit<FileAccess, "userId" | "identities"> = {
  role: "none",
  canView: false,
  canComment: false,
  canResolve: false,
  isAdmin: false,
};

function capsForRole(role: CommentRole): Omit<FileAccess, "userId" | "identities" | "role"> {
  switch (role) {
    case "admin":
      return { canView: true, canComment: true, canResolve: true, isAdmin: true };
    case "editor":
      return { canView: true, canComment: true, canResolve: true, isAdmin: false };
    case "commenter":
      return { canView: true, canComment: true, canResolve: false, isAdmin: false };
    case "viewer":
      return { canView: true, canComment: false, canResolve: false, isAdmin: false };
    default:
      return { canView: false, canComment: false, canResolve: false, isAdmin: false };
  }
}

export async function getFileAccess(
  fileId: string,
  userId: string | null,
  userEmail?: string | null
): Promise<FileAccess> {
  const identities = [userId, userEmail].filter((v): v is string => Boolean(v));

  const file = await prisma.designFile.findUnique({
    where: { id: fileId },
    select: {
      ownerId: true,
      isPublic: true,
      workspace: {
        select: {
          ownerId: true,
          members: {
            select: { userId: true, role: true },
          },
        },
      },
    },
  });

  if (!file) {
    return { ...NO_ACCESS, userId: userId ?? "", identities };
  }

  // Unauthenticated users may only read public files.
  if (!userId) {
    if (file.isPublic) {
      return { role: "viewer", userId: "", identities, ...capsForRole("viewer") };
    }
    return { ...NO_ACCESS, userId: "", identities };
  }

  // File owner is always an admin.
  if (file.ownerId === userId) {
    return { role: "admin", userId, identities, ...capsForRole("admin") };
  }

  // Workspace owner is an admin.
  if (file.workspace?.ownerId === userId) {
    return { role: "admin", userId, identities, ...capsForRole("admin") };
  }

  // Explicit workspace membership.
  const member = file.workspace?.members.find((m) => identities.includes(m.userId));
  if (member) {
    const raw = member.role.toLowerCase();
    const role: CommentRole =
      raw === "owner" || raw === "admin"
        ? "admin"
        : raw === "editor"
          ? "editor"
          : raw === "commenter"
            ? "commenter"
            : "viewer";
    return { role, userId, identities, ...capsForRole(role) };
  }

  // Public file, no membership → read-only.
  if (file.isPublic) {
    return { role: "viewer", userId, identities, ...capsForRole("viewer") };
  }

  return { ...NO_ACCESS, userId, identities };
}

/** True when the user authored the comment, matching either identity. */
export function isAuthor(
  access: Pick<FileAccess, "identities" | "userId">,
  authorId: string
): boolean {
  return access.identities.includes(authorId) || access.userId === authorId;
}

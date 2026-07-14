import { auth, currentUser } from "@clerk/nextjs/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "./prisma";
import type { DesignFileSummary } from "@/types";

export async function getCurrentUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}

export interface CurrentUserContext {
  userId: string;
  email: string | null;
  name: string;
  avatar: string | null;
}

/**
 * Full identity for the signed-in user. `email` is important for permission
 * checks because WorkspaceMember rows store the email in their `userId` column.
 * Returns null when unauthenticated.
 */
export async function getCurrentUserContext(): Promise<CurrentUserContext | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? null;
  const name =
    user?.fullName ??
    user?.firstName ??
    user?.username ??
    email ??
    "Anonymous";

  return { userId, email, name, avatar: user?.imageUrl ?? null };
}

type RawFileSummary = {
  id: string;
  title: string;
  isPublic: boolean;
  hasThumbnail: boolean;
  isDeleted: boolean;
  isStarred: boolean;
  workspaceId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Lists file summaries WITHOUT pulling the heavy `thumbnail` column (base64 PNG
 * data URLs, often 50-200 KB each). Instead it returns a cheap `hasThumbnail`
 * boolean; the image itself is fetched lazily per-card from the thumbnail route.
 * This keeps list payloads tiny and makes the dashboard render fast.
 */
export async function listFileSummaries(options: {
  where: Prisma.Sql;
  orderBy: Prisma.Sql;
  limit: number;
}): Promise<DesignFileSummary[]> {
  const { where, orderBy, limit } = options;

  const rows = await prisma.$queryRaw<RawFileSummary[]>`
    SELECT "id", "title", "isPublic",
           ("thumbnail" IS NOT NULL) AS "hasThumbnail",
           "isDeleted", "isStarred", "workspaceId",
           "createdAt", "updatedAt"
    FROM "public"."DesignFile"
    WHERE ${where}
    ORDER BY ${orderBy}
    LIMIT ${limit}
  `;

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    isPublic: r.isPublic,
    hasThumbnail: r.hasThumbnail,
    isDeleted: r.isDeleted,
    isStarred: r.isStarred,
    workspaceId: r.workspaceId,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function getOwnedFile(fileId: string, userId: string) {
  return prisma.designFile.findFirst({
    where: { id: fileId, ownerId: userId },
  });
}

export async function getEditableFile(fileId: string, userId: string | null) {
  if (!userId) return null;
  return prisma.designFile.findFirst({
    where: { id: fileId, ownerId: userId },
  });
}

export async function getPublicFileByToken(token: string) {
  return prisma.designFile.findFirst({
    where: { shareToken: token, isPublic: true },
  });
}

export async function getFileForCollaboration(
  fileId: string,
  userId: string | null,
  userEmail?: string | null
) {
  const identities = [userId, userEmail].filter((v): v is string => Boolean(v));

  return prisma.designFile.findFirst({
    where: {
      id: fileId,
      OR: [
        ...(userId ? [{ ownerId: userId }] : []),
        { isPublic: true },
        // Any member of the file's workspace may collaborate. Membership rows
        // may key on either the Clerk id or the email, so match both.
        ...(identities.length > 0
          ? [
              { workspace: { ownerId: userId ?? undefined } },
              { workspace: { members: { some: { userId: { in: identities } } } } },
            ]
          : []),
      ],
    },
  });
}

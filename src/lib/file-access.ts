import { auth } from "@clerk/nextjs/server";
import { prisma } from "./prisma";

export async function getCurrentUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
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
  userId: string | null
) {
  return prisma.designFile.findFirst({
    where: {
      id: fileId,
      OR: [
        ...(userId ? [{ ownerId: userId }] : []),
        { isPublic: true },
      ],
    },
  });
}

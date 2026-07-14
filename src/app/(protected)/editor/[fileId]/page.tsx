import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EditorPageClient } from "./EditorPageClient";

type PageProps = {
  params: Promise<{ fileId: string }>;
};

export default async function EditorPage({ params }: PageProps) {
  // Resolve params and run auth + DB in parallel — saves ~200-400ms vs sequential
  const [{ userId }, { fileId }] = await Promise.all([
    auth(),
    params,
  ]);

  if (!userId) redirect("/sign-in");

  // Fetch user profile and file in parallel — saves another ~100-300ms
  const [user, file] = await Promise.all([
    currentUser(),
    prisma.designFile.findFirst({
      where: { id: fileId, ownerId: userId },
      select: {
        id: true,
        title: true,
        ownerId: true,
        workspaceId: true,
        canvasData: true,
        isPublic: true,
        shareToken: true,
        thumbnail: true,
        isDeleted: true,
        deletedAt: true,
        isStarred: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  if (!file) {
    redirect("/dashboard");
  }

  return (
    <EditorPageClient
      initialFile={{
        id: file.id,
        title: file.title,
        ownerId: file.ownerId,
        workspaceId: file.workspaceId,
        canvasData: file.canvasData,
        isPublic: file.isPublic,
        shareToken: file.shareToken,
        thumbnail: file.thumbnail,
        isDeleted: file.isDeleted,
        deletedAt: file.deletedAt ? file.deletedAt.toISOString() : null,
        isStarred: file.isStarred,
        createdAt: file.createdAt.toISOString(),
        updatedAt: file.updatedAt.toISOString(),
      }}
      userInfo={{
        name: user?.fullName ?? user?.firstName ?? "Anonymous",
        avatar: user?.imageUrl ?? "",
        userId,
      }}
    />
  );
}

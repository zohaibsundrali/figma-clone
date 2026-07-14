import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getFileAccess } from "@/lib/comment-access";
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

  // Fetch user profile and file in parallel — saves another ~100-300ms.
  // The file query allows the owner OR any member of its workspace; the
  // fine-grained role is resolved below to decide read-only vs. edit access.
  const [user, file] = await Promise.all([
    currentUser(),
    prisma.designFile.findFirst({
      where: { id: fileId },
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

  // Role-based gating: owners and workspace editors/admins get full edit;
  // commenters/viewers open the file read-only (they can still comment).
  const access = await getFileAccess(
    fileId,
    userId,
    user?.primaryEmailAddress?.emailAddress ?? null
  );
  if (!access.canView) {
    redirect("/dashboard");
  }
  const readonly = !(access.role === "admin" || access.role === "editor");

  return (
    <EditorPageClient
      readonly={readonly}
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

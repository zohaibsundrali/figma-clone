import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EditorPageClient } from "./EditorPageClient";

type PageProps = {
  params: Promise<{ fileId: string }>;
};

export default async function EditorPage({ params }: PageProps) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await currentUser();
  const { fileId } = await params;

  // Fetch file on server side to avoid client-side delay
  const file = await prisma.designFile.findFirst({
    where: { id: fileId, ownerId: userId },
  });

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

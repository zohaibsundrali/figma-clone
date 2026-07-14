import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getCurrentUserContext } from "@/lib/file-access";
import { getFileAccess } from "@/lib/comment-access";
import { verifyShareSession, shareCookieName } from "@/lib/share-tokens";
import { SharePageClient } from "./SharePageClient";
import { ExpiredShareScreen } from "./ExpiredShareScreen";
import { PasswordGate } from "./PasswordGate";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function SharePage({ params }: PageProps) {
  const { token } = await params;

  // Disabled links have isPublic=false → not found. Regenerated tokens no longer
  // match → not found. Both invalidate the old URL immediately.
  const file = await prisma.designFile.findFirst({
    where: { shareToken: token, isPublic: true },
  });

  if (!file) notFound();

  // Expiration is enforced on page load (and again in the API / room auth).
  const expired = Boolean(
    file.shareExpiresAt && file.shareExpiresAt.getTime() < Date.now()
  );
  if (expired) {
    return <ExpiredShareScreen />;
  }

  // Signed-in users who already have edit access go straight to the real editor.
  const { userId } = await auth();
  if (userId) {
    const me = await getCurrentUserContext();
    const access = await getFileAccess(file.id, userId, me?.email);
    if (access.canEdit) {
      redirect(`/editor/${file.id}`);
    }
  }

  // Password gate for protected links (unless a valid share session exists).
  if (file.sharePasswordHash) {
    const cookieStore = await cookies();
    const sessionValue = cookieStore.get(shareCookieName(file.id))?.value;
    if (!verifyShareSession(sessionValue, file.id)) {
      return <PasswordGate token={token} fileTitle={file.title} />;
    }
  }

  return (
    <SharePageClient
      file={{
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
    />
  );
}

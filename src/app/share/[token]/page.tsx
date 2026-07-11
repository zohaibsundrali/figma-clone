import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { SharePageClient } from "./SharePageClient";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function SharePage({ params }: PageProps) {
  const { token } = await params;

  const file = await prisma.designFile.findFirst({
    where: { shareToken: token, isPublic: true },
  });

  if (!file) notFound();

  return (
    <SharePageClient
      file={{
        id: file.id,
        title: file.title,
        ownerId: file.ownerId,
        canvasData: file.canvasData,
        isPublic: file.isPublic,
        shareToken: file.shareToken,
        thumbnail: file.thumbnail,
        createdAt: file.createdAt.toISOString(),
        updatedAt: file.updatedAt.toISOString(),
      }}
    />
  );
}

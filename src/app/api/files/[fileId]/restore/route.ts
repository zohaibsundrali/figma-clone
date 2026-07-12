import { NextResponse } from "next/server";
import { getCurrentUserId, getOwnedFile } from "@/lib/file-access";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ fileId: string }> };

export async function POST(_request: Request, { params }: RouteParams) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fileId } = await params;
  const file = await getOwnedFile(fileId, userId);

  if (!file) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const restored = await prisma.designFile.update({
    where: { id: fileId },
    data: { isDeleted: false, deletedAt: null },
  });

  await prisma.activity.create({
    data: {
      fileId,
      authorId: userId,
      authorName: "You",
      action: "file_restored",
      details: "Restored from trash",
    },
  }).catch((err) => console.error("[Activity logging]", err));

  return NextResponse.json(restored);
}

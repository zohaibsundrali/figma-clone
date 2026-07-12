import { NextResponse } from "next/server";
import { getCurrentUserId, getOwnedFile } from "@/lib/file-access";
import { prisma } from "@/lib/prisma";
import { clearCache } from "@/lib/api-cache";

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

  const duplicate = await prisma.designFile.create({
    data: {
      title: `${file.title} (Copy)`,
      ownerId: userId,
      canvasData: file.canvasData ?? undefined,
      isPublic: false,
    },
  });

  clearCache(userId);
  return NextResponse.json(duplicate, { status: 201 });
}

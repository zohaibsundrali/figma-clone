import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/file-access";

type RouteParams = { params: Promise<{ fileId: string; versionId: string }> };

export async function POST(
  _req: NextRequest,
  { params }: RouteParams
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { fileId, versionId } = await params;

    // Verify user owns this file
    const file = await prisma.designFile.findUnique({
      where: { id: fileId },
      select: { ownerId: true },
    });

    if (!file || file.ownerId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get the version to restore
    const version = await prisma.versionHistory.findUnique({
      where: { id: versionId },
    });

    if (!version || version.fileId !== fileId) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    // Update file with version's canvas data (cast as any for Json type compatibility)
    await prisma.designFile.update({
      where: { id: fileId },
      data: { canvasData: version.canvasData as any },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        fileId,
        authorId: userId,
        authorName: "You",
        action: "version_restored",
        details: `Restored to version "${version.name}"`,
      },
    }).catch((err) => console.error("[Activity logging]", err));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Restore POST]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

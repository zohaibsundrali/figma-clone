import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getOwnedFile } from "@/lib/file-access";
import type { Prisma } from "@/generated/prisma/client";

type RouteParams = { params: Promise<{ fileId: string; versionId: string }> };

export async function POST(
  _request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fileId, versionId } = await params;

    // Verify the caller owns the file before allowing a restore
    const file = await getOwnedFile(fileId, userId);
    if (!file) {
      return NextResponse.json(
        { error: "File not found or unauthorized" },
        { status: 404 }
      );
    }

    // Verify the version belongs to this file
    const version = await prisma.versionHistory.findUnique({
      where: { id: versionId },
    });

    if (!version || version.fileId !== fileId) {
      return NextResponse.json(
        { error: "Version not found" },
        { status: 404 }
      );
    }

    // Restore: overwrite the file's canvasData with the snapshot from this version
    const updatedFile = await prisma.designFile.update({
      where: { id: fileId },
      data: { canvasData: version.canvasData as Prisma.InputJsonValue },
    });

    return NextResponse.json(updatedFile);
  } catch (error) {
    console.error("[VERSIONS_RESTORE]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

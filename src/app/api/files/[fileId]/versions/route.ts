import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/file-access";

type RouteParams = { params: Promise<{ fileId: string }> };

export async function GET(
  req: NextRequest,
  { params }: RouteParams
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { fileId } = await params;

    // Verify user owns this file
    const file = await prisma.designFile.findUnique({
      where: { id: fileId },
      select: { ownerId: true },
    });

    if (!file || file.ownerId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const versions = await prisma.versionHistory.findMany({
      where: { fileId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(versions);
  } catch (err) {
    console.error("[Versions GET]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: RouteParams
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { fileId } = await params;
    const body = await req.json();
    const { name, canvasData, authorName } = body;

    // Verify user owns this file
    const file = await prisma.designFile.findUnique({
      where: { id: fileId },
      select: { ownerId: true },
    });

    if (!file || file.ownerId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const version = await prisma.versionHistory.create({
      data: {
        fileId,
        authorId: userId,
        authorName: authorName || "Unknown",
        name: name || "Version snapshot",
        canvasData: canvasData || {},
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        fileId,
        authorId: userId,
        authorName: authorName || "You",
        action: "version_saved",
        details: `Version "${name}" saved`,
      },
    }).catch((err) => console.error("[Activity logging]", err));

    return NextResponse.json(version, { status: 201 });
  } catch (err) {
    console.error("[Versions POST]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

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
    const { searchParams } = new URL(req.url);
    const take = Math.min(parseInt(searchParams.get("take") || "50"), 100);
    const skip = parseInt(searchParams.get("skip") || "0");

    // Verify user owns this file
    const file = await prisma.designFile.findUnique({
      where: { id: fileId },
      select: { ownerId: true },
    });

    if (!file || file.ownerId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const activities = await prisma.activity.findMany({
      where: { fileId },
      orderBy: { createdAt: "desc" },
      take,
      skip,
    });

    return NextResponse.json(activities);
  } catch (err) {
    console.error("[Activity GET]", err);
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
    const { action, details, authorName } = body;

    // Verify user owns this file
    const file = await prisma.designFile.findUnique({
      where: { id: fileId },
      select: { ownerId: true },
    });

    if (!file || file.ownerId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const activity = await prisma.activity.create({
      data: {
        fileId,
        authorId: userId,
        authorName: authorName || "Unknown",
        action,
        details: details || null,
      },
    });

    return NextResponse.json(activity);
  } catch (err) {
    console.error("[Activity POST]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getOwnedFile } from "@/lib/file-access";

type RouteParams = { params: Promise<{ fileId: string }> };

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fileId } = await params;

    const file = await getOwnedFile(fileId, userId);
    if (!file) {
      return NextResponse.json(
        { error: "File not found or unauthorized" },
        { status: 404 }
      );
    }

    const versions = await prisma.versionHistory.findMany({
      where: { fileId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(versions);
  } catch (error) {
    console.error("[VERSIONS_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fileId } = await params;

    const file = await getOwnedFile(fileId, userId);
    if (!file) {
      return NextResponse.json(
        { error: "File not found or unauthorized" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, canvasData, authorName } = body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    if (!canvasData) {
      return NextResponse.json(
        { error: "canvasData is required" },
        { status: 400 }
      );
    }

    const version = await prisma.versionHistory.create({
      data: {
        fileId,
        authorId: userId,
        authorName:
          typeof authorName === "string" && authorName.trim()
            ? authorName.trim()
            : "Anonymous",
        name: name.trim(),
        canvasData,
      },
    });

    return NextResponse.json(version, { status: 201 });
  } catch (error) {
    console.error("[VERSIONS_POST]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

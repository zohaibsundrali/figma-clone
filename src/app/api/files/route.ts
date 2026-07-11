import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/file-access";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  const files = await prisma.designFile.findMany({
    where: {
      ownerId: userId,
      ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      isPublic: true,
      thumbnail: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(files);
}

export async function POST() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const file = await prisma.designFile.create({
    data: {
      title: "Untitled Design",
      ownerId: userId,
      canvasData: undefined,
    },
  });

  return NextResponse.json(file, { status: 201 });
}

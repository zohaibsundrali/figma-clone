import { NextResponse } from "next/server";
import { getCurrentUserId, getOwnedFile } from "@/lib/file-access";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ fileId: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fileId } = await params;
  const file = await getOwnedFile(fileId, userId);

  if (!file) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(file);
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fileId } = await params;
  const file = await getOwnedFile(fileId, userId);

  if (!file) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body;
  try {
    body = await request.json();
  } catch (err) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }
  const { title, canvasData, isPublic, thumbnail } = body;

  const updated = await prisma.designFile.update({
    where: { id: fileId },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(canvasData !== undefined ? { canvasData } : {}),
      ...(isPublic !== undefined ? { isPublic } : {}),
      ...(thumbnail !== undefined ? { thumbnail } : {}),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fileId } = await params;
  const file = await getOwnedFile(fileId, userId);

  if (!file) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.designFile.delete({ where: { id: fileId } });
  return NextResponse.json({ success: true });
}

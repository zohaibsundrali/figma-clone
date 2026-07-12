import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/file-access";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaces = await prisma.workspace.findMany({
    where: {
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } },
      ],
    },
    include: {
      _count: { select: { members: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(workspaces);
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name } = body;
  if (!name?.trim()) {
    return NextResponse.json({ error: "Workspace name required" }, { status: 400 });
  }

  const workspace = await prisma.workspace.create({
    data: {
      name: name.trim(),
      ownerId: userId,
      members: {
        create: {
          userId,
          userEmail: "", // Will be filled via Clerk
          role: "owner",
        },
      },
    },
    include: { members: true },
  });

  return NextResponse.json(workspace, { status: 201 });
}

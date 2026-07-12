import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/file-access";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ workspaceId: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId } = await params;

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: { members: true },
  });

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  // Check access: owner or member
  const isMember = workspace.members.some((m) => m.userId === userId);
  if (workspace.ownerId !== userId && !isMember) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(workspace.members);
}

export async function POST(request: Request, { params }: RouteParams) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId } = await params;

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  });

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  // Only owner can invite
  if (workspace.ownerId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { userEmail, userName, role = "editor" } = body;
  if (!userEmail?.trim()) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  // Check if already a member
  const existing = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: userEmail } },
  });

  if (existing) {
    return NextResponse.json(
      { error: "User already a member" },
      { status: 409 }
    );
  }

  const member = await prisma.workspaceMember.create({
    data: {
      workspaceId,
      userId: userEmail,
      userEmail: userEmail.trim(),
      userName: userName?.trim() || null,
      role,
    },
  });

  return NextResponse.json(member, { status: 201 });
}

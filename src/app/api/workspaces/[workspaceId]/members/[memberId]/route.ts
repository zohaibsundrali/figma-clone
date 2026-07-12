import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/file-access";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ workspaceId: string; memberId: string }> };

export async function DELETE(_request: Request, { params }: RouteParams) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId, memberId } = await params;

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  });

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  // Only owner can remove members
  if (workspace.ownerId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const member = await prisma.workspaceMember.findUnique({
    where: { id: memberId },
  });

  if (!member || member.workspaceId !== workspaceId) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  await prisma.workspaceMember.delete({
    where: { id: memberId },
  });

  return NextResponse.json({ success: true });
}

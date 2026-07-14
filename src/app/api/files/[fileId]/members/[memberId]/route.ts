import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserContext } from "@/lib/file-access";
import { getFileAccess } from "@/lib/comment-access";
import { roleChangeSchema } from "@/lib/share-validation";
import { auditShare } from "@/lib/share-audit";

type RouteParams = { params: Promise<{ fileId: string; memberId: string }> };

async function requireAdmin(fileId: string) {
  const me = await getCurrentUserContext();
  if (!me) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const access = await getFileAccess(fileId, me.userId, me.email);
  if (!access.isAdmin) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { me };
}

/** Change a member's role. */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { fileId, memberId } = await params;
  const guard = await requireAdmin(fileId);
  if ("error" in guard) return guard.error;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = roleChangeSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const member = await prisma.fileMember.findUnique({
    where: { id: memberId },
    select: { fileId: true, email: true },
  });
  if (!member || member.fileId !== fileId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.fileMember.update({
    where: { id: memberId },
    data: { role: parsed.data.role },
    select: {
      id: true,
      email: true,
      userId: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });

  await auditShare({
    fileId,
    actorId: guard.me.userId,
    actorName: guard.me.name,
    action: "role_changed",
    target: member.email,
    metadata: { role: parsed.data.role },
  });

  return NextResponse.json({
    ...updated,
    createdAt: updated.createdAt.toISOString(),
  });
}

/** Revoke an invitation / remove a member's access. */
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { fileId, memberId } = await params;
  const guard = await requireAdmin(fileId);
  if ("error" in guard) return guard.error;

  const member = await prisma.fileMember.findUnique({
    where: { id: memberId },
    select: { fileId: true, email: true },
  });
  if (!member || member.fileId !== fileId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // The file owner is never a FileMember row, so this can never remove the
  // only owner — owner access is intrinsic to DesignFile.ownerId.
  await prisma.fileMember.delete({ where: { id: memberId } });

  await auditShare({
    fileId,
    actorId: guard.me.userId,
    actorName: guard.me.name,
    action: "access_revoked",
    target: member.email,
  });

  return NextResponse.json({ success: true });
}

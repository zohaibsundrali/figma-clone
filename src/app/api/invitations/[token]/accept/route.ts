import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserContext } from "@/lib/file-access";
import { auditShare } from "@/lib/share-audit";

type RouteParams = { params: Promise<{ token: string }> };

/** Complete an invitation for the signed-in user. */
export async function POST(_req: NextRequest, { params }: RouteParams) {
  const me = await getCurrentUserContext();
  if (!me) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const { token } = await params;

  const member = await prisma.fileMember.findUnique({
    where: { inviteToken: token },
    select: {
      id: true,
      fileId: true,
      email: true,
      role: true,
      status: true,
      expiresAt: true,
    },
  });

  // Generic 404 — never reveal whether a token/file exists.
  if (!member) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }

  if (member.status === "revoked") {
    return NextResponse.json({ error: "This invitation has been revoked." }, { status: 403 });
  }

  if (member.expiresAt && member.expiresAt.getTime() < Date.now()) {
    await prisma.fileMember.update({
      where: { id: member.id },
      data: { status: "expired" },
    });
    return NextResponse.json({ error: "This invitation has expired." }, { status: 410 });
  }

  // The invite is bound to a specific email address.
  const emailMatches =
    me.email && me.email.toLowerCase() === member.email.toLowerCase();
  if (!emailMatches) {
    return NextResponse.json(
      { error: "This invitation was sent to a different email address." },
      { status: 403 }
    );
  }

  await prisma.fileMember.update({
    where: { id: member.id },
    data: { userId: me.userId, status: "accepted" },
  });

  await auditShare({
    fileId: member.fileId,
    actorId: me.userId,
    actorName: me.name,
    action: "invite_accepted",
    target: member.email,
  });

  return NextResponse.json({ fileId: member.fileId, role: member.role });
}

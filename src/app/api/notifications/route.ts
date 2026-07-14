import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserContext } from "@/lib/file-access";

export interface SerializedNotification {
  id: string;
  type: string;
  fileId: string;
  commentId: string | null;
  actorId: string;
  actorName: string;
  message: string;
  read: boolean;
  createdAt: string;
}

/** List the current user's notifications (matched by Clerk id and email). */
export async function GET() {
  try {
    const me = await getCurrentUserContext();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const identities = [me.userId, me.email].filter(
      (v): v is string => Boolean(v)
    );

    const notifications = await prisma.notification.findMany({
      where: { userId: { in: identities } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const payload: SerializedNotification[] = notifications.map((n) => ({
      id: n.id,
      type: n.type,
      fileId: n.fileId,
      commentId: n.commentId,
      actorId: n.actorId,
      actorName: n.actorName,
      message: n.message,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
    }));

    return NextResponse.json(payload);
  } catch (err) {
    console.error("[Notifications GET]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

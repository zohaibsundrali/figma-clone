import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserContext } from "@/lib/file-access";

type RouteParams = { params: Promise<{ id: string }> };

/** Mark a single notification as read (only the recipient may do so). */
export async function PATCH(_req: NextRequest, { params }: RouteParams) {
  try {
    const me = await getCurrentUserContext();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const identities = [me.userId, me.email].filter(
      (v): v is string => Boolean(v)
    );

    const notification = await prisma.notification.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!notification || !identities.includes(notification.userId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Notification PATCH]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

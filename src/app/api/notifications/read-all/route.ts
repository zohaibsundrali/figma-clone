import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserContext } from "@/lib/file-access";

/** Mark all of the current user's notifications as read. */
export async function POST() {
  try {
    const me = await getCurrentUserContext();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const identities = [me.userId, me.email].filter(
      (v): v is string => Boolean(v)
    );

    await prisma.notification.updateMany({
      where: { userId: { in: identities }, read: false },
      data: { read: true },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Notifications read-all]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

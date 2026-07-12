import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/file-access";

type RouteParams = { params: Promise<{ templateId: string }> };

export async function DELETE(
  _req: NextRequest,
  { params }: RouteParams
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { templateId } = await params;

    // Verify user is the creator
    const template = await prisma.template.findUnique({
      where: { id: templateId },
    });

    if (!template || template.creatorId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.template.delete({
      where: { id: templateId },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Template DELETE]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

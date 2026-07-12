import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/file-access";

export async function PATCH(
  req: Request,
  { params }: { params: { fileId: string; guideId: string } }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { guideId } = params;
    const body = await req.json();
    const { position, locked, color } = body;

    const guide = await prisma.guide.update({
      where: { id: guideId },
      data: {
        ...(position !== undefined && { position }),
        ...(locked !== undefined && { locked }),
        ...(color !== undefined && { color }),
        updatedAt: new Date(),
      },
    });

    return Response.json(guide);
  } catch (error) {
    console.error("[PATCH /api/files/[fileId]/guides/[guideId]]", error);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { fileId: string; guideId: string } }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { fileId, guideId } = params;

    await prisma.guide.delete({
      where: { id: guideId },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        fileId,
        authorId: userId,
        authorName: "User",
        action: "guide_deleted",
        details: `Deleted guide ${guideId}`,
      },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/files/[fileId]/guides/[guideId]]", error);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}

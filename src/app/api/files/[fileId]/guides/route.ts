import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/file-access";

export async function GET(
  req: Request,
  { params }: { params: { fileId: string } }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const fileId = params.fileId;
    const guides = await prisma.guide.findMany({
      where: { fileId },
      orderBy: [{ setName: "asc" }, { position: "asc" }],
    });

    return Response.json(guides);
  } catch (error) {
    console.error("[GET /api/files/[fileId]/guides]", error);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: { fileId: string } }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const fileId = params.fileId;
    const body = await req.json();
    const { setName, position, type, locked = false, color = "#4f46e5" } = body;

    if (!setName || position === undefined || !type) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (type !== "horizontal" && type !== "vertical") {
      return Response.json({ error: "Type must be horizontal or vertical" }, { status: 400 });
    }

    const guide = await prisma.guide.create({
      data: {
        fileId,
        setName,
        position,
        type,
        locked,
        color,
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        fileId,
        authorId: userId,
        authorName: "User",
        action: "guide_added",
        details: `Added ${type} guide at ${position}px in set "${setName}"`,
      },
    });

    return Response.json(guide, { status: 201 });
  } catch (error) {
    console.error("[POST /api/files/[fileId]/guides]", error);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}

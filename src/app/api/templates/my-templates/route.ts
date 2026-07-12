import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/file-access";

export async function GET(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const take = Math.min(parseInt(searchParams.get("take") || "50"), 100);
    const skip = parseInt(searchParams.get("skip") || "0");

    const templates = await prisma.template.findMany({
      where: { creatorId: userId },
      orderBy: { createdAt: "desc" },
      take,
      skip,
    });

    return NextResponse.json(templates);
  } catch (err) {
    console.error("[My Templates GET]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

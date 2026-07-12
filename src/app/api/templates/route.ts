import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/file-access";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || "all";
    const take = Math.min(parseInt(searchParams.get("take") || "50"), 100);
    const skip = parseInt(searchParams.get("skip") || "0");

    const where: any = { isPublic: true };
    if (category !== "all") {
      where.category = category;
    }

    const templates = await prisma.template.findMany({
      where,
      orderBy: { usageCount: "desc" },
      take,
      skip,
    });

    return NextResponse.json(templates);
  } catch (err) {
    console.error("[Templates GET]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { name, description, canvasData, thumbnail, isPublic, category, tags } = body;

    if (!name || !canvasData) {
      return NextResponse.json({ error: "Name and canvasData required" }, { status: 400 });
    }

    const template = await prisma.template.create({
      data: {
        name,
        description: description || null,
        canvasData,
        thumbnail: thumbnail || null,
        isPublic: isPublic || false,
        category: category || "general",
        tags: tags || "",
        creatorId: userId,
        creatorName: "You",
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (err) {
    console.error("[Templates POST]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/file-access";
import { prisma } from "@/lib/prisma";
import { checkProjectLimit } from "@/lib/subscription";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [sub, limit] = await Promise.all([
    prisma.subscription.findUnique({ where: { userId } }),
    checkProjectLimit(userId),
  ]);

  return NextResponse.json({
    plan: limit.plan.id,
    planName: limit.plan.name,
    projectLimit: Number.isFinite(limit.plan.projectLimit) ? limit.plan.projectLimit : null,
    projectsUsed: limit.used,
    status: sub?.status ?? "active",
  });
}

import { NextResponse } from "next/server";
import { getCurrentUserContext } from "@/lib/file-access";
import { isAdminEmail } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const me = await getCurrentUserContext();
  if (!me || !isAdminEmail(me.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const submissions = await prisma.subscription.findMany({
    where: { status: "pending_review" },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(submissions);
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserContext } from "@/lib/file-access";
import { isAdminEmail } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  action: z.enum(["approve", "reject"]),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getCurrentUserContext();
  if (!me || !isAdminEmail(me.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { id } = await params;
  const existing = await prisma.subscription.findUnique({ where: { id } });
  if (!existing || existing.status !== "pending_review") {
    return NextResponse.json({ error: "Nothing to review here." }, { status: 404 });
  }

  const updated = await prisma.subscription.update({
    where: { id },
    data: {
      status: parsed.data.action === "approve" ? "active" : "rejected",
      reviewedByEmail: me.email,
      reviewedAt: new Date(),
    },
  });

  return NextResponse.json(updated);
}

import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserContext } from "@/lib/file-access";
import { getFileAccess } from "@/lib/comment-access";
import { inviteSchema } from "@/lib/share-validation";
import { generateSecureToken } from "@/lib/share-tokens";
import { auditShare } from "@/lib/share-audit";
import { sendEmail, buildInviteEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import type { FileMemberSummary } from "@/types";

type RouteParams = { params: Promise<{ fileId: string }> };

const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

function serialize(m: {
  id: string;
  email: string;
  userId: string | null;
  role: string;
  status: string;
  createdAt: Date;
}): FileMemberSummary {
  return {
    id: m.id,
    email: m.email,
    userId: m.userId,
    role: (["admin", "editor", "commenter", "viewer"] as const).includes(
      m.role as FileMemberSummary["role"]
    )
      ? (m.role as FileMemberSummary["role"])
      : "viewer",
    status: (["pending", "accepted", "expired", "revoked"] as const).includes(
      m.status as FileMemberSummary["status"]
    )
      ? (m.status as FileMemberSummary["status"])
      : "pending",
    createdAt: m.createdAt.toISOString(),
  };
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const me = await getCurrentUserContext();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { fileId } = await params;
  const access = await getFileAccess(fileId, me.userId, me.email);
  if (!access.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const members = await prisma.fileMember.findMany({
    where: { fileId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      userId: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });

  return NextResponse.json(members.map(serialize));
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const me = await getCurrentUserContext();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { fileId } = await params;

  const rl = rateLimit(`invite:${me.userId}:${fileId}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const access = await getFileAccess(fileId, me.userId, me.email);
  if (!access.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = inviteSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { emails, role } = parsed.data;

  const file = await prisma.designFile.findUnique({
    where: { id: fileId },
    select: { title: true },
  });
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const origin = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  const client = await clerkClient();
  const results: FileMemberSummary[] = [];

  for (const email of Array.from(new Set(emails))) {
    // Detect an existing account so we can grant access immediately.
    let existingUserId: string | null = null;
    try {
      const list = await client.users.getUserList({ emailAddress: [email] });
      existingUserId = list.data[0]?.id ?? null;
    } catch {
      existingUserId = null;
    }

    const inviteToken = generateSecureToken();
    const status = existingUserId ? "accepted" : "pending";
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

    // Upsert on [fileId, email] — the unique constraint prevents duplicate
    // active invitations; re-inviting refreshes the row instead of duplicating.
    const member = await prisma.fileMember.upsert({
      where: { fileId_email: { fileId, email } },
      create: {
        fileId,
        email,
        userId: existingUserId,
        role,
        status,
        invitedById: me.userId,
        inviteToken,
        expiresAt,
      },
      update: {
        role,
        // Don't downgrade an already-accepted membership back to pending.
        status: existingUserId ? "accepted" : undefined,
        userId: existingUserId ?? undefined,
        invitedById: me.userId,
        inviteToken,
        expiresAt,
      },
      select: {
        id: true,
        email: true,
        userId: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    const { subject, html, text } = buildInviteEmail({
      fileTitle: file.title,
      inviterName: me.name,
      role,
      acceptUrl: `${origin}/invite/${inviteToken}`,
    });
    await sendEmail({ to: email, subject, html, text });

    await auditShare({
      fileId,
      actorId: me.userId,
      actorName: me.name,
      action: "invite_sent",
      target: email,
      metadata: { role, existingUser: Boolean(existingUserId) },
    });

    results.push(serialize(member));
  }

  return NextResponse.json(results, { status: 201 });
}

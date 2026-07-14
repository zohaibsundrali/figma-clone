import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getCurrentUserContext } from "@/lib/file-access";
import { getFileAccess } from "@/lib/comment-access";
import { shareSettingsSchema } from "@/lib/share-validation";
import { generateSecureToken } from "@/lib/share-tokens";
import { auditShare } from "@/lib/share-audit";
import { rateLimit } from "@/lib/rate-limit";
import type { ShareRole, ShareSettings } from "@/types";

type RouteParams = { params: Promise<{ fileId: string }> };

function appOrigin(req: NextRequest): string {
  return process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
}

function toSettings(
  file: {
    isPublic: boolean;
    shareToken: string;
    shareRole: string;
    sharePasswordHash: string | null;
    shareExpiresAt: Date | null;
  },
  origin: string
): ShareSettings {
  const expired = Boolean(
    file.shareExpiresAt && file.shareExpiresAt.getTime() < Date.now()
  );
  return {
    isPublic: file.isPublic,
    shareUrl: file.isPublic ? `${origin}/share/${file.shareToken}` : null,
    shareRole: (["viewer", "commenter", "editor"] as const).includes(
      file.shareRole as ShareRole
    )
      ? (file.shareRole as ShareRole)
      : "viewer",
    hasPassword: Boolean(file.sharePasswordHash),
    expiresAt: file.shareExpiresAt ? file.shareExpiresAt.toISOString() : null,
    expired,
  };
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const me = await getCurrentUserContext();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { fileId } = await params;
  const access = await getFileAccess(fileId, me.userId, me.email);
  if (!access.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const file = await prisma.designFile.findUnique({
    where: { id: fileId },
    select: {
      isPublic: true,
      shareToken: true,
      shareRole: true,
      sharePasswordHash: true,
      shareExpiresAt: true,
    },
  });
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(toSettings(file, appOrigin(req)));
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const me = await getCurrentUserContext();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { fileId } = await params;

  // Rate-limit link mutations (token regeneration is security-sensitive).
  const rl = rateLimit(`share:${me.userId}:${fileId}`, 30, 60_000);
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
  const parsed = shareSettingsSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const input = parsed.data;

  const existing = await prisma.designFile.findUnique({
    where: { id: fileId },
    select: {
      isPublic: true,
      shareToken: true,
      shareRole: true,
      sharePasswordHash: true,
      shareExpiresAt: true,
    },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: {
    isPublic?: boolean;
    shareToken?: string;
    shareRole?: string;
    sharePasswordHash?: string | null;
    shareExpiresAt?: Date | null;
  } = {};
  const audits: { action: string; target?: string }[] = [];

  if (input.enabled !== undefined) {
    data.isPublic = input.enabled;
    audits.push({ action: input.enabled ? "link_enabled" : "link_disabled" });
  }
  if (input.regenerate) {
    data.shareToken = generateSecureToken();
    audits.push({ action: "link_regenerated" });
  }
  if (input.role !== undefined) {
    data.shareRole = input.role;
    audits.push({ action: "link_role_changed", target: input.role });
  }
  if (input.password !== undefined) {
    if (input.password === null) {
      data.sharePasswordHash = null;
      audits.push({ action: "password_removed" });
    } else {
      data.sharePasswordHash = await bcrypt.hash(input.password, 10);
      audits.push({ action: "password_set" });
    }
  }
  if (input.expiresAt !== undefined) {
    data.shareExpiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
    audits.push({
      action: input.expiresAt ? "expiry_set" : "expiry_removed",
      target: input.expiresAt ?? undefined,
    });
  }

  const updated = await prisma.designFile.update({
    where: { id: fileId },
    data,
    select: {
      isPublic: true,
      shareToken: true,
      shareRole: true,
      sharePasswordHash: true,
      shareExpiresAt: true,
    },
  });

  for (const a of audits) {
    await auditShare({
      fileId,
      actorId: me.userId,
      actorName: me.name,
      action: a.action,
      target: a.target,
    });
  }

  return NextResponse.json(toSettings(updated, appOrigin(req)));
}

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { verifyPasswordSchema } from "@/lib/share-validation";
import {
  createShareSession,
  shareCookieName,
  SHARE_SESSION_TTL_MS,
} from "@/lib/share-tokens";
import { rateLimit, clientIpFrom } from "@/lib/rate-limit";

type RouteParams = { params: Promise<{ token: string }> };

/**
 * Verify a public link's password and, on success, mint a short-lived
 * verified-share session cookie. Rate-limited; responses are intentionally
 * generic so the endpoint never reveals whether a file/token exists.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { token } = await params;

  // Rate limit per token + IP: 5 attempts / 5 minutes.
  const ip = clientIpFrom(req.headers);
  const rl = rateLimit(`pw:${token}:${ip}`, 5, 5 * 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const parsed = verifyPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const file = await prisma.designFile.findFirst({
    where: { shareToken: token, isPublic: true },
    select: { id: true, sharePasswordHash: true, shareExpiresAt: true },
  });

  // Generic response — do not reveal whether the file exists.
  const GENERIC = NextResponse.json({ error: "Incorrect password" }, { status: 401 });

  if (!file || !file.sharePasswordHash) return GENERIC;
  if (file.shareExpiresAt && file.shareExpiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "This link is no longer available." }, { status: 410 });
  }

  const ok = await bcrypt.compare(parsed.data.password, file.sharePasswordHash);
  if (!ok) return GENERIC;

  const res = NextResponse.json({ success: true });
  res.cookies.set(shareCookieName(file.id), createShareSession(file.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SHARE_SESSION_TTL_MS / 1000),
  });
  return res;
}

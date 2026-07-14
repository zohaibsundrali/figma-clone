import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/file-access";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ fileId: string }> };

// Matches "data:image/png;base64,AAAA..." — captures the mime type and payload.
const DATA_URL_RE = /^data:([^;,]+)(;base64)?,([\s\S]*)$/;

/**
 * Serves a file's thumbnail as a real image response instead of inlining the
 * base64 data URL into the dashboard payload. Loaded lazily per card, so only
 * visible thumbnails are fetched, and the browser can cache them.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return new NextResponse(null, { status: 401 });
  }

  const { fileId } = await params;

  const file = await prisma.designFile.findFirst({
    where: { id: fileId, ownerId: userId },
    select: { thumbnail: true },
  });

  if (!file?.thumbnail) {
    return new NextResponse(null, { status: 404 });
  }

  const match = DATA_URL_RE.exec(file.thumbnail);
  if (!match) {
    // Not a data URL we can decode (e.g. a plain URL) — nothing to serve.
    return new NextResponse(null, { status: 404 });
  }

  const [, mime, base64Flag, payload] = match;
  const body = base64Flag
    ? Buffer.from(payload, "base64")
    : Buffer.from(decodeURIComponent(payload), "utf-8");

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": mime || "image/png",
      // Private (owner-only) and versioned via ?v=<updatedAt> from the client,
      // so a long cache is safe — a new version fetches a new URL.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}

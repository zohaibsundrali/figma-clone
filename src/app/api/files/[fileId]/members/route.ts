import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserContext } from "@/lib/file-access";
import { getFileAccess } from "@/lib/comment-access";

type RouteParams = { params: Promise<{ fileId: string }> };

export interface MentionMember {
  id: string;
  name: string;
  email: string | null;
}

/**
 * Members who can be @mentioned on a file: the file owner plus every member of
 * the file's workspace. Used to populate the mention autocomplete. `id` is the
 * value stored in Comment.mentions and used to target notifications.
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const me = await getCurrentUserContext();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { fileId } = await params;
    const access = await getFileAccess(fileId, me.userId, me.email);
    if (!access.canView) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const file = await prisma.designFile.findUnique({
      where: { id: fileId },
      select: {
        ownerId: true,
        workspace: {
          select: {
            ownerId: true,
            members: {
              select: { userId: true, userName: true, userEmail: true },
            },
          },
        },
      },
    });

    if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const byId = new Map<string, MentionMember>();

    for (const m of file.workspace?.members ?? []) {
      byId.set(m.userId, {
        id: m.userId,
        name: m.userName || m.userEmail,
        email: m.userEmail,
      });
    }

    // Resolve the file/workspace owner display name via Clerk (best-effort).
    const ownerIds = [file.ownerId, file.workspace?.ownerId]
      .filter((v): v is string => typeof v === "string" && v.length > 0)
      .filter((v) => !byId.has(v));
    if (ownerIds.length > 0) {
      try {
        const client = await clerkClient();
        for (const id of ownerIds) {
          try {
            const u = await client.users.getUser(id);
            byId.set(id, {
              id,
              name:
                u.fullName ??
                u.firstName ??
                u.username ??
                u.primaryEmailAddress?.emailAddress ??
                "Owner",
              email: u.primaryEmailAddress?.emailAddress ?? null,
            });
          } catch {
            byId.set(id, { id, name: "Owner", email: null });
          }
        }
      } catch {
        for (const id of ownerIds) {
          if (!byId.has(id)) byId.set(id, { id, name: "Owner", email: null });
        }
      }
    }

    return NextResponse.json([...byId.values()]);
  } catch (err) {
    console.error("[File members GET]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

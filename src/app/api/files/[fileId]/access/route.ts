import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserContext } from "@/lib/file-access";
import { getFileAccess } from "@/lib/comment-access";
import type { CommentAccess } from "@/types";

type RouteParams = { params: Promise<{ fileId: string }> };

/** The signed-in user's comment capabilities for a file (drives UI gating). */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const me = await getCurrentUserContext();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { fileId } = await params;
    const access = await getFileAccess(fileId, me.userId, me.email);

    const payload: CommentAccess = {
      role: access.role,
      canView: access.canView,
      canComment: access.canComment,
      canResolve: access.canResolve,
      canEdit: access.canEdit,
      isAdmin: access.isAdmin,
    };
    return NextResponse.json(payload);
  } catch (err) {
    console.error("[File access GET]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

import { Liveblocks } from "@liveblocks/node";
import { getCurrentUserContext, getFileForCollaboration } from "@/lib/file-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

export async function POST(request: Request) {
  const startedAt = Date.now();
  console.log("[liveblocks-auth] route entered");

  try {
    let room: string;
    try {
      const requestBody: unknown = await request.json();
      console.log("[liveblocks-auth] request body parsed");

      if (
        typeof requestBody !== "object" ||
        requestBody === null ||
        !("room" in requestBody) ||
        typeof requestBody.room !== "string" ||
        requestBody.room.trim().length === 0
      ) {
        return Response.json(
          { error: "Invalid room" },
          { status: 400 }
        );
      }
      room = requestBody.room;
      console.log("[liveblocks-auth] room parsed:", room);
    } catch {
      return Response.json(
        { error: "Invalid JSON" },
        { status: 400 }
      );
    }

    console.time("[liveblocks-auth] clerk-auth");
    const me = await getCurrentUserContext();
    console.timeEnd("[liveblocks-auth] clerk-auth");
    console.log("[liveblocks-auth] auth completed");

    if (!me) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    const userId = me.userId;

    console.time("[liveblocks-auth] file-access");
    // Owner, workspace member, or public file may join the collaboration room.
    const file = await getFileForCollaboration(room, userId, me.email);
    console.timeEnd("[liveblocks-auth] file-access");
    console.log("[liveblocks-auth] file-access check completed");

    if (!file) {
      return Response.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const session = liveblocks.prepareSession(userId);
    session.allow(room, session.FULL_ACCESS);

    console.time("[liveblocks-auth] authorize");
    const { status, body } = await session.authorize();
    console.timeEnd("[liveblocks-auth] authorize");
    console.log("[liveblocks-auth] Liveblocks authorization completed, status:", status);

    console.log(
      "[liveblocks-auth] completed in",
      Date.now() - startedAt,
      "ms"
    );

    return new Response(body, {
      status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error(
      "[liveblocks-auth]",
      error instanceof Error ? error.message : "Unknown error"
    );

    return Response.json(
      { error: "Liveblocks authentication failed" },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}



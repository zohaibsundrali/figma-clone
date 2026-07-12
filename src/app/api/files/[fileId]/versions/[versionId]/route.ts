import { NextRequest, NextResponse } from "next/server";

type RouteParams = { params: Promise<{ fileId: string; versionId: string }> };

export async function GET(
  req: NextRequest,
  { params }: RouteParams
) {
  try {
    const { fileId, versionId } = await params;
    
    // This endpoint would fetch a specific version if needed
    // For now, we just return OK
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Version GET]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

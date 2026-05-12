import { NextRequest, NextResponse } from "next/server";
import { getShareTokenByToken } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    
    if (!token) {
      return NextResponse.json(
        { error: "token is required" },
        { status: 400 }
      );
    }

    const shareToken = await getShareTokenByToken(token);
    
    if (!shareToken) {
      return NextResponse.json(
        { error: "Share token not found or has expired" },
        { status: 404 }
      );
    }

    return NextResponse.json(shareToken);
  } catch (e) {
    console.error("GET /api/share-tokens/by-token/[token] error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { deleteShareToken } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    await deleteShareToken(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/share-tokens/[id] error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

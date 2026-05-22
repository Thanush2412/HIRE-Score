import { NextResponse } from "next/server";
import { recalculateAllScores } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const updatedCount = await recalculateAllScores();
    
    return NextResponse.json({
      success: true,
      message: `Successfully recalculated scores for ${updatedCount} students.`,
    });
  } catch (e) {
    return NextResponse.json({
      success: false,
      error: String(e),
    }, { status: 500 });
  }
}


import { NextResponse } from "next/server";
import { getAllStudents, upsertStudent } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const students = await getAllStudents();
    let updatedCount = 0;
    
    for (const student of students) {
      // Re-upsert will run computeScores and save the newly calculated values
      await upsertStudent(student);
      updatedCount++;
    }
    
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

import { NextRequest, NextResponse } from "next/server";
import { getPool, recalculateAllScores } from "@/lib/db";

export const dynamic = "force-dynamic";

const ALLOWED_COLLEGES = [
  "Takshashila University",
  "SDNB Vaishnav College for Women",
  "S-VYASA University"
];

export async function POST(req: NextRequest) {
  try {
    const pool = getPool();

    // 1. Reset aptitude scores for students outside allowed colleges
    const [aptRes] = await pool.query(`
      UPDATE student_aptitude sa
      JOIN students s ON sa.student_id = s.id
      JOIN colleges c ON s.college_id = c.id
      SET sa.quants = 0, sa.verbal = 0, sa.logical = 0
      WHERE c.name NOT IN (?)
    `, [ALLOWED_COLLEGES]);

    // 2. Reset technical assessment scores for students outside allowed colleges
    const [techRes] = await pool.query(`
      UPDATE student_technical st
      JOIN students s ON st.student_id = s.id
      JOIN colleges c ON s.college_id = c.id
      SET st.fop_assessment = 0, st.dsa_assessment = 0
      WHERE c.name NOT IN (?)
    `, [ALLOWED_COLLEGES]);

    // 3. Recalculate HireScores for all students in DB
    const recalculatedCount = await recalculateAllScores();

    return NextResponse.json({
      success: true,
      message: `Cleared NQT test scores for all colleges except Takshashila University, SDNB Vaishnav College for Women, and S-VYASA University.`,
      allowedColleges: ALLOWED_COLLEGES,
      affectedAptitudeRows: (aptRes as any).affectedRows || 0,
      affectedTechnicalRows: (techRes as any).affectedRows || 0,
      recalculatedTotal: recalculatedCount
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed clearing scores" }, { status: 500 });
  }
}

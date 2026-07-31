import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const regNo = searchParams.get("regNo");
    const college = searchParams.get("college");
    const department = searchParams.get("department");

    const pool = getPool();

    let query = `
      SELECT 
        s.registrationNumber,
        s.name,
        s.email,
        s.department,
        s.college,
        COALESCE(log.quants, s.quants, 0) AS quants,
        COALESCE(log.logical, s.logical, 0) AS logical,
        COALESCE(log.verbal, s.verbal, 0) AS verbal,
        COALESCE(log.fop_assessment, s.fopAssessment, 0) AS fopAssessment,
        COALESCE(log.dsa_assessment, s.dsaAssessment, 0) AS dsaAssessment,
        s.hireScore,
        log.created_at AS lastSubmittedAt
      FROM student_full_view s
      LEFT JOIN (
        SELECT l1.*
        FROM student_submissions_log l1
        INNER JOIN (
          SELECT registration_number, MAX(created_at) AS max_date
          FROM student_submissions_log
          WHERE registration_number IS NOT NULL AND registration_number != ''
          GROUP BY registration_number
        ) l2 ON l1.registration_number = l2.registration_number AND l1.created_at = l2.max_date
      ) log ON LOWER(s.registrationNumber) = LOWER(log.registration_number)
      WHERE 1=1
    `;

    const params: any[] = [];

    if (regNo) {
      query += ` AND (LOWER(s.registrationNumber) = LOWER(?) OR LOWER(s.email) = LOWER(?))`;
      params.push(regNo.trim(), regNo.trim());
    }

    if (college) {
      query += ` AND LOWER(s.college) = LOWER(?)`;
      params.push(college.trim());
    }

    if (department) {
      query += ` AND LOWER(s.department) = LOWER(?)`;
      params.push(department.trim());
    }

    query += ` ORDER BY s.name ASC`;

    const [rows] = await pool.query(query, params);

    const formattedStudents = (rows as any[]).map(r => {
      const quants = Number(r.quants || 0);
      const logical = Number(r.logical || 0);
      const verbal = Number(r.verbal || 0);
      const fop = Number(r.fopAssessment || 0);
      const dsa = Number(r.dsaAssessment || 0);
      const aptitude = Math.round(((quants + logical + verbal + fop) / 4) * 100) / 100;

      return {
        registrationNumber: r.registrationNumber,
        name: r.name,
        email: r.email,
        department: r.department,
        college: r.college,
        numerical: quants,
        verbal: verbal,
        reasoning: logical,
        advQuant: fop,
        aptitude: aptitude,
        coding: dsa,
        hireScore: r.hireScore,
        lastSubmittedAt: r.lastSubmittedAt || null,
      };
    });

    const totalCount = formattedStudents.length;
    const avgAptitude = totalCount > 0
      ? Math.round((formattedStudents.reduce((a, b) => a + b.aptitude, 0) / totalCount) * 100) / 100
      : 0;

    return NextResponse.json({
      success: true,
      totalStudents: totalCount,
      summary: {
        totalEvaluated: totalCount,
        averageAptitude: avgAptitude,
      },
      students: formattedStudents,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch NQT API data" },
      { status: 500 }
    );
  }
}

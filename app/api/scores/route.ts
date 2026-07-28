import { NextRequest, NextResponse } from "next/server";
import { getAllStudents, getStudentByRegistrationNumber, getStudentsFiltered } from "@/lib/db";

export const dynamic = "force-dynamic";

function formatScoresResponse(student: any) {
  return {
    registrationNumber: student.registrationNumber,
    name: student.name,
    college: student.college || null,
    department: student.department || null,
    year: student.year || null,
    scores: {
      fopAssessment: student.fopAssessment ?? 0,
      dsaAssessment: student.dsaAssessment ?? 0,
      quants: student.quants ?? 0,
      verbal: student.verbal ?? 0,
      logical: student.logical ?? 0,
    },
    computedScores: {
      quantsScore: student.quantsScore ?? 0,
      verbalScore: student.verbalScore ?? 0,
      logicalScore: student.logicalScore ?? 0,
      aptitudeTotal: student.aptitudeTotal ?? 0,
      technicalProficiency: student.technicalProficiency ?? 0,
      hireScore: student.hireScore ?? 0,
    },
    updatedAt: student.updated_at || student.createdAt || null,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const regNo =
      searchParams.get("registrationNumber") ||
      searchParams.get("regNo") ||
      searchParams.get("registerNumber") ||
      searchParams.get("reg");

    if (regNo) {
      const student = await getStudentByRegistrationNumber(regNo);
      if (!student) {
        return NextResponse.json(
          { error: `Student with registration number '${regNo}' not found` },
          { status: 404 }
        );
      }
      return NextResponse.json(formatScoresResponse(student));
    }

    const collegesParam = searchParams.get("colleges");
    const coursesParam  = searchParams.get("courses");
    const yearsParam    = searchParams.get("years");
    const college       = searchParams.get("college") ?? undefined;
    const degreeType    = searchParams.get("degreeType") ?? undefined;

    const colleges = collegesParam ? (JSON.parse(collegesParam) as string[]) : undefined;
    const courses  = coursesParam  ? (JSON.parse(coursesParam)  as string[]) : undefined;
    const years    = yearsParam    ? (JSON.parse(yearsParam)    as string[]) : undefined;

    const hasFilter = colleges?.length || college || courses?.length || years?.length || (degreeType && degreeType !== "all");

    const students = hasFilter
      ? await getStudentsFiltered({ colleges, college, courses, years, degreeType })
      : await getAllStudents();

    return NextResponse.json(students.map(formatScoresResponse));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

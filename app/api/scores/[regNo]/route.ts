import { NextRequest, NextResponse } from "next/server";
import { getStudentByRegistrationNumber } from "@/lib/db";

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ regNo: string }> }
) {
  try {
    const { regNo } = await params;
    const decodedRegNo = decodeURIComponent(regNo);

    const student = await getStudentByRegistrationNumber(decodedRegNo);
    if (!student) {
      return NextResponse.json(
        { error: `Student with registration number '${decodedRegNo}' not found` },
        { status: 404 }
      );
    }

    return NextResponse.json(formatScoresResponse(student));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getStudentByRegistrationNumber } from "@/lib/db";

export const dynamic = "force-dynamic";

// Assessment component denominators
const MAX_DENOMINATORS = {
  fopAssessment: 75,
  dsaAssessment: 100,
  quants: 50,
  verbal: 50,
  logical: 50,
  aptitudeTotal: 150,
} as const;

/**
 * Normalizes raw input value against max denominator:
 * - If raw > max: treats raw as percentage (0-100), converts to score out of max.
 * - If raw <= max: treats raw as score out of max, calculates percentage.
 */
function normalizeComponentScore(val: unknown, max: number) {
  const raw = Math.max(0, Number(val) || 0);
  let scoreOutOfMax: number;
  let percentage: number;

  if (raw > max) {
    // Value provided as percentage (e.g. 80% for FOP)
    percentage = Math.min(raw, 100);
    scoreOutOfMax = Math.round(((percentage / 100) * max) * 100) / 100;
  } else {
    // Value provided as raw score out of max denominator (e.g. 60 out of 75)
    scoreOutOfMax = Math.min(raw, max);
    percentage = max > 0 ? Math.round(((scoreOutOfMax / max) * 100) * 100) / 100 : 0;
  }

  return {
    score: scoreOutOfMax,
    maxDenominator: max,
    percentage: percentage,
    displayScore: `${scoreOutOfMax}/${max}`,
    displayPercentage: `${percentage}%`,
  };
}

function formatScoresResponse(student: any) {
  const fop = normalizeComponentScore(student.fopAssessment, MAX_DENOMINATORS.fopAssessment);
  const dsa = normalizeComponentScore(student.dsaAssessment, MAX_DENOMINATORS.dsaAssessment);
  const quants = normalizeComponentScore(student.quants, MAX_DENOMINATORS.quants);
  const verbal = normalizeComponentScore(student.verbal, MAX_DENOMINATORS.verbal);
  const logical = normalizeComponentScore(student.logical, MAX_DENOMINATORS.logical);

  const aptRawTotal = student.aptitudeTotal ?? (quants.score + verbal.score + logical.score);
  const aptitudeTotal = normalizeComponentScore(aptRawTotal, MAX_DENOMINATORS.aptitudeTotal);
  const hireScore = Math.round(Number(student.hireScore ?? 0));

  return {
    registrationNumber: student.registrationNumber,
    name: student.name,
    college: student.college || null,
    department: student.department || null,
    year: student.year || null,
    hireScore: hireScore, // Total Hire Score out of 1000

    // Scores normalized to their respective max denominators (e.g. FOP out of 75)
    scores: {
      fopAssessment: fop.score,
      dsaAssessment: dsa.score,
      quants: quants.score,
      verbal: verbal.score,
      logical: logical.score,
      hireScore: hireScore,
    },

    // Percentage equivalent (0 - 100%) for each component
    percentages: {
      fopAssessment: fop.percentage,
      dsaAssessment: dsa.percentage,
      quants: quants.percentage,
      verbal: verbal.percentage,
      logical: logical.percentage,
      aptitudeTotal: aptitudeTotal.percentage,
    },

    // Max denominators definition
    maxDenominators: MAX_DENOMINATORS,

    // Full component breakdown with scores, denominators, and percentage strings
    breakdown: {
      fopAssessment: fop,
      dsaAssessment: dsa,
      quants: quants,
      verbal: verbal,
      logical: logical,
      aptitudeTotal: aptitudeTotal,
    },

    computedScores: {
      quantsScore: student.quantsScore ?? quants.score,
      verbalScore: student.verbalScore ?? verbal.score,
      logicalScore: student.logicalScore ?? logical.score,
      aptitudeTotal: aptitudeTotal.score,
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


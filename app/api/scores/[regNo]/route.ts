import { NextRequest, NextResponse } from "next/server";
import { getStudentByRegistrationNumber, getAllNqtAssessmentsFromDb } from "@/lib/db";

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
    percentage = Math.min(raw, 100);
    scoreOutOfMax = Math.round(((percentage / 100) * max) * 100) / 100;
  } else {
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

function formatScoresResponse(student: any, nqtUploadMatch: any | null) {
  const fop = normalizeComponentScore(student.fopAssessment, MAX_DENOMINATORS.fopAssessment);
  const dsa = normalizeComponentScore(student.dsaAssessment, MAX_DENOMINATORS.dsaAssessment);
  const quants = normalizeComponentScore(student.quants, MAX_DENOMINATORS.quants);
  const verbal = normalizeComponentScore(student.verbal, MAX_DENOMINATORS.verbal);
  const logical = normalizeComponentScore(student.logical, MAX_DENOMINATORS.logical);

  const aptRawTotal = student.aptitudeTotal ?? (quants.score + verbal.score + logical.score);
  const aptitudeTotal = normalizeComponentScore(aptRawTotal, MAX_DENOMINATORS.aptitudeTotal);
  const hireScore = Math.round(Number(student.hireScore ?? 0));

  let fpcNqtAssessment: any = null;
  let noOfAssessments = 0;
  let numericalPct = 0;
  let verbalPct = 0;
  let reasoningPct = 0;
  let advQuantPct = 0;
  let aptitudeAvgPct = 0;
  let codingAvgPct = 0;
  let overallAvgPct = 0;

  // Populate NQT fields ONLY if student exists in an uploaded NQT assessment file
  if (nqtUploadMatch) {
    noOfAssessments = Number(nqtUploadMatch.assessmentsConducted ?? 1);
    numericalPct = Number(nqtUploadMatch.numerical || 0);
    verbalPct = Number(nqtUploadMatch.verbal || 0);
    reasoningPct = Number(nqtUploadMatch.reasoning || 0);
    advQuantPct = Number(nqtUploadMatch.advQuant || 0);
    
    aptitudeAvgPct = nqtUploadMatch.aptitude !== undefined && nqtUploadMatch.aptitude !== null 
      ? Number(nqtUploadMatch.aptitude) 
      : Math.round(((numericalPct + verbalPct + reasoningPct + advQuantPct) / 4) * 100) / 100;
      
    codingAvgPct = Number(nqtUploadMatch.coding || 0);
    
    overallAvgPct = nqtUploadMatch.overall !== undefined && nqtUploadMatch.overall !== null 
      ? Number(nqtUploadMatch.overall) 
      : Math.round(((aptitudeAvgPct + codingAvgPct) / 2) * 100) / 100;

    fpcNqtAssessment = {
      tableHeader: "FPC NQT Assessment",
      hasNqtData: true,
      noOfAssessmentConducted: noOfAssessments,
      numericalAbilityPercentage: numericalPct,
      verbalAbilityPercentage: verbalPct,
      reasoningAbilityPercentage: reasoningPct,
      advancedQuantitativeAndReasoningAbilityPercentage: advQuantPct,
      aptitudeAveragePercentage: aptitudeAvgPct,
      codingAveragePercentage: codingAvgPct,
      overallAveragePercentage: overallAvgPct,

      // Header mappings matching exact spreadsheet column headers
      headers: {
        "No.Of. Assessment Conducted": noOfAssessments,
        "Numerical Ability( Percentage)": numericalPct,
        "Verbal Ability( Percentage)": verbalPct,
        "Reasoning Ability( Percentage)": reasoningPct,
        "Advanced Quantitative and Reasoning Ability( Percentage)": advQuantPct,
        "Aptitude Average %": aptitudeAvgPct,
        "Coding (Average Percentage)": codingAvgPct,
        "Overall (Average Percentage)": overallAvgPct,
      }
    };
  }

  return {
    registrationNumber: student.registrationNumber,
    name: student.name,
    college: student.college || null,
    department: student.department || null,
    year: student.year || null,
    hireScore: hireScore, // Total Hire Score out of 1000

    // FPC NQT Assessment Module Data (populated ONLY for uploaded NQT test students)
    fpcNqtAssessment,
    "No.Of. Assessment Conducted": noOfAssessments,
    "Numerical Ability( Percentage)": numericalPct,
    "Verbal Ability( Percentage)": verbalPct,
    "Reasoning Ability( Percentage)": reasoningPct,
    "Advanced Quantitative and Reasoning Ability( Percentage)": advQuantPct,
    "Aptitude Average %": aptitudeAvgPct,
    "Coding (Average Percentage)": codingAvgPct,
    "Overall (Average Percentage)": overallAvgPct,

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
      numericalAbility: numericalPct,
      verbalAbility: verbalPct,
      reasoningAbility: reasoningPct,
      advancedQuantitativeAndReasoningAbility: advQuantPct,
      aptitudeAverage: aptitudeAvgPct,
      codingAverage: codingAvgPct,
      overallAverage: overallAvgPct,
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

    // Check if student belongs to an actual uploaded NQT assessment file
    let nqtMatch: any = null;
    try {
      const savedAssessments = await getAllNqtAssessmentsFromDb();
      let targetReg = student.registrationNumber ? student.registrationNumber.trim().toLowerCase() : "";
      if (targetReg.endsWith(".0")) targetReg = targetReg.slice(0, -2);
      const targetEmail = (student.email || "").trim().toLowerCase();

      for (const ass of savedAssessments) {
        if (Array.isArray(ass.students)) {
          const found = ass.students.find((st: any) => {
            let reg = String(st.registrationNumber || "").trim().toLowerCase();
            if (reg.endsWith(".0")) reg = reg.slice(0, -2);
            let email = String(st.email || "").trim().toLowerCase();
            return (targetReg && reg === targetReg) || (targetEmail && email === targetEmail);
          });
          if (found) {
            nqtMatch = {
              ...found,
              assessmentsConducted: ass.assessmentsConducted || ass.noOfAssessmentConducted || 1
            };
            break;
          }
        }
      }
    } catch (err) {
      console.warn("Failed checking uploaded NQT assessment match:", err);
    }

    return NextResponse.json(formatScoresResponse(student, nqtMatch));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}



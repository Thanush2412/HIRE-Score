export interface FpcNqtStudentResult {
  registrationNumber?: string;
  name: string;
  email?: string;
  department?: string;
  college?: string;
  matchedDbStudent?: boolean;
  numerical: number;
  verbal: number;
  reasoning: number;
  aptitude: number; // Combined average of numerical, verbal, reasoning & advQuant
  advQuant: number;
  coding: number;
  overall: number;
}

export interface FpcNqtAssessment {
  id: string;
  assessmentName: string;            // e.g. "SDNB _ TCS _ 17 Jul 26"
  assessmentsConducted: number;      // e.g. 54
  numericalAbilityAvg: number;       // Average Percentage (0-100)
  verbalAbilityAvg: number;          // Average Percentage (0-100)
  reasoningAbilityAvg: number;       // Average Percentage (0-100)
  aptitudeAvg: number;               // Combined Aptitude Average (Num + Verb + Reas + AdvQuant)
  advancedQuantReasoningAvg: number; // Average Percentage (0-100)
  codingAvg: number;                 // Average Percentage (0-100)
  overallAvg: number;                // Average Percentage (0-100)
  uploadedAt: string;
  students?: FpcNqtStudentResult[];  // Student-level scores mapped via Reg Number / Email
}

export interface FpcNqtSummary {
  totalAssessments: number;
  totalConducted: number;
  overallAvgPercentage: number;
  numericalAbilityAvg: number;
  verbalAbilityAvg: number;
  reasoningAbilityAvg: number;
  aptitudeAvg: number;
  advancedQuantReasoningAvg: number;
  codingAvg: number;
  topModule: { name: string; score: number };
}

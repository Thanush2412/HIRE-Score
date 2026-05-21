/**
 * HIRE Score formula engine — mirrors the Excel HIRE_Score sheet exactly.
 * Verified against Excel computed columns for student row 2.
 */

import { StudentData } from "./types";

// ── CEFR level → numeric score ────────────────────────────────────────────────
function cefrScore(level: string, max: number): number {
  const map: Record<string, number> = {
    A1: 5, A2: 10, B1: 12, B2: 15, C1: 20, C2: 25,
  };
  const raw = map[String(level).toUpperCase().trim()] ?? 0;
  return Math.min(raw, max);
}

// ── X Score (15) ─────────────────────────────────────────────────────────────
function calcXScore(x: number): number {
  if (x >= 95) return 15;
  if (x >= 90) return 13;
  if (x >= 80) return 11;
  if (x >= 70) return 9;
  if (x >= 60) return 7;
  if (x >= 50) return 5;
  return 3;
}

// ── UG Score (70) ─────────────────────────────────────────────────────────────
function calcUGScore(ug: number, pg: number | null): number {
  if (pg === null || pg === 0) {
    if (ug >= 95) return 70;
    if (ug >= 90) return 65;
    if (ug >= 80) return 55;
    if (ug >= 70) return 45;
    if (ug >= 60) return 35;
    if (ug >= 50) return 25;
    return 20;
  }
  let ugPart: number;
  if (ug >= 95) ugPart = 40;
  else if (ug >= 90) ugPart = 35;
  else if (ug >= 80) ugPart = 30;
  else if (ug >= 70) ugPart = 25;
  else if (ug >= 60) ugPart = 20;
  else ugPart = 10;

  let pgPart: number;
  if (pg >= 95) pgPart = 30;
  else if (pg >= 90) pgPart = 25;
  else if (pg >= 80) pgPart = 20;
  else if (pg >= 70) pgPart = 15;
  else if (pg >= 60) pgPart = 10;
  else if (pg >= 50) pgPart = 5;
  else pgPart = 3;

  return ugPart + pgPart;
}

// ── No. of Arrears Score (40) ─────────────────────────────────────────────────
function calcArrearsScore(n: number): number {
  if (n === 0) return 40;
  if (n === 1) return 30;
  if (n === 2) return 20;
  return 10;
}

// ── History of Arrears Score (10) ─────────────────────────────────────────────
function calcHistoryScore(h: number): number {
  return h === 0 ? 10 : 0;
}

// ── Aptitude scores (50 each) ─────────────────────────────────────────────────
function calcAptitudeComponent(raw: number): number {
  return Math.min(Math.max(raw, 0), 50);
}

// ── Coding Practice (125) — Accepts clean numerical rank
function calcCodingPractice(rank: number): number {
  if (!rank || isNaN(rank)) return 0;
  if (rank > 1   && rank < 40000)    return 125;
  if (rank >= 40000  && rank < 150000)   return 115;
  if (rank >= 150000 && rank < 225000)   return 95;
  if (rank >= 225000 && rank < 350000)   return 75;
  if (rank >= 350000 && rank < 625000)   return 55;
  if (rank >= 625000 && rank < 1200000)  return 45;
  if (rank >= 1200000 && rank < 3000000) return 25;
  return 10;
}

// ── Coding Assessment — Excel: SUM(FOP, DSA), no per-component cap ────────────
function calcCodingAssessment(fop: number, dsa: number): number {
  return fop + dsa;
}

// ── Codeathon & Hackathon (50) — Excel: ROUND(MIN(W,2)*10,0) + ROUND(MIN(X,2)*15,0) ──
function calcCodeathon(internal: number, external: number): number {
  return Math.round(Math.min(internal, 2) * 10) + Math.round(Math.min(external, 2) * 15);
}

// ── Mini Projects in GitHub (30) — Excel: ROUND(MIN(Y,15)*2,0) ───────────────
function calcMiniProjects(n: number): number {
  return Math.round(Math.min(n, 15) * 2);
}

// ── Full Length Project (20) — Excel: ROUND(MIN(Z,2)*10,0) ───────────────────
function calcFullLengthProject(n: number): number {
  return Math.round(Math.min(n, 2) * 10);
}

// ── Global Certification (100) — Excel: ROUND(MIN(AA,2)*50,0) ────────────────
function calcGlobalCert(n: number): number {
  return Math.round(Math.min(n, 2) * 50);
}

// ── Other Certifications (50) — Excel: ROUND(MIN(AB,10)*5,0) ─────────────────
function calcOtherCert(n: number): number {
  return Math.round(Math.min(n, 10) * 5);
}

// ── Main compute function ─────────────────────────────────────────────────────
export function computeScores(s: StudentData): StudentData {
  // Tier 1 Academic
  const xScore              = calcXScore(s.xMarks);
  const xiiScore            = calcXScore(s.xiiMarks);
  const ugScore             = calcUGScore(s.ugPercentage, s.pgPercentage);
  const academicAggregate   = xScore + xiiScore + ugScore;
  const noOfArrearsScore    = calcArrearsScore(s.noOfArrears);
  const historyArrearsScore = calcHistoryScore(s.historyOfArrears);
  const standingArrears     = noOfArrearsScore + historyArrearsScore;

  // Tier 2 Aptitude
  const quantsScore  = calcAptitudeComponent(s.quants);
  const logicalScore = calcAptitudeComponent(s.logical);
  const verbalScore  = calcAptitudeComponent(s.verbal);
  const aptitudeTotal = quantsScore + logicalScore + verbalScore;

  // Tier 2 Communication
  const cefrGrammarScore = cefrScore(s.cefrGrammar, 25) * 2;
  const efListeningScore = cefrScore(s.efSetListening, 25);
  const efSpeakingScore  = cefrScore(s.efSetSpeaking, 25);
  const efReadingScore   = cefrScore(s.efSetReading, 25);
  const efWritingScore   = cefrScore(s.efSetWriting, 25);
  const communicationTotal = cefrGrammarScore + efListeningScore + efSpeakingScore + efReadingScore + efWritingScore;

  // Tier 3 Technical
  const codingPractice       = calcCodingPractice(s.leetcodeRank);
  const codingAssessment     = calcCodingAssessment(s.fopAssessment, s.dsaAssessment);
  const codeathonHackathon   = calcCodeathon(s.internalCodeathon, s.externalCodeathon);
  const miniProjects         = calcMiniProjects(s.githubProjects);
  const fullLengthProjectScore = calcFullLengthProject(s.fullLengthProjects);
  const globalCertScore      = calcGlobalCert(s.globalCertification);
  const otherCertScore       = calcOtherCert(s.otherCertifications);

  // Tier totals
  const academicRegulatory   = academicAggregate + standingArrears;
  const cognitiveLinguistic  = aptitudeTotal + communicationTotal;
  const technicalProficiency = codingPractice + codingAssessment + codeathonHackathon + miniProjects + fullLengthProjectScore;
  const industryValidation   = globalCertScore + otherCertScore;

  const hireScore = academicRegulatory + cognitiveLinguistic + technicalProficiency + industryValidation;

  return {
    ...s,
    xScore, xiiScore, ugScore, academicAggregate,
    noOfArrearsScore, historyArrearsScore, standingArrears,
    quantsScore, logicalScore, verbalScore, aptitudeTotal,
    cefrGrammarScore, efListeningScore, efSpeakingScore, efReadingScore, efWritingScore,
    communicationTotal,
    codingPractice, codingAssessment, codeathonHackathon, miniProjects,
    fullLengthProjectScore, globalCertScore, otherCertScore,
    academicRegulatory, cognitiveLinguistic, technicalProficiency, industryValidation,
    hireScore,
  };
}

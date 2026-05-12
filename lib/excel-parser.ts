import * as XLSX from "xlsx";
import { StudentData } from "./types";

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

function parseCEFR(val: unknown): string {
  if (!val) return "";
  const s = String(val).trim().toUpperCase();
  return CEFR_LEVELS.includes(s) ? s : "";
}

function parseNum(val: unknown): number {
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

function parseNullableNum(val: unknown): number | null {
  if (val === null || val === undefined || val === "" || String(val).toUpperCase() === "NA") return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

// Column indices (0-based, row index 2 = first data row)
const C = {
  name: 0, regNo: 1, dept: 2, year: 3,
  xMarks: 4, xiiMarks: 5, ugPct: 6, pgPct: 7,
  arrears: 8, histArrears: 9,
  quants: 10, logical: 11, verbal: 12,
  cefrA1: 13, cefrA2: 14,
  efListen: 15, efSpeak: 16, efRead: 17, efWrite: 18,
  leetcode: 19,
  fop: 20, dsa: 21,
  internalCode: 22, externalCode: 23,
  githubProjects: 24, fullLengthProjects: 25,
  globalCert: 26, otherCert: 27,
};

function rowToStudent(row: unknown[]): StudentData | null {
  if (!row[C.name]) return null;
  return {
    name: String(row[C.name] ?? ""),
    registrationNumber: String(row[C.regNo] ?? ""),
    department: String(row[C.dept] ?? ""),
    year: String(row[C.year] ?? ""),
    xMarks: parseNum(row[C.xMarks]),
    xiiMarks: parseNum(row[C.xiiMarks]),
    ugPercentage: parseNum(row[C.ugPct]),
    pgPercentage: parseNullableNum(row[C.pgPct]),
    noOfArrears: parseNum(row[C.arrears]),
    historyOfArrears: parseNum(row[C.histArrears]),
    quants: parseNum(row[C.quants]),
    logical: parseNum(row[C.logical]),
    verbal: parseNum(row[C.verbal]),
    cefrA1Grammar: parseCEFR(row[C.cefrA1]),
    cefrA2Grammar: parseCEFR(row[C.cefrA2]),
    efSetListening: parseCEFR(row[C.efListen]),
    efSetSpeaking: parseCEFR(row[C.efSpeak]),
    efSetReading: parseCEFR(row[C.efRead]),
    efSetWriting: parseCEFR(row[C.efWrite]),
    leetcodeRank: String(row[C.leetcode] ?? ""),
    leetcodeUrl: "", // Not in Excel, will be filled manually
    githubUrl: "", // Not in Excel, will be filled manually
    fopAssessment: parseNum(row[C.fop]),
    dsaAssessment: parseNum(row[C.dsa]),
    internalCodeathon: parseNum(row[C.internalCode]),
    externalCodeathon: parseNum(row[C.externalCode]),
    githubProjects: parseNum(row[C.githubProjects]),
    fullLengthProjects: parseNum(row[C.fullLengthProjects]),
    globalCertification: parseNum(row[C.globalCert]),
    otherCertifications: parseNum(row[C.otherCert]),
    // computed fields — will be filled by computeScores in db.ts
    xScore: 0, xiiScore: 0, ugScore: 0, academicAggregate: 0,
    noOfArrearsScore: 0, historyArrearsScore: 0, standingArrears: 0,
    quantsScore: 0, logicalScore: 0, verbalScore: 0, aptitudeTotal: 0,
    cefrA1Score: 0, cefrA2Score: 0, efListeningScore: 0, efSpeakingScore: 0,
    efReadingScore: 0, efWritingScore: 0, communicationTotal: 0,
    codingPractice: 0, codingAssessment: 0, codeathonHackathon: 0,
    miniProjects: 0, fullLengthProjectScore: 0, globalCertScore: 0, otherCertScore: 0,
    academicRegulatory: 0, cognitiveLinguistic: 0, technicalProficiency: 0,
    industryValidation: 0, hireScore: 0,
  };
}

function getRows(buffer: ArrayBuffer): unknown[][] {
  const wb = XLSX.read(buffer, { type: "array" });
  const ws = wb.Sheets["HIRE_Score"];
  if (!ws) throw new Error("Sheet 'HIRE_Score' not found");
  return XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null }) as unknown[][];
}

export function parseExcelAll(buffer: ArrayBuffer): StudentData[] {
  const rows = getRows(buffer);
  const result: StudentData[] = [];
  for (let i = 2; i < rows.length; i++) {
    const s = rowToStudent(rows[i] as unknown[]);
    if (s) result.push(s);
  }
  return result;
}

// Keep old names for backward compat
export const parseExcelPrimary = parseExcelAll;

import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { bulkUpsert } from "@/lib/db";
import { StudentData } from "@/lib/types";
import { upsertCollegesFromImport } from "@/lib/settings";

const PRIMARY_KEYS = new Set([
  "name", "registrationNumber", "department", "year",
  "phone", "email", "college", "stream",
  "xMarks", "xiiMarks", "ugPercentage", "pgPercentage",
  "noOfArrears", "historyOfArrears",
  "cefrA1Grammar", "cefrA2Grammar",
  "efSetListening", "efSetSpeaking", "efSetReading", "efSetWriting",
  "leetcodeRank", "leetcodeUrl", "githubUrl",
  "fopAssessment", "dsaAssessment",
  "internalCodeathon", "externalCodeathon",
  "githubProjects", "fullLengthProjects",
  "globalCertification", "otherCertifications",
]);

function parseNum(v: unknown): number {
  const n = Number(v); return isNaN(n) ? 0 : n;
}
function parseNullableNum(v: unknown): number | null {
  if (v === null || v === undefined || String(v).toUpperCase() === "NA" || v === "") return null;
  const n = Number(v); return isNaN(n) ? null : n;
}
function parseRankNum(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  const s = String(v).replace(/[,~\s]/g, "").trim();
  const n = Number(s);
  return isNaN(n) ? 0 : n;
}
function parseCEFR(v: unknown): string {
  const s = String(v ?? "").trim().toUpperCase();
  return ["A1", "A2", "B1", "B2", "C1", "C2"].includes(s) ? s : "";
}

const CEFR_FIELDS = new Set(["cefrA1Grammar","cefrA2Grammar","efSetListening","efSetSpeaking","efSetReading","efSetWriting"]);
const STRING_FIELDS = new Set(["name","registrationNumber","department","year","phone","email","college","stream","leetcodeUrl","githubUrl"]);

function castValue(key: string, raw: unknown): unknown {
  if (CEFR_FIELDS.has(key)) return parseCEFR(raw);
  if (key === "pgPercentage") return parseNullableNum(raw);
  if (key === "leetcodeRank") return parseRankNum(raw);
  if (key === "stream") {
    const s = String(raw ?? "").trim().toLowerCase();
    return s === "arts" || s === "art" ? "arts" : s === "engineering" || s === "engg" || s === "eng" ? "engineering" : "";
  }
  if (STRING_FIELDS.has(key)) return String(raw ?? "").trim();
  return parseNum(raw);
}

function blankStudent(): Record<string, unknown> {
  return {
    name: "", registrationNumber: "", department: "", year: "",
    phone: "", email: "", college: "", stream: "", leetcodeUrl: "", githubUrl: "",
    xMarks: 0, xiiMarks: 0, ugPercentage: 0, pgPercentage: null,
    noOfArrears: 0, historyOfArrears: 0,
    quants: 0, logical: 0, verbal: 0,
    cefrA1Grammar: "", cefrA2Grammar: "",
    efSetListening: "", efSetSpeaking: "", efSetReading: "", efSetWriting: "",
    leetcodeRank: 0,
    fopAssessment: 0, dsaAssessment: 0,
    internalCodeathon: 0, externalCodeathon: 0,
    githubProjects: 0, fullLengthProjects: 0,
    globalCertification: 0, otherCertifications: 0,
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

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

    const mappingRaw = formData.get("mapping");
    const clientMapping: Record<number, string> = mappingRaw ? JSON.parse(String(mappingRaw)) : {};

    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });
    const sheetName = wb.SheetNames.includes("HIRE_Score") ? "HIRE_Score" : wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    if (!ws) return NextResponse.json({ error: "No sheets found in the uploaded file" }, { status: 400 });

    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null }) as unknown[][];

    const isHeaderRow = (row: unknown[]) => {
      const nonEmpty = row.filter(c => c !== null && c !== "");
      if (nonEmpty.length === 0) return false;
      const stringCells = nonEmpty.filter(c => typeof c === "string" && isNaN(Number(c)));
      return stringCells.length / nonEmpty.length >= 0.5;
    };
    const headerRowIdx = (rows[1] && isHeaderRow(rows[1])) ? 1 : 0;
    const dataStartIdx = headerRowIdx + 1;

    const defaultMapping: Record<number, string> = {
      0: "name", 1: "registrationNumber", 2: "department", 3: "year",
      4: "xMarks", 5: "xiiMarks", 6: "ugPercentage", 7: "pgPercentage",
      8: "noOfArrears", 9: "historyOfArrears",
      13: "cefrA1Grammar", 14: "cefrA2Grammar",
      15: "efSetListening", 16: "efSetSpeaking", 17: "efSetReading", 18: "efSetWriting",
      19: "leetcodeRank", 20: "fopAssessment", 21: "dsaAssessment",
      22: "internalCodeathon", 23: "externalCodeathon",
      24: "githubProjects", 25: "fullLengthProjects",
      26: "globalCertification", 27: "otherCertifications",
    };

    const effectiveMapping = Object.keys(clientMapping).length > 0 ? clientMapping : defaultMapping;
    const records: StudentData[] = [];

    for (let i = dataStartIdx; i < rows.length; i++) {
      const row = rows[i] as unknown[];
      if (!row || row.every(c => c === null || c === "")) continue;

      const student = blankStudent();
      for (const [colIdxStr, fieldKey] of Object.entries(effectiveMapping)) {
        if (fieldKey === "skip" || !PRIMARY_KEYS.has(fieldKey)) continue;
        const colIdx = Number(colIdxStr);
        if (colIdx < row.length) student[fieldKey] = castValue(fieldKey, row[colIdx]);
      }
      if (!student.name && !student.registrationNumber) continue;
      records.push(student as unknown as StudentData);
    }

    // Both bulkUpsert and upsertCollegesFromImport are now async
    const saved = await bulkUpsert(records as (StudentData & { college?: string })[]);

    await upsertCollegesFromImport(records.map(r => {
      const rec = r as unknown as Record<string, unknown>;
      return {
        college:    rec.college    as string | undefined,
        stream:     rec.stream     as string | undefined,
        department: r.department,
        year:       r.year,
      };
    }));

    return NextResponse.json({ imported: saved.length });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

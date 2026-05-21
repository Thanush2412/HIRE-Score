import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getAllStudents, bulkUpsert } from "@/lib/db";
import { StudentData } from "@/lib/types";

function parseNum(v: unknown): number {
  const n = Number(v); return isNaN(n) ? 0 : n;
}

function parseRankNum(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  const s = String(v).replace(/[,~\s]/g, "").trim();
  const n = Number(s);
  return isNaN(n) ? 0 : n;
}

const SECONDARY_KEYS = new Set([
  "quants", "logical", "verbal",
  "leetcodeRank", "fopAssessment", "dsaAssessment",
  "internalCodeathon", "externalCodeathon", "githubProjects",
  "fullLengthProjects", "globalCertification", "otherCertifications",
]);

const DEFAULT_SECONDARY_MAP: Record<number, string> = {
  1:  "registrationNumber",
  10: "quants",
  11: "logical",
  12: "verbal",
  19: "leetcodeRank",
  20: "fopAssessment",
  21: "dsaAssessment",
  22: "internalCodeathon",
  23: "externalCodeathon",
  24: "githubProjects",
  25: "fullLengthProjects",
  26: "globalCertification",
  27: "otherCertifications",
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

    const mappingRaw = formData.get("mapping");
    const clientMapping: Record<number, string> = mappingRaw ? JSON.parse(String(mappingRaw)) : {};
    const effectiveMapping = Object.keys(clientMapping).length > 0 ? clientMapping : DEFAULT_SECONDARY_MAP;

    const regNoCol = Number(
      Object.entries(effectiveMapping).find(([, v]) => v === "registrationNumber")?.[0] ?? 1
    );

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

    const secMap = new Map<string, Record<string, unknown>>();

    for (let i = dataStartIdx; i < rows.length; i++) {
      const row = rows[i] as unknown[];
      if (!row || row.every(c => c === null || c === "")) continue;

      const regNo = String(row[regNoCol] ?? "").trim();
      if (!regNo) continue;

      const patch: Record<string, unknown> = {};
      for (const [colStr, fieldKey] of Object.entries(effectiveMapping)) {
        if (fieldKey === "registrationNumber" || fieldKey === "name" || fieldKey === "skip") continue;
        if (!SECONDARY_KEYS.has(fieldKey)) continue;
        const col = Number(colStr);
        if (col >= row.length) continue;
        patch[fieldKey] = fieldKey === "leetcodeRank"
          ? parseRankNum(row[col])
          : parseNum(row[col]);
      }
      if (Object.keys(patch).length > 0) secMap.set(regNo, patch);
    }

    // getAllStudents is now async
    const existing = await getAllStudents();
    const existingMap = new Map(existing.map(s => [s.registrationNumber.trim().toLowerCase(), s]));

    const toSave: (StudentData & { college?: string })[] = [];
    const matched: string[] = [];
    const unmatched: string[] = [];

    for (const [regNo, patch] of secMap.entries()) {
      const student = existingMap.get(regNo.toLowerCase());
      if (student) {
        toSave.push({ ...student, ...patch } as StudentData & { college?: string });
        matched.push(regNo);
      } else {
        unmatched.push(regNo);
      }
    }

    const saved = toSave.length > 0 ? await bulkUpsert(toSave) : [];

    return NextResponse.json({
      updated: saved.length,
      matched: matched.length,
      unmatched: unmatched.length,
      unmatchedRegNos: unmatched.slice(0, 20),
      totalInFile: secMap.size,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

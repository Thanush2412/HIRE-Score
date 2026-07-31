import * as XLSX from "xlsx";
import { FpcNqtAssessment, FpcNqtSummary, FpcNqtStudentResult } from "./nqt-types";

function parseNum(val: unknown): number {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") {
    if (val > 0 && val <= 1) {
      return Math.round(val * 10000) / 100;
    }
    return Math.round(val * 100) / 100;
  }
  const cleaned = String(val).replace(/[%,\s]/g, "").trim();
  const n = Number(cleaned);
  if (isNaN(n)) return 0;
  if (n > 0 && n <= 1 && String(val).includes("%")) {
    return Math.round(n * 10000) / 100;
  }
  return Math.round(n * 100) / 100;
}

export function parseFpcNqtExcel(buffer: ArrayBuffer, filename: string = "FPC NQT Assessment"): FpcNqtAssessment[] {
  const wb = XLSX.read(buffer, { type: "array" });
  
  // Prefer "Report" or "Summary" sheet if available, else first sheet
  let sheetName = wb.SheetNames.find(n => n.toLowerCase() === "report") || 
                    wb.SheetNames.find(n => n.toLowerCase() === "summary") || 
                    wb.SheetNames[0];

  if (!sheetName) throw new Error("No sheet found in workbook");

  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null }) as unknown[][];

  if (rows.length === 0) return [];

  // Check if this is a Multi-level FACE NQT Detailed Report (e.g. contains "FINISHED" status or sub-headers in row 2)
  const isMultiLevelReport = rows.some((r, i) => i < 10 && r && (
    String(r[2] || "").toUpperCase() === "FINISHED" || 
    r.some(c => String(c || "").toLowerCase().includes("proctoring") || String(c || "").toLowerCase().includes("tab switch"))
  ));

  if (isMultiLevelReport) {
    return parseMultiLevelFaceNqtReport(rows, filename);
  }

  // Otherwise, handle as Standard Module Average Summary table
  let headerRowIdx = -1;
  for (let r = 0; r < Math.min(10, rows.length); r++) {
    const rowStr = (rows[r] || []).map(cell => String(cell || "").toLowerCase()).join(" ");
    if (rowStr.includes("assessment") || rowStr.includes("numerical") || rowStr.includes("overall")) {
      headerRowIdx = r;
      break;
    }
  }

  if (headerRowIdx === -1) headerRowIdx = 0;

  const headers = (rows[headerRowIdx] || []).map(cell => String(cell || "").trim());

  const findCol = (keywords: string[], excludeKeywords: string[] = []): number => {
    return headers.findIndex(h => {
      const lower = h.toLowerCase();
      if (excludeKeywords.some(ex => lower.includes(ex.toLowerCase()))) {
        return false;
      }
      return keywords.some(k => lower.includes(k.toLowerCase()));
    });
  };

  const colAdvQuant = findCol([
    "advanced quantitative and reasoning ability",
    "advanced quantitative",
    "advanced quant & reasoning",
    "advanced quant",
    "adv quant"
  ]);
  const colReasoning = findCol(
    ["reasoning ability", "logical ability", "reasoning"],
    ["advanced", "adv"]
  );
  const colName = findCol(["fpc nqt assessment", "nqt assessment", "assessment name", "assessment"]);
  const colConducted = findCol(["no.of. assessment conducted", "no. of assessment conducted", "no. of assessment", "assessment conducted", "conducted", "count"]);
  const colNum = findCol(["numerical ability", "numerical"]);
  const colVerbal = findCol(["verbal ability", "verbal"]);
  const colCoding = findCol(["coding"]);
  const colOverall = findCol(["overall"]);

  const results: FpcNqtAssessment[] = [];
  const now = new Date().toISOString();

  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.every(cell => cell === null || cell === undefined || String(cell).trim() === "")) {
      continue;
    }

    const nameVal = colName !== -1 ? String(row[colName] ?? "").trim() : `Assessment ${r - headerRowIdx}`;
    if (!nameVal) continue;

    const conducted = colConducted !== -1 ? parseNum(row[colConducted]) || 1 : 1;
    const num = colNum !== -1 ? parseNum(row[colNum]) : 0;
    const verbal = colVerbal !== -1 ? parseNum(row[colVerbal]) : 0;
    const reasoning = colReasoning !== -1 ? parseNum(row[colReasoning]) : 0;
    const advQuant = colAdvQuant !== -1 ? parseNum(row[colAdvQuant]) : 0;
    const coding = colCoding !== -1 ? parseNum(row[colCoding]) : 0;
    const aptitudeAvg = Math.round(((num + verbal + reasoning + advQuant) / 4) * 100) / 100;

    let overall = colOverall !== -1 ? parseNum(row[colOverall]) : 0;
    if (overall === 0 && (num > 0 || verbal > 0 || reasoning > 0 || advQuant > 0 || coding > 0)) {
      const scores = [num, verbal, reasoning, advQuant, coding].filter(s => s > 0);
      overall = scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100 : 0;
    }

    results.push({
      id: `nqt-${Date.now()}-${r}`,
      assessmentName: nameVal,
      assessmentsConducted: conducted,
      numericalAbilityAvg: num,
      verbalAbilityAvg: verbal,
      reasoningAbilityAvg: reasoning,
      aptitudeAvg,
      advancedQuantReasoningAvg: advQuant,
      codingAvg: coding,
      overallAvg: overall,
      uploadedAt: now,
    });
  }

  return results;
}

function parseMultiLevelFaceNqtReport(rows: unknown[][], filename: string): FpcNqtAssessment[] {
  const colCount = Math.max(...rows.slice(0, 3).map(r => (r ? r.length : 0)));
  const compositeHeaders: { section: string; r2: string; full: string }[] = [];

  let currentSection = "";
  for (let c = 0; c < colCount; c++) {
    const r0 = String(rows[0]?.[c] || "").trim();
    const r1 = String(rows[1]?.[c] || "").trim();
    const r2 = String(rows[2]?.[c] || "").trim();

    if (r1 && (r1.toLowerCase().includes("ability") || r1.toLowerCase().includes("coding") || r1.toLowerCase().includes("quantitative"))) {
      currentSection = r1;
    } else if (r0 && (r0.toLowerCase().includes("ability") || r0.toLowerCase().includes("coding") || r0.toLowerCase().includes("score"))) {
      currentSection = r0;
    }

    compositeHeaders[c] = {
      section: currentSection,
      r2,
      full: `${r0} ${r1} ${r2} ${currentSection}`.toLowerCase(),
    };
  }

  let colName = -1, colEmail = -1, colRegNo = -1;
  let colNumPct = -1, colVerbalPct = -1, colReasoningPct = -1, colAdvQuantPct = -1, colCodingPct = -1, colOverallPct = -1;

  for (let c = 0; c < colCount; c++) {
    const h = compositeHeaders[c];
    const sec = h.section.toLowerCase();
    const sub = h.r2.toLowerCase();

    if (colName === -1 && (h.full.includes("name") && !h.full.includes("candidate"))) colName = c;
    if (colName === -1 && h.full.includes("name")) colName = c;
    if (colEmail === -1 && (h.full.includes("email") || h.full.includes("candidate details") || h.full.includes("mail"))) colEmail = c;
    if (colRegNo === -1 && (h.full.includes("reg") || h.full.includes("roll") || h.full.includes("usn"))) colRegNo = c;

    if (sec.includes("numerical") && (sub.includes("percentage") || sub.includes("score") || sub.includes("%"))) {
      if (sub.includes("percentage") || colNumPct === -1) colNumPct = c;
    }
    if (sec.includes("verbal") && (sub.includes("percentage") || sub.includes("score") || sub.includes("%"))) {
      if (sub.includes("percentage") || colVerbalPct === -1) colVerbalPct = c;
    }
    if (sec.includes("reasoning") && !sec.includes("advanced") && (sub.includes("percentage") || sub.includes("score") || sub.includes("%"))) {
      if (sub.includes("percentage") || colReasoningPct === -1) colReasoningPct = c;
    }
    if ((sec.includes("advanced quantitative") || sec.includes("advanced quant")) && (sub.includes("percentage") || sub.includes("score") || sub.includes("%"))) {
      if (sub.includes("percentage") || colAdvQuantPct === -1) colAdvQuantPct = c;
    }
    if (sec.includes("coding") && (sub.includes("percentage") || sub.includes("score") || sub.includes("%"))) {
      if (sub.includes("percentage") || colCodingPct === -1) colCodingPct = c;
    }
    if (h.full.includes("total percentage") || h.full.includes("overall percentage")) {
      colOverallPct = c;
    }
  }

  if (colName === -1) colName = 0;
  if (colEmail === -1) colEmail = 1;
  if (colNumPct === -1) colNumPct = 11;
  if (colVerbalPct === -1) colVerbalPct = 14;
  if (colReasoningPct === -1) colReasoningPct = 17;
  if (colAdvQuantPct === -1) colAdvQuantPct = 20;
  if (colCodingPct === -1) colCodingPct = 23;
  if (colOverallPct === -1) colOverallPct = 26;

  let dataStart = 3;
  for (let r = 0; r < Math.min(10, rows.length); r++) {
    const row = rows[r];
    if (row && String(row[2] || "").toUpperCase() === "FINISHED") {
      dataStart = r;
      break;
    }
  }

  const studentRows: FpcNqtStudentResult[] = [];

  for (let r = dataStart; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.every(c => c === null || c === undefined || String(c).trim() === "")) continue;

    const name = String(row[colName] || "").trim();
    if (!name || name.toLowerCase().includes("name") || name.toLowerCase().includes("total")) continue;

    const email = colEmail !== -1 ? String(row[colEmail] || "").trim() : "";
    const regNo = colRegNo !== -1 ? String(row[colRegNo] || "").trim() : "";

    const numerical = parseNum(row[colNumPct]);
    const verbal = parseNum(row[colVerbalPct]);
    const reasoning = parseNum(row[colReasoningPct]);
    const advQuant = parseNum(row[colAdvQuantPct]);
    const coding = parseNum(row[colCodingPct]);
    let overall = parseNum(row[colOverallPct]);

    if (overall === 0) {
      const valid = [numerical, verbal, reasoning, advQuant, coding].filter(v => v > 0);
      overall = valid.length > 0 ? Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 100) / 100 : 0;
    }

    const aptitude = Math.round(((numerical + verbal + reasoning + advQuant) / 4) * 100) / 100;

    studentRows.push({
      registrationNumber: regNo,
      name,
      email,
      numerical,
      verbal,
      reasoning,
      aptitude,
      advQuant,
      coding,
      overall
    });
  }

  const count = studentRows.length;
  if (count === 0) return [];

  const calcAvg = (fn: (r: FpcNqtStudentResult) => number) => {
    const sum = studentRows.reduce((a, b) => a + fn(b), 0);
    return Math.round((sum / count) * 100) / 100;
  };

  const cleanName = filename.replace(/\.xlsx$/i, '').trim() || "FACE NQT Report";
  const numAvg = calcAvg(r => r.numerical);
  const verbalAvg = calcAvg(r => r.verbal);
  const reasoningAvg = calcAvg(r => r.reasoning);
  const advQuantAvg = calcAvg(r => r.advQuant);
  const aptitudeAvg = Math.round(((numAvg + verbalAvg + reasoningAvg + advQuantAvg) / 4) * 100) / 100;

  return [{
    id: `nqt-${Date.now()}-face`,
    assessmentName: cleanName,
    assessmentsConducted: count,
    numericalAbilityAvg: numAvg,
    verbalAbilityAvg: verbalAvg,
    reasoningAbilityAvg: reasoningAvg,
    aptitudeAvg,
    advancedQuantReasoningAvg: advQuantAvg,
    codingAvg: calcAvg(r => r.coding),
    overallAvg: calcAvg(r => r.overall),
    uploadedAt: new Date().toISOString(),
    students: studentRows,
  }];
}

export function computeFpcNqtSummary(records: FpcNqtAssessment[]): FpcNqtSummary {
  if (records.length === 0) {
    return {
      totalAssessments: 0,
      totalConducted: 0,
      overallAvgPercentage: 0,
      numericalAbilityAvg: 0,
      verbalAbilityAvg: 0,
      reasoningAbilityAvg: 0,
      aptitudeAvg: 0,
      advancedQuantReasoningAvg: 0,
      codingAvg: 0,
      topModule: { name: "N/A", score: 0 },
    };
  }

  const totalAssessments = records.length;
  const totalConducted = records.reduce((sum, r) => sum + (r.assessmentsConducted || 0), 0);

  const avg = (fn: (r: FpcNqtAssessment) => number) => {
    const vals = records.map(fn);
    const sum = vals.reduce((a, b) => a + b, 0);
    return Math.round((sum / records.length) * 100) / 100;
  };

  const numAvg = avg(r => r.numericalAbilityAvg);
  const verbalAvg = avg(r => r.verbalAbilityAvg);
  const reasoningAvg = avg(r => r.reasoningAbilityAvg);
  const advQuantAvg = avg(r => r.advancedQuantReasoningAvg);
  const aptitudeAvg = avg(r => r.aptitudeAvg || Math.round(((r.numericalAbilityAvg + r.verbalAbilityAvg + r.reasoningAbilityAvg + r.advancedQuantReasoningAvg) / 4) * 100) / 100);
  const codingAvg = avg(r => r.codingAvg);
  const overallAvg = avg(r => r.overallAvg);

  const modules = [
    { name: "Aptitude (Numerical, Verbal, Reasoning, Adv Quant)", score: aptitudeAvg },
    { name: "Coding", score: codingAvg },
  ];

  modules.sort((a, b) => b.score - a.score);

  return {
    totalAssessments,
    totalConducted,
    overallAvgPercentage: overallAvg,
    numericalAbilityAvg: numAvg,
    verbalAbilityAvg: verbalAvg,
    reasoningAbilityAvg: reasoningAvg,
    aptitudeAvg,
    advancedQuantReasoningAvg: advQuantAvg,
    codingAvg,
    topModule: modules[0] || { name: "N/A", score: 0 },
  };
}

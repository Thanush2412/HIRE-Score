import * as XLSX from "xlsx";

/**
 * Clean and normalize registration numbers from Excel.
 * Handles numbers, floating point representation (e.g. 211320104001.0),
 * scientific notation (e.g. 2.113201e+11), and extra whitespace.
 */
export function cleanRegNo(val: unknown): string {
  if (val === null || val === undefined) return "";
  
  if (typeof val === "number") {
    // If it's an integer stored as a float or exponential, format without scientific notation
    if (!isNaN(val)) {
      return BigInt(Math.round(val)).toString();
    }
  }

  let s = String(val).trim();
  if (!s) return "";

  // Handle scientific notation string like "2.11320104e+11"
  if (/^\d+(\.\d+)?e\+\d+$/i.test(s)) {
    const num = Number(s);
    if (!isNaN(num)) return BigInt(Math.round(num)).toString();
  }

  // Remove trailing decimal ".0" if present
  if (/^\d+\.0+$/.test(s)) {
    s = s.replace(/\.0+$/, "");
  }

  return s;
}

/**
 * Find the best sheet in a workbook.
 * Prioritizes sheets containing target keywords or having the most populated data.
 */
export function findBestSheet(wb: XLSX.WorkBook, preferredName: string = "HIRE_Score"): { sheetName: string; ws: XLSX.WorkSheet } {
  if (!wb.SheetNames || wb.SheetNames.length === 0) {
    throw new Error("No sheet found in workbook");
  }

  // 1. Check preferred sheet name
  const exactMatch = wb.SheetNames.find(n => n.toLowerCase() === preferredName.toLowerCase());
  if (exactMatch && wb.Sheets[exactMatch]) {
    return { sheetName: exactMatch, ws: wb.Sheets[exactMatch] };
  }

  // 2. Search for sheets matching keywords
  const keywordMatch = wb.SheetNames.find(n => {
    const l = n.toLowerCase();
    return l.includes("score") || l.includes("student") || l.includes("data") || l.includes("primary") || l.includes("secondary");
  });
  if (keywordMatch && wb.Sheets[keywordMatch]) {
    return { sheetName: keywordMatch, ws: wb.Sheets[keywordMatch] };
  }

  // 3. Fallback: Find sheet with highest row count
  let bestSheet = wb.SheetNames[0];
  let maxRows = -1;

  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name];
    if (!sheet) continue;
    const ref = sheet["!ref"];
    if (ref) {
      const range = XLSX.utils.decode_range(ref);
      const rowCount = range.e.r - range.s.r + 1;
      if (rowCount > maxRows) {
        maxRows = rowCount;
        bestSheet = name;
      }
    }
  }

  return { sheetName: bestSheet, ws: wb.Sheets[bestSheet] };
}

/**
 * Automatically locate the header row within the top 15 rows of a spreadsheet.
 */
export function findHeaderRow(rows: unknown[][], primaryKeywords: string[] = ["reg", "registration", "roll", "name", "dept", "department", "quant", "score"]): { headerRowIdx: number; headers: string[] } {
  if (rows.length === 0) return { headerRowIdx: 0, headers: [] };

  let bestIdx = 0;
  let maxMatches = -1;

  const searchLimit = Math.min(15, rows.length);

  for (let r = 0; r < searchLimit; r++) {
    const row = rows[r];
    if (!row || !Array.isArray(row)) continue;

    const rowStrings = row.map(c => String(c || "").trim().toLowerCase());
    let matchCount = 0;

    for (const cellStr of rowStrings) {
      if (!cellStr) continue;
      if (primaryKeywords.some(k => cellStr.includes(k.toLowerCase()))) {
        matchCount++;
      }
    }

    if (matchCount > maxMatches && matchCount > 0) {
      maxMatches = matchCount;
      bestIdx = r;
    }
  }

  // Fallback heuristic if no keyword matches: row with highest ratio of non-numeric text cells
  if (maxMatches <= 0) {
    for (let r = 0; r < Math.min(5, rows.length); r++) {
      const row = rows[r];
      if (!row) continue;
      const nonEmpty = row.filter(c => c !== null && c !== undefined && String(c).trim() !== "");
      if (nonEmpty.length === 0) continue;
      const textCells = nonEmpty.filter(c => typeof c === "string" && isNaN(Number(c)));
      if (textCells.length / nonEmpty.length >= 0.5) {
        bestIdx = r;
        break;
      }
    }
  }

  const headerRow = rows[bestIdx] || [];
  const headers = headerRow.map((c, i) => {
    const str = c !== null && c !== undefined ? String(c).trim() : "";
    return str || `Col ${i + 1}`;
  });

  return { headerRowIdx: bestIdx, headers };
}

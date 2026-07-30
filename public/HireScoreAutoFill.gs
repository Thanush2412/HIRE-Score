/**
 * ==============================================================================
 * HIRE SCORE GOOGLE APPS SCRIPT (FINAL PRODUCTION CODE.GS)
 * API Endpoint: https://hire-score-fawn.vercel.app/api/scores/{regNo}
 * 
 * Target Sheets (12 Placement Eligibility Sheets):
 * - SDNB, AU, KC, AMET, Takshashila, SACAS, BCAS, NAAS, STC, S-Vyasa, TERF, TJS
 * 
 * Column Headers Detected from Spreadsheet:
 * - Reg. Number: "Register", "Register Number", "Registration Number", "Reg No"
 * - FOP: "FOP"
 * - DSA: "DSA"
 * - Aptitude: "Aptitude" (Combines Quants + Logical + Verbal)
 * - Verbal: "Verbal Ability" / "Verbal"
 * - Logical: "Reasoning Ability" / "Logical"
 * - Quants: "Numerical Ability" / "Advanced Quantitative" / "Quants"
 * ==============================================================================
 */

const TARGET_SHEETS = [
  "SDNB PLACEMENT ELIGIBILITY STUDENTS DATA",
  "AU PLACEMENT ELIGIBILITY STUDENTS DATA",
  "KC PLACEMENT ELIGIBILITY STUDENTS DATA",
  "AMET PLACEMENT ELIGIBILITY STUDENTS DATA",
  "Takshashila PLACEMENT ELIGIBILITY STUDENTS DATA",
  "SACAS PLACEMENT ELIGIBILITY STUDENTS DATA",
  "BCAS PLACEMENT ELIGIBILITY STUDENTS DATA",
  "NAAS PLACEMENT ELIGIBILITY STUDENTS DATA",
  "STC PLACEMENT ELIGIBILITY STUDENTS DATA",
  "S-Vyasa PLACEMENT ELIGIBILITY STUDENTS DATA",
  "TERF PLACEMENT ELIGIBILITY STUDENTS DATA",
  "TJS PLACEMENT ELIGIBILITY STUDENTS DATA"
];

// Custom toolbar menu
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("🚀 HIRE Score Tools")
    .addItem("⚡ Auto-Fill All Placement Sheets", "autoFillAllPlacementSheets")
    .addItem("⚡ Auto-Fill Current Sheet Only", "autoFillCurrentSheet")
    .addSeparator()
    .addItem("🔍 Inspect Sheet Headers & Mappings", "inspectHeaders")
    .addToUi();
}

/**
 * Auto-fills FOP, DSA, Aptitude across ALL 12 Placement Eligibility sheets.
 */
function autoFillAllPlacementSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  let totalProcessed = 0;
  let sheetsCount = 0;

  for (let i = 0; i < sheets.length; i++) {
    const sheet = sheets[i];
    const sName = sheet.getName().trim().toUpperCase();

    const isTarget = TARGET_SHEETS.some(t => sName === t.toUpperCase() || sName.includes("PLACEMENT ELIGIBILITY"));

    if (isTarget) {
      const count = processPlacementSheet(sheet);
      totalProcessed += count;
      sheetsCount++;
    }
  }

  SpreadsheetApp.getUi().alert(
    "🎉 AUTO-FILL COMPLETE!\n\n" +
    "• Placement Sheets Processed: " + sheetsCount + "\n" +
    "• Total Student Records Populated: " + totalProcessed
  );
}

/**
 * Auto-fills FOP, DSA, Aptitude on Current Active Sheet only.
 */
function autoFillCurrentSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const count = processPlacementSheet(sheet);
  SpreadsheetApp.getUi().alert("🎉 Updated " + count + " student records in sheet: " + sheet.getName());
}

/**
 * Core processor for a single sheet
 */
function processPlacementSheet(sheet) {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow <= 7 || lastCol === 0) return 0; // Data starts on Line 8

  // 1. Locate Registration Number column across Rows 1-7
  const regInfo = findRegNoColumn(sheet, 7, lastCol);
  if (regInfo.colIdx === -1) return 0;
  const regColIdx = regInfo.colIdx;

  // 2. Read Line 7 Headers for score columns
  const row7 = sheet.getRange(7, 1, 1, lastCol).getValues()[0].map(String);
  const colFop = findColumnIndex(row7, ["fop"]);
  const colDsa = findColumnIndex(row7, ["dsa"]);
  const colApt = findColumnIndex(row7, ["aptitude", "apt"]);
  const colQuants = findColumnIndex(row7, ["numerical ability", "advanced quantitative", "quant", "quants"]);
  const colLogical = findColumnIndex(row7, ["reasoning ability", "logical", "reasoning"]);
  const colVerbal = findColumnIndex(row7, ["verbal ability", "verbal"]);

  const startRow = 8; // Data starts on Line 8
  const numRows = lastRow - 7;
  if (numRows <= 0) return 0;

  // 3. Read Registration Numbers from Line 8 downwards in batch
  const regValues = sheet.getRange(startRow, regColIdx + 1, numRows, 1).getValues();

  // Buffers for batch writing
  const fopValues = colFop !== -1 ? new Array(numRows).fill([""]) : null;
  const dsaValues = colDsa !== -1 ? new Array(numRows).fill([""]) : null;
  const aptValues = colApt !== -1 ? new Array(numRows).fill([""]) : null;
  const quantsValues = colQuants !== -1 ? new Array(numRows).fill([""]) : null;
  const logicalValues = colLogical !== -1 ? new Array(numRows).fill([""]) : null;
  const verbalValues = colVerbal !== -1 ? new Array(numRows).fill([""]) : null;

  const baseUrl = "https://hire-score-fawn.vercel.app/api/scores/";
  let count = 0;

  for (let i = 0; i < numRows; i++) {
    const rawReg = String(regValues[i][0] || "").trim();
    if (!rawReg) continue;

    try {
      const response = UrlFetchApp.fetch(baseUrl + encodeURIComponent(rawReg), { muteHttpExceptions: true });
      if (response.getResponseCode() === 200) {
        const data = JSON.parse(response.getContentText());
        const scores = data.scores || {};
        const percentages = data.percentages || {};
        const computed = data.computedScores || {};

        // FOP out of 75 / DSA out of 100
        const fop = scores.fopAssessment ?? 0;
        const dsa = scores.dsaAssessment ?? 0;
        const quants = Number(scores.quants ?? 0);
        const logical = Number(scores.logical ?? 0);
        const verbal = Number(scores.verbal ?? 0);

        // Percentage equivalents
        const fopPct = percentages.fopAssessment ?? 0;
        const dsaPct = percentages.dsaAssessment ?? 0;
        const quantsPct = percentages.quants ?? 0;
        const logicalPct = percentages.logical ?? 0;
        const verbalPct = percentages.verbal ?? 0;

        // Combined Aptitude total = Quants + Logical + Verbal (out of 150)
        const aptitude = (computed.aptitudeTotal && computed.aptitudeTotal > 0) ? computed.aptitudeTotal : (quants + logical + verbal);

        if (fopValues) fopValues[i] = [fop];
        if (dsaValues) dsaValues[i] = [dsa];
        if (aptValues) aptValues[i] = [aptitude];
        if (quantsValues) quantsValues[i] = [quants];
        if (logicalValues) logicalValues[i] = [logical];
        if (verbalValues) verbalValues[i] = [verbal];

        count++;
      }
    } catch (e) {
      Logger.log("Fetch error for " + rawReg + ": " + e.message);
    }
  }

  // 4. Batch write updated values back to Google Sheet
  if (fopValues) sheet.getRange(startRow, colFop + 1, numRows, 1).setValues(fopValues);
  if (dsaValues) sheet.getRange(startRow, colDsa + 1, numRows, 1).setValues(dsaValues);
  if (aptValues) sheet.getRange(startRow, colApt + 1, numRows, 1).setValues(aptValues);
  if (quantsValues) sheet.getRange(startRow, colQuants + 1, numRows, 1).setValues(quantsValues);
  if (logicalValues) sheet.getRange(startRow, colLogical + 1, numRows, 1).setValues(logicalValues);
  if (verbalValues) sheet.getRange(startRow, colVerbal + 1, numRows, 1).setValues(verbalValues);

  return count;
}

/**
 * Inspect Headers helper
 */
function inspectHeaders() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastCol = sheet.getLastColumn();
  const ui = SpreadsheetApp.getUi();

  if (sheet.getLastRow() < 7 || lastCol === 0) {
    ui.alert("Sheet '" + sheet.getName() + "' has no data on Row 7.");
    return;
  }

  const regInfo = findRegNoColumn(sheet, 7, lastCol);
  const row7 = sheet.getRange(7, 1, 1, lastCol).getValues()[0].map(String);
  const colFop = findColumnIndex(row7, ["fop"]);
  const colDsa = findColumnIndex(row7, ["dsa"]);
  const colApt = findColumnIndex(row7, ["aptitude", "apt"]);
  const colQuants = findColumnIndex(row7, ["numerical ability", "advanced quantitative", "quant", "quants"]);
  const colLogical = findColumnIndex(row7, ["reasoning ability", "logical", "reasoning"]);
  const colVerbal = findColumnIndex(row7, ["verbal ability", "verbal"]);

  let msg = "🔍 HEADER ANALYSIS FOR '" + sheet.getName() + "':\n\n";
  msg += (regInfo.colIdx !== -1)
    ? "✅ Reg. Number Column: Col " + colLetter(regInfo.colIdx) + " (Row " + regInfo.rowIdx + ": '" + regInfo.headerName + "')\n"
    : "❌ Reg. Number Column: NOT FOUND across Rows 1-7\n";

  msg += "• FOP Column: " + (colFop !== -1 ? "Col " + colLetter(colFop) + " (" + row7[colFop] + ")" : "❌ Not Found") + "\n";
  msg += "• DSA Column: " + (colDsa !== -1 ? "Col " + colLetter(colDsa) + " (" + row7[colDsa] + ")" : "❌ Not Found") + "\n";
  msg += "• Aptitude Column (Combined): " + (colApt !== -1 ? "Col " + colLetter(colApt) + " (" + row7[colApt] + ")" : "❌ Not Found") + "\n";
  msg += "• Verbal Column: " + (colVerbal !== -1 ? "Col " + colLetter(colVerbal) + " (" + row7[colVerbal] + ")" : "❌ Not Found") + "\n";
  msg += "• Logical Column: " + (colLogical !== -1 ? "Col " + colLetter(colLogical) + " (" + row7[colLogical] + ")" : "❌ Not Found") + "\n";
  msg += "• Quants Column: " + (colQuants !== -1 ? "Col " + colLetter(colQuants) + " (" + row7[colQuants] + ")" : "❌ Not Found") + "\n";

  ui.alert(msg);
}

// Scans Rows 1 to maxRow for Registration Number header
function findRegNoColumn(sheet, maxRow, lastCol) {
  const keywords = ["register", "registration", "reg", "roll", "student id", "reg.no", "reg. no", "urn"];
  for (let r = 1; r <= maxRow; r++) {
    const rowValues = sheet.getRange(r, 1, 1, lastCol).getValues()[0].map(String);
    for (let c = 0; c < rowValues.length; c++) {
      const text = rowValues[c].toLowerCase().trim();
      for (let k = 0; k < keywords.length; k++) {
        if (text.includes(keywords[k])) {
          return { colIdx: c, rowIdx: r, headerName: rowValues[c] };
        }
      }
    }
  }
  return { colIdx: -1, rowIdx: -1, headerName: "" };
}

function findColumnIndex(headers, keywords) {
  for (let i = 0; i < headers.length; i++) {
    const text = headers[i].toLowerCase().trim();
    for (let k = 0; k < keywords.length; k++) {
      if (text.includes(keywords[k])) return i;
    }
  }
  return -1;
}

function colLetter(i) {
  if (i < 26) return String.fromCharCode(65 + i);
  return String.fromCharCode(64 + Math.floor(i / 26)) + String.fromCharCode(65 + (i % 26));
}

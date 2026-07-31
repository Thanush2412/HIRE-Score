/**
 * ==============================================================================
 * HIRE SCORE GOOGLE APPS SCRIPT (FINAL PRODUCTION CODE.GS)
 * API Endpoint: https://hire-score-fawn.vercel.app/api/scores/{regNo}
 * 
 * Target Sheets (12 Placement Eligibility Sheets):
 * - SDNB, AU, KC, AMET, Takshashila, SACAS, BCAS, NAAS, STC, S-Vyasa, TERF, TJS
 * 
 * Column Headers & Insertion (Exact Column Y placement):
 * - TOTAL HIRE SCORE(OUT OF 1000): Created right after 'Average Percentage' / 'Aptitude'
 *   and right before 'No.Of. Assessment Conducted'.
 * - Real-Time Logs: Displays live Spreadsheet toasts & progress logs during execution.
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
 * Auto-fills Total Hire Score, FOP, DSA, Aptitude across ALL 12 Placement Eligibility sheets
 * with Real-Time Toast Logs.
 */
function autoFillAllPlacementSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  let totalProcessed = 0;
  let sheetsCount = 0;
  let summaryLog = [];

  ss.toast("🚀 Starting HIRE Score Auto-Fill across all sheets...", "HIRE Score Auto-Fill", 5);

  for (let i = 0; i < sheets.length; i++) {
    const sheet = sheets[i];
    const sName = sheet.getName().trim().toUpperCase();

    const isTarget = TARGET_SHEETS.some(t => sName === t.toUpperCase() || sName.includes("PLACEMENT ELIGIBILITY"));

    if (isTarget) {
      ss.toast("📄 Processing sheet (" + (sheetsCount + 1) + "): " + sheet.getName() + "...", "HIRE Score Auto-Fill", 5);
      const count = processPlacementSheet(sheet, ss);
      totalProcessed += count;
      sheetsCount++;
      summaryLog.push("• " + sheet.getName() + ": " + count + " records updated");
    }
  }

  ss.toast("🎉 Auto-Fill Complete! Processed " + totalProcessed + " students.", "HIRE Score Auto-Fill", 10);

  SpreadsheetApp.getUi().alert(
    "🎉 AUTO-FILL COMPLETE!\n\n" +
    "• Placement Sheets Processed: " + sheetsCount + "\n" +
    "• Total Student Records Updated: " + totalProcessed + "\n\n" +
    "Sheet Breakdown:\n" + summaryLog.join("\n")
  );
}

/**
 * Auto-fills Total Hire Score, FOP, DSA, Aptitude on Current Active Sheet only
 * with Real-Time Toast Logs.
 */
function autoFillCurrentSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  ss.toast("⚡ Processing current sheet: " + sheet.getName() + "...", "HIRE Score Auto-Fill", 5);
  const count = processPlacementSheet(sheet, ss);
  ss.toast("🎉 Updated " + count + " records in " + sheet.getName(), "HIRE Score Auto-Fill", 10);
  SpreadsheetApp.getUi().alert("🎉 Updated " + count + " student records in sheet: " + sheet.getName());
}

/**
 * Core processor for a single sheet with Real-Time Toast Logs & exact Column Y placement
 */
function processPlacementSheet(sheet, ss) {
  let lastRow = sheet.getLastRow();
  let lastCol = sheet.getLastColumn();
  if (lastRow <= 7 || lastCol === 0) return 0; // Data starts on Line 8

  // 1. Locate Registration Number column across Rows 1-7
  const regInfo = findRegNoColumn(sheet, 7, lastCol);
  if (regInfo.colIdx === -1) {
    Logger.log("Skipping '" + sheet.getName() + "': Reg. Number column not found.");
    return 0;
  }
  const regColIdx = regInfo.colIdx;

  // 2. Read Line 6 & Line 7 Headers for score columns (combining row 6 and row 7 text)
  const row6 = sheet.getRange(6, 1, 1, lastCol).getValues()[0].map(String);
  const row7 = sheet.getRange(7, 1, 1, lastCol).getValues()[0].map(String);
  const combinedHeaders = row7.map((h7, idx) => (row6[idx] ? (row6[idx] + " " + h7) : h7));

  let colHireScore = findColumnIndex(combinedHeaders, ["total hire score", "hire score", "hire_score"]);
  const colFop = findColumnIndex(combinedHeaders, ["fop"]);
  const colDsa = findColumnIndex(combinedHeaders, ["dsa"]);
  const colApt = findColumnIndex(combinedHeaders, ["aptitude", "apt"]);
  const colQuants = findColumnIndex(combinedHeaders, ["numerical ability", "advanced quantitative", "quant", "quants"]);
  const colLogical = findColumnIndex(combinedHeaders, ["reasoning ability", "logical", "reasoning"]);
  const colVerbal = findColumnIndex(combinedHeaders, ["verbal ability", "verbal"]);
  const colNoOfAssess = findColumnIndex(combinedHeaders, ["no.of. assessment", "no of assessment", "assessment conducted"]);

  // ── Exact Column Y Placement: Create TOTAL HIRE SCORE(OUT OF 1000) right before 'No.Of. Assessment' / after 'Average Percentage' ──
  if (colHireScore === -1) {
    let insertAfterIdx = -1;

    // Preference 1: Insert right before 'No.Of. Assessment Conducted'
    if (colNoOfAssess !== -1) {
      insertAfterIdx = colNoOfAssess - 1;
    } else {
      // Preference 2: Insert right after 'Average Percentage' or 'Aptitude'
      for (let c = 0; c < combinedHeaders.length; c++) {
        if (combinedHeaders[c].toLowerCase().includes("average percentage")) {
          insertAfterIdx = c;
        }
      }
      if (insertAfterIdx === -1) {
        insertAfterIdx = colApt !== -1 ? colApt : (colDsa !== -1 ? colDsa : (colFop !== -1 ? colFop : lastCol - 1));
      }
    }

    if (insertAfterIdx >= 0) {
      sheet.insertColumnAfter(insertAfterIdx + 1);
      colHireScore = insertAfterIdx + 1; // 0-based index of new Column Y
    } else {
      sheet.insertColumnAfter(lastCol);
      colHireScore = lastCol;
    }

    lastCol = sheet.getLastColumn();

    // Set Header values for Row 6 and Row 7
    sheet.getRange(6, colHireScore + 1).setValue("HIRE Assessment Score (Latest Month)");
    sheet.getRange(7, colHireScore + 1).setValue("TOTAL HIRE SCORE(OUT OF 1000)");

    // Apply header styling matching screenshot
    try {
      const sampleCol = (colApt !== -1 ? colApt : (colDsa !== -1 ? colDsa : (colFop !== -1 ? colFop : 0))) + 1;
      
      const targetHeaderRow7 = sheet.getRange(7, colHireScore + 1);
      const srcHeaderRow7 = sheet.getRange(7, sampleCol);
      targetHeaderRow7.setBackground(srcHeaderRow7.getBackground());
      targetHeaderRow7.setFontColor(srcHeaderRow7.getFontColor());
      targetHeaderRow7.setFontWeight("bold");
      targetHeaderRow7.setHorizontalAlignment("center");
      targetHeaderRow7.setVerticalAlignment("middle");
      targetHeaderRow7.setWrap(true);

      const targetHeaderRow6 = sheet.getRange(6, colHireScore + 1);
      const srcHeaderRow6 = sheet.getRange(6, sampleCol);
      targetHeaderRow6.setBackground(srcHeaderRow6.getBackground());
      targetHeaderRow6.setFontColor(srcHeaderRow6.getFontColor());
      targetHeaderRow6.setFontWeight("bold");
      targetHeaderRow6.setHorizontalAlignment("center");
      targetHeaderRow6.setVerticalAlignment("middle");
    } catch (err) {
      Logger.log("Styling copy warning: " + err.message);
    }
  }

  const startRow = 8; // Data starts on Line 8
  const numRows = lastRow - 7;
  if (numRows <= 0) return 0;

  // 3. Read Registration Numbers from Line 8 downwards in batch
  const regValues = sheet.getRange(startRow, regColIdx + 1, numRows, 1).getValues();

  // Buffers for batch writing
  const hireScoreValues = colHireScore !== -1 ? new Array(numRows).fill([""]) : null;
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

    // Real-Time Progress Toast every 15 rows
    if (ss && (i % 15 === 0 || i === numRows - 1)) {
      ss.toast("⚡ [" + sheet.getName() + "] Processing student " + (i + 1) + " of " + numRows + "...", "HIRE Score Auto-Fill", 3);
    }

    try {
      const response = UrlFetchApp.fetch(baseUrl + encodeURIComponent(rawReg), { muteHttpExceptions: true });
      if (response.getResponseCode() === 200) {
        const data = JSON.parse(response.getContentText());
        const percentages = data.percentages || {};

        // Total Hire Score (Out of 1000)
        const totalHireScore = data.hireScore ?? data.scores?.hireScore ?? data.computedScores?.hireScore ?? 0;

        // Direct percentages / scores from API
        const fop = percentages.fopAssessment ?? 0;
        const dsa = percentages.dsaAssessment ?? 0;
        const quants = percentages.quants ?? 0;
        const logical = percentages.logical ?? 0;
        const verbal = percentages.verbal ?? 0;
        const aptitude = percentages.aptitudeTotal ?? 0;

        if (hireScoreValues) hireScoreValues[i] = [totalHireScore];
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
  if (hireScoreValues) sheet.getRange(startRow, colHireScore + 1, numRows, 1).setValues(hireScoreValues);
  if (fopValues) sheet.getRange(startRow, colFop + 1, numRows, 1).setValues(fopValues);
  if (dsaValues) sheet.getRange(startRow, colDsa + 1, numRows, 1).setValues(dsaValues);
  if (aptValues) sheet.getRange(startRow, colApt + 1, numRows, 1).setValues(aptValues);
  if (quantsValues) sheet.getRange(startRow, colQuants + 1, numRows, 1).setValues(quantsValues);
  if (logicalValues) sheet.getRange(startRow, colLogical + 1, numRows, 1).setValues(logicalValues);
  if (verbalValues) sheet.getRange(startRow, colVerbal + 1, numRows, 1).setValues(verbalValues);

  return count;
}

/**
 * Inspect Headers helper with Real-time toast
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
  const row6 = sheet.getRange(6, 1, 1, lastCol).getValues()[0].map(String);
  const row7 = sheet.getRange(7, 1, 1, lastCol).getValues()[0].map(String);
  const combined = row7.map((h7, idx) => (row6[idx] ? (row6[idx] + " " + h7) : h7));

  const colHireScore = findColumnIndex(combined, ["total hire score", "hire score", "hire_score"]);
  const colFop = findColumnIndex(combined, ["fop"]);
  const colDsa = findColumnIndex(combined, ["dsa"]);
  const colApt = findColumnIndex(combined, ["aptitude", "apt"]);
  const colQuants = findColumnIndex(combined, ["numerical ability", "advanced quantitative", "quant", "quants"]);
  const colLogical = findColumnIndex(combined, ["reasoning ability", "logical", "reasoning"]);
  const colVerbal = findColumnIndex(combined, ["verbal ability", "verbal"]);

  let msg = "🔍 HEADER ANALYSIS FOR '" + sheet.getName() + "':\n\n";
  msg += (regInfo.colIdx !== -1)
    ? "✅ Reg. Number Column: Col " + colLetter(regInfo.colIdx) + " (Row " + regInfo.rowIdx + ": '" + regInfo.headerName + "')\n"
    : "❌ Reg. Number Column: NOT FOUND across Rows 1-7\n";

  msg += "• TOTAL HIRE SCORE Column: " + (colHireScore !== -1 ? "Col " + colLetter(colHireScore) + " (" + combined[colHireScore] + ")" : "⚡ Will be Auto-Created at Column Y on Run") + "\n";
  msg += "• FOP Column: " + (colFop !== -1 ? "Col " + colLetter(colFop) + " (" + combined[colFop] + ")" : "❌ Not Found") + "\n";
  msg += "• DSA Column: " + (colDsa !== -1 ? "Col " + colLetter(colDsa) + " (" + combined[colDsa] + ")" : "❌ Not Found") + "\n";
  msg += "• Aptitude Column (Combined): " + (colApt !== -1 ? "Col " + colLetter(colApt) + " (" + combined[colApt] + ")" : "❌ Not Found") + "\n";
  msg += "• Verbal Column: " + (colVerbal !== -1 ? "Col " + colLetter(colVerbal) + " (" + combined[colVerbal] + ")" : "❌ Not Found") + "\n";
  msg += "• Logical Column: " + (colLogical !== -1 ? "Col " + colLetter(colLogical) + " (" + combined[colLogical] + ")" : "❌ Not Found") + "\n";
  msg += "• Quants Column: " + (colQuants !== -1 ? "Col " + colLetter(colQuants) + " (" + combined[colQuants] + ")" : "❌ Not Found") + "\n";

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

/**
 * ==============================================================================
 * HIRE & NQT SCORE GOOGLE APPS SCRIPT (STRICT ISOLATED MODES + SCREENSHOT UI)
 * API Endpoint: https://hire-score-fawn.vercel.app/api/scores/{regNo}
 * 
 * Target Sheets (12 Placement Eligibility Sheets):
 * - SDNB, AU, KC, AMET, Takshashila, SACAS, BCAS, NAAS, STC, S-Vyasa, TERF, TJS
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

// Custom toolbar menu with separate, strictly isolated options
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("🚀 HIRE & NQT Score Tools")
    .addItem("⚡ Auto-Fill ALL Scores (HIRE + NQT)", "autoFillAllPlacementSheets")
    .addSeparator()
    .addItem("🎯 Auto-Fill HIRE Scores Only", "autoFillHireScoresOnly")
    .addItem("📊 Auto-Fill NQT Scores Only", "autoFillNqtScoresOnly")
    .addSeparator()
    .addItem("⚡ Auto-Fill Current Sheet (ALL)", "autoFillCurrentSheet")
    .addItem("🎯 Auto-Fill Current Sheet (HIRE Only)", "autoFillCurrentSheetHireOnly")
    .addItem("📊 Auto-Fill Current Sheet (NQT Only)", "autoFillCurrentSheetNqtOnly")
    .addSeparator()
    .addItem("🎨 Format Sheet Headers (Green Screenshot Layout)", "formatSheetHeadersCurrent")
    .addItem("🔍 Inspect Sheet Headers & Mappings", "inspectHeaders")
    .addToUi();
}

/**
 * Mode 1: Auto-fills ALL scores (HIRE + NQT) across ALL 12 Placement Eligibility sheets
 */
function autoFillAllPlacementSheets() {
  runBatchAutoFill("ALL", "🚀 Starting HIRE + NQT Real-Time Sync across all sheets...");
}

/**
 * Mode 2: Auto-fills HIRE Scores ONLY (Total Hire Score, FOP, DSA, Aptitude)
 * DOES NOT TOUCH NQT COLUMNS AT ALL.
 */
function autoFillHireScoresOnly() {
  runBatchAutoFill("HIRE_ONLY", "🎯 Starting HIRE Scores ONLY Real-Time Sync across all sheets...");
}

/**
 * Mode 3: Auto-fills FPC NQT Assessment Scores ONLY
 * DOES NOT TOUCH HIRE COLUMNS AT ALL.
 */
function autoFillNqtScoresOnly() {
  runBatchAutoFill("NQT_ONLY", "📊 Starting NQT Scores ONLY Real-Time Sync across all sheets...");
}

/**
 * Helper to run batch auto-fill across sheets for specified mode
 */
function runBatchAutoFill(mode, startMessage) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  let totalProcessed = 0;
  let sheetsCount = 0;
  let summaryLog = [];

  ss.toast(startMessage, "HIRE & NQT Real-Time Sync", 5);

  for (let i = 0; i < sheets.length; i++) {
    const sheet = sheets[i];
    const sName = sheet.getName().trim().toUpperCase();

    const isTarget = TARGET_SHEETS.some(t => sName === t.toUpperCase() || sName.includes("PLACEMENT ELIGIBILITY"));

    if (isTarget) {
      ss.toast("📄 Processing (" + (sheetsCount + 1) + "): " + sheet.getName() + " [" + mode + "]...", "HIRE & NQT Real-Time Sync", 5);
      const count = processPlacementSheet(sheet, ss, mode);
      totalProcessed += count;
      sheetsCount++;
      summaryLog.push("• " + sheet.getName() + ": " + count + " records updated");
    }
  }

  ss.toast("🎉 Auto-Fill Complete! Processed " + totalProcessed + " students.", "HIRE & NQT Real-Time Sync", 10);

  SpreadsheetApp.getUi().alert(
    "🎉 REAL-TIME AUTO-FILL COMPLETE! [" + mode + " Mode]\n\n" +
    "• Placement Sheets Processed: " + sheetsCount + "\n" +
    "• Total Student Records Updated: " + totalProcessed + "\n\n" +
    "Sheet Breakdown:\n" + summaryLog.join("\n")
  );
}

/**
 * Current Active Sheet Handlers
 */
function autoFillCurrentSheet() {
  runCurrentSheetAutoFill("ALL");
}

function autoFillCurrentSheetHireOnly() {
  runCurrentSheetAutoFill("HIRE_ONLY");
}

function autoFillCurrentSheetNqtOnly() {
  runCurrentSheetAutoFill("NQT_ONLY");
}

function runCurrentSheetAutoFill(mode) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  ss.toast("⚡ Live sync on sheet [" + mode + "]: " + sheet.getName() + "...", "HIRE & NQT Real-Time Sync", 5);
  const count = processPlacementSheet(sheet, ss, mode);
  ss.toast("🎉 Updated " + count + " records in " + sheet.getName(), "HIRE & NQT Real-Time Sync", 10);
  SpreadsheetApp.getUi().alert("🎉 Updated " + count + " student records in sheet: " + sheet.getName() + " [" + mode + " mode]");
}

/**
 * Format active sheet headers matching screenshot green design
 */
function formatSheetHeadersCurrent() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  formatSheetHeaders(sheet);
  SpreadsheetApp.getUi().alert("🎨 Headers formatted successfully matching screenshot layout on sheet: " + sheet.getName());
}

/**
 * Core processor for a single sheet with STRICT mode isolation ("ALL" | "HIRE_ONLY" | "NQT_ONLY")
 */
function processPlacementSheet(sheet, ss, mode) {
  mode = mode || "ALL";
  const isHireMode = (mode === "ALL" || mode === "HIRE_ONLY");
  const isNqtMode = (mode === "ALL" || mode === "NQT_ONLY");

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

  // 2. Read Line 6 & Line 7 Headers for score columns (clean whitespace & newlines)
  const row6 = sheet.getRange(6, 1, 1, lastCol).getValues()[0].map(v => String(v || "").replace(/[\r\n]+/g, " ").trim());
  const row7 = sheet.getRange(7, 1, 1, lastCol).getValues()[0].map(v => String(v || "").replace(/[\r\n]+/g, " ").trim());
  const combinedHeaders = row7.map((h7, idx) => (row6[idx] ? (row6[idx] + " " + h7) : h7));

  // Column Index Locators
  let colHireScore = findColumnIndex(combinedHeaders, ["total hire score", "hire score", "hire_score"]);
  const colFop = findColumnIndex(combinedHeaders, ["fop(%)", "fop"]);
  const colDsa = findColumnIndex(combinedHeaders, ["dsa(%)", "dsa"]);
  const colApt = findColumnIndex(combinedHeaders, ["aptitude(%)", "aptitude", "apt"]);

  const colNoOfAssess = findColumnIndex(combinedHeaders, ["no.of. assessment", "no of assessment", "assessment conducted"]);
  const colNumerical = findColumnIndex(combinedHeaders, ["numerical ability( percentage)", "numerical ability", "numerical"]);
  const colVerbal = findColumnIndex(combinedHeaders, ["verbal ability( percentage)", "verbal ability", "verbal"]);
  const colReasoning = findColumnIndex(combinedHeaders, ["reasoning ability( percentage)", "reasoning ability", "reasoning", "logical"]);
  const colAdvQuant = findColumnIndex(combinedHeaders, ["advanced quantitative and reasoning ability", "advanced quantitative", "adv quant"]);
  const colAptAvg = findColumnIndex(combinedHeaders, ["aptitude average %", "aptitude average", "aptitude avg"]);
  const colCodingAvg = findColumnIndex(combinedHeaders, ["coding (average percentage)", "coding (average", "coding average", "coding avg"]);
  const colOverallAvg = findColumnIndex(combinedHeaders, ["overall (average percentage)", "overall (average", "overall average", "overall avg"]);

  // Auto-Create Column Y for TOTAL HIRE SCORE if missing
  if (colHireScore === -1 && isHireMode) {
    let insertAfterIdx = -1;
    if (colNoOfAssess !== -1) {
      insertAfterIdx = colNoOfAssess - 1;
    } else {
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
      colHireScore = insertAfterIdx + 1;
    } else {
      sheet.insertColumnAfter(lastCol);
      colHireScore = lastCol;
    }

    lastCol = sheet.getLastColumn();
    sheet.getRange(6, colHireScore + 1).setValue("HIRE Assessment Score (Latest Month)");
    sheet.getRange(7, colHireScore + 1).setValue("TOTAL HIRE SCORE(OUT OF 1000)");

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

  const startRow = 8;
  const numRows = lastRow - 7;
  if (numRows <= 0) return 0;

  const regValues = sheet.getRange(startRow, regColIdx + 1, numRows, 1).getValues();

  // STRICTLY ISOLATED BUFFERS: ONLY allocate buffer if Mode permits
  const hireScoreValues = (isHireMode && colHireScore !== -1) ? new Array(numRows).fill([""]) : null;
  const fopValues = (isHireMode && colFop !== -1) ? new Array(numRows).fill([""]) : null;
  const dsaValues = (isHireMode && colDsa !== -1) ? new Array(numRows).fill([""]) : null;
  const aptValues = (isHireMode && colApt !== -1) ? new Array(numRows).fill([""]) : null;

  const noOfAssessValues = (isNqtMode && colNoOfAssess !== -1) ? new Array(numRows).fill([""]) : null;
  const numericalValues = (isNqtMode && colNumerical !== -1) ? new Array(numRows).fill([""]) : null;
  const verbalValues = (isNqtMode && colVerbal !== -1) ? new Array(numRows).fill([""]) : null;
  const reasoningValues = (isNqtMode && colReasoning !== -1) ? new Array(numRows).fill([""]) : null;
  const advQuantValues = (isNqtMode && colAdvQuant !== -1) ? new Array(numRows).fill([""]) : null;
  const aptAvgValues = (isNqtMode && colAptAvg !== -1) ? new Array(numRows).fill([""]) : null;
  const codingAvgValues = (isNqtMode && colCodingAvg !== -1) ? new Array(numRows).fill([""]) : null;
  const overallAvgValues = (isNqtMode && colOverallAvg !== -1) ? new Array(numRows).fill([""]) : null;

  const baseUrl = "https://hire-score-fawn.vercel.app/api/scores/";
  let count = 0;

  for (let i = 0; i < numRows; i++) {
    const rawReg = String(regValues[i][0] || "").trim();
    if (!rawReg) continue;

    try {
      const response = UrlFetchApp.fetch(baseUrl + encodeURIComponent(rawReg), { muteHttpExceptions: true });
      if (response.getResponseCode() === 200) {
        const data = JSON.parse(response.getContentText());
        const percentages = data.percentages || {};

        if (isHireMode) {
          const totalHireScore = data.hireScore ?? data.scores?.hireScore ?? data.computedScores?.hireScore ?? 0;
          const fop = percentages.fopAssessment ?? 0;
          const dsa = percentages.dsaAssessment ?? 0;
          const aptitude = percentages.aptitudeTotal ?? 0;

          if (hireScoreValues) hireScoreValues[i] = [totalHireScore];
          if (fopValues) fopValues[i] = [fop];
          if (dsaValues) dsaValues[i] = [dsa];
          if (aptValues) aptValues[i] = [aptitude];
        }

        if (isNqtMode) {
          const nqt = data.fpcNqtAssessment || {};
          const noOfAssess = nqt.noOfAssessmentConducted ?? data["No.Of. Assessment Conducted"] ?? 1;
          const numPct = nqt.numericalAbilityPercentage ?? data["Numerical Ability( Percentage)"] ?? percentages.numericalAbility ?? percentages.quants ?? 0;
          const verbPct = nqt.verbalAbilityPercentage ?? data["Verbal Ability( Percentage)"] ?? percentages.verbalAbility ?? percentages.verbal ?? 0;
          const reasPct = nqt.reasoningAbilityPercentage ?? data["Reasoning Ability( Percentage)"] ?? percentages.reasoningAbility ?? percentages.logical ?? 0;
          const advPct = nqt.advancedQuantitativeAndReasoningAbilityPercentage ?? data["Advanced Quantitative and Reasoning Ability( Percentage)"] ?? percentages.advancedQuantitativeAndReasoningAbility ?? percentages.quants ?? 0;
          const aptAvgPct = nqt.aptitudeAveragePercentage ?? data["Aptitude Average %"] ?? percentages.aptitudeAverage ?? (percentages.aptitudeTotal ?? 0);
          const codingAvgPct = nqt.codingAveragePercentage ?? data["Coding (Average Percentage)"] ?? percentages.codingAverage ?? (percentages.dsaAssessment ?? 0);
          const overallAvgPct = nqt.overallAveragePercentage ?? data["Overall (Average Percentage)"] ?? percentages.overallAverage ?? 0;

          if (noOfAssessValues) noOfAssessValues[i] = [noOfAssess];
          if (numericalValues) numericalValues[i] = [numPct];
          if (verbalValues) verbalValues[i] = [verbPct];
          if (reasoningValues) reasoningValues[i] = [reasPct];
          if (advQuantValues) advQuantValues[i] = [advPct];
          if (aptAvgValues) aptAvgValues[i] = [aptAvgPct];
          if (codingAvgValues) codingAvgValues[i] = [codingAvgPct];
          if (overallAvgValues) overallAvgValues[i] = [overallAvgPct];
        }

        count++;

        // Live Real-Time Progress Toast Notification every 5 students
        if (ss && (i % 5 === 0 || i === numRows - 1)) {
          const studentName = data.name ? " • " + data.name : "";
          ss.toast("⚡ [" + (i + 1) + "/" + numRows + "] " + rawReg + studentName, "HIRE & NQT Live Sync [" + mode + "]", 2);
        }
      }
    } catch (e) {
      Logger.log("Fetch error for " + rawReg + ": " + e.message);
    }

    // Flush batch updates every 25 rows so data appears live on the Google Sheet
    if ((i + 1) % 25 === 0 || i === numRows - 1) {
      flushBuffersToSheet(sheet, startRow, numRows, {
        isHireMode, isNqtMode,
        hireScoreValues, colHireScore,
        fopValues, colFop,
        dsaValues, colDsa,
        aptValues, colApt,
        noOfAssessValues, colNoOfAssess,
        numericalValues, colNumerical,
        verbalValues, colVerbal,
        reasoningValues, colReasoning,
        advQuantValues, colAdvQuant,
        aptAvgValues, colAptAvg,
        codingAvgValues, colCodingAvg,
        overallAvgValues, colOverallAvg
      });
      SpreadsheetApp.flush();
    }
  }

  return count;
}

function flushBuffersToSheet(sheet, startRow, numRows, buf) {
  if (buf.isHireMode) {
    if (buf.hireScoreValues && buf.colHireScore !== -1) sheet.getRange(startRow, buf.colHireScore + 1, numRows, 1).setValues(buf.hireScoreValues);
    if (buf.fopValues && buf.colFop !== -1) sheet.getRange(startRow, buf.colFop + 1, numRows, 1).setValues(buf.fopValues);
    if (buf.dsaValues && buf.colDsa !== -1) sheet.getRange(startRow, buf.colDsa + 1, numRows, 1).setValues(buf.dsaValues);
    if (buf.aptValues && buf.colApt !== -1) sheet.getRange(startRow, buf.colApt + 1, numRows, 1).setValues(buf.aptValues);
  }

  if (buf.isNqtMode) {
    if (buf.noOfAssessValues && buf.colNoOfAssess !== -1) sheet.getRange(startRow, buf.colNoOfAssess + 1, numRows, 1).setValues(buf.noOfAssessValues);
    if (buf.numericalValues && buf.colNumerical !== -1) sheet.getRange(startRow, buf.colNumerical + 1, numRows, 1).setValues(buf.numericalValues);
    if (buf.verbalValues && buf.colVerbal !== -1) sheet.getRange(startRow, buf.colVerbal + 1, numRows, 1).setValues(buf.verbalValues);
    if (buf.reasoningValues && buf.colReasoning !== -1) sheet.getRange(startRow, buf.colReasoning + 1, numRows, 1).setValues(buf.reasoningValues);
    if (buf.advQuantValues && buf.colAdvQuant !== -1) sheet.getRange(startRow, buf.colAdvQuant + 1, numRows, 1).setValues(buf.advQuantValues);
    if (buf.aptAvgValues && buf.colAptAvg !== -1) sheet.getRange(startRow, buf.colAptAvg + 1, numRows, 1).setValues(buf.aptAvgValues);
    if (buf.codingAvgValues && buf.colCodingAvg !== -1) sheet.getRange(startRow, buf.colCodingAvg + 1, numRows, 1).setValues(buf.codingAvgValues);
    if (buf.overallAvgValues && buf.colOverallAvg !== -1) sheet.getRange(startRow, buf.colOverallAvg + 1, numRows, 1).setValues(buf.overallAvgValues);
  }
}

/**
 * Format headers on sheet matching screenshot green theme
 */
function formatSheetHeaders(sheet) {
  const lastCol = sheet.getLastColumn();
  if (lastCol === 0) return;

  const GREEN_BG = "#a2c4c9"; // Green header background from screenshot

  const row6 = sheet.getRange(6, 1, 1, lastCol);
  const row7 = sheet.getRange(7, 1, 1, lastCol);

  row6.setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle").setBackground(GREEN_BG);
  row7.setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true).setBackground(GREEN_BG);

  sheet.getRange(6, 1, 2, lastCol).setBorder(true, true, true, true, true, true, "#333333", SpreadsheetApp.BorderStyle.SOLID);
}

function inspectHeaders() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastCol = sheet.getLastColumn();
  const ui = SpreadsheetApp.getUi();

  if (sheet.getLastRow() < 7 || lastCol === 0) {
    ui.alert("Sheet '" + sheet.getName() + "' has no data on Row 7.");
    return;
  }

  const regInfo = findRegNoColumn(sheet, 7, lastCol);
  const row6 = sheet.getRange(6, 1, 1, lastCol).getValues()[0].map(v => String(v || "").replace(/[\r\n]+/g, " ").trim());
  const row7 = sheet.getRange(7, 1, 1, lastCol).getValues()[0].map(v => String(v || "").replace(/[\r\n]+/g, " ").trim());
  const combined = row7.map((h7, idx) => (row6[idx] ? (row6[idx] + " " + h7) : h7));

  const colHireScore = findColumnIndex(combined, ["total hire score", "hire score", "hire_score"]);
  const colFop = findColumnIndex(combined, ["fop(%)", "fop"]);
  const colDsa = findColumnIndex(combined, ["dsa(%)", "dsa"]);
  const colApt = findColumnIndex(combined, ["aptitude(%)", "aptitude", "apt"]);

  const colNoOfAssess = findColumnIndex(combined, ["no.of. assessment", "no of assessment", "assessment conducted"]);
  const colNumerical = findColumnIndex(combined, ["numerical ability( percentage)", "numerical ability", "numerical"]);
  const colVerbal = findColumnIndex(combined, ["verbal ability( percentage)", "verbal ability", "verbal"]);
  const colReasoning = findColumnIndex(combined, ["reasoning ability( percentage)", "reasoning ability", "reasoning", "logical"]);
  const colAdvQuant = findColumnIndex(combined, ["advanced quantitative and reasoning ability", "advanced quantitative", "adv quant"]);
  const colAptAvg = findColumnIndex(combined, ["aptitude average %", "aptitude average", "aptitude avg"]);
  const colCodingAvg = findColumnIndex(combined, ["coding (average percentage)", "coding (average", "coding average", "coding avg"]);
  const colOverallAvg = findColumnIndex(combined, ["overall (average percentage)", "overall (average", "overall average", "overall avg"]);

  let msg = "🔍 HEADER ANALYSIS FOR '" + sheet.getName() + "':\n\n";
  msg += (regInfo.colIdx !== -1)
    ? "✅ Reg. Number Column: Col " + colLetter(regInfo.colIdx) + " (Row " + regInfo.rowIdx + ": '" + regInfo.headerName + "')\n"
    : "❌ Reg. Number Column: NOT FOUND across Rows 1-7\n";

  msg += "\n🎯 HIRE COLUMNS:\n";
  msg += "• FOP(%): " + (colFop !== -1 ? "Col " + colLetter(colFop) : "❌ Not Found") + "\n";
  msg += "• DSA(%): " + (colDsa !== -1 ? "Col " + colLetter(colDsa) : "❌ Not Found") + "\n";
  msg += "• Aptitude(%): " + (colApt !== -1 ? "Col " + colLetter(colApt) : "❌ Not Found") + "\n";
  msg += "• TOTAL HIRE SCORE(OUT OF 1000): " + (colHireScore !== -1 ? "Col " + colLetter(colHireScore) : "⚡ Will Auto-Create") + "\n\n";

  msg += "📊 NQT COLUMNS:\n";
  msg += "• No.Of Assessment Conducted: " + (colNoOfAssess !== -1 ? "Col " + colLetter(colNoOfAssess) : "❌ Not Found") + "\n";
  msg += "• Numerical Ability %: " + (colNumerical !== -1 ? "Col " + colLetter(colNumerical) : "❌ Not Found") + "\n";
  msg += "• Verbal Ability %: " + (colVerbal !== -1 ? "Col " + colLetter(colVerbal) : "❌ Not Found") + "\n";
  msg += "• Reasoning Ability %: " + (colReasoning !== -1 ? "Col " + colLetter(colReasoning) : "❌ Not Found") + "\n";
  msg += "• Adv Quant & Reasoning %: " + (colAdvQuant !== -1 ? "Col " + colLetter(colAdvQuant) : "❌ Not Found") + "\n";
  msg += "• Aptitude Average %: " + (colAptAvg !== -1 ? "Col " + colLetter(colAptAvg) : "❌ Not Found") + "\n";
  msg += "• Coding Average %: " + (colCodingAvg !== -1 ? "Col " + colLetter(colCodingAvg) : "❌ Not Found") + "\n";
  msg += "• Overall Average %: " + (colOverallAvg !== -1 ? "Col " + colLetter(colOverallAvg) : "❌ Not Found") + "\n";

  ui.alert(msg);
}

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

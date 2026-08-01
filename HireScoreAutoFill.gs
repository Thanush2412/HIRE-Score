/**
 * ==============================================================================
 * HIRE & NQT SCORE GOOGLE APPS SCRIPT (CLEAN SINGLE-HEADER & NO DUPLICATE COLS)
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

// Custom toolbar menu
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
    .addItem("🎨 Fix & Format Sheet Headers (Clean Layout)", "formatSheetHeadersCurrent")
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
 */
function autoFillHireScoresOnly() {
  runBatchAutoFill("HIRE_ONLY", "🎯 Starting HIRE Scores ONLY Real-Time Sync across all sheets...");
}

/**
 * Mode 3: Auto-fills FPC NQT Assessment Scores ONLY
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
 * Format active sheet headers matching clean screenshot design
 */
function formatSheetHeadersCurrent() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  formatSheetHeaders(sheet);
  SpreadsheetApp.getUi().alert("🎨 Headers cleaned and formatted successfully on sheet: " + sheet.getName());
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
  const row6Raw = sheet.getRange(6, 1, 1, lastCol).getValues()[0].map(v => String(v || "").replace(/[\r\n]+/g, " ").trim());
  const row7Raw = sheet.getRange(7, 1, 1, lastCol).getValues()[0].map(v => String(v || "").replace(/[\r\n]+/g, " ").trim());

  // Search headers across both Row 6 and Row 7
  const combinedHeaders = row7Raw.map((h7, idx) => (row6Raw[idx] ? (row6Raw[idx] + " " + h7) : h7));

  // Column Index Locators
  let colHireScore = findColumnIndex(row7Raw, ["total hire score", "hire score", "hire_score", "out of 1000"]);
  if (colHireScore === -1) {
    colHireScore = findColumnIndex(combinedHeaders, ["total hire score", "hire score", "hire_score", "out of 1000"]);
  }

  let colFop = findColumnIndex(row7Raw, ["fop(%)", "fop"]);
  if (colFop === -1) colFop = findColumnIndex(combinedHeaders, ["fop(%)", "fop"]);

  let colDsa = findColumnIndex(row7Raw, ["dsa(%)", "dsa"]);
  if (colDsa === -1) colDsa = findColumnIndex(combinedHeaders, ["dsa(%)", "dsa"]);

  let colApt = findColumnIndex(row7Raw, ["aptitude(%)", "aptitude"]);
  if (colApt === -1) colApt = findColumnIndex(combinedHeaders, ["aptitude(%)", "aptitude"]);

  const colNoOfAssess = findColumnIndex(combinedHeaders, ["no.of. assessment", "no of assessment", "assessment conducted"]);
  const colNumerical = findColumnIndex(combinedHeaders, ["numerical ability( percentage)", "numerical ability", "numerical"]);
  const colVerbal = findColumnIndex(combinedHeaders, ["verbal ability( percentage)", "verbal ability", "verbal"]);
  const colReasoning = findColumnIndex(combinedHeaders, ["reasoning ability( percentage)", "reasoning ability", "reasoning", "logical"]);
  const colAdvQuant = findColumnIndex(combinedHeaders, ["advanced quantitative and reasoning ability", "advanced quantitative", "adv quant"]);
  const colAptAvg = findColumnIndex(combinedHeaders, ["aptitude average %", "aptitude average", "aptitude avg"]);
  const colCodingAvg = findColumnIndex(combinedHeaders, ["coding (average percentage)", "coding (average", "coding average", "coding avg"]);
  const colOverallAvg = findColumnIndex(combinedHeaders, ["overall (average percentage)", "overall (average", "overall average", "overall avg"]);

  // Auto-Create Column for TOTAL HIRE SCORE ONLY IF NOT FOUND ANYWHERE
  if (colHireScore === -1 && isHireMode) {
    let insertAfterIdx = -1;
    if (colApt !== -1) {
      insertAfterIdx = colApt;
    } else if (colDsa !== -1) {
      insertAfterIdx = colDsa;
    } else if (colFop !== -1) {
      insertAfterIdx = colFop;
    } else if (colNoOfAssess !== -1) {
      insertAfterIdx = colNoOfAssess - 1;
    } else {
      insertAfterIdx = lastCol - 1;
    }

    sheet.insertColumnAfter(insertAfterIdx + 1);
    colHireScore = insertAfterIdx + 1;
    lastCol = sheet.getLastColumn();

    // Set Row 6 and Row 7 specifically for TOTAL HIRE SCORE column
    sheet.getRange(6, colHireScore + 1).setValue("TOTAL HIRE SCORE(OUT OF 1000)");
    sheet.getRange(7, colHireScore + 1).setValue("TOTAL HIRE SCORE(OUT OF 1000)");

    try {
      const targetHeader = sheet.getRange(6, colHireScore + 1, 2, 1);
      targetHeader.setBackground("#a2c4c9");
      targetHeader.setFontWeight("bold");
      targetHeader.setHorizontalAlignment("center");
      targetHeader.setVerticalAlignment("middle");
      targetHeader.setWrap(true);
    } catch (err) {
      Logger.log("Styling warning: " + err.message);
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
 * Cleanly unmerges and re-formats Row 6 and Row 7 to guarantee NO duplicate headers!
 */
function formatSheetHeaders(sheet) {
  const lastCol = sheet.getLastColumn();
  if (sheet.getLastRow() < 7 || lastCol === 0) return;

  const GREEN_BG = "#a2c4c9";

  // Unmerge Row 6 & 7 across sheet to reset duplicate merged cells
  try {
    sheet.getRange(6, 1, 2, lastCol).breakApart();
  } catch (e) {
    Logger.log("Break apart note: " + e);
  }

  const row7Values = sheet.getRange(7, 1, 1, lastCol).getValues()[0].map(v => String(v || "").toLowerCase().trim());

  let fopColIdx = -1;
  for (let c = 0; c < lastCol; c++) {
    if (row7Values[c].includes("fop")) {
      fopColIdx = c;
      break;
    }
  }

  if (fopColIdx !== -1 && fopColIdx + 3 < lastCol) {
    // 1. Merge Row 6 over FOP, DSA, Aptitude (ONLY 3 columns)
    const hireHeaderRange = sheet.getRange(6, fopColIdx + 1, 1, 3);
    hireHeaderRange.merge();
    hireHeaderRange.setValue("HIRE Assessment Score (Latest Month)");

    sheet.getRange(7, fopColIdx + 1).setValue("FOP(%)");
    sheet.getRange(7, fopColIdx + 2).setValue("DSA(%)");
    sheet.getRange(7, fopColIdx + 3).setValue("Aptitude(%)");

    // 2. Set TOTAL HIRE SCORE column (fopColIdx + 4)
    const hireScoreColIdx = fopColIdx + 4;
    const scoreRange = sheet.getRange(6, hireScoreColIdx, 2, 1);
    scoreRange.merge();
    scoreRange.setValue("TOTAL HIRE SCORE(OUT OF 1000)");

    // 3. Set FPC NQT Assessment Header over next 8 columns
    const nqtStartCol = hireScoreColIdx + 1;
    if (nqtStartCol + 7 <= lastCol) {
      const nqtHeaderRange = sheet.getRange(6, nqtStartCol, 1, 8);
      nqtHeaderRange.merge();
      nqtHeaderRange.setValue("FPC NQT Assessment");

      const nqtHeaders = [
        "No.Of. Assessment Conducted",
        "Numerical Ability( Percentage)",
        "Verbal Ability( Percentage)",
        "Reasoning Ability( Percentage)",
        "Advanced Quantitative and Reasoning Ability( Percentage)",
        "Aptitude Average %",
        "Coding (Average Percentage)",
        "Overall (Average Percentage)"
      ];

      for (let k = 0; k < 8; k++) {
        sheet.getRange(7, nqtStartCol + k).setValue(nqtHeaders[k]);
      }

      // Format all 12 columns cleanly
      const totalHeaderRange = sheet.getRange(6, fopColIdx + 1, 2, 12);
      totalHeaderRange.setBackground(GREEN_BG);
      totalHeaderRange.setFontWeight("bold");
      totalHeaderRange.setHorizontalAlignment("center");
      totalHeaderRange.setVerticalAlignment("middle");
      totalHeaderRange.setWrap(true);
      totalHeaderRange.setBorder(true, true, true, true, true, true, "#333333", SpreadsheetApp.BorderStyle.SOLID);
    }
  }
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

  const colHireScore = findColumnIndex(row7, ["total hire score", "hire score", "hire_score", "out of 1000"]);
  const colFop = findColumnIndex(row7, ["fop(%)", "fop"]);
  const colDsa = findColumnIndex(row7, ["dsa(%)", "dsa"]);
  const colApt = findColumnIndex(row7, ["aptitude(%)", "aptitude"]);

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

import { computeScores } from "./lib/formulas";
import { StudentData } from "./lib/types";

// Raw row data from the Excel importer
// 0: Name, 1: RegNo, 2: College, 3: BCA (dept), 4: Second (year), 5: Arts (stream), 6: Phone, 7: Email
// 8: xMarks (79), 9: xiiMarks (71), 10: ugPct (81.33), 11: pgPct ("—" or empty)
// 12: arrears (0), 13: histArrears (0), 14: quants (0), 15: logical (0), 16: verbal (0)
// 17: cefrA1Grammar (B2), 18: cefrA2Grammar (B2), 19: efSetListening (B1)
// 20: efSetSpeaking (A2), 21: efSetReading (A2), 22: efSetWriting (A2)
// 23: leetcodeRank (5000000), 24: fopAssessment (0), 25: dsaAssessment (0)
// 26: internalCode (1), 27: externalCode (1)
// 28: githubProjects (18), 29: fullLengthProjects (2)
// 30: globalCert (2), 31: otherCert (3)

const rawRow = [
  "Prathibaa P",              // 0: name
  "24082100402012064",        // 1: regNo
  "BCA",                      // 2: department
  "Second",                   // 3: year
  "79",                       // 4: xMarks
  "71",                       // 5: xiiMarks
  "81.33",                    // 6: ugPct
  "—",                        // 7: pgPct (NA)
  "0",                        // 8: arrears
  "0",                        // 9: histArrears
  "0",                        // 10: quants
  "0",                        // 11: logical
  "0",                        // 12: verbal
  "B2",                       // 13: cefrA1Grammar
  "B2",                       // 14: cefrA2Grammar
  "B1",                       // 15: efSetListening
  "A2",                       // 16: efSetSpeaking
  "A2",                       // 17: efSetReading
  "A2",                       // 18: efSetWriting
  "5000000",                  // 19: leetcodeRank
  "0",                        // 20: fop
  "0",                        // 21: dsa
  "1",                        // 22: internalCodeathon
  "1",                        // 23: externalCodeathon
  "18",                       // 24: githubProjects
  "2",                        // 25: fullLengthProjects
  "2",                        // 26: globalCertification
  "3",                        // 27: otherCertifications
];

// Replicate primary/secondary route parse & cast logic
function parseCEFR(v: unknown): string {
  const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
  if (!v) return "";
  const parts = String(v)
    .split(/[\s,]+/)
    .map((p) => p.trim().toUpperCase())
    .filter((p) => CEFR_LEVELS.includes(p));

  if (parts.length === 0) return "";
  
  let highest = parts[0];
  let highestIdx = CEFR_LEVELS.indexOf(highest);
  for (let i = 1; i < parts.length; i++) {
    const idx = CEFR_LEVELS.indexOf(parts[i]);
    if (idx > highestIdx) {
      highest = parts[i];
      highestIdx = idx;
    }
  }
  return highest;
}


function parseNum(v: unknown): number {
  const n = Number(v); return isNaN(n) ? 0 : n;
}

function parseNullableNum(v: unknown): number | null {
  if (v === null || v === undefined || String(v).toUpperCase() === "NA" || v === "" || v === "—") return null;
  const n = Number(v); return isNaN(n) ? null : n;
}

function parseRankNum(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  const s = String(v).replace(/[,~\s]/g, "").trim();
  const n = Number(s);
  return isNaN(n) ? 0 : n;
}

// Convert mock spreadsheet row to StudentData
function rowToStudent(row: string[]): StudentData {
  const C = {
    name: 0, regNo: 1, dept: 2, year: 3,
    xMarks: 4, xiiMarks: 5, ugPct: 6, pgPct: 7,
    arrears: 8, histArrears: 9,
    quants: 10, logical: 11, verbal: 12,
    cefrA1: 13, cefrA2: 14,
    efListen: 15, efSpeak: 16, efRead: 17, efWrite: 18,
    leetcode: 19, fop: 20, dsa: 21,
    internalCode: 22, externalCode: 23,
    githubProjects: 24, fullLengthProjects: 25,
    globalCert: 26, otherCert: 27,
  };

  // Perform combining parsing logic
  let cefrGrammar = parseCEFR(row[C.cefrA1]);
  const a2Val = parseCEFR(row[C.cefrA2]);
  if (!cefrGrammar && a2Val) {
    cefrGrammar = a2Val;
  }

  return {
    name: row[C.name],
    registrationNumber: row[C.regNo],
    department: row[C.dept],
    year: row[C.year],
    college: "Kamaraj College",
    stream: "arts",
    phone: "+916382649443",
    email: "p.prathibaa07@gmail.com",
    xMarks: parseNum(row[C.xMarks]),
    xiiMarks: parseNum(row[C.xiiMarks]),
    ugPercentage: parseNum(row[C.ugPct]),
    pgPercentage: parseNullableNum(row[C.pgPct]),
    noOfArrears: parseNum(row[C.arrears]),
    historyOfArrears: parseNum(row[C.histArrears]),
    quants: parseNum(row[C.quants]),
    logical: parseNum(row[C.logical]),
    verbal: parseNum(row[C.verbal]),
    cefrGrammar,
    efSetListening: parseCEFR(row[C.efListen]),
    efSetSpeaking: parseCEFR(row[C.efSpeak]),
    efSetReading: parseCEFR(row[C.efRead]),
    efSetWriting: parseCEFR(row[C.efWrite]),
    leetcodeRank: parseRankNum(row[C.leetcode]),
    leetcodeUrl: "leetcode.com/u/Prathi_07/",
    githubUrl: "github.com/Prathibaa07",
    fopAssessment: parseNum(row[C.fop]),
    dsaAssessment: parseNum(row[C.dsa]),
    internalCodeathon: parseNum(row[C.internalCode]),
    externalCodeathon: parseNum(row[C.externalCode]),
    githubProjects: parseNum(row[C.githubProjects]),
    fullLengthProjects: parseNum(row[C.fullLengthProjects]),
    globalCertification: parseNum(row[C.globalCert]),
    otherCertifications: parseNum(row[C.otherCert]),
  } as unknown as StudentData;
}

// Convert form fields simulation to StudentData (for testing form input flow)
function formInputToStudent(form: any): StudentData {
  return {
    name: form.name,
    registrationNumber: form.registrationNumber,
    department: form.department,
    year: form.year,
    college: form.college,
    stream: form.stream,
    phone: form.phone,
    email: form.email,
    xMarks: parseNum(form.xMarks),
    xiiMarks: parseNum(form.xiiMarks),
    ugPercentage: parseNum(form.ugPercentage),
    pgPercentage: parseNullableNum(form.pgPercentage),
    noOfArrears: parseNum(form.noOfArrears),
    historyOfArrears: parseNum(form.historyOfArrears),
    quants: parseNum(form.quants),
    logical: parseNum(form.logical),
    verbal: parseNum(form.verbal),
    cefrGrammar: parseCEFR(form.cefrGrammar),
    efSetListening: parseCEFR(form.efSetListening),
    efSetSpeaking: parseCEFR(form.efSetSpeaking),
    efSetReading: parseCEFR(form.efSetReading),
    efSetWriting: parseCEFR(form.efSetWriting),
    leetcodeRank: parseRankNum(form.leetcodeRank),
    leetcodeUrl: form.leetcodeUrl,
    githubUrl: form.githubUrl,
    fopAssessment: parseNum(form.fopAssessment),
    dsaAssessment: parseNum(form.dsaAssessment),
    internalCodeathon: parseNum(form.internalCodeathon),
    externalCodeathon: parseNum(form.externalCodeathon),
    githubProjects: parseNum(form.githubProjects),
    fullLengthProjects: parseNum(form.fullLengthProjects),
    globalCertification: parseNum(form.globalCertification),
    otherCertifications: parseNum(form.otherCertifications),
  } as unknown as StudentData;
}

console.log("--- Testing Parser + Formula Engine Combination ---");
const parsedStudent = rowToStudent(rawRow);
console.log("Parsed grammar field:", parsedStudent.cefrGrammar);
console.log("Expected grammar field: B2");

const computed = computeScores(parsedStudent);
console.log("\nComputed scores check:");
console.log("cefrGrammarScore:", computed.cefrGrammarScore, " (Expected: 30)");
console.log("efListeningScore:", computed.efListeningScore, " (Expected: 12)");
console.log("efSpeakingScore:", computed.efSpeakingScore, " (Expected: 10)");
console.log("efReadingScore:", computed.efReadingScore, " (Expected: 10)");
console.log("efWritingScore:", computed.efWritingScore, " (Expected: 10)");
console.log("communicationTotal:", computed.communicationTotal, " (Expected: 72)");

console.log("\nAcademic checks:");
console.log("xScore:", computed.xScore, " (Expected: 9)");
console.log("xiiScore:", computed.xiiScore, " (Expected: 9)");
console.log("ugScore:", computed.ugScore, " (Expected: 55)");
console.log("academicAggregate:", computed.academicAggregate, " (Expected: 73)");
console.log("standingArrears:", computed.standingArrears, " (Expected: 50)");

console.log("\nTechnical & Industry checks:");
console.log("codingPractice:", computed.codingPractice, " (Expected: 10)");
console.log("codeathonHackathon:", computed.codeathonHackathon, " (Expected: 25)");
console.log("miniProjects:", computed.miniProjects, " (Expected: 30)");
console.log("fullLengthProjectScore:", computed.fullLengthProjectScore, " (Expected: 20)");
console.log("globalCertScore:", computed.globalCertScore, " (Expected: 100)");
console.log("otherCertScore:", computed.otherCertScore, " (Expected: 15)");

console.log("\nTiers checks:");
console.log("academicRegulatory:", computed.academicRegulatory, " (Expected: 123)");
console.log("cognitiveLinguistic:", computed.cognitiveLinguistic, " (Expected: 72)");
console.log("technicalProficiency:", computed.technicalProficiency, " (Expected: 85)");
console.log("industryValidation:", computed.industryValidation, " (Expected: 115)");
console.log("hireScore:", computed.hireScore, " (Expected: 395)");

console.log("\n--- Testing Form Submission Flow Mapping ---");
const mockFormInput = {
  name: "Prathibaa P",
  registrationNumber: "24082100402012064",
  department: "BCA",
  year: "Second",
  college: "Kamaraj College",
  stream: "arts",
  phone: "+916382649443",
  email: "p.prathibaa07@gmail.com",
  xMarks: "79",
  xiiMarks: "71",
  ugPercentage: "81.33",
  pgPercentage: "",
  noOfArrears: "0",
  historyOfArrears: "0",
  quants: "0",
  logical: "0",
  verbal: "0",
  cefrGrammar: "B2",
  efSetListening: "B1",
  efSetSpeaking: "A2",
  efSetReading: "A2",
  efSetWriting: "A2",
  leetcodeRank: "5000000",
  leetcodeUrl: "leetcode.com/u/Prathi_07/",
  githubUrl: "github.com/Prathibaa07",
  fopAssessment: "0",
  dsaAssessment: "0",
  internalCodeathon: "1",
  externalCodeathon: "1",
  githubProjects: "18",
  fullLengthProjects: "2",
  globalCertification: "2",
  otherCertifications: "3",
};

const formStudent = formInputToStudent(mockFormInput);
const formComputed = computeScores(formStudent);
console.log("Form mapped grammar field:", formStudent.cefrGrammar);
console.log("Form communicationTotal:", formComputed.communicationTotal, " (Expected: 72)");
console.log("Form hireScore:", formComputed.hireScore, " (Expected: 395)");

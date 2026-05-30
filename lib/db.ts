/**
 * db.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Database adapter for Hostinger MySQL.
 * Handles pooling, connections, CRUD operations, transactions, and settings.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import mysql, { Pool } from "mysql2/promise";
import { StudentData } from "./types";
import { computeScores } from "./formulas";

// ── Types ─────────────────────────────────────────────────────────────────────

export type StoredStudent = StudentData & {
  id: string;
  college: string;
  createdAt: string;
};

export interface ShareTokenRow {
  id: string;
  college_name: string;
  colleges: string[];
  courses: string[];
  years: string[];
  token: string;
  created_at: string;
  last_accessed: string | null;
}

// ── MySQL Connection Pool ─────────────────────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __dbPool: Pool | undefined;
}

export function getPool(): Pool {
  if (global.__dbPool) return global.__dbPool;

  const host = process.env.DB_HOST || "82.25.111.19";
  const user = process.env.DB_USER || "u461595815_hirescore";
  const password = process.env.DB_PASSWORD || "hireScore-admin1";
  const database = process.env.DB_NAME || "u461595815_Hirescore";
  const port = parseInt(process.env.DB_PORT || "3306");

  global.__dbPool = mysql.createPool({
    host,
    user,
    password,
    database,
    port,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  return global.__dbPool;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseRankNum(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  const s = String(v).replace(/[,~\s]/g, "").trim();
  const n = Number(s);
  return isNaN(n) ? 0 : n;
}

function cleanCEFR(val: unknown): string {
  if (!val) return "";
  const s = String(val).toUpperCase().trim();
  const levels = s
    .split(/[\s,/;]+/)
    .map(p => p.trim())
    .filter(p => ["A1", "A2", "B1", "B2", "C1", "C2"].includes(p));
  
  if (levels.length === 0) return "";
  
  const rank: Record<string, number> = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };
  levels.sort((a, b) => rank[b] - rank[a]);
  return levels[0] || "";
}

function parseJSON(val: any): any {
  if (typeof val === "string") {
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }
  return val;
}

function fromRow(row: any): StoredStudent {
  if (!row) return null as any;
  return {
    ...row,
    id: row.id,
    college: row.college || "",
    createdAt: row.created_at || row.createdAt || "",
    leetcodeRank: parseRankNum(row.leetcodeRank),
    cefrGrammar: cleanCEFR(row.cefrGrammar),
    efSetListening: cleanCEFR(row.efSetListening),
    efSetSpeaking: cleanCEFR(row.efSetSpeaking),
    efSetReading: cleanCEFR(row.efSetReading),
    efSetWriting: cleanCEFR(row.efSetWriting),
    ugSemesterMarks: parseJSON(row.ugSemesterMarks) || [],
    pgSemesterMarks: parseJSON(row.pgSemesterMarks) || [],
    certUrls: parseJSON(row.certUrls) || {},
    internalCodeathonDetails: parseJSON(row.internalCodeathonDetails) || [],
    externalCodeathonDetails: parseJSON(row.externalCodeathonDetails) || [],
    fullLengthProjectDetails: parseJSON(row.fullLengthProjectDetails) || [],
    globalCertDetails: parseJSON(row.globalCertDetails) || [],
    otherCertDetails: parseJSON(row.otherCertDetails) || [],
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getAllStudents(): Promise<StoredStudent[]> {
  const pool = getPool();
  const [rows] = await pool.query(
    "SELECT * FROM student_full_view ORDER BY importSequence ASC, created_at ASC"
  );
  return (rows as any[]).map(fromRow);
}

export async function getStudentById(id: string): Promise<StoredStudent | null> {
  const pool = getPool();
  const [rows] = await pool.query("SELECT * FROM student_full_view WHERE id = ?", [id]);
  if (Array.isArray(rows) && rows.length > 0) {
    return fromRow(rows[0]);
  }
  return null;
}

export async function getStudentsFiltered(opts: {
  colleges?: string[];
  college?: string;
  courses?: string[];
  years?: string[];
  degreeType?: string;
} = {}): Promise<StoredStudent[]> {
  const pool = getPool();
  let queryStr = "SELECT * FROM student_full_view WHERE 1=1";
  const params: any[] = [];

  const colleges = opts.colleges?.length ? opts.colleges : opts.college ? [opts.college] : [];
  if (colleges.length > 0) {
    queryStr += ` AND college IN (${colleges.map(() => "?").join(",")})`;
    params.push(...colleges);
  }

  if (opts.courses?.length) {
    queryStr += ` AND department IN (${opts.courses.map(() => "?").join(",")})`;
    params.push(...opts.courses);
  }

  if (opts.years?.length) {
    queryStr += ` AND year IN (${opts.years.map(() => "?").join(",")})`;
    params.push(...opts.years);
  }

  if (opts.degreeType && opts.degreeType !== "all") {
    queryStr += " AND degreeType = ?";
    params.push(opts.degreeType);
  }

  queryStr += " ORDER BY importSequence ASC, created_at ASC";

  const [rows] = await pool.query(queryStr, params);
  return (rows as any[]).map(fromRow);
}

export async function upsertStudent(
  input: StudentData & { college?: string }
): Promise<StoredStudent> {
  const pool = getPool();
  const conn = await pool.getConnection();
  await conn.beginTransaction();

  try {
    const computed = computeScores(input);
    const collegeName = input.college || "";
    const stream = input.stream || "engineering";
    const degreeType = input.degreeType || "ug";

    // 1. Upsert College
    let collegeId = crypto.randomUUID();
    const [colRows] = await conn.query("SELECT id FROM colleges WHERE name = ?", [collegeName]);
    if (Array.isArray(colRows) && colRows.length > 0) {
      collegeId = (colRows[0] as any).id;
      await conn.query(
        "UPDATE colleges SET stream = ?, degree_type = ? WHERE id = ?",
        [stream, degreeType, collegeId]
      );
    } else {
      await conn.query(
        "INSERT INTO colleges (id, name, stream, degree_type) VALUES (?, ?, ?, ?)",
        [collegeId, collegeName, stream, degreeType]
      );
    }

    // 2. Upsert Department
    let departmentId = crypto.randomUUID();
    const [deptRows] = await conn.query("SELECT id FROM departments WHERE college_id = ? AND name = ?", [collegeId, computed.department]);
    if (Array.isArray(deptRows) && deptRows.length > 0) {
      departmentId = (deptRows[0] as any).id;
    } else {
      await conn.query(
        "INSERT INTO departments (id, college_id, name) VALUES (?, ?, ?)",
        [departmentId, collegeId, computed.department]
      );
    }

    // 3. Upsert Student Identity
    let studentId = (computed as any).id || crypto.randomUUID();
    const [stuRows] = await conn.query("SELECT id FROM students WHERE registration_number = ?", [computed.registrationNumber]);
    if (Array.isArray(stuRows) && stuRows.length > 0) {
      studentId = (stuRows[0] as any).id;
      await conn.query(
        `UPDATE students SET 
          name = ?, email = ?, phone = ?, college_id = ?, department_id = ?, 
          year = ?, stream = ?, degree_type = ?, import_sequence = ?, updated_at = NOW() 
         WHERE id = ?`,
        [
          computed.name, computed.email || null, computed.phone || null, collegeId, departmentId,
          computed.year, stream, degreeType, computed.importSequence || null, studentId
        ]
      );
    } else {
      await conn.query(
        `INSERT INTO students 
          (id, registration_number, name, email, phone, college_id, department_id, year, stream, degree_type, import_sequence) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          studentId, computed.registrationNumber, computed.name, computed.email || null, computed.phone || null,
          collegeId, departmentId, computed.year, stream, degreeType, computed.importSequence || null
        ]
      );
    }

    // 4. Upsert Tier Tables (ON DUPLICATE KEY UPDATE)
    
    // Tier 1: Academic
    await conn.query(
      `INSERT INTO student_academic 
        (student_id, x_marks, xii_marks, ug_percentage, pg_percentage, no_of_arrears, history_of_arrears, ug_semester_marks, pg_semester_marks, x_marksheet_url, xii_marksheet_url) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE 
        x_marks = VALUES(x_marks), xii_marks = VALUES(xii_marks), ug_percentage = VALUES(ug_percentage), pg_percentage = VALUES(pg_percentage), 
        no_of_arrears = VALUES(no_of_arrears), history_of_arrears = VALUES(history_of_arrears), ug_semester_marks = VALUES(ug_semester_marks), 
        pg_semester_marks = VALUES(pg_semester_marks), x_marksheet_url = VALUES(x_marksheet_url), xii_marksheet_url = VALUES(xii_marksheet_url)`,
      [
        studentId, computed.xMarks, computed.xiiMarks, computed.ugPercentage, computed.pgPercentage,
        computed.noOfArrears, computed.historyOfArrears, JSON.stringify(computed.ugSemesterMarks || []),
        JSON.stringify(computed.pgSemesterMarks || []), computed.xMarksheetUrl || null, computed.xiiMarksheetUrl || null
      ]
    );

    // Tier 2: Aptitude
    await conn.query(
      `INSERT INTO student_aptitude (student_id, quants, logical, verbal) 
       VALUES (?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE quants = VALUES(quants), logical = VALUES(logical), verbal = VALUES(verbal)`,
      [studentId, computed.quants, computed.logical, computed.verbal]
    );

    // Tier 2: Communication
    await conn.query(
      `INSERT INTO student_communication (student_id, cefr_grammar, ef_set_listening, ef_set_speaking, ef_set_reading, ef_set_writing, cert_urls) 
       VALUES (?, ?, ?, ?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE 
        cefr_grammar = VALUES(cefr_grammar), ef_set_listening = VALUES(ef_set_listening), ef_set_speaking = VALUES(ef_set_speaking), 
        ef_set_reading = VALUES(ef_set_reading), ef_set_writing = VALUES(ef_set_writing), cert_urls = VALUES(cert_urls)`,
      [
        studentId, computed.cefrGrammar, computed.efSetListening, computed.efSetSpeaking,
        computed.efSetReading, computed.efSetWriting, JSON.stringify(computed.certUrls || {})
      ]
    );

    // Tier 3: Technical
    await conn.query(
      `INSERT INTO student_technical 
        (student_id, leetcode_rank, leetcode_url, github_url, fop_assessment, dsa_assessment, internal_codeathon, external_codeathon, github_projects, full_length_projects, internal_codeathon_details, external_codeathon_details, full_length_project_details) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE 
        leetcode_rank = VALUES(leetcode_rank), leetcode_url = VALUES(leetcode_url), github_url = VALUES(github_url), 
        fop_assessment = VALUES(fop_assessment), dsa_assessment = VALUES(dsa_assessment), internal_codeathon = VALUES(internal_codeathon), 
        external_codeathon = VALUES(external_codeathon), github_projects = VALUES(github_projects), full_length_projects = VALUES(full_length_projects), 
        internal_codeathon_details = VALUES(internal_codeathon_details), external_codeathon_details = VALUES(external_codeathon_details), 
        full_length_project_details = VALUES(full_length_project_details)`,
      [
        studentId, computed.leetcodeRank ? String(computed.leetcodeRank) : "", computed.leetcodeUrl, computed.githubUrl,
        computed.fopAssessment, computed.dsaAssessment, computed.internalCodeathon, computed.externalCodeathon,
        computed.githubProjects, computed.fullLengthProjects, JSON.stringify(computed.internalCodeathonDetails || []),
        JSON.stringify(computed.externalCodeathonDetails || []), JSON.stringify(computed.fullLengthProjectDetails || [])
      ]
    );

    // Tier 4: Industry
    await conn.query(
      `INSERT INTO student_industry (student_id, global_certification, other_certifications, global_cert_details, other_cert_details) 
       VALUES (?, ?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE 
        global_certification = VALUES(global_certification), other_certifications = VALUES(other_certifications), 
        global_cert_details = VALUES(global_cert_details), other_cert_details = VALUES(other_cert_details)`,
      [
        studentId, computed.globalCertification, computed.otherCertifications,
        JSON.stringify(computed.globalCertDetails || []), JSON.stringify(computed.otherCertDetails || [])
      ]
    );

    // Scores
    await conn.query(
      `INSERT INTO student_scores 
        (student_id, x_score, xii_score, ug_score, academic_aggregate, no_of_arrears_score, history_arrears_score, standing_arrears, quants_score, logical_score, verbal_score, aptitude_total, cefr_grammar_score, ef_listening_score, ef_speaking_score, ef_reading_score, ef_writing_score, communication_total, coding_practice, coding_assessment, codeathon_hackathon, mini_projects, full_length_project_score, global_cert_score, other_cert_score, academic_regulatory, cognitive_linguistic, technical_proficiency, industry_validation, hire_score) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE 
        x_score = VALUES(x_score), xii_score = VALUES(xii_score), ug_score = VALUES(ug_score), academic_aggregate = VALUES(academic_aggregate), 
        no_of_arrears_score = VALUES(no_of_arrears_score), history_arrears_score = VALUES(history_arrears_score), standing_arrears = VALUES(standing_arrears), 
        quants_score = VALUES(quants_score), logical_score = VALUES(logical_score), verbal_score = VALUES(verbal_score), 
        aptitude_total = VALUES(aptitude_total), cefr_grammar_score = VALUES(cefr_grammar_score), ef_listening_score = VALUES(ef_listening_score), 
        ef_speaking_score = VALUES(ef_speaking_score), ef_reading_score = VALUES(ef_reading_score), ef_writing_score = VALUES(ef_writing_score), 
        communication_total = VALUES(communication_total), coding_practice = VALUES(coding_practice), coding_assessment = VALUES(coding_assessment), 
        codeathon_hackathon = VALUES(codeathon_hackathon), mini_projects = VALUES(mini_projects), full_length_project_score = VALUES(full_length_project_score), 
        global_cert_score = VALUES(global_cert_score), other_cert_score = VALUES(other_cert_score), academic_regulatory = VALUES(academic_regulatory), 
        cognitive_linguistic = VALUES(cognitive_linguistic), technical_proficiency = VALUES(technical_proficiency), 
        industry_validation = VALUES(industry_validation), hire_score = VALUES(hire_score)`,
      [
        studentId, computed.xScore, computed.xiiScore, computed.ugScore, computed.academicAggregate,
        computed.noOfArrearsScore, computed.historyArrearsScore, computed.standingArrears, computed.quantsScore,
        computed.logicalScore, computed.verbalScore, computed.aptitudeTotal, computed.cefrGrammarScore,
        computed.efListeningScore, computed.efSpeakingScore, computed.efReadingScore, computed.efWritingScore,
        computed.communicationTotal, computed.codingPractice, computed.codingAssessment, computed.codeathonHackathon,
        computed.miniProjects, computed.fullLengthProjectScore, computed.globalCertScore, computed.otherCertScore,
        computed.academicRegulatory, computed.cognitiveLinguistic, computed.technicalProficiency,
        computed.industryValidation, computed.hireScore
      ]
    );

    await conn.commit();

    const [resRows] = await conn.query("SELECT * FROM student_full_view WHERE id = ?", [studentId]);
    return fromRow((resRows as any[])[0]);

  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function bulkUpsert(
  records: (StudentData & { college?: string })[]
): Promise<StoredStudent[]> {
  const results: StoredStudent[] = [];
  const BATCH = 50;

  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    const batchWithSequence = batch.map((record, batchIndex) => ({
      ...record,
      importSequence: i + batchIndex + 1
    }));
    const batchResults = await Promise.all(batchWithSequence.map((r) => upsertStudent(r)));
    results.push(...batchResults);
  }

  return results;
}

export async function recalculateAllScores(): Promise<number> {
  const students = await getAllStudents();
  if (students.length === 0) return 0;

  const pool = getPool();
  const conn = await pool.getConnection();
  await conn.beginTransaction();

  try {
    for (const student of students) {
      const computed = computeScores(student);
      await conn.query(
        `UPDATE student_scores SET 
          x_score = ?, xii_score = ?, ug_score = ?, academic_aggregate = ?, no_of_arrears_score = ?, 
          history_arrears_score = ?, standing_arrears = ?, quants_score = ?, logical_score = ?, verbal_score = ?, 
          aptitude_total = ?, cefr_grammar_score = ?, ef_listening_score = ?, ef_speaking_score = ?, ef_reading_score = ?, 
          ef_writing_score = ?, communication_total = ?, coding_practice = ?, coding_assessment = ?, codeathon_hackathon = ?, 
          mini_projects = ?, full_length_project_score = ?, global_cert_score = ?, other_cert_score = ?, academic_regulatory = ?, 
          cognitive_linguistic = ?, technical_proficiency = ?, industry_validation = ?, hire_score = ? 
         WHERE student_id = ?`,
        [
          computed.xScore, computed.xiiScore, computed.ugScore, computed.academicAggregate, computed.noOfArrearsScore,
          computed.historyArrearsScore, computed.standingArrears, computed.quantsScore, computed.logicalScore, computed.verbalScore,
          computed.aptitudeTotal, computed.cefrGrammarScore, computed.efListeningScore, computed.efSpeakingScore, computed.efReadingScore,
          computed.efWritingScore, computed.communicationTotal, computed.codingPractice, computed.codingAssessment, computed.codeathonHackathon,
          computed.miniProjects, computed.fullLengthProjectScore, computed.globalCertScore, computed.otherCertScore, computed.academicRegulatory,
          computed.cognitiveLinguistic, computed.technicalProficiency, computed.industryValidation, computed.hireScore,
          student.id
        ]
      );
    }
    await conn.commit();
    return students.length;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function deleteStudentById(id: string): Promise<boolean> {
  const pool = getPool();
  const [res] = await pool.query("DELETE FROM students WHERE id = ?", [id]);
  return ((res as any).affectedRows || 0) > 0;
}

export async function deleteByRange(range: string): Promise<number> {
  const pool = getPool();
  const match = range.trim().match(/^(\d+)(?:-(\d+))?$/);
  if (!match) return 0;

  const from = parseInt(match[1]) - 1;
  const count = match[2] ? parseInt(match[2]) - from : 1;

  const [rows] = await pool.query(
    "SELECT id FROM students ORDER BY created_at ASC LIMIT ? OFFSET ?",
    [count, from]
  );
  if (!Array.isArray(rows) || rows.length === 0) return 0;

  const ids = (rows as any[]).map((r) => r.id);
  const [res] = await pool.query(
    `DELETE FROM students WHERE id IN (${ids.map(() => "?").join(",")})`,
    ids
  );
  return (res as any).affectedRows || 0;
}

// ── Settings ──────────────────────────────────────────────────────────────────

export async function getSettingsFromDb(): Promise<Record<string, unknown> | null> {
  const pool = getPool();
  const [rows] = await pool.query("SELECT value FROM settings WHERE `key` = 'main'");
  if (Array.isArray(rows) && rows.length > 0) {
    const row = rows[0] as any;
    return parseJSON(row.value);
  }
  return null;
}

export async function saveSettingsToDb(value: Record<string, unknown>): Promise<void> {
  const pool = getPool();
  await pool.query(
    "INSERT INTO settings (`key`, value) VALUES ('main', ?) ON DUPLICATE KEY UPDATE value = ?",
    [JSON.stringify(value), JSON.stringify(value)]
  );
}

// ── Share tokens ──────────────────────────────────────────────────────────────

export async function getAllShareTokens(): Promise<ShareTokenRow[]> {
  const pool = getPool();
  const [rows] = await pool.query("SELECT * FROM share_tokens ORDER BY created_at DESC");
  return (rows as any[]).map(r => ({
    ...r,
    colleges: parseJSON(r.colleges) || [],
    courses: parseJSON(r.courses) || [],
    years: parseJSON(r.years) || [],
  }));
}

export async function getShareTokenByToken(token: string): Promise<ShareTokenRow | null> {
  const pool = getPool();
  const [rows] = await pool.query("SELECT * FROM share_tokens WHERE token = ?", [token]);
  if (Array.isArray(rows) && rows.length > 0) {
    const r = rows[0] as any;
    return {
      ...r,
      colleges: parseJSON(r.colleges) || [],
      courses: parseJSON(r.courses) || [],
      years: parseJSON(r.years) || [],
    };
  }
  return null;
}

export async function createShareToken(opts: {
  colleges: string[];
  courses: string[];
  years: string[];
}): Promise<ShareTokenRow> {
  const pool = getPool();
  const id = crypto.randomUUID();
  const token = crypto.randomUUID().replace(/-/g, "");
  
  // Format current time as MySQL DATETIME: 'YYYY-MM-DD HH:MM:SS'
  const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
  
  const row = {
    id,
    college_name: opts.colleges[0] ?? "",
    colleges: opts.colleges,
    courses: opts.courses,
    years: opts.years,
    token,
    created_at: createdAt,
    last_accessed: null,
  };

  await pool.query(
    `INSERT INTO share_tokens (id, college_name, colleges, courses, years, token, created_at, last_accessed) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, row.college_name, JSON.stringify(row.colleges), JSON.stringify(row.courses), 
      JSON.stringify(row.years), token, createdAt, null
    ]
  );

  return row;
}

export async function updateShareToken(
  id: string,
  opts: { colleges: string[]; courses: string[]; years: string[] }
): Promise<void> {
  const pool = getPool();
  await pool.query(
    "UPDATE share_tokens SET college_name = ?, colleges = ?, courses = ?, years = ? WHERE id = ?",
    [opts.colleges[0] ?? "", JSON.stringify(opts.colleges), JSON.stringify(opts.courses), JSON.stringify(opts.years), id]
  );
}

export async function touchShareToken(token: string): Promise<void> {
  const pool = getPool();
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  await pool.query("UPDATE share_tokens SET last_accessed = ? WHERE token = ?", [now, token]);
}

export async function deleteShareToken(id: string): Promise<void> {
  const pool = getPool();
  await pool.query("DELETE FROM share_tokens WHERE id = ?", [id]);
}

// ── Audit Log ─────────────────────────────────────────────────────────────────

export async function logSubmission(
  registrationNumber: string,
  actionType: string,
  payload: any
): Promise<void> {
  try {
    const pool = getPool();
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    await pool.query(
      `INSERT INTO student_submissions_log 
        (id, action_type, created_at, name, registration_number, department, year, phone, email, college, stream, degree_type, 
         x_marks, xii_marks, ug_percentage, pg_percentage, no_of_arrears, history_of_arrears, x_marksheet_url, xii_marksheet_url, 
         ug_semester_marks, pg_semester_marks, ef_set_listening, ef_set_speaking, ef_set_reading, ef_set_writing, cert_urls, 
         leetcode_rank, leetcode_url, github_url, fop_assessment, dsa_assessment, internal_codeathon, external_codeathon, 
         github_projects, full_length_projects, internal_codeathon_details, external_codeathon_details, full_length_project_details, 
         global_certification, other_certifications, global_cert_details, other_cert_details, cefr_grammar) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, actionType, createdAt, payload.name, registrationNumber, payload.department, payload.year, payload.phone, payload.email,
        payload.college, payload.stream, payload.degreeType, payload.xMarks, payload.xiiMarks, payload.ugPercentage, payload.pgPercentage,
        payload.noOfArrears, payload.historyOfArrears, payload.xMarksheetUrl, payload.xiiMarksheetUrl,
        JSON.stringify(payload.ugSemesterMarks || []), JSON.stringify(payload.pgSemesterMarks || []),
        payload.efSetListening, payload.efSetSpeaking, payload.efSetReading, payload.efSetWriting, JSON.stringify(payload.certUrls || {}),
        payload.leetcodeRank ? String(payload.leetcodeRank) : "", payload.leetcodeUrl, payload.githubUrl,
        payload.fopAssessment, payload.dsaAssessment, payload.internalCodeathon, payload.externalCodeathon,
        payload.githubProjects, payload.fullLengthProjects, JSON.stringify(payload.internalCodeathonDetails || []),
        JSON.stringify(payload.externalCodeathonDetails || []), JSON.stringify(payload.fullLengthProjectDetails || []),
        payload.globalCertification, payload.otherCertifications, JSON.stringify(payload.globalCertDetails || []),
        JSON.stringify(payload.otherCertDetails || []), payload.cefrGrammar
      ]
    );
  } catch (error: any) {
    console.error("Failed to log submission:", error.message);
  }
}

// ── Refactoring Helper Operations ─────────────────────────────────────────────

export async function syncStudentsDegreeTypeInDb(settings: any): Promise<void> {
  const pool = getPool();
  for (const col of settings.colleges) {
    const [colRows] = await pool.query("SELECT id FROM colleges WHERE name = ?", [col.name]);
    if (!Array.isArray(colRows) || colRows.length === 0) continue;
    const collegeId = (colRows[0] as any).id;

    for (const co of col.courses) {
      const [deptRows] = await pool.query("SELECT id FROM departments WHERE college_id = ? AND name = ?", [collegeId, co.name]);
      if (!Array.isArray(deptRows) || deptRows.length === 0) continue;
      const deptId = (deptRows[0] as any).id;

      await pool.query(
        "UPDATE students SET degree_type = ? WHERE college_id = ? AND department_id = ?",
        [co.degreeType, collegeId, deptId]
      );
    }
  }
}

export async function renameDepartmentInDb(collegeName: string, oldName: string, newName: string): Promise<number> {
  const pool = getPool();
  const [colRows] = await pool.query("SELECT id FROM colleges WHERE name = ?", [collegeName]);
  if (!Array.isArray(colRows) || colRows.length === 0) {
    throw new Error("College not found");
  }
  const collegeId = (colRows[0] as any).id;

  const [res] = await pool.query(
    "UPDATE departments SET name = ? WHERE college_id = ? AND name = ?",
    [newName, collegeId, oldName]
  );
  return (res as any).affectedRows || 0;
}

/**
 * db.supabase.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Drop-in replacement for lib/db.ts using Supabase (Postgres) instead of
 * SQLite + better-sqlite3.
 *
 * HOW TO SWITCH:
 *   1. Install:  npm install @supabase/supabase-js
 *   2. Add to .env.local:
 *        NEXT_PUBLIC_SUPABASE_URL=https://<project-id>.supabase.co
 *        SUPABASE_SERVICE_ROLE_KEY=<service-role-key>   ← use service role, NOT publishable key
 *   3. Run the SQL schema below in Supabase SQL Editor (one-time setup).
 *   4. Rename this file to db.ts  (and back up / remove the old SQLite db.ts).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SUPABASE SQL SCHEMA  (run once in Supabase → SQL Editor)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *   -- Students table
 *   CREATE TABLE IF NOT EXISTS students (
 *     id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
 *     college      TEXT NOT NULL DEFAULT '',
 *     created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
 *     data         JSONB NOT NULL
 *   );
 *   CREATE INDEX IF NOT EXISTS idx_students_reg
 *     ON students ((data->>'registrationNumber'));
 *   CREATE INDEX IF NOT EXISTS idx_students_college
 *     ON students (college);
 *
 *   -- Settings table
 *   CREATE TABLE IF NOT EXISTS settings (
 *     key   TEXT PRIMARY KEY,
 *     value JSONB NOT NULL
 *   );
 *
 *   -- Share tokens table
 *   CREATE TABLE IF NOT EXISTS share_tokens (
 *     id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
 *     college_name  TEXT NOT NULL DEFAULT '',
 *     colleges      JSONB NOT NULL DEFAULT '[]',
 *     courses       JSONB NOT NULL DEFAULT '[]',
 *     years         JSONB NOT NULL DEFAULT '[]',
 *     token         TEXT NOT NULL UNIQUE,
 *     created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
 *     last_accessed TIMESTAMPTZ
 *   );
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { StudentData } from "./types";
import { computeScores } from "./formulas";

// ── Types ─────────────────────────────────────────────────────────────────────

export type StoredStudent = StudentData & {
  id: string;
  college: string;
  createdAt: string;
};

// ── Supabase client (server-side only — uses service role key) ────────────────

declare global {
  // eslint-disable-next-line no-var
  var __supabaseClient: SupabaseClient | undefined;
}

export function getSupabase(): SupabaseClient {
  if (global.__supabaseClient) return global.__supabaseClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set."
    );
  }

  global.__supabaseClient = createClient(url, key, {
    auth: { persistSession: false },
  });

  return global.__supabaseClient;
}

// ── Row ↔ StoredStudent helpers ───────────────────────────────────────────────

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

function fromRow(row: any): StoredStudent {
  return {
    ...row,
    id: row.id,
    college: row.college || "",
    createdAt: row.created_at,
    leetcodeRank: parseRankNum(row.leetcodeRank),
    cefrGrammar: cleanCEFR(row.cefrGrammar),
    efSetListening: cleanCEFR(row.efSetListening),
    efSetSpeaking: cleanCEFR(row.efSetSpeaking),
    efSetReading: cleanCEFR(row.efSetReading),
    efSetWriting: cleanCEFR(row.efSetWriting),
  };
}

// ── Public API — mirrors lib/db.ts exactly ────────────────────────────────────

/**
 * Get all students ordered by import sequence (if available), then by creation date ascending.
 * Uses the unified view student_full_view.
 */
export async function getAllStudents(): Promise<StoredStudent[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("student_full_view")
    .select("*")
    .order("importSequence", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error(`getAllStudents: ${error.message}`);
  
  return (data as any[]).map(fromRow);
}

/**
 * Get a single student by their internal UUID.
 */
export async function getStudentById(id: string): Promise<StoredStudent | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("student_full_view")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`getStudentById: ${error.message}`);
  return data ? fromRow(data) : null;
}

/**
 * Get students filtered by college, courses, and/or years.
 */
export async function getStudentsFiltered(opts: {
  colleges?: string[];
  college?: string;
  courses?: string[];
  years?: string[];
  degreeType?: string;
} = {}): Promise<StoredStudent[]> {
  const sb = getSupabase();
  let query = sb.from("student_full_view").select("*");

  // College filter
  const colleges = opts.colleges?.length
    ? opts.colleges
    : opts.college
    ? [opts.college]
    : [];
  if (colleges.length > 0) {
    query = query.in("college", colleges);
  }

  // Course (Department) filter
  if (opts.courses?.length) {
    query = query.in("department", opts.courses);
  }

  // Year filter
  if (opts.years?.length) {
    query = query.in("year", opts.years);
  }

  // Degree Type filter
  if (opts.degreeType && opts.degreeType !== "all") {
    query = query.eq("degreeType", opts.degreeType);
  }

  const { data, error } = await query.order("importSequence", { ascending: true }).order("created_at", { ascending: true });
  if (error) throw new Error(`getStudentsFiltered: ${error.message}`);

  return (data as any[]).map(fromRow);
}

/**
 * Insert or update a single student (upsert by registrationNumber).
 * Since this now spans multiple tables, we use a series of upserts.
 * For production, consider using a Supabase RPC to wrap this in a transaction.
 */
export async function upsertStudent(
  input: StudentData & { college?: string }
): Promise<StoredStudent> {
  const sb = getSupabase();
  const computed = computeScores(input);
  const collegeName = input.college || "";
  const stream = input.stream || "engineering";
  const degreeType = input.degreeType || "ug";

  // 1. Upsert College
  const { data: colData, error: colErr } = await sb
    .from("colleges")
    .upsert({ name: collegeName, stream, degree_type: degreeType }, { onConflict: "name" })
    .select("id")
    .single();
  if (colErr) throw new Error(`upsertStudent (college): ${colErr.message}`);
  const collegeId = colData.id;

  // 2. Upsert Department
  const { data: deptData, error: deptErr } = await sb
    .from("departments")
    .upsert({ college_id: collegeId, name: computed.department }, { onConflict: "college_id, name" })
    .select("id")
    .single();
  if (deptErr) throw new Error(`upsertStudent (dept): ${deptErr.message}`);
  const departmentId = deptData.id;

  // 3. Upsert Student Identity
  const studentPayload = {
    registration_number: computed.registrationNumber,
    name: computed.name,
    email: computed.email || null,
    phone: computed.phone || null,
    college_id: collegeId,
    department_id: departmentId,
    year: computed.year,
    stream: stream,
    degree_type: degreeType,
    import_sequence: computed.importSequence || null,
    updated_at: new Date().toISOString()
  };

  const { data: stuData, error: stuErr } = await sb
    .from("students")
    .upsert(studentPayload, { onConflict: "registration_number" })
    .select("id, created_at")
    .single();
  if (stuErr) throw new Error(`upsertStudent (identity): ${stuErr.message}`);
  const studentId = stuData.id;

  // 4. Update Tier Tables in parallel
  const promises = [
    sb.from("student_academic").upsert({
      student_id: studentId,
      x_marks: computed.xMarks,
      xii_marks: computed.xiiMarks,
      ug_percentage: computed.ugPercentage,
      pg_percentage: computed.pgPercentage,
      no_of_arrears: computed.noOfArrears,
      history_of_arrears: computed.historyOfArrears,
      ug_semester_marks: computed.ugSemesterMarks || [],
      pg_semester_marks: computed.pgSemesterMarks || [],
      x_marksheet_url: computed.xMarksheetUrl || null,
      xii_marksheet_url: computed.xiiMarksheetUrl || null
    }),
    sb.from("student_aptitude").upsert({
      student_id: studentId,
      quants: computed.quants,
      logical: computed.logical,
      verbal: computed.verbal
    }),
    sb.from("student_communication").upsert({
      student_id: studentId,
      cefr_grammar: computed.cefrGrammar,
      ef_set_listening: computed.efSetListening,
      ef_set_speaking: computed.efSetSpeaking,
      ef_set_reading: computed.efSetReading,
      ef_set_writing: computed.efSetWriting,
      cert_urls: computed.certUrls || {}
    }),
    sb.from("student_technical").upsert({
      student_id: studentId,
      leetcode_rank: computed.leetcodeRank ? String(computed.leetcodeRank) : "",
      leetcode_url: computed.leetcodeUrl,
      github_url: computed.githubUrl,
      fop_assessment: computed.fopAssessment,
      dsa_assessment: computed.dsaAssessment,
      internal_codeathon: computed.internalCodeathon,
      external_codeathon: computed.externalCodeathon,
      github_projects: computed.githubProjects,
      full_length_projects: computed.fullLengthProjects,
      internal_codeathon_details: computed.internalCodeathonDetails || [],
      external_codeathon_details: computed.externalCodeathonDetails || [],
      full_length_project_details: computed.fullLengthProjectDetails || []
    }),
    sb.from("student_industry").upsert({
      student_id: studentId,
      global_certification: computed.globalCertification,
      other_certifications: computed.otherCertifications,
      global_cert_details: computed.globalCertDetails || [],
      other_cert_details: computed.otherCertDetails || []
    }),
    sb.from("student_scores").upsert({
      student_id: studentId,
      x_score: computed.xScore,
      xii_score: computed.xiiScore,
      ug_score: computed.ugScore,
      academic_aggregate: computed.academicAggregate,
      no_of_arrears_score: computed.noOfArrearsScore,
      history_arrears_score: computed.historyArrearsScore,
      standing_arrears: computed.standingArrears,
      quants_score: computed.quantsScore,
      logical_score: computed.logicalScore,
      verbal_score: computed.verbalScore,
      aptitude_total: computed.aptitudeTotal,
      cefr_grammar_score: computed.cefrGrammarScore,
      ef_listening_score: computed.efListeningScore,
      ef_speaking_score: computed.efSpeakingScore,
      ef_reading_score: computed.efReadingScore,
      ef_writing_score: computed.efWritingScore,
      communication_total: computed.communicationTotal,
      coding_practice: computed.codingPractice,
      coding_assessment: computed.codingAssessment,
      codeathon_hackathon: computed.codeathonHackathon,
      mini_projects: computed.miniProjects,
      full_length_project_score: computed.fullLengthProjectScore,
      global_cert_score: computed.globalCertScore,
      other_cert_score: computed.otherCertScore,
      academic_regulatory: computed.academicRegulatory,
      cognitive_linguistic: computed.cognitiveLinguistic,
      technical_proficiency: computed.technicalProficiency,
      industry_validation: computed.industryValidation,
      hire_score: computed.hireScore
    })
  ];

  const results = await Promise.all(promises);
  const err = results.find(r => r.error);
  if (err) throw new Error(`upsertStudent (tier update): ${err.error?.message}`);

  // 5. Return full record
  return {
    ...computed,
    id: studentId,
    college: collegeName,
    createdAt: stuData.created_at
  };
}

/**
 * Bulk insert/update students. Processes in batches of 50 for performance.
 */
export async function bulkUpsert(
  records: (StudentData & { college?: string })[]
): Promise<StoredStudent[]> {
  const results: StoredStudent[] = [];

  // Process in batches to avoid overwhelming the connection
  const BATCH = 50;
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    // Add import sequence number to maintain Excel order
    const batchWithSequence = batch.map((record, batchIndex) => ({
      ...record,
      importSequence: i + batchIndex + 1 // 1-based sequence number
    }));
    const batchResults = await Promise.all(batchWithSequence.map((r) => upsertStudent(r)));
    results.push(...batchResults);
  }

  return results;
}

/**
 * Recalculate all scores in memory and save to database in a bulk query.
 */
export async function recalculateAllScores(): Promise<number> {
  const sb = getSupabase();
  const students = await getAllStudents();
  if (students.length === 0) return 0;

  const scoresToUpsert = students.map((student) => {
    const computed = computeScores(student);
    return {
      student_id: student.id,
      x_score: computed.xScore,
      xii_score: computed.xiiScore,
      ug_score: computed.ugScore,
      academic_aggregate: computed.academicAggregate,
      no_of_arrears_score: computed.noOfArrearsScore,
      history_arrears_score: computed.historyArrearsScore,
      standing_arrears: computed.standingArrears,
      quants_score: computed.quantsScore,
      logical_score: computed.logicalScore,
      verbal_score: computed.verbalScore,
      aptitude_total: computed.aptitudeTotal,
      cefr_grammar_score: computed.cefrGrammarScore,
      ef_listening_score: computed.efListeningScore,
      ef_speaking_score: computed.efSpeakingScore,
      ef_reading_score: computed.efReadingScore,
      ef_writing_score: computed.efWritingScore,
      communication_total: computed.communicationTotal,
      coding_practice: computed.codingPractice,
      coding_assessment: computed.codingAssessment,
      codeathon_hackathon: computed.codeathonHackathon,
      mini_projects: computed.miniProjects,
      full_length_project_score: computed.fullLengthProjectScore,
      global_cert_score: computed.globalCertScore,
      other_cert_score: computed.otherCertScore,
      academic_regulatory: computed.academicRegulatory,
      cognitive_linguistic: computed.cognitiveLinguistic,
      technical_proficiency: computed.technicalProficiency,
      industry_validation: computed.industryValidation,
      hire_score: computed.hireScore,
    };
  });

  const { error } = await sb.from("student_scores").upsert(scoresToUpsert);
  if (error) throw new Error(`recalculateAllScores: ${error.message}`);

  return students.length;
}


/**
 * Delete a student by their internal UUID.
 */
export async function deleteStudentById(id: string): Promise<boolean> {
  const sb = getSupabase();
  const { error, count } = await sb
    .from("students")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) throw new Error(`deleteStudentById: ${error.message}`);
  return (count ?? 0) > 0;
}

/**
 * Delete students by 1-based row range (e.g. "1-10", "5").
 * Matches the SQLite version's behaviour.
 */
export async function deleteByRange(range: string): Promise<number> {
  const sb = getSupabase();
  const match = range.trim().match(/^(\d+)(?:-(\d+))?$/);
  if (!match) return 0;

  const from = parseInt(match[1]) - 1;          // 0-based offset
  const count = match[2] ? parseInt(match[2]) - from : 1;

  // Fetch the IDs in that range
  const { data, error: fetchErr } = await sb
    .from("students")
    .select("id")
    .order("created_at", { ascending: true })
    .range(from, from + count - 1);

  if (fetchErr) throw new Error(`deleteByRange (fetch): ${fetchErr.message}`);
  if (!data?.length) return 0;

  const ids = (data as { id: string }[]).map((r) => r.id);
  const { error: delErr, count: deleted } = await sb
    .from("students")
    .delete({ count: "exact" })
    .in("id", ids);

  if (delErr) throw new Error(`deleteByRange (delete): ${delErr.message}`);
  return deleted ?? 0;
}

// ── Settings ──────────────────────────────────────────────────────────────────

/**
 * Read the main settings object.
 */
export async function getSettingsFromDb(): Promise<Record<string, unknown> | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("settings")
    .select("value")
    .eq("key", "main")
    .maybeSingle();

  if (error) throw new Error(`getSettingsFromDb: ${error.message}`);
  return data ? (data.value as Record<string, unknown>) : null;
}

/**
 * Save the main settings object.
 */
export async function saveSettingsToDb(value: Record<string, unknown>): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from("settings")
    .upsert({ key: "main", value }, { onConflict: "key" });

  if (error) throw new Error(`saveSettingsToDb: ${error.message}`);
}

// ── Share tokens ──────────────────────────────────────────────────────────────

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

export async function getAllShareTokens(): Promise<ShareTokenRow[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("share_tokens")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`getAllShareTokens: ${error.message}`);
  return (data ?? []) as ShareTokenRow[];
}

export async function getShareTokenByToken(token: string): Promise<ShareTokenRow | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("share_tokens")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (error) throw new Error(`getShareTokenByToken: ${error.message}`);
  return data as ShareTokenRow | null;
}

export async function createShareToken(opts: {
  colleges: string[];
  courses: string[];
  years: string[];
}): Promise<ShareTokenRow> {
  const sb = getSupabase();
  const row = {
    id: crypto.randomUUID(),
    college_name: opts.colleges[0] ?? "",
    colleges: opts.colleges,
    courses: opts.courses,
    years: opts.years,
    token: crypto.randomUUID().replace(/-/g, ""),
    created_at: new Date().toISOString(),
    last_accessed: null,
  };

  const { error } = await sb.from("share_tokens").insert(row);
  if (error) throw new Error(`createShareToken: ${error.message}`);
  return row;
}

export async function updateShareToken(
  id: string,
  opts: { colleges: string[]; courses: string[]; years: string[] }
): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from("share_tokens")
    .update({
      college_name: opts.colleges[0] ?? "",
      colleges: opts.colleges,
      courses: opts.courses,
      years: opts.years,
    })
    .eq("id", id);

  if (error) throw new Error(`updateShareToken: ${error.message}`);
}

export async function touchShareToken(token: string): Promise<void> {
  const sb = getSupabase();
  await sb
    .from("share_tokens")
    .update({ last_accessed: new Date().toISOString() })
    .eq("token", token);
}

export async function deleteShareToken(id: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from("share_tokens").delete().eq("id", id);
  if (error) throw new Error(`deleteShareToken: ${error.message}`);
}

// ── Audit Log ─────────────────────────────────────────────────────────────────

export async function logSubmission(
  registrationNumber: string,
  actionType: string,
  payload: any
): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from("student_submissions_log").insert({
    action_type: actionType,
    name: payload.name,
    registration_number: registrationNumber,
    department: payload.department,
    year: payload.year,
    phone: payload.phone,
    email: payload.email,
    college: payload.college,
    stream: payload.stream,
    degree_type: payload.degreeType,
    x_marks: payload.xMarks,
    xii_marks: payload.xiiMarks,
    ug_percentage: payload.ugPercentage,
    pg_percentage: payload.pgPercentage,
    no_of_arrears: payload.noOfArrears,
    history_of_arrears: payload.historyOfArrears,
    x_marksheet_url: payload.xMarksheetUrl,
    xii_marksheet_url: payload.xiiMarksheetUrl,
    ug_semester_marks: payload.ugSemesterMarks,
    pg_semester_marks: payload.pgSemesterMarks,
    cefr_grammar: payload.cefrGrammar,
    ef_set_listening: payload.efSetListening,
    ef_set_speaking: payload.efSetSpeaking,
    ef_set_reading: payload.efSetReading,
    ef_set_writing: payload.efSetWriting,
    cert_urls: payload.certUrls,
    leetcode_rank: payload.leetcodeRank ? String(payload.leetcodeRank) : "",
    leetcode_url: payload.leetcodeUrl,
    github_url: payload.githubUrl,
    fop_assessment: payload.fopAssessment,
    dsa_assessment: payload.dsaAssessment,
    internal_codeathon: payload.internalCodeathon,
    external_codeathon: payload.externalCodeathon,
    github_projects: payload.githubProjects,
    full_length_projects: payload.fullLengthProjects,
    internal_codeathon_details: payload.internalCodeathonDetails,
    external_codeathon_details: payload.externalCodeathonDetails,
    full_length_project_details: payload.fullLengthProjectDetails,
    global_certification: payload.globalCertification,
    other_certifications: payload.otherCertifications,
    global_cert_details: payload.globalCertDetails,
    other_cert_details: payload.otherCertDetails,
  });
  if (error) console.error("Failed to log submission:", error.message);
}


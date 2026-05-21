-- ─────────────────────────────────────────────────────────────────────────────
-- HIRE Score — New Normalized Schema (v3)
-- Finalized based on API review and StudentData interface
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Colleges & Departments
CREATE TABLE IF NOT EXISTS colleges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    stream TEXT CHECK (stream IN ('engineering', 'arts')) NOT NULL DEFAULT 'engineering',
    degree_type TEXT CHECK (degree_type IN ('ug', 'pg')) NOT NULL DEFAULT 'ug',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id UUID REFERENCES colleges(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    UNIQUE(college_id, name)
);

-- 2. Students (Identity & Profile)
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_number TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    college_id UUID REFERENCES colleges(id),
    department_id UUID REFERENCES departments(id),
    year TEXT NOT NULL,
    stream TEXT CHECK (stream IN ('engineering', 'arts')) NOT NULL DEFAULT 'engineering',
    degree_type TEXT CHECK (degree_type IN ('ug', 'pg')) NOT NULL DEFAULT 'ug',
    import_sequence INTEGER,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_students_reg_no ON students (registration_number);
CREATE INDEX IF NOT EXISTS idx_students_college_id ON students (college_id);
CREATE INDEX IF NOT EXISTS idx_students_dept_id ON students (department_id);

-- 3. Raw Data Tables (Split by Tier)

-- Tier 1: Academic
CREATE TABLE IF NOT EXISTS student_academic (
    student_id UUID PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
    x_marks NUMERIC DEFAULT 0,
    xii_marks NUMERIC DEFAULT 0,
    ug_percentage NUMERIC DEFAULT 0,
    pg_percentage NUMERIC,
    no_of_arrears INTEGER DEFAULT 0,
    history_of_arrears INTEGER DEFAULT 0,
    ug_semester_marks JSONB DEFAULT '[]', -- [{semester: string, percentage: number, fileUrl?: string}]
    pg_semester_marks JSONB DEFAULT '[]',
    x_marksheet_url TEXT,
    xii_marksheet_url TEXT
);

-- Tier 2: Aptitude
CREATE TABLE IF NOT EXISTS student_aptitude (
    student_id UUID PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
    quants NUMERIC DEFAULT 0,
    logical NUMERIC DEFAULT 0,
    verbal NUMERIC DEFAULT 0
);

-- Tier 2: Communication
CREATE TABLE IF NOT EXISTS student_communication (
    student_id UUID PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
    cefr_a1_grammar TEXT,
    cefr_a2_grammar TEXT,
    ef_set_listening TEXT,
    ef_set_speaking TEXT,
    ef_set_reading TEXT,
    ef_set_writing TEXT,
    cert_urls JSONB DEFAULT '{}' -- {cefrA1: string, cefrA2: string, ...}
);

-- Tier 3: Technical
CREATE TABLE IF NOT EXISTS student_technical (
    student_id UUID PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
    leetcode_rank NUMERIC,
    leetcode_url TEXT,
    github_url TEXT,
    fop_assessment NUMERIC DEFAULT 0,
    dsa_assessment NUMERIC DEFAULT 0,
    internal_codeathon NUMERIC DEFAULT 0,
    external_codeathon NUMERIC DEFAULT 0,
    github_projects NUMERIC DEFAULT 0,
    full_length_projects NUMERIC DEFAULT 0,
    internal_codeathon_details JSONB DEFAULT '[]', -- [{title, description, link, fileUrl}]
    external_codeathon_details JSONB DEFAULT '[]',
    full_length_project_details JSONB DEFAULT '[]'
);

-- Tier 4: Industry
CREATE TABLE IF NOT EXISTS student_industry (
    student_id UUID PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
    global_certification NUMERIC DEFAULT 0,
    other_certifications NUMERIC DEFAULT 0,
    global_cert_details JSONB DEFAULT '[]', -- [{name, issuer, link, fileUrl}]
    other_cert_details JSONB DEFAULT '[]'
);

-- 4. Computed Scores (Cached for performance)
CREATE TABLE IF NOT EXISTS student_scores (
    student_id UUID PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
    x_score NUMERIC,
    xii_score NUMERIC,
    ug_score NUMERIC,
    academic_aggregate NUMERIC,
    no_of_arrears_score NUMERIC,
    history_arrears_score NUMERIC,
    standing_arrears NUMERIC,
    quants_score NUMERIC,
    logical_score NUMERIC,
    verbal_score NUMERIC,
    aptitude_total NUMERIC,
    cefr_a1_score NUMERIC,
    cefr_a2_score NUMERIC,
    ef_listening_score NUMERIC,
    ef_speaking_score NUMERIC,
    ef_reading_score NUMERIC,
    ef_writing_score NUMERIC,
    communication_total NUMERIC,
    coding_practice NUMERIC,
    coding_assessment NUMERIC,
    codeathon_hackathon NUMERIC,
    mini_projects NUMERIC,
    full_length_project_score NUMERIC,
    global_cert_score NUMERIC,
    other_cert_score NUMERIC,
    academic_regulatory NUMERIC,
    cognitive_linguistic NUMERIC,
    technical_proficiency NUMERIC,
    industry_validation NUMERIC,
    hire_score NUMERIC
);

-- 5. Share Tokens & Settings
CREATE TABLE IF NOT EXISTS share_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_name TEXT NOT NULL DEFAULT '',
    colleges JSONB NOT NULL DEFAULT '[]',
    courses JSONB NOT NULL DEFAULT '[]',
    years JSONB NOT NULL DEFAULT '[]',
    token TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_accessed TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL
);

-- 6. Unified View for Application (Maps database structure back to StudentData interface)
CREATE OR REPLACE VIEW student_full_view AS
SELECT 
    s.id,
    s.registration_number as "registrationNumber",
    s.name,
    s.email,
    s.phone,
    s.year,
    s.stream,
    s.degree_type as "degreeType",
    s.import_sequence as "importSequence",
    s.created_at,
    s.updated_at,
    c.name as college,
    d.name as department,
    a.x_marks as "xMarks",
    a.xii_marks as "xiiMarks",
    a.ug_percentage as "ugPercentage",
    a.pg_percentage as "pgPercentage",
    a.no_of_arrears as "noOfArrears",
    a.history_of_arrears as "historyOfArrears",
    a.ug_semester_marks as "ugSemesterMarks",
    a.pg_semester_marks as "pgSemesterMarks",
    a.x_marksheet_url as "xMarksheetUrl",
    a.xii_marksheet_url as "xiiMarksheetUrl",
    apt.quants,
    apt.logical,
    apt.verbal,
    comm.cefr_a1_grammar as "cefrA1Grammar",
    comm.cefr_a2_grammar as "cefrA2Grammar",
    comm.ef_set_listening as "efSetListening",
    comm.ef_set_speaking as "efSetSpeaking",
    comm.ef_set_reading as "efSetReading",
    comm.ef_set_writing as "efSetWriting",
    comm.cert_urls as "certUrls",
    tech.leetcode_rank as "leetcodeRank",
    tech.leetcode_url as "leetcodeUrl",
    tech.github_url as "githubUrl",
    tech.fop_assessment as "fopAssessment",
    tech.dsa_assessment as "dsaAssessment",
    tech.internal_codeathon as "internalCodeathon",
    tech.external_codeathon as "externalCodeathon",
    tech.github_projects as "githubProjects",
    tech.full_length_projects as "fullLengthProjects",
    tech.internal_codeathon_details as "internalCodeathonDetails",
    tech.external_codeathon_details as "externalCodeathonDetails",
    tech.full_length_project_details as "fullLengthProjectDetails",
    ind.global_certification as "globalCertification",
    ind.other_certifications as "otherCertifications",
    ind.global_cert_details as "globalCertDetails",
    ind.other_cert_details as "otherCertDetails",
    sc.x_score as "xScore",
    sc.xii_score as "xiiScore",
    sc.ug_score as "ugScore",
    sc.academic_aggregate as "academicAggregate",
    sc.no_of_arrears_score as "noOfArrearsScore",
    sc.history_arrears_score as "historyArrearsScore",
    sc.standing_arrears as "standingArrears",
    sc.quants_score as "quantsScore",
    sc.logical_score as "logicalScore",
    sc.verbal_score as "verbalScore",
    sc.aptitude_total as "aptitudeTotal",
    sc.cefr_a1_score as "cefrA1Score",
    sc.cefr_a2_score as "cefrA2Score",
    sc.ef_listening_score as "efListeningScore",
    sc.ef_speaking_score as "efSpeakingScore",
    sc.ef_reading_score as "efReadingScore",
    sc.ef_writing_score as "efWritingScore",
    sc.communication_total as "communicationTotal",
    sc.coding_practice as "codingPractice",
    sc.coding_assessment as "codingAssessment",
    sc.codeathon_hackathon as "codeathonHackathon",
    sc.mini_projects as "miniProjects",
    sc.full_length_project_score as "fullLengthProjectScore",
    sc.global_cert_score as "globalCertScore",
    sc.other_cert_score as "otherCertScore",
    sc.academic_regulatory as "academicRegulatory",
    sc.cognitive_linguistic as "cognitiveLinguistic",
    sc.technical_proficiency as "technicalProficiency",
    sc.industry_validation as "industryValidation",
    sc.hire_score as "hireScore"
FROM students s
LEFT JOIN colleges c ON s.college_id = c.id
LEFT JOIN departments d ON s.department_id = d.id
LEFT JOIN student_academic a ON s.id = a.student_id
LEFT JOIN student_aptitude apt ON s.id = apt.student_id
LEFT JOIN student_communication comm ON s.id = comm.student_id
LEFT JOIN student_technical tech ON s.id = tech.student_id
LEFT JOIN student_industry ind ON s.id = ind.student_id
LEFT JOIN student_scores sc ON s.id = sc.student_id;

-- 7. Audit Log for Form Submissions (Flat Structure)
CREATE TABLE IF NOT EXISTS student_submissions_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Identity & Profile
    name TEXT,
    registration_number TEXT,
    department TEXT,
    year TEXT,
    phone TEXT,
    email TEXT,
    college TEXT,
    stream TEXT,
    degree_type TEXT,

    -- Tier 1: Academic raw
    x_marks NUMERIC,
    xii_marks NUMERIC,
    ug_percentage NUMERIC,
    pg_percentage NUMERIC,
    no_of_arrears INTEGER,
    history_of_arrears INTEGER,
    x_marksheet_url TEXT,
    xii_marksheet_url TEXT,
    ug_semester_marks JSONB,
    pg_semester_marks JSONB,

    -- Tier 2: Communication raw
    cefr_a1_grammar TEXT,
    cefr_a2_grammar TEXT,
    ef_set_listening TEXT,
    ef_set_speaking TEXT,
    ef_set_reading TEXT,
    ef_set_writing TEXT,
    cert_urls JSONB,

    -- Tier 3: Technical raw
    leetcode_rank NUMERIC,
    leetcode_url TEXT,
    github_url TEXT,
    fop_assessment NUMERIC,
    dsa_assessment NUMERIC,
    internal_codeathon NUMERIC,
    external_codeathon NUMERIC,
    github_projects NUMERIC,
    full_length_projects NUMERIC,
    internal_codeathon_details JSONB,
    external_codeathon_details JSONB,
    full_length_project_details JSONB,

    -- Tier 4: Industry raw
    global_certification NUMERIC,
    other_certifications NUMERIC,
    global_cert_details JSONB,
    other_cert_details JSONB
);


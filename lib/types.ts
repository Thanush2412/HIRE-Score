// ── Raw input fields ──────────────────────────────────────────────────────────

export interface StudentData {
  // Identity
  name: string;
  registrationNumber: string;
  department: string;
  year: string;
  phone?: string;
  email?: string;

  // Tier 1 – Academic raw
  xMarks: number;
  xiiMarks: number;
  ugPercentage: number;
  ugSemesterMarks?: { semester: string; percentage: number; fileUrl?: string }[];
  pgPercentage: number | null;
  pgSemesterMarks?: { semester: string; percentage: number; fileUrl?: string }[];
  noOfArrears: number;
  historyOfArrears: number;

  // Tier 2 – Aptitude raw (excluded from import — formula-only in Excel)
  quants: number;
  logical: number;
  verbal: number;

  // Tier 2 – Communication raw
  cefrA1Grammar: string;
  cefrA2Grammar: string;
  efSetListening: string;
  efSetSpeaking: string;
  efSetReading: string;
  efSetWriting: string;

  // Tier 3 – Technical raw
  leetcodeRank: string;
  leetcodeUrl: string;
  githubUrl: string;
  fopAssessment: number;
  dsaAssessment: number;
  internalCodeathon: number;
  externalCodeathon: number;
  githubProjects: number;
  fullLengthProjects: number;

  // Tier 4 – Industry raw
  globalCertification: number;
  otherCertifications: number;

  // ── Computed scores (formula columns) ────────────────────────────────────

  // Tier 1 Academic scores
  xScore: number;           // col 29 – X Score (15)
  xiiScore: number;         // col 30 – XII Score (15)
  ugScore: number;          // col 31 – UG Score (70)
  academicAggregate: number;// col 32 – Academic Aggregate (100)
  noOfArrearsScore: number; // col 33 – No. of arrears (40)
  historyArrearsScore: number; // col 34 – History of arrears (10)
  standingArrears: number;  // col 35 – Standing Arrears (50)

  // Tier 2 Aptitude scores
  quantsScore: number;      // col 36 – Quants (50)
  logicalScore: number;     // col 37 – Logical (50)
  verbalScore: number;      // col 38 – Verbal (50)
  aptitudeTotal: number;    // col 39 – Aptitude (150)

  // Tier 2 Communication scores
  cefrA1Score: number;      // col 40
  cefrA2Score: number;      // col 41
  efListeningScore: number; // col 42
  efSpeakingScore: number;  // col 43
  efReadingScore: number;   // col 44
  efWritingScore: number;   // col 45
  communicationTotal: number; // col 46 – Communication (150)

  // Tier 3 Technical scores
  codingPractice: number;   // col 47 – Coding Practice (125)
  codingAssessment: number; // col 48 – Coding Assessment (175)
  codeathonHackathon: number; // col 49 – Codeathon & Hackathon (50)
  miniProjects: number;     // col 50 – Mini Projects (30)
  fullLengthProjectScore: number; // col 51 – Full Length Project (20)
  globalCertScore: number;  // col 52 – Global Certification (100)
  otherCertScore: number;   // col 53 – Other Certifications (50)

  // Tier totals
  academicRegulatory: number;       // col 54 – Academic & Regulatory (150)
  cognitiveLinguistic: number;      // col 55 – Cognitive & Linguistic (300)
  technicalProficiency: number;     // col 56 – Technical Proficiency (400)
  industryValidation: number;       // col 57 – Industry Validation (150)

  // Final
  hireScore: number;                // col 58 – HIRE Score

  // Profile extras (not scored)
  college?: string;
  stream?: "engineering" | "arts"; // determines year-wise max denominators
  degreeType?: "ug" | "pg";
  importSequence?: number; // maintains Excel import order
  fullLengthProjectDetails?: { title: string; description: string; link: string; fileUrl?: string }[];
  globalCertDetails?: { name: string; issuer: string; link: string; fileUrl?: string }[];
  otherCertDetails?: { name: string; issuer: string; link: string; fileUrl?: string }[];

  // Document URLs (stored in Supabase Storage)
  xMarksheetUrl?: string;
  xiiMarksheetUrl?: string;
  certUrls?: {
    cefrA1?: string;
    cefrA2?: string;
    efListening?: string;
    efSpeaking?: string;
    efReading?: string;
    efWriting?: string;
  };
  internalCodeathonDetails?: { title: string; description: string; link: string; fileUrl?: string }[];
  externalCodeathonDetails?: { title: string; description: string; link: string; fileUrl?: string }[];
}

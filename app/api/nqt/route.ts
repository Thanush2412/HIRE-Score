import { NextRequest, NextResponse } from "next/server";
import { getPool, getAllNqtAssessmentsFromDb, getStudentsByRegNos } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const regNoFilter = searchParams.get("regNo")?.trim().toLowerCase();
    const collegeFilter = searchParams.get("college")?.trim().toLowerCase();
    const departmentFilter = searchParams.get("department")?.trim().toLowerCase();

    // 1. Fetch persisted NQT assessment batches from MySQL DB
    const savedAssessments = await getAllNqtAssessmentsFromDb();

    // 2. Extract student attempts exclusively from uploaded NQT assessments
    const attemptsMap = new Map<string, any[]>();
    const allRegNos = new Set<string>();

    savedAssessments.forEach((ass: any) => {
      const assessmentName = ass.assessmentName || "FACE NQT Assessment";
      const uploadedAt = ass.uploadedAt || ass.conductedDate || new Date().toISOString();
      const students = Array.isArray(ass.students) ? ass.students : [];

      students.forEach((st: any) => {
        let regClean = String(st.registrationNumber || "").trim();
        if (regClean.endsWith(".0")) regClean = regClean.slice(0, -2);
        const emailClean = String(st.email || "").trim().toLowerCase();
        const nameClean = String(st.name || "").trim().toLowerCase();

        const studentKey = regClean.toLowerCase() || emailClean || nameClean;
        if (!studentKey) return;

        if (regClean) allRegNos.add(regClean);

        const num = Number(st.numerical || 0);
        const verb = Number(st.verbal || 0);
        const reas = Number(st.reasoning || 0);
        const adv = Number(st.advQuant || 0);
        const apt = st.aptitude !== undefined && st.aptitude !== null 
          ? Number(st.aptitude) 
          : Math.round(((num + verb + reas + adv) / 4) * 100) / 100;
        const coding = Number(st.coding || 0);
        const overall = st.overall !== undefined && st.overall !== null 
          ? Number(st.overall) 
          : Math.round(((apt + coding) / 2) * 100) / 100;

        const attemptObj = {
          ...st,
          registrationNumber: regClean || st.registrationNumber || "",
          numerical: num,
          verbal: verb,
          reasoning: reas,
          advQuant: adv,
          aptitude: apt,
          coding: coding,
          overall: overall,
          assessmentName,
          assessmentId: ass.id,
          uploadedAt,
        };

        const existing = attemptsMap.get(studentKey) || [];
        existing.push(attemptObj);
        attemptsMap.set(studentKey, existing);
      });
    });

    // 3. Match Hire DB records for metadata & include students with non-zero NQT scores in DB
    const pool = getPool();
    const dbStudentsMap = new Map<string, any>();

    try {
      const [dbScoreRows] = await pool.query(`
        SELECT registrationNumber, name, email, department, college, quants, logical, verbal, fopAssessment, dsaAssessment, hireScore
        FROM student_full_view
        WHERE (quants > 0 OR logical > 0 OR verbal > 0 OR fopAssessment > 0 OR dsaAssessment > 0)
      `);

      (dbScoreRows as any[]).forEach(s => {
        let regClean = String(s.registrationNumber || "").trim();
        if (regClean.endsWith(".0")) regClean = regClean.slice(0, -2);
        const emailClean = String(s.email || "").trim().toLowerCase();
        const nameClean = String(s.name || "").trim().toLowerCase();

        const key = regClean.toLowerCase() || emailClean || nameClean;
        if (!key) return;

        if (regClean) dbStudentsMap.set(regClean.toLowerCase(), s);
        if (emailClean) dbStudentsMap.set(emailClean, s);

        if (!attemptsMap.has(key)) {
          const num = Number(s.quants || 0);
          const verb = Number(s.verbal || 0);
          const reas = Number(s.logical || 0);
          const adv = Number(s.fopAssessment || 0);
          const apt = Math.round(((num + verb + reas + adv) / 4) * 100) / 100;
          const coding = Number(s.dsaAssessment || 0);
          const overall = Math.round(((apt + coding) / 2) * 100) / 100;

          attemptsMap.set(key, [{
            registrationNumber: s.registrationNumber || "",
            name: s.name || "",
            email: s.email || "",
            department: s.department || "",
            college: s.college || "",
            numerical: num,
            verbal: verb,
            reasoning: reas,
            advQuant: adv,
            aptitude: apt,
            coding: coding,
            overall: overall,
            assessmentName: "FACE NQT Assessment (Recorded)",
            assessmentId: `db-${s.registrationNumber || s.email}`,
            uploadedAt: new Date().toISOString(),
          }]);
        }
      });

      if (allRegNos.size > 0) {
        const matchedDbStudents = await getStudentsByRegNos(Array.from(allRegNos));
        matchedDbStudents.forEach(s => {
          if (s.registrationNumber) {
            dbStudentsMap.set(s.registrationNumber.trim().toLowerCase(), s);
          }
          if (s.email) {
            dbStudentsMap.set(s.email.trim().toLowerCase(), s);
          }
        });
      }
    } catch (e) {
      console.warn("Could not match DB students metadata for NQT:", e);
    }

    // 4. Consolidate NQT student records
    const consolidatedStudents: any[] = [];

    attemptsMap.forEach((attempts, key) => {
      attempts.sort((a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime());
      
      const firstAttempt = attempts[0];
      const latestAttempt = attempts[attempts.length - 1];

      // Try matching Hire DB metadata
      const regKey = String(latestAttempt.registrationNumber || "").trim().toLowerCase();
      const emailKey = String(latestAttempt.email || "").trim().toLowerCase();
      const dbMatch = dbStudentsMap.get(regKey) || dbStudentsMap.get(emailKey);

      const regNo = dbMatch?.registrationNumber || latestAttempt.registrationNumber || "";
      const name = dbMatch?.name || latestAttempt.name || "Unknown Student";
      const email = dbMatch?.email || latestAttempt.email || "";
      const department = dbMatch?.department || latestAttempt.department || "";
      const college = dbMatch?.college || latestAttempt.college || "";
      const hireScore = dbMatch?.hireScore ?? null;

      const studentSummary = {
        key,
        registrationNumber: regNo,
        name,
        email,
        department,
        college,
        hireScore,
        numerical: latestAttempt.numerical,
        verbal: latestAttempt.verbal,
        reasoning: latestAttempt.reasoning,
        advQuant: latestAttempt.advQuant,
        aptitude: latestAttempt.aptitude,
        coding: latestAttempt.coding,
        overall: latestAttempt.overall,
        firstOverall: firstAttempt.overall,
        latestOverall: latestAttempt.overall,
        deltaOverall: Math.round((latestAttempt.overall - firstAttempt.overall) * 100) / 100,
        attemptsCount: attempts.length,
        attempts,
        matchedDbStudent: !!dbMatch,
      };

      // Apply Filters if provided
      if (regNoFilter) {
        const matchesReg = regNo.toLowerCase().includes(regNoFilter) || 
                           email.toLowerCase().includes(regNoFilter) ||
                           name.toLowerCase().includes(regNoFilter);
        if (!matchesReg) return;
      }

      if (collegeFilter && college.toLowerCase() !== collegeFilter) {
        return;
      }

      if (departmentFilter && department.toLowerCase() !== departmentFilter) {
        return;
      }

      consolidatedStudents.push(studentSummary);
    });

    // Sort students alphabetically by name
    consolidatedStudents.sort((a, b) => a.name.localeCompare(b.name));

    // 5. Calculate summary statistics based strictly on uploaded NQT data
    const totalCount = consolidatedStudents.length;
    const avgAptitude = totalCount > 0
      ? Math.round((consolidatedStudents.reduce((acc, s) => acc + s.aptitude, 0) / totalCount) * 100) / 100
      : 0;
    const avgCoding = totalCount > 0
      ? Math.round((consolidatedStudents.reduce((acc, s) => acc + s.coding, 0) / totalCount) * 100) / 100
      : 0;
    const avgOverall = totalCount > 0
      ? Math.round((consolidatedStudents.reduce((acc, s) => acc + s.overall, 0) / totalCount) * 100) / 100
      : 0;

    return NextResponse.json({
      success: true,
      totalStudents: totalCount,
      totalAssessments: savedAssessments.length,
      summary: {
        totalEvaluated: totalCount,
        averageAptitude: avgAptitude,
        averageCoding: avgCoding,
        averageOverall: avgOverall,
      },
      students: consolidatedStudents,
      assessments: savedAssessments,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch NQT API data" },
      { status: 500 }
    );
  }
}



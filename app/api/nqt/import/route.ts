import { NextRequest, NextResponse } from "next/server";
import { parseFpcNqtExcel } from "@/lib/nqt-parser";
import { getPool, saveNqtAssessmentToDb, updateStudentNqtScoresInDb } from "@/lib/db";
import { FpcNqtStudentResult } from "@/lib/nqt-types";
import { cleanRegNo } from "@/lib/excel-utils";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const assessments = parseFpcNqtExcel(buffer, file.name);

    if (assessments.length === 0) {
      return NextResponse.json({ error: "No valid assessment data found in file" }, { status: 400 });
    }

    // Fetch DB students for matching
    const pool = getPool();
    const [allDbStudents] = await pool.query(
      `SELECT id, registrationNumber, name, email, department, college FROM student_full_view`
    );

    const dbEmailMap = new Map<string, { id: string; registrationNumber: string; email?: string; name: string; department?: string; college?: string }>();
    const dbRegMap = new Map<string, { id: string; registrationNumber: string; email?: string; name: string; department?: string; college?: string }>();

    (allDbStudents as any[]).forEach(s => {
      if (s.email) {
        dbEmailMap.set(String(s.email).trim().toLowerCase(), s);
      }
      if (s.registrationNumber) {
        const cleanedReg = cleanRegNo(s.registrationNumber).toLowerCase();
        if (cleanedReg) dbRegMap.set(cleanedReg, s);
      }
    });

    for (const ass of assessments) {
      if (ass.students && ass.students.length > 0) {
        ass.students = ass.students.map((st): FpcNqtStudentResult => {
          const emailClean = String(st.email || "").trim().toLowerCase();
          const regClean = cleanRegNo(st.registrationNumber).toLowerCase();

          // PRIMARY KEY: Prioritize Registration Number first, fallback to Email
          let dbMatch = (regClean ? dbRegMap.get(regClean) : undefined) || (emailClean ? dbEmailMap.get(emailClean) : undefined);

          if (dbMatch) {
            // Asynchronously update student NQT section scores in MySQL DB
            updateStudentNqtScoresInDb(dbMatch.id, {
              quants: st.numerical,
              verbal: st.verbal,
              logical: st.reasoning,
              fopAssessment: st.advQuant,
              dsaAssessment: st.coding
            }).catch(e => console.error("Sync error for " + dbMatch?.registrationNumber + ":", e));

            return {
              ...st,
              registrationNumber: dbMatch.registrationNumber || cleanRegNo(st.registrationNumber) || "",
              email: dbMatch.email || st.email || "",
              name: dbMatch.name || st.name || "",
              department: dbMatch.department || st.department || "",
              college: dbMatch.college || st.college || "",
              matchedDbStudent: true,
            };
          }
          return {
            ...st,
            registrationNumber: cleanRegNo(st.registrationNumber) || st.registrationNumber || "",
            matchedDbStudent: false,
          };
        });
      }

      // Persist the NQT assessment record into MySQL DB table `nqt_assessments`
      await saveNqtAssessmentToDb(ass);
    }

    return NextResponse.json({ assessments, success: true, savedToDb: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to process NQT file" }, { status: 500 });
  }
}


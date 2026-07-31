import { NextRequest, NextResponse } from "next/server";
import { parseFpcNqtExcel } from "@/lib/nqt-parser";
import { getPool } from "@/lib/db";
import { FpcNqtStudentResult } from "@/lib/nqt-types";

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

    // Attempt DB matching for student rows if available
    const pool = getPool();
    const [allDbStudents] = await pool.query(
      `SELECT registrationNumber, name, email, department, college FROM student_full_view`
    );

    const dbEmailMap = new Map<string, { registrationNumber: string; email?: string; name: string; department?: string; college?: string }>();
    const dbRegMap = new Map<string, { registrationNumber: string; email?: string; name: string; department?: string; college?: string }>();

    (allDbStudents as any[]).forEach(s => {
      if (s.email) {
        dbEmailMap.set(String(s.email).trim().toLowerCase(), s);
      }
      if (s.registrationNumber) {
        let cleanReg = String(s.registrationNumber).trim().toLowerCase();
        if (cleanReg.endsWith(".0")) cleanReg = cleanReg.slice(0, -2);
        dbRegMap.set(cleanReg, s);
      }
    });

    assessments.forEach(ass => {
      if (ass.students && ass.students.length > 0) {
        ass.students = ass.students.map((st): FpcNqtStudentResult => {
          const emailClean = String(st.email || "").trim().toLowerCase();
          let regClean = String(st.registrationNumber || "").trim().toLowerCase();
          if (regClean.endsWith(".0")) regClean = regClean.slice(0, -2);

          let dbMatch = dbEmailMap.get(emailClean) || dbRegMap.get(regClean);

          if (dbMatch) {
            return {
              ...st,
              registrationNumber: dbMatch.registrationNumber || st.registrationNumber || "",
              email: dbMatch.email || st.email || "",
              name: dbMatch.name || st.name || "",
              department: dbMatch.department || st.department || "",
              college: dbMatch.college || st.college || "",
              matchedDbStudent: true,
            };
          }
          return {
            ...st,
            matchedDbStudent: false,
          };
        });
      }
    });

    return NextResponse.json({ assessments });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to process NQT file" }, { status: 500 });
  }
}

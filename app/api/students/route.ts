import { NextRequest, NextResponse } from "next/server";
import { getAllStudents, getStudentsFiltered, upsertStudent, bulkUpsert, deleteStudentById, deleteByRange } from "@/lib/db";
import { StudentData } from "@/lib/types";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const college = searchParams.get("college") ?? undefined;
    const collegesParam = searchParams.get("colleges");
    const coursesParam = searchParams.get("courses");
    const yearsParam   = searchParams.get("years");
    const degreeType   = searchParams.get("degreeType") ?? undefined;

    const colleges = collegesParam ? JSON.parse(collegesParam) as string[] : undefined;
    const courses  = coursesParam  ? JSON.parse(coursesParam)  as string[] : undefined;
    const years    = yearsParam    ? JSON.parse(yearsParam)    as string[] : undefined;

    const hasFilter = colleges?.length || college || courses?.length || years?.length || (degreeType && degreeType !== "all");

    const students = hasFilter
      ? await getStudentsFiltered({ colleges, college, courses, years, degreeType })
      : await getAllStudents();

    return NextResponse.json(students);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: StudentData & { college?: string } = await req.json();

    // Check if student already exists to return correct status code
    const all = await getAllStudents();
    const existing = all.find(
      s => s.registrationNumber === (body.registrationNumber ?? "").trim()
    );
    
    const student = await upsertStudent(body, existing ? "API_UPDATE" : "API_CREATE");
    return NextResponse.json(student, { status: existing ? 200 : 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { department, college } = await req.json() as { department?: string; college: string };
    const all = await getAllStudents();
    const toUpdate = department ? all.filter(s => s.department === department) : all;
    const updated = await bulkUpsert(toUpdate.map(s => ({ ...s, college })));
    return NextResponse.json({ updated: updated.length });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const range = searchParams.get("range");

    if (id) {
      const ok = await deleteStudentById(id);
      return NextResponse.json({ deleted: ok ? 1 : 0 });
    }
    if (range) {
      const deleted = await deleteByRange(range);
      return NextResponse.json({ deleted });
    }
    return NextResponse.json({ error: "Provide id or range" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

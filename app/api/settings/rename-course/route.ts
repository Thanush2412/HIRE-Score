/**
 * PATCH /api/settings/rename-course
 * Renames a department in the departments table so existing students reflect the new name.
 * Body: { collegeName: string; oldName: string; newName: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/db";

export async function PATCH(req: NextRequest) {
  try {
    const { collegeName, oldName, newName } = await req.json();

    if (!collegeName || !oldName || !newName) {
      return NextResponse.json({ error: "collegeName, oldName and newName are required" }, { status: 400 });
    }

    if (oldName === newName) {
      return NextResponse.json({ ok: true, updated: 0 });
    }

    const sb = getSupabase();

    // Find the college id
    const { data: college, error: colErr } = await sb
      .from("colleges")
      .select("id")
      .eq("name", collegeName)
      .maybeSingle();

    if (colErr) throw new Error(colErr.message);
    if (!college) return NextResponse.json({ error: "College not found" }, { status: 404 });

    // Rename the department row
    const { data, error: deptErr } = await sb
      .from("departments")
      .update({ name: newName })
      .eq("college_id", college.id)
      .eq("name", oldName)
      .select("id");

    if (deptErr) throw new Error(deptErr.message);

    return NextResponse.json({ ok: true, updated: data?.length ?? 0 });
  } catch (err) {
    console.error("[rename-course]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

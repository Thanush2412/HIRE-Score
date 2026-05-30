/**
 * PATCH /api/settings/rename-course
 * Renames a department in the departments table so existing students reflect the new name.
 * Body: { collegeName: string; oldName: string; newName: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { renameDepartmentInDb } from "@/lib/db";

export async function PATCH(req: NextRequest) {
  try {
    const { collegeName, oldName, newName } = await req.json();

    if (!collegeName || !oldName || !newName) {
      return NextResponse.json({ error: "collegeName, oldName and newName are required" }, { status: 400 });
    }

    if (oldName === newName) {
      return NextResponse.json({ ok: true, updated: 0 });
    }

    const updatedRows = await renameDepartmentInDb(collegeName, oldName, newName);

    return NextResponse.json({ ok: true, updated: updatedRows });
  } catch (err) {
    console.error("[rename-course]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

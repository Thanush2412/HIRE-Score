import { NextRequest, NextResponse } from "next/server";
import { getStudentHistory } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const regNo = searchParams.get("regNo");

    if (!regNo) {
      return NextResponse.json({ error: "Missing regNo parameter" }, { status: 400 });
    }

    const history = await getStudentHistory(regNo);
    return NextResponse.json(history);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

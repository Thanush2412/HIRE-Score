import { NextRequest, NextResponse } from "next/server";
import { getAllShareTokens, createShareToken, updateShareToken, deleteShareToken } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const tokens = await getAllShareTokens();
    return NextResponse.json(tokens);
  } catch (e) {
    console.error("GET /api/share-tokens error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { colleges, courses, years } = body;

    if (!colleges || !Array.isArray(colleges) || colleges.length === 0) {
      return NextResponse.json(
        { error: "colleges array is required and must not be empty" },
        { status: 400 }
      );
    }

    const token = await createShareToken({
      colleges,
      courses: courses || [],
      years: years || [],
    });

    return NextResponse.json(token, { status: 201 });
  } catch (e) {
    console.error("POST /api/share-tokens error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, colleges, courses, years } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    if (!colleges || !Array.isArray(colleges) || colleges.length === 0) {
      return NextResponse.json(
        { error: "colleges array is required and must not be empty" },
        { status: 400 }
      );
    }

    await updateShareToken(id, {
      colleges,
      courses: courses || [],
      years: years || [],
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("PATCH /api/share-tokens error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    await deleteShareToken(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/share-tokens error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

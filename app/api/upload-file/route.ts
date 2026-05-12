/**
 * POST /api/upload-file
 * Uploads a file to Supabase Storage and returns the public URL.
 *
 * FormData fields:
 *   file     — the file to upload
 *   path     — storage path e.g. "marksheets/2413421108014/x.pdf"
 *   bucket   — (optional) storage bucket name, defaults to "student-documents"
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "student-documents";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const storagePath = formData.get("path") as string | null;

    if (!file || !storagePath) {
      return NextResponse.json({ error: "Missing file or path" }, { status: 400 });
    }

    // Validate file type
    const allowed = [
      "application/pdf",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "image/jpeg", "image/png", "image/webp",
    ];
    if (!allowed.includes(file.type) && file.type !== "") {
      // Allow empty type (some browsers don't set it for xlsx)
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!["pdf", "xlsx", "xls", "jpg", "jpeg", "png", "webp"].includes(ext ?? "")) {
        return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
      }
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    const sb = getSupabase();
    const buffer = await file.arrayBuffer();

    const { error: uploadError } = await sb.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: true, // overwrite if re-uploading
      });

    if (uploadError) {
      console.error("[upload-file] Storage error:", uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = sb.storage.from(BUCKET).getPublicUrl(storagePath);

    return NextResponse.json({
      url: urlData.publicUrl,
      path: storagePath,
      name: file.name,
      size: file.size,
    });
  } catch (err) {
    console.error("[upload-file] Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

/**
 * POST /api/upload-file
 * Uploads a file directly to your Hostinger server via FTP/SFTP and returns the public URL.
 *
 * FormData fields:
 *   file     — the file to upload
 *   path     — storage path e.g. "2413421108014/marksheets/x.pdf"
 */

import { NextRequest, NextResponse } from "next/server";
import * as ftp from "basic-ftp";
import { Readable } from "stream";
import path from "path";

const FTP_HOST = process.env.FTP_HOST;
const FTP_USER = process.env.FTP_USER;
const FTP_PASSWORD = process.env.FTP_PASSWORD;
const FTP_PORT = parseInt(process.env.FTP_PORT || "21");
const FTP_SECURE = process.env.FTP_SECURE === "true";

// Relative or absolute directory on the FTP server where the uploads folder is located.
// Default assumes the FTP user root is mapped to public_html, so we upload into 'uploads' subfolder.
const FTP_REMOTE_DIR = process.env.FTP_REMOTE_DIR || "uploads";
const BASE_URL = "https://faceprepcampus.com/uploads";

export async function POST(req: NextRequest) {
  console.log("[FTP Debug] Connecting with:", {
    host: FTP_HOST,
    user: FTP_USER,
    password: FTP_PASSWORD,
    port: FTP_PORT,
    secure: FTP_SECURE,
  });
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const storagePath = formData.get("path") as string | null;

    if (!file || !storagePath) {
      return NextResponse.json({ error: "Missing file or path" }, { status: 400 });
    }

    if (!FTP_HOST || !FTP_USER || !FTP_PASSWORD) {
      return NextResponse.json({ 
        error: "FTP configuration is missing. Please set FTP_HOST, FTP_USER, and FTP_PASSWORD in your environment variables." 
      }, { status: 500 });
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

    const buffer = Buffer.from(await file.arrayBuffer());

    // Connect and upload via FTP
    const client = new ftp.Client();
    client.ftp.verbose = false;

    // Normalize paths to Linux-style forward slashes '/'
    const normalizedStoragePath = storagePath.replace(/\\/g, "/");
    
    // Resolve path relative to FTP_REMOTE_DIR config
    let remoteFilePath = normalizedStoragePath;
    if (FTP_REMOTE_DIR && FTP_REMOTE_DIR !== ".") {
      remoteFilePath = `${FTP_REMOTE_DIR}/${normalizedStoragePath}`;
    }
    
    const remoteDir = path.dirname(remoteFilePath).replace(/\\/g, "/");
    const remoteFileName = path.basename(remoteFilePath);

    console.log(`[FTP Upload] Target folder path: ${remoteDir}`);
    console.log(`[FTP Upload] Target file name: ${remoteFileName}`);

    try {
      await client.access({
        host: FTP_HOST,
        user: FTP_USER,
        password: FTP_PASSWORD,
        port: FTP_PORT,
        secure: FTP_SECURE,
      });

      const initialDir = await client.pwd();
      console.log(`[FTP Upload] Connected. Initial FTP working dir: ${initialDir}`);

      // Ensure the directory structure exists on the FTP server
      await client.ensureDir(remoteDir);

      // Convert file buffer to readable stream for basic-ftp
      const stream = Readable.from(buffer);
      await client.uploadFrom(stream, remoteFileName);
      console.log("[FTP Upload] Transfer completed successfully.");
    } finally {
      client.close();
    }

    const publicUrl = `${BASE_URL}/${normalizedStoragePath}`;

    return NextResponse.json({
      url: publicUrl,
      path: storagePath,
      name: file.name,
      size: file.size,
    });
  } catch (err) {
    console.error("[upload-file] FTP Upload Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

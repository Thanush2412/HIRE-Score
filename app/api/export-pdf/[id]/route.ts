import { NextRequest, NextResponse } from "next/server";
import { getStudentById, getAllStudents } from "@/lib/db";
import { buildPdfHtmlV1 } from "@/lib/pdf-html-builder-v1";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [student, allStudents] = await Promise.all([
    getStudentById(id),
    getAllStudents(),
  ]);

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const html = buildPdfHtmlV1(student, allStudents);

  try {
    const puppeteer = (await import("puppeteer")).default;

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 820, height: 4000, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: "networkidle0" });

    const contentHeight = await page.evaluate(() => document.body.scrollHeight);

    const a4W = 794;
    const a4H = 1123;
    const scaleW = a4W / 820;
    const scaledH = contentHeight * scaleW;
    const scale = scaledH > a4H * 0.98 ? (a4H * 0.98 / contentHeight) : scaleW;
    const finalScale = Math.max(0.1, Math.min(2, scale));

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      scale: finalScale,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });

    await browser.close();

    const filename = `HIRE_Score_${student.registrationNumber}_${student.name.replace(/\s+/g, "_")}.pdf`;

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[export-pdf] Puppeteer error:", err);
    return NextResponse.json(
      { error: "PDF generation failed", detail: String(err) },
      { status: 500 }
    );
  }
}

"use client";

import { useRef, useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, Key } from "lucide-react";

import { findBestSheet, findHeaderRow } from "@/lib/excel-utils";

// ── Field definitions ─────────────────────────────────────────────────────────
const PRIMARY_FIELDS = [
  { key: "registrationNumber",  label: "Reg. Number",              primaryKey: true,  headerMatches: ["reg", "registration", "roll", "usn", "register", "student id"] },
  { key: "name",                label: "Name",                     primaryKey: false, headerMatches: ["name", "student name", "candidate name", "full name"] },
  { key: "college",             label: "College",                  primaryKey: false, headerMatches: ["college", "institution", "campus", "inst"] },
  { key: "stream",              label: "Stream (Engg/Arts)",       primaryKey: false, headerMatches: ["stream", "programme type", "program type", "degree"] },
  { key: "department",          label: "Department",               primaryKey: false, headerMatches: ["dept", "department", "branch", "specialization"] },
  { key: "year",                label: "Year",                     primaryKey: false, headerMatches: ["year", "batch"] },
  { key: "phone",               label: "Phone",                    primaryKey: false, headerMatches: ["phone", "mobile", "contact", "cell"] },
  { key: "email",               label: "Email",                    primaryKey: false, headerMatches: ["email", "mail", "e-mail"] },
  { key: "xMarks",              label: "X Marks %",                primaryKey: false, headerMatches: ["x mark", "10th", "sslc", "x %", "x%", "10%"] },
  { key: "xiiMarks",            label: "XII Marks %",              primaryKey: false, headerMatches: ["xii mark", "12th", "hsc", "xii %", "xii%", "12%"] },
  { key: "ugPercentage",        label: "UG %",                     primaryKey: false, headerMatches: ["ug %", "ug%", "ug percentage", "under", "cgpa", "ug mark"] },
  { key: "pgPercentage",        label: "PG %",                     primaryKey: false, headerMatches: ["pg %", "pg%", "pg percentage", "post", "pg mark"] },
  { key: "noOfArrears",         label: "No. of Arrears",           primaryKey: false, headerMatches: ["no. of arrear", "no of arrear", "current arrear", "standing arrear", "arrear count", "arrears"] },
  { key: "historyOfArrears",    label: "History of Arrears",       primaryKey: false, headerMatches: ["history of arrear", "hist arrear", "total arrear", "history arrear"] },
  { key: "cefrGrammar",         label: "CEFR",                     primaryKey: false, headerMatches: ["cefr grammar", "cefr", "grammar"] },
  { key: "efSetListening",      label: "EF SET Listening",         primaryKey: false, headerMatches: ["listening", "ef listen"] },
  { key: "efSetSpeaking",       label: "EF SET Speaking",          primaryKey: false, headerMatches: ["speaking", "ef speak"] },
  { key: "efSetReading",        label: "EF SET Reading",           primaryKey: false, headerMatches: ["reading", "ef read"] },
  { key: "efSetWriting",        label: "EF SET Writing",           primaryKey: false, headerMatches: ["writing", "ef writ"] },
  { key: "internalCodeathon",   label: "Internal Codeathon",       primaryKey: false, headerMatches: ["internal code", "int code", "internal hackathon"] },
  { key: "externalCodeathon",   label: "External Codeathon",       primaryKey: false, headerMatches: ["external code", "ext code", "external hackathon"] },
  { key: "githubProjects",      label: "GitHub Projects",          primaryKey: false, headerMatches: ["github", "git project", "mini project"] },
  { key: "fullLengthProjects",  label: "Full Length Projects",     primaryKey: false, headerMatches: ["full length", "full project", "major project"] },
  { key: "globalCertification", label: "Global Certification",     primaryKey: false, headerMatches: ["global cert", "global certification"] },
  { key: "otherCertifications", label: "Other Certifications",     primaryKey: false, headerMatches: ["other cert", "other certification"] },
] as const;

const SECONDARY_FIELDS = [
  { key: "registrationNumber",  label: "Reg. Number",              primaryKey: true,  headerMatches: ["reg", "registration", "roll", "usn", "register", "student id"] },
  { key: "quants",              label: "Quants",                   primaryKey: false, headerMatches: ["quant", "numerical"] },
  { key: "logical",             label: "Logical",                  primaryKey: false, headerMatches: ["logical", "reasoning", "aptitude"] },
  { key: "verbal",              label: "Verbal",                   primaryKey: false, headerMatches: ["verbal", "english"] },
  { key: "leetcodeRank",        label: "Leetcode Rank",            primaryKey: false, headerMatches: ["leetcode", "leet"] },
  { key: "fopAssessment",       label: "FOP Assessment (75)",      primaryKey: false, headerMatches: ["fop", "programming"] },
  { key: "dsaAssessment",       label: "DSA Assessment (100)",     primaryKey: false, headerMatches: ["dsa", "data structure"] },
] as const;

type FieldDef = { key: string; label: string; primaryKey: boolean; headerMatches: readonly string[] };

// ── Auto-map by matching Excel header text ────────────────────────────────────
function autoMap(headers: string[], fields: readonly FieldDef[]): Record<string, number | "skip"> {
  const mapping: Record<string, number | "skip"> = {};
  const usedCols = new Set<number>();

  for (const field of fields) {
    let found = -1;
    for (const match of field.headerMatches) {
      const idx = headers.findIndex((h, i) => !usedCols.has(i) && h.toLowerCase().includes(match.toLowerCase()));
      if (idx !== -1) {
        found = idx;
        break;
      }
    }
    if (found !== -1) {
      mapping[field.key] = found;
      usedCols.add(found);
    } else {
      mapping[field.key] = "skip";
    }
  }
  return mapping;
}

// Column letter: 0→A, 1→B, 26→AA …
function colLetter(i: number): string {
  if (i < 26) return String.fromCharCode(65 + i);
  return String.fromCharCode(64 + Math.floor(i / 26)) + String.fromCharCode(65 + (i % 26));
}

export function ImportDialog({ open, onClose, onImported, mode }: {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
  mode: "primary" | "secondary";
}) {
  const [file, setFile] = useState<File | null>(null);
  // Two data rows shown as sample (rows 2 and 3 in Excel = index 2 and 3)
  const [sampleRows, setSampleRows] = useState<unknown[][]>([]);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, number | "skip">>({});
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{
    imported?: number;
    updated?: number;
    matched?: number;
    unmatched?: number;
    unmatchedRegNos?: string[];
    totalInFile?: number;
    error?: string;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fields: readonly FieldDef[] = mode === "primary" ? PRIMARY_FIELDS : SECONDARY_FIELDS;

  useEffect(() => {
    if (!open) {
      setFile(null); setSampleRows([]); setExcelHeaders([]);
      setMapping({}); setResult(null); setProgress(0);
    }
  }, [open]);

  const handleFile = (f: File) => {
    setFile(f);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: "array" });
        const { ws } = findBestSheet(wb);
        const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null }) as unknown[][];

        const { headerRowIdx, headers } = findHeaderRow(rows);
        setExcelHeaders(headers);
        setSampleRows(rows.slice(headerRowIdx + 1, headerRowIdx + 3));
        setMapping(autoMap(headers, fields));
      } catch (err: any) {
        setResult({ error: err.message || "Failed to parse Excel file" });
      }
    };
    reader.readAsArrayBuffer(f);
  };

  const upload = async () => {
    if (!file) return;
    setLoading(true); setProgress(20);
    try {
      const fd = new FormData();
      fd.append("file", file);
      // Convert { fieldKey → colIdx } to { colIdx → fieldKey } for the API
      const colToField: Record<number, string> = {};
      for (const [fieldKey, colIdx] of Object.entries(mapping)) {
        if (colIdx !== "skip") colToField[colIdx as number] = fieldKey;
      }
      fd.append("mapping", JSON.stringify(colToField));
      const res = await fetch(
        mode === "primary" ? "/api/import/primary" : "/api/import/secondary",
        { method: "POST", body: fd }
      );
      const data = await res.json();
      setResult(data);
      setProgress(100);
      if (!data.error) {
        onImported();
        if (mode === "primary") {
          setTimeout(() => { onClose(); }, 1600);
        }
      }
    } catch {
      setResult({ error: "Upload failed" });
    } finally {
      setLoading(false);
    }
  };

  const mappedCount = Object.values(mapping).filter(v => v !== "skip").length;
  // Primary key must be mapped before import is allowed
  const pkMapped = fields
    .filter(f => f.primaryKey)
    .every(f => mapping[f.key] !== "skip" && mapping[f.key] !== undefined);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setFile(null); setResult(null); onClose(); } }}>
      <DialogContent className="!max-w-[98vw] !w-[98vw] max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl">

        {/* Header */}
        <div className="px-5 py-3 border-b bg-muted/10 shrink-0">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 flex items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">
                  {mode === "primary" ? "Primary" : "Secondary"} Data Import
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground/80">
                  Columns auto-mapped from row 2 headers · Registration Number is the primary key
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 bg-muted/5 min-h-0">
          {!file ? (
            <div
              className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-muted-foreground/20 rounded-xl hover:bg-primary/[0.02] hover:border-primary/40 transition-all cursor-pointer"
              onClick={() => inputRef.current?.click()}
            >
              <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              <Upload className="h-8 w-8 text-primary/30 mb-2" />
              <p className="text-sm font-semibold text-foreground/70">Select Excel file</p>
              <p className="text-xs text-muted-foreground mt-1">Click to browse · .xlsx / .xls</p>
            </div>
          ) : (
            <div className="space-y-4">

              {/* File info */}
              <div className="flex items-center justify-between p-3 rounded-xl border bg-card">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center font-black text-[10px] shrink-0">XLS</div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">{file.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {excelHeaders.length} columns · {" "}
                      <span className="text-emerald-600 font-medium">{mappedCount} mapped</span>
                      {!pkMapped && <span className="text-red-500 font-medium"> · Reg. Number not mapped</span>}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="h-7 px-3 text-xs shrink-0"
                  onClick={() => { setFile(null); setMapping({}); }}>
                  Change
                </Button>
              </div>

              {/* Mapping table */}
              <div className="rounded-xl border bg-card overflow-hidden">
                {/* Table header */}
                <div className="grid bg-muted/50 border-b text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-3 py-2"
                  style={{ gridTemplateColumns: "180px 1fr 1fr 1fr" }}>
                  <div>App Field</div>
                  <div>Excel Column (Row 2 Header)</div>
                  <div>Sample Row 1</div>
                  <div>Sample Row 2</div>
                </div>

                <div className="divide-y max-h-[55vh] overflow-y-auto">
                  {fields.map((f) => {
                    const sel = mapping[f.key];
                    const colIdx = sel !== "skip" ? (sel as number) : null;
                    const headerName = colIdx !== null ? excelHeaders[colIdx] : null;
                    const sample1 = colIdx !== null ? sampleRows[0]?.[colIdx] : null;
                    const sample2 = colIdx !== null ? sampleRows[1]?.[colIdx] : null;
                    const isMapped = sel !== "skip" && sel !== undefined;
                    const isPK = f.primaryKey;

                    return (
                      <div
                        key={f.key}
                        className={`grid items-center px-3 py-2 gap-3 transition-colors ${
                          isPK
                            ? "bg-primary/5 hover:bg-primary/8"
                            : isMapped
                            ? "hover:bg-muted/20"
                            : "bg-amber-50/50 dark:bg-amber-950/10"
                        }`}
                        style={{ gridTemplateColumns: "180px 1fr 1fr 1fr" }}
                      >
                        {/* App field name */}
                        <div className="flex items-center gap-2 min-w-0">
                          {isPK ? (
                            <Key className="h-3 w-3 text-primary shrink-0" />
                          ) : (
                            <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${isMapped ? "bg-emerald-500" : "bg-amber-400"}`} />
                          )}
                          <span className={`text-xs font-semibold truncate ${isPK ? "text-primary" : "text-foreground/80"}`}>
                            {f.label}
                            {isPK && <span className="ml-1 text-[9px] font-bold text-primary/60 uppercase tracking-wide">PK</span>}
                          </span>
                        </div>

                        {/* Column selector — shows Excel column letter + header name */}
                        <div>
                          <Select
                            value={sel === "skip" ? "skip" : String(sel ?? "skip")}
                            // Primary key field in secondary import cannot be skipped
                            onValueChange={(v) => {
                              if (isPK && mode === "secondary" && v === "skip") return;
                              setMapping(p => ({ ...p, [f.key]: v === "skip" ? "skip" : Number(v) }));
                            }}
                          >
                            <SelectTrigger className={`h-7 text-xs rounded-lg ${
                              isPK && !isMapped ? "border-red-400 dark:border-red-600" :
                              !isMapped ? "border-amber-300 dark:border-amber-700" : ""
                            }`}>
                              <SelectValue>
                                {isMapped && colIdx !== null ? (
                                  <span className="flex items-center gap-1.5">
                                    <span className="font-mono font-bold text-primary text-[11px]">{colLetter(colIdx)}</span>
                                    <span className="text-foreground/70 truncate">{headerName || `Col ${colIdx + 1}`}</span>
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground italic text-[11px]">— not mapped</span>
                                )}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="max-h-64">
                              {!(isPK && mode === "secondary") && (
                                <SelectItem value="skip" className="text-xs italic text-muted-foreground">
                                  — Skip this field
                                </SelectItem>
                              )}
                              {excelHeaders.map((h, i) => (
                                <SelectItem key={i} value={String(i)} className="text-xs">
                                  <span className="font-mono font-bold text-primary w-7 inline-block">{colLetter(i)}</span>
                                  <span className="text-foreground/80">{h}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Sample row 1 */}
                        <div className="text-[11px] font-mono text-muted-foreground truncate">
                          {sample1 != null && sample1 !== ""
                            ? <span className="text-foreground/70">{String(sample1)}</span>
                            : <span className="opacity-25">—</span>}
                        </div>

                        {/* Sample row 2 */}
                        <div className="text-[11px] font-mono text-muted-foreground truncate">
                          {sample2 != null && sample2 !== ""
                            ? <span className="text-foreground/70">{String(sample2)}</span>
                            : <span className="opacity-25">—</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t bg-card flex items-center justify-between shrink-0">
          <Button variant="ghost" size="sm" onClick={() => { setFile(null); setResult(null); onClose(); }}>
            Close
          </Button>
          {file && !result?.error && (
            <div className="flex items-center gap-3">
              {!pkMapped && (
                <span className="text-xs text-red-500">Map Registration Number first</span>
              )}
              <Button size="sm" disabled={loading || !pkMapped} onClick={upload}>
                {loading ? "Importing…" : `Import ${mappedCount} field${mappedCount !== 1 ? "s" : ""}`}
              </Button>
            </div>
          )}
        </div>

        {loading && <Progress value={progress} className="h-1 rounded-none shrink-0" />}

        {result && (
          <div className={`px-5 py-2.5 border-t shrink-0 ${
            result.error ? "bg-red-50 dark:bg-red-950/30" : "bg-emerald-50 dark:bg-emerald-950/30"
          }`}>
            <div className={`flex items-center gap-2 text-xs font-semibold ${
              result.error ? "text-red-600" : "text-emerald-700 dark:text-emerald-400"
            }`}>
              {result.error
                ? <><XCircle className="h-4 w-4 shrink-0" /> {result.error}</>
                : <><CheckCircle2 className="h-4 w-4 shrink-0" />
                    {mode === "secondary"
                      ? `${result.updated ?? 0} updated · ${result.matched ?? 0} matched out of ${result.totalInFile ?? 0} in file${(result.unmatched ?? 0) > 0 ? ` · ${result.unmatched} not found` : ""}`
                      : `Imported ${result.imported ?? result.updated ?? 0} records successfully`
                    }
                  </>
              }
            </div>
            {!result.error && mode === "secondary" && (result.unmatched ?? 0) > 0 && result.unmatchedRegNos && (
              <div className="mt-1 text-[10px] text-amber-600 dark:text-amber-400">
                Not found: {result.unmatchedRegNos.join(", ")}
                {(result.unmatched ?? 0) > result.unmatchedRegNos.length && ` …and ${(result.unmatched ?? 0) - result.unmatchedRegNos.length} more`}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

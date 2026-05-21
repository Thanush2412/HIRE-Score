"use client";

import { useEffect, useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Users, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StudentData } from "@/lib/types";

type Student = StudentData & { id: string; createdAt: string; college?: string };

function getYearMax(year: string, stream?: string): number {
  const y = year.toLowerCase().trim();
  const isArts = (stream ?? "").toLowerCase() === "arts";
  if (y.includes("fresh") || y === "1" || y.includes("first") || y.includes("1st")) return 450;
  if (y === "2" || y.includes("second") || y.includes("2nd")) return isArts ? 700 : 600;
  if (y === "3" || y.includes("third") || y.includes("3rd")) return isArts ? 1000 : 850;
  return 1000;
}

function getTierMaxes(year: string, stream?: string): { academic: number; cognitive: number; technical: number; industry: number } {
  const y = year.toLowerCase().trim();
  const isArts = (stream ?? "").toLowerCase() === "arts";
  if (y.includes("fresh") || y === "1" || y.includes("first") || y.includes("1st")) {
    return { academic: 150, cognitive: 300, technical: 0,   industry: 0   };
  }
  if (y === "2" || y.includes("second") || y.includes("2nd")) {
    return isArts
      ? { academic: 150, cognitive: 300, technical: 150, industry: 100 }
      : { academic: 150, cognitive: 300, technical: 150, industry: 0   };
  }
  if (y === "3" || y.includes("third") || y.includes("3rd")) {
    return isArts
      ? { academic: 150, cognitive: 300, technical: 400, industry: 150 }
      : { academic: 150, cognitive: 300, technical: 300, industry: 100 };
  }
  return { academic: 150, cognitive: 300, technical: 400, industry: 150 };
}

function CefrBadge({ val }: { val: string }) {
  if (!val) return <span className="text-muted-foreground/40">—</span>;
  const color =
    val === "C2" || val === "C1" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" :
    val === "B2" || val === "B1" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" :
    "bg-muted text-muted-foreground";
  return <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${color}`}>{val}</span>;
}

function ScoreBadge({ score, max }: { score: number; max: number }) {
  const pct = score / max;
  const color = pct >= 0.7
    ? "text-emerald-700 bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-400"
    : pct >= 0.5
    ? "text-amber-700 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-400"
    : "text-red-700 bg-red-100 dark:bg-red-900/40 dark:text-red-400";
  return (
    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${color}`}>
      {score}<span className="opacity-50 font-normal">/{max}</span>
    </span>
  );
}

function getMissingData(s: StudentData) {
  const missing: string[] = [];
  if (!s.phone) missing.push("Phone");
  if (!s.email) missing.push("Email");
  if (!s.cefrGrammar) missing.push("CEFR Grammar");
  if (!s.efSetListening) missing.push("EF Listen");
  if (!s.efSetSpeaking) missing.push("EF Speak");
  if (!s.efSetReading) missing.push("EF Read");
  if (!s.efSetWriting) missing.push("EF Write");
  if (!s.leetcodeRank) missing.push("Leetcode");
  if (!s.fopAssessment) missing.push("FOP");
  if (!s.dsaAssessment) missing.push("DSA");
  if (!s.internalCodeathon && s.internalCodeathon !== 0) missing.push("Int. Codeathon");
  if (!s.externalCodeathon && s.externalCodeathon !== 0) missing.push("Ext. Codeathon");
  if (!s.fullLengthProjects && s.fullLengthProjects !== 0) missing.push("Full Projects");
  if (!s.globalCertification && s.globalCertification !== 0) missing.push("Global Cert");
  return missing;
}

export function StudentsTable({ refresh }: { refresh?: number }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/students");
      setStudents(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStudents(); }, [refresh]);

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.registrationNumber.toLowerCase().includes(search.toLowerCase()) ||
      s.department.toLowerCase().includes(search.toLowerCase())
  );

  const headers = [
    // Identity
    "Name", "Reg. No.", "Dept", "Year", "Stream", "Phone", "Email",
    // Academic
    "X%", "XII%", "UG%", "PG%", "Arrears", "Hist. Arrears",
    // Language
    "CEFR Grammar", "EF Listen", "EF Speak", "EF Read", "EF Write",
    // Technical
    "LeetCode URL", "GitHub URL", "Leetcode Rank", "FOP", "DSA",
    "Int. Codeathon", "Ext. Codeathon",
    "GitHub Projects", "Full Projects", "Global Certs", "Other Certs",
    // Scores — dynamic labels set per-row, header is generic
    "Academic", "Cognitive", "Technical", "Industry", "HIRE Score (year-adj.)",
    // Missing
    "Missing Data",
  ];

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">All Students</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {students.length} student{students.length !== 1 ? "s" : ""} registered
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search name, reg no, dept…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm w-56"
            />
          </div>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={fetchStudents} title="Refresh">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <Card className="shadow-none border overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-5 space-y-2.5">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-9 w-full rounded-md" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">
                {search ? "No students match your search" : "No students yet"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {search ? "Try a different search term" : "Add students manually or import from Excel"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    {headers.map((h) => (
                      <TableHead
                        key={h}
                        className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap py-2.5"
                      >
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s, idx) => {
                    const yearMax = getYearMax(s.year, s.stream);
                    const tierMaxes = getTierMaxes(s.year, s.stream);
                    const hirePct = s.hireScore / yearMax;
                    const hireColor =
                      hirePct >= 0.70
                        ? "text-emerald-700 bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-400"
                        : hirePct >= 0.50
                        ? "text-amber-700 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-400"
                        : "text-red-700 bg-red-100 dark:bg-red-900/40 dark:text-red-400";

                    return (
                      <TableRow
                        key={s.id}
                        className={`hover:bg-primary/5 transition-colors cursor-pointer ${idx % 2 === 0 ? "" : "bg-muted/20"}`}
                        onClick={() => window.location.href = `/students/${s.registrationNumber}`}
                      >
                        {/* Identity */}
                        <TableCell className="font-medium whitespace-nowrap text-sm py-2.5">{s.name}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">{s.registrationNumber}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[11px] font-medium border-primary/30 text-primary bg-primary/5">
                            {s.department}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{s.year}</TableCell>
                        <TableCell className="text-center">
                          {(s.stream ?? "").toLowerCase() === "arts"
                            ? <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400">Arts</span>
                            : <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">Engg</span>
                          }
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{s.phone || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{s.email || "—"}</TableCell>

                        {/* Academic */}
                        <TableCell className="text-center text-sm tabular-nums">{s.xMarks}</TableCell>
                        <TableCell className="text-center text-sm tabular-nums">{s.xiiMarks}</TableCell>
                        <TableCell className="text-center text-sm tabular-nums">
                          {s.ugSemesterMarks && s.ugSemesterMarks.length > 0 ? (
                            <div className="group relative inline-block">
                              <span className="cursor-default underline decoration-dotted">{s.ugPercentage}</span>
                              <div className="absolute z-50 hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-1 w-44 bg-popover border rounded-lg shadow-lg p-2 text-left">
                                <p className="text-[10px] font-semibold text-muted-foreground mb-1 uppercase tracking-wide">UG Semesters</p>
                                {s.ugSemesterMarks.map((sem, i) => (
                                  <div key={i} className="flex justify-between text-[11px] py-0.5">
                                    <span className="text-foreground">{sem.semester}</span>
                                    <span className="font-medium tabular-nums">{sem.percentage}%</span>
                                  </div>
                                ))}
                                <div className="border-t mt-1 pt-1 flex justify-between text-[11px] font-semibold">
                                  <span>Overall</span>
                                  <span>{s.ugPercentage}%</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            s.ugPercentage
                          )}
                        </TableCell>
                        <TableCell className="text-center text-sm tabular-nums text-muted-foreground">
                          {s.pgPercentage !== null && s.pgPercentage !== undefined ? s.pgPercentage : "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`inline-flex items-center justify-center rounded-full w-6 h-6 text-xs font-bold ${
                            s.noOfArrears === 0
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                              : "bg-[#f01536]/10 text-[#f01536]"
                          }`}>
                            {s.noOfArrears}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`inline-flex items-center justify-center rounded-full w-6 h-6 text-xs font-bold ${
                            s.historyOfArrears === 0
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                          }`}>
                            {s.historyOfArrears}
                          </span>
                        </TableCell>

                        {/* Language */}
                        <TableCell className="text-center"><CefrBadge val={s.cefrGrammar} /></TableCell>
                        <TableCell className="text-center"><CefrBadge val={s.efSetListening} /></TableCell>
                        <TableCell className="text-center"><CefrBadge val={s.efSetSpeaking} /></TableCell>
                        <TableCell className="text-center"><CefrBadge val={s.efSetReading} /></TableCell>
                        <TableCell className="text-center"><CefrBadge val={s.efSetWriting} /></TableCell>

                        {/* Technical */}
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          {s.leetcodeUrl ? (
                            <a href={s.leetcodeUrl} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-mono">
                              <ExternalLink className="h-3 w-3 shrink-0" />
                              <span className="max-w-[100px] truncate">{s.leetcodeUrl.replace("https://", "")}</span>
                            </a>
                          ) : <span className="text-muted-foreground/40">—</span>}
                        </TableCell>
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          {s.githubUrl ? (
                            <a href={s.githubUrl} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-mono">
                              <ExternalLink className="h-3 w-3 shrink-0" />
                              <span className="max-w-[100px] truncate">{s.githubUrl.replace("https://", "")}</span>
                            </a>
                          ) : <span className="text-muted-foreground/40">—</span>}
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs text-muted-foreground whitespace-nowrap">{s.leetcodeRank || "—"}</TableCell>
                        <TableCell className="text-center text-sm tabular-nums">{s.fopAssessment || "—"}</TableCell>
                        <TableCell className="text-center text-sm tabular-nums">{s.dsaAssessment || "—"}</TableCell>
                        <TableCell className="text-center text-sm tabular-nums">{s.internalCodeathon ?? "—"}</TableCell>
                        <TableCell className="text-center text-sm tabular-nums">{s.externalCodeathon ?? "—"}</TableCell>
                        <TableCell className="text-center text-sm tabular-nums">{s.githubProjects ?? "—"}</TableCell>
                        <TableCell className="text-center text-sm tabular-nums">{s.fullLengthProjects ?? "—"}</TableCell>
                        <TableCell className="text-center text-sm tabular-nums">{s.globalCertification ?? "—"}</TableCell>
                        <TableCell className="text-center text-sm tabular-nums">{s.otherCertifications ?? "—"}</TableCell>

                        {/* Scores */}
                        <TableCell className="text-center">
                          <ScoreBadge score={Math.round(s.academicRegulatory)} max={tierMaxes.academic || 150} />
                        </TableCell>
                        <TableCell className="text-center">
                          <ScoreBadge score={Math.round(s.cognitiveLinguistic)} max={tierMaxes.cognitive || 300} />
                        </TableCell>
                        <TableCell className="text-center">
                          {tierMaxes.technical > 0
                            ? <ScoreBadge score={Math.round(s.technicalProficiency)} max={tierMaxes.technical} />
                            : <span className="text-muted-foreground/40 text-[11px]">N/A</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          {tierMaxes.industry > 0
                            ? <ScoreBadge score={Math.round(s.industryValidation)} max={tierMaxes.industry} />
                            : <span className="text-muted-foreground/40 text-[11px]">N/A</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold tabular-nums ${hireColor}`}>
                            {s.hireScore}<span className="opacity-50 font-normal text-[10px]">/{yearMax}</span>
                          </span>
                        </TableCell>

                        {/* Missing Data */}
                        <TableCell className="text-xs">
                          {getMissingData(s).length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {getMissingData(s).map((item, i) => (
                                <Badge key={i} variant="secondary" className="text-[10px] bg-muted text-muted-foreground hover:bg-muted">
                                  {item}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-medium">✓ Complete</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

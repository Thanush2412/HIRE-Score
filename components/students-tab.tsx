"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RefreshCw, Users, X, Upload, Trash2, BarChart2, Filter, ArrowUpDown, ArrowUp, ArrowDown, Download, Eye } from "lucide-react";
import { ImportDialog } from "@/components/import-dialog";
import { StoredStudent } from "@/lib/db";

type ColDef = { key: keyof StoredStudent; label: string; group: string; computed?: boolean };

const COLUMNS: ColDef[] = [
  { key: "name",                    label: "Student Name",                    group: "Identity" },
  { key: "registrationNumber",      label: "Registration Number",             group: "Identity" },
  { key: "college",                 label: "College",                         group: "Identity" },
  { key: "department",              label: "Department",                      group: "Identity" },
  { key: "year",                    label: "Year",                            group: "Identity" },
  { key: "stream",                  label: "Stream",                          group: "Identity" },
  { key: "phone",                   label: "Phone",                           group: "Identity" },
  { key: "email",                   label: "Email",                           group: "Identity" },
  { key: "xMarks",                  label: "X Marks %",                       group: "Tier 1: Academic" },
  { key: "xiiMarks",                label: "XII Marks %",                     group: "Tier 1: Academic" },
  { key: "ugPercentage",            label: "UG Percentage",                   group: "Tier 1: Academic" },
  { key: "pgPercentage",            label: "PG Percentage",                   group: "Tier 1: Academic" },
  { key: "noOfArrears",             label: "No. of Arrears",                  group: "Tier 1: Academic" },
  { key: "historyOfArrears",        label: "History of Arrears",              group: "Tier 1: Academic" },
  { key: "quants",                  label: "Quants",                          group: "Tier 2: Aptitude" },
  { key: "logical",                 label: "Logical",                         group: "Tier 2: Aptitude" },
  { key: "verbal",                  label: "Verbal",                          group: "Tier 2: Aptitude" },
  { key: "cefrA1Grammar",           label: "CEFR A1 Grammar",                 group: "Tier 2: Language" },
  { key: "cefrA2Grammar",           label: "CEFR A2 Grammar",                 group: "Tier 2: Language" },
  { key: "efSetListening",          label: "EF SET Listening",                group: "Tier 2: Language" },
  { key: "efSetSpeaking",           label: "EF SET Speaking",                 group: "Tier 2: Language" },
  { key: "efSetReading",            label: "EF SET Reading",                  group: "Tier 2: Language" },
  { key: "efSetWriting",            label: "EF SET Writing",                  group: "Tier 2: Language" },
  { key: "leetcodeRank",            label: "Leetcode Rank",                   group: "Tier 3: Technical" },
  { key: "leetcodeUrl",             label: "Leetcode URL",                    group: "Tier 3: Technical" },
  { key: "githubUrl",               label: "GitHub URL",                      group: "Tier 3: Technical" },
  { key: "fopAssessment",           label: "FOP Assessment",                  group: "Tier 3: Technical" },
  { key: "dsaAssessment",           label: "DSA Assessment",                  group: "Tier 3: Technical" },
  { key: "internalCodeathon",       label: "Internal Codeathon",              group: "Tier 3: Technical" },
  { key: "externalCodeathon",       label: "External Codeathon",              group: "Tier 3: Technical" },
  { key: "githubProjects",          label: "GitHub Projects",                 group: "Tier 3: Technical" },
  { key: "fullLengthProjects",      label: "Full Length Projects",            group: "Tier 3: Technical" },
  { key: "globalCertification",     label: "Global Certification",            group: "Tier 4: Industry" },
  { key: "otherCertifications",     label: "Other Certifications",            group: "Tier 4: Industry" },
  { key: "xScore",                  label: "X Score (15)",                    group: "Computed Scores", computed: true },
  { key: "xiiScore",                label: "XII Score (15)",                  group: "Computed Scores", computed: true },
  { key: "ugScore",                 label: "UG Score (70)",                   group: "Computed Scores", computed: true },
  { key: "academicAggregate",       label: "Academic Aggregate (100)",        group: "Computed Scores", computed: true },
  { key: "noOfArrearsScore",        label: "Arrears Score (40)",              group: "Computed Scores", computed: true },
  { key: "historyArrearsScore",     label: "History Arrears Score (10)",      group: "Computed Scores", computed: true },
  { key: "standingArrears",         label: "Standing Arrears (50)",           group: "Computed Scores", computed: true },
  { key: "quantsScore",             label: "Quants Score (50)",               group: "Computed Scores", computed: true },
  { key: "logicalScore",            label: "Logical Score (50)",              group: "Computed Scores", computed: true },
  { key: "verbalScore",             label: "Verbal Score (50)",               group: "Computed Scores", computed: true },
  { key: "aptitudeTotal",           label: "Aptitude Total (150)",            group: "Computed Scores", computed: true },
  { key: "cefrA1Score",             label: "CEFR A1 Score",                   group: "Computed Scores", computed: true },
  { key: "cefrA2Score",             label: "CEFR A2 Score",                   group: "Computed Scores", computed: true },
  { key: "efListeningScore",        label: "EF Listening Score",              group: "Computed Scores", computed: true },
  { key: "efSpeakingScore",         label: "EF Speaking Score",               group: "Computed Scores", computed: true },
  { key: "efReadingScore",          label: "EF Reading Score",                group: "Computed Scores", computed: true },
  { key: "efWritingScore",          label: "EF Writing Score",                group: "Computed Scores", computed: true },
  { key: "communicationTotal",      label: "Communication Total (150)",       group: "Computed Scores", computed: true },
  { key: "codingPractice",          label: "Coding Practice (125)",           group: "Computed Scores", computed: true },
  { key: "codingAssessment",        label: "Coding Assessment (175)",         group: "Computed Scores", computed: true },
  { key: "codeathonHackathon",      label: "Codeathon & Hackathon (50)",      group: "Computed Scores", computed: true },
  { key: "miniProjects",            label: "Mini Projects (30)",              group: "Computed Scores", computed: true },
  { key: "fullLengthProjectScore",  label: "Full Length Project (20)",        group: "Computed Scores", computed: true },
  { key: "globalCertScore",         label: "Global Certification (100)",      group: "Computed Scores", computed: true },
  { key: "otherCertScore",          label: "Other Certifications (50)",       group: "Computed Scores", computed: true },
  { key: "academicRegulatory",      label: "Academic & Regulatory (150)",     group: "Final Totals", computed: true },
  { key: "cognitiveLinguistic",     label: "Cognitive & Linguistic (300)",    group: "Final Totals", computed: true },
  { key: "technicalProficiency",    label: "Technical Proficiency (400)",     group: "Final Totals", computed: true },
  { key: "industryValidation",      label: "Industry Validation (150)",       group: "Final Totals", computed: true },
  { key: "hireScore",               label: "HIRE Score (year-adj.)",      group: "Final Totals", computed: true },
];

const CEFR_KEYS = new Set(["cefrA1Grammar","cefrA2Grammar","efSetListening","efSetSpeaking","efSetReading","efSetWriting"]);

function getYearMax(year: string, stream?: string | null): number {
  const y = (year ?? "").toLowerCase().trim();
  const isArts = (stream ?? "").toLowerCase() === "arts";
  if (y.includes("fresh") || y === "1" || y.includes("first") || y.includes("1st")) return 450;
  if (y === "2" || y.includes("second") || y.includes("2nd")) return isArts ? 700 : 600;
  if (y === "3" || y.includes("third") || y.includes("3rd")) return isArts ? 1000 : 850;
  return 1000;
}

function getYearDenom(year: string, stream?: string): { max: number; academic: number; cognitive: number; technical: number; industry: number } {
  const y = (year ?? "").toLowerCase().trim();
  const isArts = (stream ?? "").toLowerCase() === "arts";
  if (y.includes("fresh") || y === "1" || y.includes("first") || y.includes("1st"))
    return { max: 450,  academic: 150, cognitive: 300, technical: 0,   industry: 0   };
  if (y === "2" || y.includes("second") || y.includes("2nd"))
    return isArts
      ? { max: 700,  academic: 150, cognitive: 300, technical: 150, industry: 100 }
      : { max: 600,  academic: 150, cognitive: 300, technical: 150, industry: 0   };
  if (y === "3" || y.includes("third") || y.includes("3rd"))
    return isArts
      ? { max: 1000, academic: 150, cognitive: 300, technical: 400, industry: 150 }
      : { max: 850,  academic: 150, cognitive: 300, technical: 300, industry: 100 };
  return { max: 1000, academic: 150, cognitive: 300, technical: 400, industry: 150 };
}

export function StudentsTab({ refresh, onImported }: { refresh?: number; onImported: () => void }) {
  const router = useRouter();
  const [students, setStudents] = useState<StoredStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFiltersRaw] = useState<Partial<Record<keyof StoredStudent, string>>>(() => {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(localStorage.getItem("students_filters") || "{}"); } catch { return {}; }
  });

  const setFilters = (v: Partial<Record<keyof StoredStudent, string>> | ((p: Partial<Record<keyof StoredStudent, string>>) => Partial<Record<keyof StoredStudent, string>>)) => {
    setFiltersRaw((prev) => {
      const next = typeof v === "function" ? v(prev) : v;
      localStorage.setItem("students_filters", JSON.stringify(next));
      return next;
    });
  };
  const [importOpen, setImportOpen] = useState(false);
  const [importMode, setImportMode] = useState<"primary" | "secondary">("primary");

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Pagination state — persisted in localStorage
  const [currentPage, setCurrentPageRaw] = useState(() => {
    if (typeof window === "undefined") return 1;
    return Number(localStorage.getItem("students_page") || "1");
  });
  const [itemsPerPage, setItemsPerPageRaw] = useState(() => {
    if (typeof window === "undefined") return 50;
    return Number(localStorage.getItem("students_per_page") || "50");
  });

  const setCurrentPage = (v: number | ((p: number) => number)) => {
    setCurrentPageRaw((prev) => {
      const next = typeof v === "function" ? v(prev) : v;
      localStorage.setItem("students_page", String(next));
      return next;
    });
  };
  const setItemsPerPage = (v: number) => {
    localStorage.setItem("students_per_page", String(v));
    setItemsPerPageRaw(v);
  };

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<StoredStudent | null>(null);
  const [deleteSelectedOpen, setDeleteSelectedOpen] = useState(false);

  // Sort state
  const [sortKey, setSortKey] = useState<keyof StoredStudent | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Hover preview
  const [previewStudent, setPreviewStudent] = useState<StoredStudent | null>(null);
  const [previewPos, setPreviewPos] = useState({ x: 0, y: 0 });

  const handleSort = (key: keyof StoredStudent) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const exportCSV = () => {
    const headers = COLUMNS.map(c => c.label);
    const rows = filtered.map(s => COLUMNS.map(c => {
      const v = s[c.key];
      return v === null || v === undefined ? "" : String(v);
    }));
    const csv = [headers, ...rows].map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "students.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const fetchStudents = async () => {
    setLoading(true);
    try { setStudents(await (await fetch("/api/students")).json()); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchStudents(); }, [refresh]);

  const setFilter = (key: keyof StoredStudent, val: string) =>
    setFilters((p) => val ? { ...p, [key]: val } : (() => { const n = { ...p }; delete n[key]; return n; })());

  const filtered = students.filter((s) =>
    COLUMNS.every(({ key }) => {
      const f = filters[key]; if (!f) return true;
      return String(s[key] ?? "").toLowerCase().includes(f.toLowerCase());
    })
  );

  // Pagination
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const sortedFiltered = sortKey
    ? [...filtered].sort((a, b) => {
        const av = a[sortKey]; const bv = b[sortKey];
        if (av === null || av === undefined) return 1;
        if (bv === null || bv === undefined) return -1;
        const cmp = typeof av === "number" && typeof bv === "number"
          ? av - bv : String(av).localeCompare(String(bv));
        return sortDir === "asc" ? cmp : -cmp;
      })
    : filtered;
  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const paginatedStudents = sortedFiltered.slice(startIdx, endIdx);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const activeFilters = Object.keys(filters).length;

  // Selection handlers
  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  // Delete single
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await fetch(`/api/students?id=${deleteTarget.id}`, { method: "DELETE" });
    setDeleteTarget(null);
    fetchStudents();
    onImported();
  };

  // Delete selected
  const confirmSelectedDelete = async () => {
    if (selectedIds.size === 0) return;
    await Promise.all(
      Array.from(selectedIds).map(id => fetch(`/api/students?id=${id}`, { method: "DELETE" }))
    );
    setSelectedIds(new Set());
    setDeleteSelectedOpen(false);
    fetchStudents();
    onImported();
  };

  // Build group spans
  const groups: { label: string; count: number }[] = [];
  COLUMNS.forEach((c) => {
    const last = groups[groups.length - 1];
    if (last && last.label === c.group) last.count++;
    else groups.push({ label: c.group, count: 1 });
  });

  // Total cols = Checkbox + S.No + data cols + Actions
  const totalCols = COLUMNS.length + 3;

  return (
    <div className="space-y-4 relative">
      {/* Toolbar - Sticky */}
      <div className="sticky top-0 z-30 bg-background pb-4 pt-2 -mt-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Students</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {students.length} total · {filtered.length} shown · Page {currentPage} of {totalPages || 1}
            {activeFilters > 0 && ` · ${activeFilters} filter${activeFilters > 1 ? "s" : ""} active`}
            {selectedIds.size > 0 && ` · ${selectedIds.size} selected`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {selectedIds.size > 0 && (
            <>
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setSelectedIds(new Set())}>
                <X className="h-3.5 w-3.5 mr-1" /> Clear selection
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs border-destructive/40 text-destructive hover:bg-destructive/5"
                onClick={() => setDeleteSelectedOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete Selected ({selectedIds.size})
              </Button>
            </>
          )}
          {activeFilters > 0 && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setFilters({})}>
              <X className="h-3.5 w-3.5 mr-1" /> Clear filters
            </Button>
          )}
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={fetchStudents}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={exportCSV} disabled={filtered.length === 0}>
            <Download className="h-3.5 w-3.5 mr-1.5" /> Export CSV
          </Button>
          <Button size="sm" className="h-8 text-xs"
            onClick={() => { setImportMode("primary"); setImportOpen(true); }}>
            <Upload className="h-3.5 w-3.5 mr-1.5" /> Primary Import
          </Button>
          <Button size="sm" className="h-8 text-xs"
            onClick={() => { setImportMode("secondary"); setImportOpen(true); }}>
            <Upload className="h-3.5 w-3.5 mr-1.5" /> Secondary Import
          </Button>
        </div>
      </div>
      </div>

      {/* Table */}
      <Card className="shadow-none border overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-5 space-y-2">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-9 w-full rounded" />)}
            </div>
          ) : (
            <div className="overflow-auto relative" style={{ maxHeight: "calc(100vh - 280px)" }}>
              <Table>
                <TableHeader className="sticky top-0 z-20 bg-background">
                  {/* Group row */}
                  <TableRow className="bg-muted/70 hover:bg-muted/70 border-b-0 backdrop-blur-sm">
                    {/* Checkbox group */}
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest text-center border-r border-border/40 py-1.5 px-2 text-muted-foreground w-10">
                      ☑
                    </TableHead>
                    {/* S.No group */}
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest text-center border-r border-border/40 py-1.5 px-2 text-muted-foreground w-10">
                      #
                    </TableHead>
                    {groups.map((g) => (
                      <TableHead key={g.label} colSpan={g.count}
                        className="text-[10px] font-bold uppercase tracking-widest text-center border-r border-border/40 last:border-r-0 py-1.5 px-2 whitespace-nowrap">
                        <span className={g.label === "Scores" || g.label === "Totals" ? "text-primary" : "text-muted-foreground"}>
                          {g.label}
                        </span>
                      </TableHead>
                    ))}
                    {/* Actions group */}
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest text-center py-1.5 px-2 text-muted-foreground w-16">
                      Actions
                    </TableHead>
                  </TableRow>

                  {/* Column labels with filter icons */}
                  <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border backdrop-blur-sm">
                    <TableHead className="text-[10px] font-semibold uppercase tracking-wide px-2 py-2 text-muted-foreground w-10 text-center">
                      <input
                        type="checkbox"
                        checked={paginatedStudents.length > 0 && paginatedStudents.every(s => selectedIds.has(s.id))}
                        onChange={() => {
                          if (paginatedStudents.every(s => selectedIds.has(s.id))) {
                            const newSet = new Set(selectedIds);
                            paginatedStudents.forEach(s => newSet.delete(s.id));
                            setSelectedIds(newSet);
                          } else {
                            const newSet = new Set(selectedIds);
                            paginatedStudents.forEach(s => newSet.add(s.id));
                            setSelectedIds(newSet);
                          }
                        }}
                        className="cursor-pointer"
                      />
                    </TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-wide px-2 py-2 text-muted-foreground w-10 text-center">
                      S.No
                    </TableHead>
                    {COLUMNS.map((col) => (
                      <TableHead key={col.key}
                        className={`text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap px-2 py-2 ${col.computed ? "text-primary/80" : "text-muted-foreground"}`}>
                        <div className="flex items-center gap-1.5 justify-between">
                          <button
                            className="flex items-center gap-1 hover:text-foreground transition-colors"
                            onClick={() => handleSort(col.key)}
                          >
                            <span className="flex-1">{col.label}</span>
                            {sortKey === col.key
                              ? sortDir === "asc" ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />
                              : <ArrowUpDown className="h-2.5 w-2.5 opacity-30" />
                            }
                          </button>
                          <Popover>
                            <PopoverTrigger
                              className={`flex-shrink-0 p-0.5 rounded hover:bg-muted/60 transition-colors ${
                                filters[col.key] ? "text-primary" : "text-muted-foreground/40 hover:text-muted-foreground"
                              }`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Filter className="h-3 w-3" />
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-3" align="start">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <p className="text-xs font-semibold">Filter: {col.label}</p>
                                  {filters[col.key] && (
                                    <button
                                      onClick={() => setFilter(col.key, "")}
                                      className="text-xs text-muted-foreground hover:text-foreground"
                                    >
                                      Clear
                                    </button>
                                  )}
                                </div>
                                <Input
                                  value={filters[col.key] ?? ""}
                                  onChange={(e) => setFilter(col.key, e.target.value)}
                                  placeholder="Type to filter..."
                                  className="h-8 text-xs"
                                  autoFocus
                                />
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="text-[10px] font-semibold uppercase tracking-wide px-2 py-2 text-muted-foreground w-16 text-center">
                      Del
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loading ? (
                    [...Array(6)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={totalCols} className="px-2 py-2">
                          <Skeleton className="h-5 w-full rounded" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : paginatedStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={totalCols} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center">
                            <Users className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {students.length === 0 ? "No students yet" : "No students match the current filters"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {students.length === 0 ? "Import from Excel or add a student manually" : "Try adjusting or clearing your filters"}
                            </p>
                          </div>
                          {students.length === 0 && (
                            <div className="flex gap-2 mt-1">
                              <Button size="sm" className="h-8 text-xs"
                                onClick={() => { setImportMode("primary"); setImportOpen(true); }}>
                                <Upload className="h-3.5 w-3.5 mr-1.5" /> Primary Import
                              </Button>
                              <Button size="sm" className="h-8 text-xs"
                                onClick={() => { setImportMode("secondary"); setImportOpen(true); }}>
                                <Upload className="h-3.5 w-3.5 mr-1.5" /> Secondary Import
                              </Button>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : paginatedStudents.map((s, idx) => {
                    const globalIdx = startIdx + idx;
                    return (
                    <TableRow key={s.id}
                      className={`hover:bg-primary/5 transition-colors text-xs group ${globalIdx % 2 === 1 ? "bg-muted/10" : ""} ${selectedIds.has(s.id) ? "bg-primary/10" : ""}`}
                      onMouseLeave={() => setPreviewStudent(null)}>

                      {/* Checkbox */}
                      <TableCell className="px-2 py-2 text-center w-10">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(s.id)}
                          onChange={() => toggleSelect(s.id)}
                          className="cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TableCell>

                      {/* S.No */}
                      <TableCell
                        className="px-2 py-2 text-center text-[11px] font-mono text-muted-foreground w-10 cursor-pointer hover:text-primary transition-colors"
                        onClick={() => router.push(`/students/${s.registrationNumber}`)}
                        title="Click to view details"
                      >
                        {globalIdx + 1}
                      </TableCell>

                      {/* Data cells */}
                      {COLUMNS.map((col) => {
                        const val = s[col.key];
                        const str = val === null || val === undefined ? "—" : String(val);

                        if (col.key === "hireScore") {
                          const yearMax = getYearMax(s.year, s.stream);
                          const hirePct = s.hireScore / yearMax;
                          const hc = hirePct >= 0.70 ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400"
                            : hirePct >= 0.50 ? "text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400"
                            : "text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400";
                          return (
                            <TableCell key={col.key} className="px-2 py-2 whitespace-nowrap cursor-pointer" onClick={() => router.push(`/students/${s.registrationNumber}`)}>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black tabular-nums ${hc}`}>
                                {s.hireScore}<span className="opacity-50 font-normal text-[10px]">/{yearMax}</span>
                                <BarChart2 className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </span>
                            </TableCell>
                          );
                        }
                        if (col.key === "stream") {
                          const isArts = (s.stream ?? "").toLowerCase() === "arts";
                          return (
                            <TableCell key={col.key} className="px-2 py-2 text-center cursor-pointer" onClick={() => router.push(`/students/${s.registrationNumber}`)}>
                              {isArts
                                ? <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400">Arts</span>
                                : <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">Engg</span>
                              }
                            </TableCell>
                          );
                        }
                        if (col.key === "noOfArrears") return (
                          <TableCell key={col.key} className="px-2 py-2 text-center cursor-pointer" onClick={() => router.push(`/students/${s.registrationNumber}`)}>
                            <span className={`inline-flex items-center justify-center rounded-full w-5 h-5 text-[10px] font-bold ${
                              Number(val) === 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" : "bg-primary/10 text-primary"
                            }`}>{str}</span>
                          </TableCell>
                        );
                        if (col.key === "department") return (
                          <TableCell key={col.key} className="px-2 py-2 cursor-pointer" onClick={() => router.push(`/students/${s.registrationNumber}`)}>
                            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary bg-primary/5 font-medium whitespace-nowrap">{str}</Badge>
                          </TableCell>
                        );
                        if (col.key === "registrationNumber") return (
                          <TableCell key={col.key} className="px-2 py-2 font-mono text-[11px] text-muted-foreground whitespace-nowrap cursor-pointer" onClick={() => router.push(`/students/${s.registrationNumber}`)}>{str}</TableCell>
                        );
                        if (col.key === "leetcodeUrl" || col.key === "githubUrl") {
                          if (!val || str === "—") return (
                            <TableCell key={col.key} className="px-2 py-2 text-center text-muted-foreground/30">—</TableCell>
                          );
                          return (
                            <TableCell key={col.key} className="px-2 py-2">
                              <a
                                href={str}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] font-mono text-primary hover:underline truncate block max-w-[120px]"
                                onClick={(e) => e.stopPropagation()}
                                title={str}
                              >
                                {str.replace(/^https?:\/\/(www\.)?/, "")}
                              </a>
                            </TableCell>
                          );
                        }
                        if (col.key === "name") return (
                          <TableCell key={col.key} className="px-2 py-2 font-medium whitespace-nowrap cursor-pointer hover:text-primary transition-colors relative"
                            onClick={() => router.push(`/students/${s.registrationNumber}`)}
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setPreviewPos({ x: rect.right + 8, y: rect.top });
                              setPreviewStudent(s);
                            }}
                          >
                            <span className="flex items-center gap-1">
                              {str}
                              <Eye className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity text-muted-foreground" />
                            </span>
                          </TableCell>
                        );
                        if (CEFR_KEYS.has(col.key as string)) {
                          if (!val) return <TableCell key={col.key} className="px-2 py-2 text-center text-muted-foreground/30 cursor-pointer" onClick={() => router.push(`/students/${s.registrationNumber}`)}>—</TableCell>;
                          const lvl = String(val);
                          const cls = lvl.startsWith("C") ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                            : lvl.startsWith("B") ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
                            : "bg-muted text-muted-foreground";
                          return (
                            <TableCell key={col.key} className="px-2 py-2 text-center cursor-pointer" onClick={() => router.push(`/students/${s.registrationNumber}`)}>
                              <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${cls}`}>{lvl}</span>
                            </TableCell>
                          );
                        }
                        if (col.computed) return (
                          <TableCell key={col.key} className="px-2 py-2 text-center tabular-nums text-primary/80 font-medium cursor-pointer" onClick={() => router.push(`/students/${s.registrationNumber}`)}>{str}</TableCell>
                        );
                        return (
                          <TableCell key={col.key} className="px-2 py-2 whitespace-nowrap text-muted-foreground cursor-pointer" onClick={() => router.push(`/students/${s.registrationNumber}`)}>{str}</TableCell>
                        );
                      })}

                      {/* Delete action */}
                      <TableCell className="px-2 py-2 text-center w-16">
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(s); }}
                          className="inline-flex items-center justify-center h-6 w-6 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete student"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </TableCell>
                    </TableRow>
                  )})}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination - Sticky */}
      {filtered.length > 0 && (
        <div className="sticky bottom-0 z-30 bg-background border-t border-border pt-3 pb-2 -mb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">
              Showing {startIdx + 1}-{Math.min(endIdx, filtered.length)} of {filtered.length}
            </p>
            <Select value={String(itemsPerPage)} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
              <SelectTrigger className="h-7 w-20 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="200">200</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(1)}
            >
              «
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
            >
              ‹
            </Button>
            <div className="flex items-center gap-1 px-2">
              <span className="text-xs text-muted-foreground">Page</span>
              <span className="text-xs font-medium">{currentPage}</span>
              <span className="text-xs text-muted-foreground">of</span>
              <span className="text-xs font-medium">{totalPages}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
            >
              ›
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(totalPages)}
            >
              »
            </Button>
          </div>
        </div>
        </div>
      )}

      {/* Hover Quick Preview */}
      {previewStudent && (
        <div
          className="fixed z-50 w-64 bg-card border border-border rounded-2xl shadow-2xl p-4 pointer-events-none"
          style={{ left: Math.min(previewPos.x, window.innerWidth - 280), top: Math.min(previewPos.y, window.innerHeight - 320) }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-sm font-black text-primary">
              {previewStudent.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold truncate">{previewStudent.name}</p>
              <p className="text-[10px] text-muted-foreground font-mono">{previewStudent.registrationNumber}</p>
            </div>
          </div>
          <div className="space-y-1.5 mb-3">
            {[
              { label: "Dept", value: previewStudent.department },
              { label: "Year", value: previewStudent.year },
              { label: "UG %", value: `${previewStudent.ugPercentage}%` },
              { label: "Arrears", value: String(previewStudent.noOfArrears) },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-semibold">{value}</span>
              </div>
            ))}
          </div>
          <div className="border-t pt-2.5 space-y-1.5">
            {(() => {
              const denom = getYearDenom(previewStudent.year, previewStudent.stream ?? undefined);
              const tiers = [
                { label: "Academic", score: previewStudent.academicRegulatory, max: denom.academic, color: "#2563eb" },
                { label: "Cognitive", score: previewStudent.cognitiveLinguistic, max: denom.cognitive, color: "#7c3aed" },
                ...(denom.technical > 0 ? [{ label: "Technical", score: previewStudent.technicalProficiency, max: denom.technical, color: "#0891b2" }] : []),
                ...(denom.industry > 0 ? [{ label: "Industry", score: previewStudent.industryValidation, max: denom.industry, color: "#059669" }] : []),
              ];
              return tiers.map(t => (
                <div key={t.label}>
                  <div className="flex justify-between text-[10px] mb-0.5">
                    <span className="text-muted-foreground">{t.label}</span>
                    <span className="font-bold" style={{ color: t.color }}>{t.score}/{t.max}</span>
                  </div>
                  <div className="h-1 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.round((t.score/t.max)*100)}%`, backgroundColor: t.color }} />
                  </div>
                </div>
              ));
            })()}
            <div className="flex justify-between items-center pt-1">
              <span className="text-[10px] font-bold text-muted-foreground">HIRE Score</span>
              <span className={`text-sm font-black ${
                previewStudent.hireScore / getYearMax(previewStudent.year, previewStudent.stream) >= 0.70
                  ? "text-emerald-600"
                  : previewStudent.hireScore / getYearMax(previewStudent.year, previewStudent.stream) >= 0.50
                  ? "text-amber-600"
                  : "text-red-600"
              }`}>
                {previewStudent.hireScore}/{getYearMax(previewStudent.year, previewStudent.stream)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Import dialog */}
      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => { onImported(); fetchStudents(); }}
        mode={importMode}
      />

      {/* Single delete confirm */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete student?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <strong>{deleteTarget?.name}</strong> ({deleteTarget?.registrationNumber}) from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Selected delete confirm */}
      <AlertDialog open={deleteSelectedOpen} onOpenChange={setDeleteSelectedOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} selected student{selectedIds.size > 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected students from the system. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" onClick={confirmSelectedDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

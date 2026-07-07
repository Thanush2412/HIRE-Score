"use client";

import { useEffect, useState, useRef, useMemo } from "react";
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
import { RefreshCw, Users, X, Upload, Trash2, BarChart2, Filter, ArrowUpDown, ArrowUp, ArrowDown, Download, Eye, FileText, Pencil } from "lucide-react";
import { ImportDialog } from "@/components/import-dialog";
import { EditStudentDialog } from "@/components/edit-student-dialog";
import { StoredStudent } from "@/lib/db";
import JSZip from "jszip";

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
  { key: "cefrGrammar",             label: "CEFR",                            group: "Tier 2: Language" },
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
  { key: "cefrGrammarScore",        label: "CEFR Score (50)",                 group: "Computed Scores", computed: true },
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

const CEFR_KEYS = new Set(["cefrGrammar","efSetListening","efSetSpeaking","efSetReading","efSetWriting"]);

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

interface ColumnFilterPopoverContentProps {
  col: ColDef;
  students: StoredStudent[];
  activeFilter: string;
  onApplyFilter: (val: string) => void;
}

function ColumnFilterPopoverContent({
  col,
  students,
  activeFilter,
  onApplyFilter,
}: ColumnFilterPopoverContentProps) {
  // Extract unique values
  const uniqueValues = useMemo(() => {
    const vals = Array.from(
      new Set(students.map((s) => String(s[col.key] ?? "").trim()))
    );
    return vals.sort((a, b) => {
      if (a === "") return -1;
      if (b === "") return 1;
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
    });
  }, [students, col.key]);

  const parseActiveFilter = (filter: string): string[] => {
    if (!filter) return [];
    if (filter.startsWith("[") && filter.endsWith("]")) {
      try {
        return JSON.parse(filter) as string[];
      } catch {
        return [filter];
      }
    }
    // If it's a simple string, treat it as a contains query
    return [`__contains__:${filter}`];
  };

  const initialSelected = useMemo(() => parseActiveFilter(activeFilter), [activeFilter]);

  const [optionSearch, setOptionSearch] = useState(() => {
    const containsFilters = initialSelected.filter(v => v.startsWith("__contains__:"));
    if (containsFilters.length === 1 && initialSelected.length === 1) {
      return containsFilters[0].slice(13);
    }
    return "";
  });

  const [selectedValues, setSelectedValues] = useState<Set<string>>(
    () => new Set(initialSelected)
  );

  // Sync with activeFilter changes
  useEffect(() => {
    const parsed = parseActiveFilter(activeFilter);
    setSelectedValues(new Set(parsed));
    
    const containsFilters = parsed.filter(v => v.startsWith("__contains__:"));
    if (containsFilters.length === 1 && parsed.length === 1) {
      setOptionSearch(containsFilters[0].slice(13));
    } else if (parsed.length === 0) {
      setOptionSearch("");
    }
  }, [activeFilter]);

  // Filtered unique values for the list
  const filteredUniqueValues = useMemo(() => {
    return uniqueValues.filter((val) => {
      const displayVal = val === "" ? "(Empty)" : val;
      return displayVal.toLowerCase().includes(optionSearch.toLowerCase());
    });
  }, [uniqueValues, optionSearch]);

  const activeContainsFilters = useMemo(() => {
    return Array.from(selectedValues).filter(v => v.startsWith("__contains__:"));
  }, [selectedValues]);

  const handleApplyValues = (currSelected?: Set<string>) => {
    const targetSet = currSelected || selectedValues;
    const arr = Array.from(targetSet);
    if (arr.length === 0) {
      onApplyFilter("");
    } else {
      onApplyFilter(JSON.stringify(arr));
    }
  };

  const handleToggleValue = (val: string) => {
    const newSet = new Set(selectedValues);
    if (newSet.has(val)) {
      newSet.delete(val);
    } else {
      newSet.add(val);
    }
    setSelectedValues(newSet);
  };

  const handleSelectAll = () => {
    const newSet = new Set(selectedValues);
    filteredUniqueValues.forEach((val) => newSet.add(val));
    setSelectedValues(newSet);
  };

  const handleDeselectAll = () => {
    const newSet = new Set(selectedValues);
    filteredUniqueValues.forEach((val) => newSet.delete(val));
    activeContainsFilters.forEach((val) => newSet.delete(val));
    setSelectedValues(newSet);
  };

  const handleClear = () => {
    setOptionSearch("");
    setSelectedValues(new Set());
    onApplyFilter("");
  };

  const handleTextSearchApply = () => {
    const query = optionSearch.trim();
    const newSet = new Set(selectedValues);
    if (query) {
      newSet.add(`__contains__:${query}`);
    }
    setSelectedValues(newSet);
    handleApplyValues(newSet);
  };

  return (
    <div className="space-y-2.5">
      {/* Title & Clear Action */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          Filter: {col.label}
        </p>
        {activeFilter && (
          <button
            onClick={handleClear}
            className="text-[10px] text-primary hover:underline font-bold"
          >
            Clear Filter
          </button>
        )}
      </div>

      {/* Unified Search Input */}
      <div className="relative">
        <Input
          value={optionSearch}
          onChange={(e) => setOptionSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleTextSearchApply();
          }}
          placeholder="Search values or contains..."
          className="h-8 text-xs focus-visible:ring-primary pr-8"
          autoFocus
        />
        {optionSearch && (
          <button
            onClick={() => setOptionSearch("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Scrollable List */}
      <div className="max-h-48 overflow-y-auto space-y-1 pr-1 border rounded-lg p-1 bg-muted/5">
        {/* Active contains filters */}
        {activeContainsFilters.map((containsVal) => {
          const query = containsVal.slice(13);
          return (
            <label
              key={containsVal}
              className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted/40 cursor-pointer text-xs transition-colors"
            >
              <input
                type="checkbox"
                checked={true}
                onChange={() => handleToggleValue(containsVal)}
                className="h-3.5 w-3.5 rounded-full text-primary border-muted focus:ring-primary cursor-pointer accent-primary"
              />
              <span className="truncate text-[11px] font-semibold text-primary">
                🔍 Contains: "{query}"
              </span>
            </label>
          );
        })}

        {/* Dynamic unchecked virtual Contains option if search input is filled and not already checked */}
        {optionSearch.trim() && !selectedValues.has(`__contains__:${optionSearch.trim()}`) && (
          <label
            className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted/40 cursor-pointer text-xs transition-colors"
          >
            <input
              type="checkbox"
              checked={false}
              onChange={() => handleToggleValue(`__contains__:${optionSearch.trim()}`)}
              className="h-3.5 w-3.5 rounded-full text-primary border-muted focus:ring-primary cursor-pointer accent-primary"
            />
            <span className="truncate text-[11px] font-semibold text-primary/70">
              🔍 Contains: "{optionSearch.trim()}"
            </span>
          </label>
        )}

        {filteredUniqueValues.length === 0 && !optionSearch.trim() && activeContainsFilters.length === 0 && (
          <p className="text-[10px] text-muted-foreground text-center py-4">No values found</p>
        )}

        {filteredUniqueValues.map((val) => {
          const displayVal = val === "" ? "(Empty)" : val;
          const isChecked = selectedValues.has(val);
          return (
            <label
              key={val}
              className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted/40 cursor-pointer text-xs transition-colors"
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => handleToggleValue(val)}
                className="h-3.5 w-3.5 rounded-full text-primary border-muted focus:ring-primary cursor-pointer accent-primary"
              />
              <span
                className={`truncate text-[11px] ${
                  val === "" ? "text-muted-foreground/75 italic" : "text-foreground font-medium"
                }`}
              >
                {displayVal}
              </span>
            </label>
          );
        })}
      </div>

      {/* Control footer */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t mt-1">
        <div className="flex gap-2">
          <button
            onClick={handleSelectAll}
            className="text-[9px] text-muted-foreground hover:text-foreground font-bold cursor-pointer"
          >
            Select All
          </button>
          <span className="text-muted-foreground/30 text-[9px]">|</span>
          <button
            onClick={handleDeselectAll}
            className="text-[9px] text-muted-foreground hover:text-foreground font-bold cursor-pointer"
          >
            Clear All
          </button>
        </div>
        <Button
          size="sm"
          className="h-6 px-3 text-[10px] font-bold"
          onClick={() => handleApplyValues()}
        >
          Apply
        </Button>
      </div>
    </div>
  );
}

export function StudentsTab({ refresh, onImported }: { refresh?: number; onImported: () => void }) {
  const router = useRouter();
  const [students, setStudents] = useState<StoredStudent[]>([]);
  const [editStudent, setEditStudent] = useState<StoredStudent | null>(null);
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

  // Bulk PDF generation state
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkTotal, setBulkTotal] = useState(0);
  const [bulkCurrent, setBulkCurrent] = useState(0);
  const [bulkCurrentName, setBulkCurrentName] = useState("");
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);
  const cancelBulkRef = useRef(false);

  const handleBulkPdfDownload = async () => {
    const targetStudents = selectedIds.size > 0
      ? students.filter(s => selectedIds.has(s.id))
      : filtered;

    if (targetStudents.length === 0) return;

    setBulkGenerating(true);
    setBulkTotal(targetStudents.length);
    setBulkCurrent(0);
    setBulkCurrentName("");
    setBulkErrors([]);
    cancelBulkRef.current = false;

    const zip = new JSZip();
    let successCount = 0;

    for (let i = 0; i < targetStudents.length; i++) {
      if (cancelBulkRef.current) {
        break;
      }

      const s = targetStudents[i];
      setBulkCurrent(i + 1);
      setBulkCurrentName(s.name);

      try {
        const res = await fetch(`/api/export-pdf/${s.id}`);
        if (!res.ok) {
          throw new Error(`Status ${res.status}: ${res.statusText}`);
        }
        const blob = await res.blob();
        const safeName = s.name.replace(/[^a-zA-Z0-9_\-]/g, "_");
        const filename = `HIRE_Score_${s.registrationNumber}_${safeName}.pdf`;
        zip.file(filename, blob);
        successCount++;
      } catch (err: any) {
        console.error(err);
        setBulkErrors(prev => [...prev, `${s.name} (${s.registrationNumber}): ${err.message || err}`]);
      }
    }

    if (successCount > 0) {
      setBulkCurrentName("Creating ZIP package...");
      try {
        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const a = document.createElement("a");
        a.href = url;
        
        let zipName = "HIRE_Score_PDFs.zip";
        let collegeName = "";
        let deptName = "";

        if (filters.college) {
          if (filters.college.startsWith("[") && filters.college.endsWith("]")) {
            try {
              const colleges = JSON.parse(filters.college) as string[];
              collegeName = colleges.map(c => c.startsWith("__contains__:") ? c.slice(13) : c).join("_");
            } catch {}
          } else {
            collegeName = filters.college.startsWith("__contains__:") ? filters.college.slice(13) : filters.college;
          }
        }

        if (filters.department) {
          if (filters.department.startsWith("[") && filters.department.endsWith("]")) {
            try {
              const depts = JSON.parse(filters.department) as string[];
              deptName = depts.map(d => d.startsWith("__contains__:") ? d.slice(13) : d).join("_");
            } catch {}
          } else {
            deptName = filters.department.startsWith("__contains__:") ? filters.department.slice(13) : filters.department;
          }
        }

        if (collegeName) {
          const cleanCollege = collegeName.replace(/[^a-zA-Z0-9_\-]/g, "_");
          if (deptName) {
            const cleanDept = deptName.replace(/[^a-zA-Z0-9_\-]/g, "_");
            zipName = `HIRE_Score_${cleanCollege}_${cleanDept}.zip`;
          } else {
            zipName = `HIRE_Score_${cleanCollege}.zip`;
          }
        }
        
        a.download = zipName;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err: any) {
        setBulkErrors(prev => [...prev, `Failed to create ZIP: ${err.message || err}`]);
      }
    }

    setBulkGenerating(false);
  };

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

  const [syncingLeetcode, setSyncingLeetcode] = useState(false);

  const handleSyncLeetcode = async () => {
    setSyncingLeetcode(true);
    try {
      const res = await fetch("/api/leetcode-rank");
      const data = await res.json();
      if (data.updated > 0) {
        const updatedStudents = await (await fetch("/api/students")).json();
        setStudents(updatedStudents);
      }
      alert(data.message || "LeetCode ranks checked.");
    } catch (e) {
      console.error(e);
      alert("Failed to sync LeetCode ranks.");
    } finally {
      setSyncingLeetcode(false);
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const data = await (await fetch("/api/students")).json();
      setStudents(data);
      // Trigger background LeetCode sync on load (once a day check)
      fetch("/api/leetcode-rank").catch(() => {});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStudents(); }, [refresh]);

  const setFilter = (key: keyof StoredStudent, val: string) =>
    setFilters((p) => val ? { ...p, [key]: val } : (() => { const n = { ...p }; delete n[key]; return n; })());

  const filtered = students.filter((s) =>
    COLUMNS.every(({ key }) => {
      const f = filters[key]; if (!f) return true;
      if (f.startsWith("[") && f.endsWith("]")) {
        try {
          const vals = JSON.parse(f) as string[];
          if (vals.length === 0) return true;
          const studentVal = String(s[key] ?? "").trim();
          return vals.some(v => {
            if (v.startsWith("__contains__:")) {
              const query = v.slice(13);
              return studentVal.toLowerCase().includes(query.toLowerCase());
            }
            return studentVal.toLowerCase() === v.toLowerCase();
          });
        } catch {
          // Fallback
        }
      }
      if (f.startsWith("__contains__:")) {
        const query = f.slice(13);
        return String(s[key] ?? "").toLowerCase().includes(query.toLowerCase());
      }
      return String(s[key] ?? "").toLowerCase().includes(f.toLowerCase());
    })
  );

  const getFilteredStudentsForColumn = (colKey: keyof StoredStudent) => {
    return students.filter((s) =>
      COLUMNS.every(({ key }) => {
        if (key === colKey) return true;
        const f = filters[key]; if (!f) return true;
        if (f.startsWith("[") && f.endsWith("]")) {
          try {
            const vals = JSON.parse(f) as string[];
            if (vals.length === 0) return true;
            const studentVal = String(s[key] ?? "").trim();
            return vals.some(v => {
              if (v.startsWith("__contains__:")) {
                const query = v.slice(13);
                return studentVal.toLowerCase().includes(query.toLowerCase());
              }
              return studentVal.toLowerCase() === v.toLowerCase();
            });
          } catch {
            // Fallback
          }
        }
        if (f.startsWith("__contains__:")) {
          const query = f.slice(13);
          return String(s[key] ?? "").toLowerCase().includes(query.toLowerCase());
        }
        return String(s[key] ?? "").toLowerCase().includes(f.toLowerCase());
      })
    );
  };

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
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={handleSyncLeetcode}
            disabled={syncingLeetcode}
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${syncingLeetcode ? "animate-spin" : ""}`} />
            {syncingLeetcode ? "Syncing LeetCode..." : "Sync LeetCode"}
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={exportCSV} disabled={filtered.length === 0}>
            <Download className="h-3.5 w-3.5 mr-1.5" /> Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={handleBulkPdfDownload}
            disabled={filtered.length === 0}
          >
            <FileText className="h-3.5 w-3.5 mr-1.5 text-primary" />
            {selectedIds.size > 0
              ? `Download Selected PDFs (${selectedIds.size})`
              : `Download Filtered PDFs (${filtered.length})`}
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
                              <ColumnFilterPopoverContent
                                col={col}
                                students={getFilteredStudentsForColumn(col.key)}
                                activeFilter={filters[col.key] ?? ""}
                                onApplyFilter={(val) => setFilter(col.key, val)}
                              />
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

                      {/* Actions */}
                      <TableCell className="px-2 py-2 text-center w-16 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditStudent(s); }}
                            className="inline-flex items-center justify-center h-6 w-6 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors opacity-0 group-hover:opacity-100"
                            title="Edit student"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteTarget(s); }}
                            className="inline-flex items-center justify-center h-6 w-6 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                            title="Delete student"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
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
          className="fixed z-50 w-72 bg-card/95 backdrop-blur-md border border-border/80 rounded-2xl shadow-2xl p-4 pointer-events-none transition-all duration-200 ease-out"
          style={{ left: Math.min(previewPos.x, window.innerWidth - 300), top: Math.min(previewPos.y, window.innerHeight - 380) }}
        >
          {/* Top Gradient bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-t-2xl" />
          
          <div className="flex items-center gap-3 mb-3 mt-1">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-sm font-black text-primary border border-primary/10 shrink-0 shadow-inner">
              {previewStudent.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold truncate text-foreground">{previewStudent.name}</p>
              <p className="text-[10px] text-muted-foreground/80 font-mono tracking-wider">{previewStudent.registrationNumber}</p>
            </div>
          </div>

          <div className="space-y-1.5 text-[11px] mb-3 text-muted-foreground">
            {previewStudent.college && (
              <div className="flex justify-between border-b border-border/40 pb-1 mb-1 items-baseline">
                <span className="text-[10px] font-medium text-muted-foreground/70">College</span>
                <span className="font-bold text-foreground truncate max-w-[170px] text-right">{previewStudent.college}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline">
              <span className="text-[10px] font-medium text-muted-foreground/70">Department</span>
              <span className="font-bold text-foreground truncate max-w-[170px] text-right">{previewStudent.department}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-[10px] font-medium text-muted-foreground/70">Year / Stream</span>
              <span className="font-bold text-foreground">
                {previewStudent.year} • {(previewStudent.stream ?? "Engineering").toUpperCase() === "ARTS" ? "Arts" : "Engineering"}
              </span>
            </div>

            {/* Academic Details Section */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-border/40 pt-2 mt-2">
              <div className="bg-muted/30 p-1.5 rounded-lg border border-border/30">
                <span className="text-muted-foreground/60 block text-[9px] uppercase font-semibold tracking-wider mb-0.5">Class X</span>
                <span className="font-bold text-foreground text-xs">{previewStudent.xMarks}%</span>
              </div>
              <div className="bg-muted/30 p-1.5 rounded-lg border border-border/30">
                <span className="text-muted-foreground/60 block text-[9px] uppercase font-semibold tracking-wider mb-0.5">Class XII</span>
                <span className="font-bold text-foreground text-xs">{previewStudent.xiiMarks}%</span>
              </div>
              <div className="bg-muted/30 p-1.5 rounded-lg border border-border/30 mt-0.5">
                <span className="text-muted-foreground/60 block text-[9px] uppercase font-semibold tracking-wider mb-0.5">UG Marks</span>
                <span className="font-bold text-foreground text-xs">{previewStudent.ugPercentage}%</span>
              </div>
              
              {previewStudent.pgPercentage !== null && previewStudent.pgPercentage !== undefined && previewStudent.pgPercentage !== 0 ? (
                <div className="bg-muted/30 p-1.5 rounded-lg border border-border/30 mt-0.5">
                  <span className="text-muted-foreground/60 block text-[9px] uppercase font-semibold tracking-wider mb-0.5">PG Marks</span>
                  <span className="font-bold text-foreground text-xs">{previewStudent.pgPercentage}%</span>
                </div>
              ) : (
                <div className="bg-muted/30 p-1.5 rounded-lg border border-border/30 mt-0.5">
                  <span className="text-muted-foreground/60 block text-[9px] uppercase font-semibold tracking-wider mb-0.5">Arrears</span>
                  <span className={`font-bold text-xs ${previewStudent.noOfArrears > 0 ? "text-red-500 dark:text-red-400" : "text-emerald-600 dark:text-emerald-500"}`}>
                    {previewStudent.noOfArrears}
                  </span>
                </div>
              )}
            </div>

            {previewStudent.pgPercentage !== null && previewStudent.pgPercentage !== undefined && previewStudent.pgPercentage !== 0 && (
              <div className="flex justify-between border-t border-border/40 pt-1.5 mt-1.5 items-center">
                <span className="text-[10px] font-medium text-muted-foreground/70">Arrears (Active / History)</span>
                <span className={`font-bold ${previewStudent.noOfArrears > 0 ? "text-red-500 dark:text-red-400" : "text-foreground"}`}>
                  {previewStudent.noOfArrears} / {previewStudent.historyOfArrears}
                </span>
              </div>
            )}
          </div>

          <div className="border-t border-border/50 pt-2.5 space-y-2">
            {(() => {
              const denom = getYearDenom(previewStudent.year, previewStudent.stream ?? undefined);
              const maxVal = denom.max;
              const pct = previewStudent.hireScore / maxVal;
              const tiers = [
                { label: "Academic", score: previewStudent.academicRegulatory, max: denom.academic, color: "#2563eb" },
                { label: "Cognitive", score: previewStudent.cognitiveLinguistic, max: denom.cognitive, color: "#7c3aed" },
                ...(denom.technical > 0 ? [{ label: "Technical", score: previewStudent.technicalProficiency, max: denom.technical, color: "#0891b2" }] : []),
                ...(denom.industry > 0 ? [{ label: "Industry", score: previewStudent.industryValidation, max: denom.industry, color: "#059669" }] : []),
              ];
              return (
                <>
                  {tiers.map(t => (
                    <div key={t.label} className="space-y-0.5">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-muted-foreground/80 font-medium">{t.label}</span>
                        <span className="font-bold" style={{ color: t.color }}>{Math.round(t.score)}/{t.max}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden border border-border/10">
                        <div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${Math.round((t.score/t.max)*100)}%`, backgroundColor: t.color }} />
                      </div>
                    </div>
                  ))}
                  
                  <div className="flex justify-between items-center pt-2 border-t border-border/30 mt-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">HIRE Score</span>
                    <div className="text-right">
                      <span className={`text-sm font-black ${
                        pct >= 0.70 ? "text-emerald-600 dark:text-emerald-400" : pct >= 0.50 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"
                      }`}>
                        {previewStudent.hireScore}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-medium">/{maxVal} ({Math.round(pct * 100)}%)</span>
                    </div>
                  </div>
                </>
              );
            })()}
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

      {/* Edit Student dialog */}
      <EditStudentDialog
        open={editStudent !== null}
        student={editStudent}
        onClose={() => setEditStudent(null)}
        onSave={() => { fetchStudents(); onImported(); }}
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

      {/* Bulk PDF Generation Progress Dialog */}
      <AlertDialog open={bulkGenerating}>
        <AlertDialogContent className="sm:max-w-[480px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-lg font-bold">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
              </span>
              Exporting PDFs in Bulk
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4 pt-2" render={<div />}>
              <div className="flex justify-between text-xs font-semibold text-foreground">
                <span>Progress</span>
                <span>{bulkCurrent} / {bulkTotal} completed</span>
              </div>
              
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden relative">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
                  style={{ width: `${bulkTotal > 0 ? Math.round((bulkCurrent / bulkTotal) * 100) : 0}%` }}
                />
              </div>

              <div className="text-xs text-muted-foreground min-h-[32px] flex items-center justify-between border rounded-lg p-2.5 bg-muted/20">
                <div className="flex flex-col">
                  <span className="font-bold text-foreground truncate max-w-[280px]">
                    {bulkCurrentName || "Initializing..."}
                  </span>
                  {bulkCurrentName && <span className="text-[10px] text-muted-foreground">Running PDF compiler...</span>}
                </div>
                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-mono">
                  {bulkTotal > 0 ? Math.round((bulkCurrent / bulkTotal) * 100) : 0}%
                </span>
              </div>

              {bulkErrors.length > 0 && (
                <div className="border border-destructive/20 bg-destructive/5 rounded-lg p-3 text-[11px] text-destructive max-h-32 overflow-y-auto space-y-1">
                  <p className="font-bold border-b border-destructive/10 pb-1 mb-1">Warnings/Errors ({bulkErrors.length})</p>
                  {bulkErrors.map((err, i) => (
                    <div key={i} className="truncate" title={err}>{err}</div>
                  ))}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="border-t pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { cancelBulkRef.current = true; }}
              className="text-xs"
            >
              Cancel Generation
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

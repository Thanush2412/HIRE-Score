"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import * as XLSX from "xlsx";
import { parseFpcNqtExcel, computeFpcNqtSummary } from "@/lib/nqt-parser";
import { getStoredNqtAssessments, addNqtAssessments, saveNqtAssessments, deleteNqtAssessment, clearNqtAssessments } from "@/lib/nqt-store";
import { FpcNqtAssessment, FpcNqtStudentResult } from "@/lib/nqt-types";
import { NqtImportDialog } from "@/components/nqt-import-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Upload, FileSpreadsheet, Download, Trash2, Award, TrendingUp, BarChart3, Search,
  CheckCircle2, Sparkles, UserCheck, Users, Layers, SlidersHorizontal, ArrowUpRight, ArrowDownRight, Activity, Brain, Calendar, HelpCircle,
  Filter, ArrowUpDown, ArrowUp, ArrowDown, Columns, RotateCcw, Pencil, Eye, Check, Save, X, ChevronLeft, ChevronRight
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from "recharts";

const BRAND_RED = "#F05136";

export type NqtColumnKey =
  | "registrationNumber"
  | "name"
  | "email"
  | "department"
  | "aptitude"
  | "coding"
  | "overall";

export interface NqtColDef {
  key: NqtColumnKey;
  label: string;
}

const NQT_COLUMNS: NqtColDef[] = [
  { key: "registrationNumber", label: "Reg Number" },
  { key: "name", label: "Student Name" },
  { key: "email", label: "Email Address" },
  { key: "department", label: "Dept / College" },
  { key: "aptitude", label: "Aptitude %" },
  { key: "coding", label: "Coding %" },
  { key: "overall", label: "Overall %" },
];

function NqtColumnFilterPopoverContent({
  columnKey,
  label,
  students,
  activeFilters,
  onApplyFilter,
}: {
  columnKey: NqtColumnKey;
  label: string;
  students: any[];
  activeFilters: string[];
  onApplyFilter: (vals: string[]) => void;
}) {
  const [query, setQuery] = useState("");

  const uniqueValues = useMemo(() => {
    const vals = new Set<string>();
    students.forEach(s => {
      let v = "";
      if (columnKey === "department") {
        v = [s.department, s.college].filter(Boolean).join(" • ") || "Unspecified";
      } else {
        v = String(s[columnKey] ?? "").trim() || "Unspecified";
      }
      vals.add(v);
    });
    return Array.from(vals).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
  }, [students, columnKey]);

  const filteredValues = useMemo(() => {
    if (!query) return uniqueValues;
    return uniqueValues.filter(v => v.toLowerCase().includes(query.toLowerCase()));
  }, [uniqueValues, query]);

  const selectedSet = useMemo(() => new Set(activeFilters), [activeFilters]);

  const toggleVal = (val: string) => {
    const next = new Set(selectedSet);
    if (next.has(val)) next.delete(val);
    else next.add(val);
    onApplyFilter(Array.from(next));
  };

  const selectAll = () => onApplyFilter(filteredValues);
  const clearAll = () => onApplyFilter([]);

  return (
    <div className="w-64 p-3 space-y-3 bg-popover rounded-xl shadow-xl border text-xs">
      <div className="flex items-center justify-between font-bold border-b pb-2">
        <span className="text-foreground">Filter {label}</span>
        {selectedSet.size > 0 && (
          <button onClick={clearAll} className="text-[10px] text-destructive hover:underline font-semibold">
            Clear ({selectedSet.size})
          </button>
        )}
      </div>

      <Input
        type="text"
        placeholder={`Search ${label}...`}
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="h-7 text-xs rounded-md"
      />

      <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
        {filteredValues.length === 0 ? (
          <p className="text-muted-foreground text-[11px] py-3 text-center">No options match query</p>
        ) : (
          filteredValues.map(val => (
            <label key={val} className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-muted/60 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={selectedSet.has(val)}
                onChange={() => toggleVal(val)}
                className="rounded border-muted-foreground/30 text-primary focus:ring-primary h-3.5 w-3.5"
              />
              <span className="truncate max-w-[180px] font-medium text-foreground" title={val}>{val}</span>
            </label>
          ))
        )}
      </div>

      <div className="flex items-center justify-between border-t pt-2 text-[10px] text-muted-foreground">
        <button onClick={selectAll} className="hover:text-primary font-semibold">Select All</button>
        <span>{selectedSet.size} of {uniqueValues.length} selected</span>
      </div>
    </div>
  );
}

interface StudentConsolidated {
  key: string;
  registrationNumber: string;
  name: string;
  email: string;
  department: string;
  college: string;
  attempts: (FpcNqtStudentResult & { assessmentName: string; uploadedAt: string })[];
  firstOverall: number;
  latestOverall: number;
  latestAptitude: number;
  latestCoding: number;
  avgOverall: number;
  avgAptitude: number;
  avgCoding: number;
  deltaOverall: number;
  matchedDbStudent: boolean;
}

interface DbStudentItem {
  id?: string;
  registrationNumber: string;
  name: string;
  email: string;
  department: string;
  college: string;
}

export function NqtDashboard() {
  const [isMounted, setIsMounted] = useState(false);
  const [assessments, setAssessments] = useState<FpcNqtAssessment[]>([]);
  const [dbStudents, setDbStudents] = useState<DbStudentItem[]>([]);

  useEffect(() => {
    setIsMounted(true);
  }, []);
  const [activeTab, setActiveTab] = useState<"consolidated" | "students" | "assessments">("consolidated");
  const [search, setSearch] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);

  // Upload confirmation modal state
  const [pendingUploads, setPendingUploads] = useState<FpcNqtAssessment[] | null>(null);
  const [conductedCountInput, setConductedCountInput] = useState<number>(1);

  // "See Progress" Modal State
  const [progressStudent, setProgressStudent] = useState<StudentConsolidated | null>(null);
  const [expandedLogIdx, setExpandedLogIdx] = useState<number | null>(null);

  const [filterMatchedOnly, setFilterMatchedOnly] = useState(false);
  const [presetFilter, setPresetFilter] = useState<"all" | "attempted" | "unattempted" | "top" | "atRisk" | "growth">("all");

  // Column Filtering, Visibility & Sorting state
  const [columnFilters, setColumnFilters] = useState<Record<NqtColumnKey, string[]>>({
    registrationNumber: [],
    name: [],
    email: [],
    department: [],
    aptitude: [],
    coding: [],
    overall: [],
  });

  const [visibleCols, setVisibleCols] = useState<Record<NqtColumnKey, boolean>>({
    registrationNumber: true,
    name: true,
    email: true,
    department: true,
    aptitude: true,
    coding: true,
    overall: true,
  });

  const [sortKey, setSortKey] = useState<NqtColumnKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Chart Pagination state
  const [chartPageIndex, setChartPageIndex] = useState<number>(0);

  // Reset page to 1 when filters or tabs change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterMatchedOnly, columnFilters, activeTab, presetFilter]);

  // Edit / Update Student state
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<{
    registrationNumber: string;
    name: string;
    email: string;
    department: string;
    college: string;
    numerical: number;
    verbal: number;
    reasoning: number;
    advQuant: number;
    coding: number;
  }>({
    registrationNumber: "",
    name: "",
    email: "",
    department: "",
    college: "",
    numerical: 0,
    verbal: 0,
    reasoning: 0,
    advQuant: 0,
    coding: 0,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const local = getStoredNqtAssessments();
    if (local && local.length > 0) {
      setAssessments(local);
    }

    // Fetch server-persisted NQT assessments from MySQL DB
    fetch("/api/nqt")
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.assessments) && data.assessments.length > 0) {
          const merged = addNqtAssessments(data.assessments);
          setAssessments(merged);
        }
      })
      .catch(err => console.error("Failed to load /api/nqt data:", err));

    // Fetch Hire DB student directory for profile matching (college, department, etc.)
    fetch("/api/students")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const list: DbStudentItem[] = data.map((s: any) => ({
            id: s.id,
            registrationNumber: String(s.registrationNumber || "").trim(),
            name: String(s.name || "").trim(),
            email: String(s.email || "").trim(),
            department: String(s.department || "").trim(),
            college: String(s.college || "").trim(),
          }));
          setDbStudents(list);
        }
      })
      .catch(() => { });
  }, []);

  const summary = computeFpcNqtSummary(assessments);

  // Extract student records across all uploaded assessments and merge with Hire DB students roster
  const { consolidatedStudents, allStudents, evaluatedCount } = useMemo(() => {
    function normKey(val: unknown): string {
      return String(val || "").trim().toLowerCase().replace(/[\s\-\._]/g, "");
    }

    const attemptsByReg = new Map<string, (FpcNqtStudentResult & { assessmentName: string; assessmentId: string; uploadedAt: string })[]>();
    const attemptsByEmail = new Map<string, (FpcNqtStudentResult & { assessmentName: string; assessmentId: string; uploadedAt: string })[]>();
    const attemptsByName = new Map<string, (FpcNqtStudentResult & { assessmentName: string; assessmentId: string; uploadedAt: string })[]>();

    // 1. Group uploaded NQT test attempts by student identifier with multi-index normalized keys
    assessments.forEach(ass => {
      if (ass.students && ass.students.length > 0) {
        ass.students.forEach(st => {
          const num = st.numerical || 0;
          const verb = st.verbal || 0;
          const reas = st.reasoning || 0;
          const adv = st.advQuant || 0;
          const apt = st.aptitude || Math.round(((num + verb + reas + adv) / 4) * 100) / 100;

          const item = {
            ...st,
            aptitude: apt,
            assessmentName: ass.assessmentName,
            assessmentId: ass.id,
            uploadedAt: ass.uploadedAt,
          };

          const r = normKey(st.registrationNumber);
          const e = normKey(st.email);
          const n = normKey(st.name);

          if (r) {
            const list = attemptsByReg.get(r) || [];
            list.push(item);
            attemptsByReg.set(r, list);
          }
          if (e) {
            const list = attemptsByEmail.get(e) || [];
            list.push(item);
            attemptsByEmail.set(e, list);
          }
          if (n) {
            const list = attemptsByName.get(n) || [];
            list.push(item);
            attemptsByName.set(n, list);
          }
        });
      }
    });

    const consolidatedMap = new Map<string, StudentConsolidated>();
    const allRecordsList: (FpcNqtStudentResult & { assessmentName: string; assessmentId: string; uploadedAt: string; attemptsCount?: number; attempts?: any[] })[] = [];

    // 2. Lookup map for Hire DB students to enrich profile info (college, department, etc.)
    const dbStudentsLookup = new Map<string, DbStudentItem>();
    dbStudents.forEach(dbSt => {
      if (dbSt.registrationNumber) {
        let r = dbSt.registrationNumber.toLowerCase();
        if (r.endsWith(".0")) r = r.slice(0, -2);
        dbStudentsLookup.set(r, dbSt);
      }
      if (dbSt.email) {
        dbStudentsLookup.set(dbSt.email.toLowerCase(), dbSt);
      }
      if (dbSt.name) {
        dbStudentsLookup.set(dbSt.name.toLowerCase(), dbSt);
      }
    });

    // 3. Merge ALL Placement DB students with uploaded NQT test attempts
    const processedKeys = new Set<string>();

    dbStudents.forEach(dbSt => {
      let regClean = String(dbSt.registrationNumber || "").trim().toLowerCase();
      if (regClean.endsWith(".0")) regClean = regClean.slice(0, -2);
      const emailClean = String(dbSt.email || "").trim().toLowerCase();
      const nameClean = String(dbSt.name || "").trim().toLowerCase();

      const studentKey = regClean || emailClean || nameClean;
      if (!studentKey || processedKeys.has(studentKey)) return;
      processedKeys.add(studentKey);

      const rNorm = normKey(dbSt.registrationNumber);
      const eNorm = normKey(dbSt.email);
      const nNorm = normKey(dbSt.name);

      const attempts = (rNorm ? attemptsByReg.get(rNorm) : undefined) ||
        (eNorm ? attemptsByEmail.get(eNorm) : undefined) ||
        (nNorm ? attemptsByName.get(nNorm) : undefined) || [];

      if (attempts.length > 0) {
        attempts.sort((a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime());
        const firstSt = attempts[0];
        const latestSt = attempts[attempts.length - 1];

        const firstOverall = firstSt.overall;
        const latestOverall = latestSt.overall;
        const totalAttempts = attempts.length;

        const sumOverall = attempts.reduce((acc, curr) => acc + (curr.overall || 0), 0);
        const sumAptitude = attempts.reduce((acc, curr) => acc + (curr.aptitude || 0), 0);
        const sumCoding = attempts.reduce((acc, curr) => acc + (curr.coding || 0), 0);
        const sumNumerical = attempts.reduce((acc, curr) => acc + (curr.numerical || 0), 0);
        const sumVerbal = attempts.reduce((acc, curr) => acc + (curr.verbal || 0), 0);
        const sumReasoning = attempts.reduce((acc, curr) => acc + (curr.reasoning || 0), 0);
        const sumAdvQuant = attempts.reduce((acc, curr) => acc + (curr.advQuant || 0), 0);

        const avgOverall = Math.round((sumOverall / totalAttempts) * 100) / 100;
        const avgAptitude = Math.round((sumAptitude / totalAttempts) * 100) / 100;
        const avgCoding = Math.round((sumCoding / totalAttempts) * 100) / 100;
        const avgNumerical = Math.round((sumNumerical / totalAttempts) * 100) / 100;
        const avgVerbal = Math.round((sumVerbal / totalAttempts) * 100) / 100;
        const avgReasoning = Math.round((sumReasoning / totalAttempts) * 100) / 100;
        const avgAdvQuant = Math.round((sumAdvQuant / totalAttempts) * 100) / 100;

        consolidatedMap.set(studentKey, {
          key: studentKey,
          registrationNumber: dbSt.registrationNumber || latestSt.registrationNumber || "",
          name: dbSt.name || latestSt.name || "Unknown Student",
          email: dbSt.email || latestSt.email || "",
          department: dbSt.department || latestSt.department || "",
          college: dbSt.college || latestSt.college || "",
          attempts,
          firstOverall,
          latestOverall,
          latestAptitude: latestSt.aptitude,
          latestCoding: latestSt.coding,
          avgOverall,
          avgAptitude,
          avgCoding,
          deltaOverall: Math.round((latestOverall - firstOverall) * 100) / 100,
          matchedDbStudent: true,
        });

        allRecordsList.push({
          ...latestSt,
          registrationNumber: dbSt.registrationNumber || latestSt.registrationNumber || "",
          email: dbSt.email || latestSt.email || "",
          name: dbSt.name || latestSt.name || "Unknown Student",
          department: dbSt.department || latestSt.department || "",
          college: dbSt.college || latestSt.college || "",
          matchedDbStudent: true,
          attemptsCount: totalAttempts,
          attempts,
          aptitude: avgAptitude,
          coding: avgCoding,
          overall: avgOverall,
          numerical: avgNumerical,
          verbal: avgVerbal,
          reasoning: avgReasoning,
          advQuant: avgAdvQuant,
        });
      } else {
        // Unattempted student from Placement DB roster
        consolidatedMap.set(studentKey, {
          key: studentKey,
          registrationNumber: dbSt.registrationNumber || "",
          name: dbSt.name || "Unknown Student",
          email: dbSt.email || "",
          department: dbSt.department || "",
          college: dbSt.college || "",
          attempts: [],
          firstOverall: 0,
          latestOverall: 0,
          latestAptitude: 0,
          latestCoding: 0,
          avgOverall: 0,
          avgAptitude: 0,
          avgCoding: 0,
          deltaOverall: 0,
          matchedDbStudent: true,
        });

        allRecordsList.push({
          registrationNumber: dbSt.registrationNumber || "",
          name: dbSt.name || "Unknown Student",
          email: dbSt.email || "",
          department: dbSt.department || "",
          college: dbSt.college || "",
          matchedDbStudent: true,
          attemptsCount: 0,
          attempts: [],
          assessmentName: "Not Attempted",
          assessmentId: "unattempted",
          uploadedAt: "",
          aptitude: 0,
          coding: 0,
          overall: 0,
          numerical: 0,
          verbal: 0,
          reasoning: 0,
          advQuant: 0,
        });
      }
    });

    const consolidatedList = Array.from(consolidatedMap.values());
    const evaluated = consolidatedList.filter(s => s.attempts.length > 0).length;

    return {
      consolidatedStudents: consolidatedList,
      allStudents: consolidatedList.map(s => {
        const latest = s.attempts.length > 0 ? s.attempts[s.attempts.length - 1] : null;
        return {
          registrationNumber: s.registrationNumber,
          name: s.name,
          email: s.email,
          department: s.department,
          college: s.college,
          matchedDbStudent: s.matchedDbStudent,
          attemptsCount: s.attempts.length,
          attempts: s.attempts,
          assessmentName: latest ? latest.assessmentName : "Not Attempted",
          assessmentId: latest ? ((latest as any).assessmentId || "unattempted") : "unattempted",
          uploadedAt: latest ? latest.uploadedAt : "",
          aptitude: s.avgAptitude,
          coding: s.avgCoding,
          overall: s.avgOverall,
          numerical: latest ? latest.numerical : 0,
          verbal: latest ? latest.verbal : 0,
          reasoning: latest ? latest.reasoning : 0,
          advQuant: latest ? latest.advQuant : 0,
        };
      }),
      evaluatedCount: evaluated,
    };
  }, [assessments, dbStudents]);


  // Map each assessment ID to a clean, unique College Name with Test Number suffix if repeated
  const assessmentCollegeMap = useMemo(() => {
    const map = new Map<string, string>();
    const collegeGroups = new Map<string, { id: string; ass: FpcNqtAssessment; date: number }[]>();

    function normKey(val: unknown): string {
      let s = String(val || "").trim().toLowerCase().replace(/[\s\-\._]/g, "");
      if (s.endsWith(".0")) s = s.slice(0, -2);
      return s;
    }

    const dbLookup = new Map<string, string>();
    dbStudents.forEach(dbSt => {
      if (dbSt.college) {
        const rNorm = normKey(dbSt.registrationNumber);
        const eNorm = normKey(dbSt.email);
        const nNorm = normKey(dbSt.name);
        if (rNorm) dbLookup.set(rNorm, dbSt.college.trim());
        if (eNorm) dbLookup.set(eNorm, dbSt.college.trim());
        if (nNorm) dbLookup.set(nNorm, dbSt.college.trim());
      }
    });

    assessments.forEach(ass => {
      let rawCollege = "";
      if (ass.students && ass.students.length > 0) {
        const counts: Record<string, number> = {};
        for (const st of ass.students) {
          let col = (st.college || "").trim();
          if (!col || col.toLowerCase() === "unspecified" || col.toLowerCase() === "unknown college") {
            const rNorm = normKey(st.registrationNumber);
            const eNorm = normKey(st.email);
            const nNorm = normKey(st.name);
            col = (rNorm ? dbLookup.get(rNorm) : undefined) ||
                  (eNorm ? dbLookup.get(eNorm) : undefined) ||
                  (nNorm ? dbLookup.get(nNorm) : undefined) || "";
          }
          if (col && col.toLowerCase() !== "unspecified" && col.toLowerCase() !== "unknown college") {
            counts[col] = (counts[col] || 0) + 1;
          }
        }
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        if (sorted.length > 0) rawCollege = sorted[0][0];
      }

      if (!rawCollege) {
        const name = ass.assessmentName || "Assessment";
        if (name.includes("SDNB")) rawCollege = "SDNB Vaishnav College";
        else if (name.includes("Takshashila") || name.startsWith("TU")) rawCollege = "Takshashila University";
        else if (name.includes("AMET")) rawCollege = "AMET University";
        else if (name.includes("S-VYASA") || name.includes("VYASA")) rawCollege = "S-VYASA University";
        else rawCollege = name.replace(/\.(xlsx|xls|csv)$/i, "").trim();
      }

      const dateMs = new Date(ass.uploadedAt || (ass as any).conductedDate || 0).getTime();
      const list = collegeGroups.get(rawCollege) || [];
      list.push({ id: ass.id, ass, date: dateMs });
      collegeGroups.set(rawCollege, list);
    });

    collegeGroups.forEach((items, collegeName) => {
      // Sort chronologically by date
      items.sort((a, b) => a.date - b.date);

      if (items.length === 1) {
        map.set(items[0].id, collegeName);
      } else {
        items.forEach((item, idx) => {
          map.set(item.id, `${collegeName} (Test ${idx + 1})`);
        });
      }
    });

    return map;
  }, [assessments, dbStudents]);

  const getCollegeDisplayName = (ass: FpcNqtAssessment): string => {
    return assessmentCollegeMap.get(ass.id) || ass.assessmentName;
  };

  // Recharts Assessment Progress Trend dataset (Individual entry per Assessment Report / Test)
  const chartData = useMemo(() => {
    return assessments.map((ass, idx) => {
      const fullCollegeName = getCollegeDisplayName(ass);
      const aptVal = ass.aptitudeAvg || Math.round(((ass.numericalAbilityAvg + ass.verbalAbilityAvg + ass.reasoningAbilityAvg + ass.advancedQuantReasoningAvg) / 4) * 100) / 100;
      const codingVal = ass.codingAvg || 0;
      const overallVal = ass.overallAvg || 0;

      // Clean, readable label for XAxis tick display with Test Number preserved
      let shortLabel = fullCollegeName;
      shortLabel = shortLabel
        .replace(/Vaishnav College of Arts & Science/i, "SDNB")
        .replace(/Vaishnav College/i, "SDNB")
        .replace(/Takshashila University/i, "Takshashila")
        .replace(/University/i, "Univ")
        .replace(/College/i, "Coll")
        .replace(/\s+/g, " ")
        .trim();

      return {
        id: ass.id,
        name: shortLabel,
        fullName: `${fullCollegeName} — File: "${ass.assessmentName}" (${ass.students?.length || 0} students evaluated)`,
        Aptitude: aptVal,
        Coding: codingVal,
        Overall: overallVal,
      };
    });
  }, [assessments, assessmentCollegeMap]);

  const totalChartPages = Math.max(1, Math.ceil(chartData.length / 5));
  const paginatedChartData = useMemo(() => {
    const start = chartPageIndex * 5;
    return chartData.slice(start, start + 5);
  }, [chartData, chartPageIndex]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadMessage(null);

    try {
      const fd = new FormData();
      fd.append("file", file);

      let parsed: FpcNqtAssessment[] = [];
      const res = await fetch("/api/nqt/import", { method: "POST", body: fd });
      if (res.ok) {
        const data = await res.json();
        if (data.assessments && Array.isArray(data.assessments)) {
          parsed = data.assessments;
        }
      }

      if (parsed.length === 0) {
        const buffer = await file.arrayBuffer();
        parsed = parseFpcNqtExcel(buffer, file.name);
      }

      if (parsed.length === 0) {
        setUploadMessage("❌ No valid FACE NQT assessment rows found in file.");
      } else {
        const defaultConducted = parsed.reduce((sum, a) => sum + (a.students?.length || a.assessmentsConducted || 1), 0);
        setPendingUploads(parsed);
        setConductedCountInput(defaultConducted);
      }
    } catch (err: any) {
      setUploadMessage(`❌ Error parsing file: ${err.message || "Invalid format"}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const confirmImportWithConductedCount = () => {
    if (!pendingUploads || pendingUploads.length === 0) return;

    const countPerAssessment = Math.max(1, Math.round(conductedCountInput / pendingUploads.length));
    const updatedPending = pendingUploads.map(ass => ({
      ...ass,
      assessmentsConducted: countPerAssessment,
    }));

    const updated = addNqtAssessments(updatedPending);
    setAssessments(updated);

    const totalStudents = updatedPending.reduce((sum, a) => sum + (a.students?.length || 0), 0);
    setUploadMessage(`✅ Successfully imported "${updatedPending[0].assessmentName}" (${totalStudents > 0 ? `${totalStudents} student scores` : `${updatedPending.length} summary records`}) with ${conductedCountInput} assessments conducted!`);

    setPendingUploads(null);
  };

  const handleDelete = async (id: string, name?: string) => {
    if (confirm(`Are you sure you want to delete assessment "${name || id}"?`)) {
      try {
        await fetch(`/api/nqt?id=${encodeURIComponent(id)}&name=${encodeURIComponent(name || "")}`, {
          method: "DELETE",
        });
      } catch (e) {
        console.error("Failed to delete assessment from API:", e);
      }
      const updated = deleteNqtAssessment(id);
      setAssessments(updated);
    }
  };

  const handleClearAll = async () => {
    if (confirm("Are you sure you want to delete all FACE NQT records?")) {
      try {
        await fetch("/api/nqt?id=all", { method: "DELETE" });
      } catch (e) {
        console.error("Failed to clear DB:", e);
      }
      clearNqtAssessments();
      setAssessments([]);
    }
  };

  const openStudentProgress = (studentIdentifier: string) => {
    const cleanKey = studentIdentifier.trim().toLowerCase();
    const found = consolidatedStudents.find(
      s =>
        s.key === cleanKey ||
        (s.registrationNumber && s.registrationNumber.trim().toLowerCase() === cleanKey) ||
        (s.email && s.email.trim().toLowerCase() === cleanKey)
    );
    if (found) {
      setProgressStudent(found);
      setExpandedLogIdx(found.attempts.length - 1);
    } else if (consolidatedStudents.length > 0) {
      setProgressStudent(consolidatedStudents[0]);
      setExpandedLogIdx(consolidatedStudents[0].attempts.length - 1);
    }
  };

  const openEditStudentModal = (st: any) => {
    setEditingStudent(st);
    setEditForm({
      registrationNumber: st.registrationNumber || "",
      name: st.name || "",
      email: st.email || "",
      department: st.department || "",
      college: st.college || "",
      numerical: st.numerical || 0,
      verbal: st.verbal || 0,
      reasoning: st.reasoning || 0,
      advQuant: st.advQuant || 0,
      coding: st.coding || 0,
    });
  };

  const handleSaveStudentEdit = () => {
    if (!editingStudent) return;
    const num = Number(editForm.numerical) || 0;
    const verb = Number(editForm.verbal) || 0;
    const reas = Number(editForm.reasoning) || 0;
    const adv = Number(editForm.advQuant) || 0;
    const apt = Math.round(((num + verb + reas + adv) / 4) * 100) / 100;
    const coding = Number(editForm.coding) || 0;
    const valid = [num, verb, reas, adv, coding].filter(v => v > 0);
    const overall = valid.length > 0 ? Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 100) / 100 : 0;

    const targetAssId = editingStudent.assessmentId;
    const targetReg = editingStudent.registrationNumber || editingStudent.email;

    const updatedAssessments = assessments.map(ass => {
      if (!targetAssId || ass.id === targetAssId) {
        const updatedStudents = (ass.students || []).map(st => {
          if (
            (targetReg && st.registrationNumber === targetReg) ||
            (editForm.email && st.email === editForm.email) ||
            st.name === editingStudent.name
          ) {
            return {
              ...st,
              registrationNumber: editForm.registrationNumber,
              name: editForm.name,
              email: editForm.email,
              department: editForm.department,
              college: editForm.college,
              numerical: num,
              verbal: verb,
              reasoning: reas,
              advQuant: adv,
              aptitude: apt,
              coding,
              overall,
            };
          }
          return st;
        });
        return {
          ...ass,
          students: updatedStudents,
        };
      }
      return ass;
    });

    setAssessments(updatedAssessments);
    saveNqtAssessments(updatedAssessments);
    setUploadMessage(`✅ Successfully updated student record for "${editForm.name}"!`);
    setEditingStudent(null);
  };

  const activeColumnFilterCount = useMemo(() => {
    return Object.values(columnFilters).reduce((sum, vals) => sum + (vals?.length ? 1 : 0), 0);
  }, [columnFilters]);

  const handleApplyColumnFilter = (colKey: NqtColumnKey, vals: string[]) => {
    setColumnFilters(prev => ({ ...prev, [colKey]: vals }));
  };

  const handleClearAllColumnFilters = () => {
    setColumnFilters({
      registrationNumber: [],
      name: [],
      email: [],
      department: [],
      aptitude: [],
      coding: [],
      overall: [],
    });
  };

  const handleToggleSort = (key: NqtColumnKey) => {
    if (sortKey === key) {
      if (sortDir === "asc") setSortDir("desc");
      else {
        setSortKey(null);
        setSortDir("asc");
      }
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const filteredAssessments = assessments.filter(a =>
    a.assessmentName.toLowerCase().includes(search.toLowerCase())
  );

  const filteredStudents = useMemo(() => {
    let list = allStudents.filter(s => {
      // Preset quick filter
      if (presetFilter === "attempted" && s.assessmentName === "Not Attempted") return false;
      if (presetFilter === "unattempted" && s.assessmentName !== "Not Attempted") return false;
      if (presetFilter === "top" && (s.assessmentName === "Not Attempted" || s.overall < 60)) return false;
      if (presetFilter === "atRisk" && (s.assessmentName === "Not Attempted" || s.overall >= 40)) return false;

      if (filterMatchedOnly && !s.matchedDbStudent && !(s.registrationNumber && s.email)) {
        return false;
      }
      const q = search.toLowerCase();
      if (q) {
        const matchQ =
          (s.name && s.name.toLowerCase().includes(q)) ||
          (s.registrationNumber && s.registrationNumber.toLowerCase().includes(q)) ||
          (s.email && s.email.toLowerCase().includes(q)) ||
          (s.assessmentName && s.assessmentName.toLowerCase().includes(q)) ||
          (s.department && s.department.toLowerCase().includes(q)) ||
          (s.college && s.college.toLowerCase().includes(q));
        if (!matchQ) return false;
      }

      for (const [colKey, selectedVals] of Object.entries(columnFilters)) {
        if (!selectedVals || selectedVals.length === 0) continue;
        const key = colKey as NqtColumnKey;
        let val = "";
        if (key === "department") {
          val = [s.department, s.college].filter(Boolean).join(" • ") || "Unspecified";
        } else {
          val = String(s[key] ?? "").trim() || "Unspecified";
        }
        if (!selectedVals.includes(val)) {
          return false;
        }
      }

      return true;
    });

    if (sortKey) {
      list = [...list].sort((a, b) => {
        let valA: any = a[sortKey];
        let valB: any = b[sortKey];

        if (sortKey === "department") {
          valA = [a.department, a.college].filter(Boolean).join(" • ");
          valB = [b.department, b.college].filter(Boolean).join(" • ");
        }

        if (typeof valA === "number" && typeof valB === "number") {
          return sortDir === "asc" ? valA - valB : valB - valA;
        }

        const strA = String(valA || "").toLowerCase();
        const strB = String(valB || "").toLowerCase();
        return sortDir === "asc" ? strA.localeCompare(strB) : strB.localeCompare(strA);
      });
    }

    return list;
  }, [allStudents, search, filterMatchedOnly, columnFilters, sortKey, sortDir, presetFilter]);

  const filteredConsolidated = useMemo(() => {
    let list = consolidatedStudents.filter(s => {
      // Preset quick filter
      if (presetFilter === "attempted" && s.attempts.length === 0) return false;
      if (presetFilter === "unattempted" && s.attempts.length > 0) return false;
      if (presetFilter === "top" && (s.attempts.length === 0 || s.latestOverall < 60)) return false;
      if (presetFilter === "atRisk" && (s.attempts.length === 0 || s.latestOverall >= 40)) return false;
      if (presetFilter === "growth" && (s.attempts.length <= 1 || s.deltaOverall <= 0)) return false;

      if (filterMatchedOnly && !s.matchedDbStudent && !(s.registrationNumber && s.email)) {
        return false;
      }
      const q = search.toLowerCase();
      return (
        !q ||
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.registrationNumber && s.registrationNumber.toLowerCase().includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q)) ||
        (s.department && s.department.toLowerCase().includes(q)) ||
        (s.college && s.college.toLowerCase().includes(q))
      );
    });

    if (sortKey) {
      list = [...list].sort((a, b) => {
        let valA: any = (a as any)[sortKey];
        let valB: any = (b as any)[sortKey];

        if (sortKey === "department") {
          valA = [a.department, a.college].filter(Boolean).join(" • ");
          valB = [b.department, b.college].filter(Boolean).join(" • ");
        } else if (sortKey === "overall") {
          valA = a.latestOverall;
          valB = b.latestOverall;
        } else if (sortKey === "aptitude") {
          valA = a.latestAptitude;
          valB = b.latestAptitude;
        } else if (sortKey === "coding") {
          valA = a.latestCoding;
          valB = b.latestCoding;
        }

        if (typeof valA === "number" && typeof valB === "number") {
          return sortDir === "asc" ? valA - valB : valB - valA;
        }

        const strA = String(valA || "").toLowerCase();
        const strB = String(valB || "").toLowerCase();
        return sortDir === "asc" ? strA.localeCompare(strB) : strB.localeCompare(strA);
      });
    }

    return list;
  }, [consolidatedStudents, search, filterMatchedOnly, sortKey, sortDir, presetFilter]);

  const totalStudentPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage, pageSize]);

  const totalConsolidatedPages = Math.max(1, Math.ceil(filteredConsolidated.length / pageSize));
  const paginatedConsolidated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredConsolidated.slice(start, start + pageSize);
  }, [filteredConsolidated, currentPage, pageSize]);

  const handleExportData = (format: "excel" | "csv" = "excel") => {
    let exportData: Record<string, any>[] = [];
    let filename = "";
    const dateStr = new Date().toISOString().slice(0, 10);

    if (activeTab === "students") {
      filename = `NQT_Student_Records_${dateStr}`;
      exportData = filteredStudents.map((s, idx) => ({
        "S.No": idx + 1,
        "Reg Number": s.registrationNumber || "",
        "Student Name": s.name || "",
        "Email": s.email || "",
        "Department": s.department || "",
        "College": s.college || "",
        "Assessment Name": s.assessmentName || "",
        "Aptitude %": s.aptitude ?? 0,
        "Coding %": s.coding ?? 0,
        "Overall %": s.overall ?? 0,
        "Numerical": s.numerical ?? 0,
        "Verbal": s.verbal ?? 0,
        "Reasoning": s.reasoning ?? 0,
        "Adv Quant": s.advQuant ?? 0,
        "Attempts Count": s.attemptsCount ?? 0,
      }));
    } else if (activeTab === "consolidated") {
      filename = `NQT_Consolidated_Progress_${dateStr}`;
      exportData = filteredConsolidated.map((s, idx) => ({
        "S.No": idx + 1,
        "Reg Number": s.registrationNumber || "",
        "Student Name": s.name || "",
        "Email": s.email || "",
        "Department": s.department || "",
        "College": s.college || "",
        "Total Attempts": s.attempts ? s.attempts.length : 0,
        "First Overall %": s.firstOverall ?? 0,
        "Latest Overall %": s.latestOverall ?? 0,
        "Latest Aptitude %": s.latestAptitude ?? 0,
        "Latest Coding %": s.latestCoding ?? 0,
        "Avg Overall %": s.avgOverall ?? 0,
        "Avg Aptitude %": s.avgAptitude ?? 0,
        "Avg Coding %": s.avgCoding ?? 0,
        "Growth/Delta %": s.deltaOverall ?? 0,
      }));
    } else {
      filename = `NQT_Assessment_Reports_${dateStr}`;
      exportData = filteredAssessments.map((a, idx) => ({
        "S.No": idx + 1,
        "Assessment Name": a.assessmentName || "",
        "Uploaded Date": a.uploadedAt ? new Date(a.uploadedAt).toLocaleDateString() : "",
        "Assessments Conducted": a.assessmentsConducted || 1,
        "Students Count": a.students?.length || 0,
        "Aptitude Avg %": a.aptitudeAvg ?? 0,
        "Coding Avg %": a.codingAvg ?? 0,
        "Overall Avg %": a.overallAvg ?? 0,
      }));
    }

    if (exportData.length === 0) {
      alert("No data available to export.");
      return;
    }

    if (format === "csv") {
      const headers = Object.keys(exportData[0]);
      const rows = exportData.map(row =>
        headers.map(h => {
          const val = row[h] === null || row[h] === undefined ? "" : String(row[h]);
          return `"${val.replace(/"/g, '""')}"`;
        }).join(",")
      );
      const csvContent = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "NQT Data");
      XLSX.writeFile(wb, `${filename}.xlsx`);
    }
  };

  const matchedStudentCount = allStudents.filter(s => s.matchedDbStudent || (s.registrationNumber && s.email)).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1 max-w-2xl">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-primary" /> FACE NQT Assessment Dashboard
          </h1>
          <p className="text-muted-foreground text-sm">
            Upload FACE NQT reports, track consolidated student progress & module performance across assessments.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0 sm:ml-auto sm:self-start">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xlsx,.xls,.csv"
            className="hidden"
          />

          <Popover>
            <PopoverTrigger className="inline-flex items-center justify-center gap-1.5 font-semibold text-xs rounded-lg border bg-background px-3 py-2 hover:bg-muted transition-colors shadow-xs cursor-pointer text-foreground">
              <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Export Data
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2 bg-popover rounded-xl shadow-xl border text-xs" align="end">
              <div className="font-bold border-b pb-1.5 mb-1.5 px-2 text-foreground">
                Export {activeTab === "students" ? "All Records" : activeTab === "consolidated" ? "Consolidated Progress" : "Assessment Reports"}
              </div>
              <button
                onClick={() => handleExportData("excel")}
                className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted font-medium text-foreground cursor-pointer transition-colors"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Export to Excel (.xlsx)</span>
              </button>
              <button
                onClick={() => handleExportData("csv")}
                className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted font-medium text-foreground cursor-pointer transition-colors"
              >
                <Download className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>Export to CSV (.csv)</span>
              </button>
            </PopoverContent>
          </Popover>

          <Button
            onClick={() => setMappingDialogOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md text-xs py-2 rounded-lg"
          >
            <SlidersHorizontal className="h-4 w-4 mr-1.5" />
            Import NQT Data
          </Button>
        </div>
      </div>

      {uploadMessage && (
        <div className={`p-4 rounded-lg text-sm font-medium border ${uploadMessage.startsWith("✅") ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-destructive/10 border-destructive/20 text-destructive"}`}>
          {uploadMessage}
        </div>
      )}

      {/* Top Header Metrics Row — 6 Symmetrical Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Reports Uploaded</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalAssessments}</div>
            <p className="text-xs text-muted-foreground mt-1">Uploaded test files</p>
          </CardContent>
        </Card>

        {/* PROMINENT HEADER CARD: Assessments Conducted */}
        <Card className="border-indigo-500/30 bg-indigo-500/5 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase text-indigo-600 dark:text-indigo-400">
              Assessments Conducted
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
              {summary.totalConducted}
            </div>
            <p className="text-xs text-indigo-600/80 dark:text-indigo-400/80 mt-1 font-medium">
              Total tests conducted
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Hire DB Students</CardTitle>
            <Users className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{consolidatedStudents.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {evaluatedCount > 0 ? `${evaluatedCount} evaluated` : "From Hire DB"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Overall Average</CardTitle>
            <Award className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{summary.overallAvgPercentage}%</div>
            <p className="text-xs text-muted-foreground mt-1">Consolidated test average</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Aptitude Avg</CardTitle>
            <Activity className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{summary.aptitudeAvg}%</div>
            <p className="text-xs text-muted-foreground mt-1">Num + Verb + Reas + Adv</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Coding Avg</CardTitle>
            <Brain className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{summary.codingAvg}%</div>
            <p className="text-xs text-muted-foreground mt-1">Programming & DSA</p>
          </CardContent>
        </Card>
      </div>

      {/* Module Performance Breakdown */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" /> Module Performance Breakdown
          </CardTitle>
          <CardDescription>
            Consolidated percentage score average per competency module across all uploaded NQT test reports.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            <div className="p-4 rounded-xl bg-muted/30 border space-y-2">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-muted-foreground">Numerical Ability</span>
                <span className="text-foreground text-sm font-black">{summary.numericalAbilityAvg}%</span>
              </div>
              <Progress value={summary.numericalAbilityAvg} className="h-2" />
              <p className="text-[10px] text-muted-foreground">Quantitative math & problem solving</p>
            </div>

            <div className="p-4 rounded-xl bg-muted/30 border space-y-2">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-muted-foreground">Verbal Ability</span>
                <span className="text-foreground text-sm font-black">{summary.verbalAbilityAvg}%</span>
              </div>
              <Progress value={summary.verbalAbilityAvg} className="h-2" />
              <p className="text-[10px] text-muted-foreground">English grammar & comprehension</p>
            </div>

            <div className="p-4 rounded-xl bg-muted/30 border space-y-2">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-muted-foreground">Reasoning Ability</span>
                <span className="text-foreground text-sm font-black">{summary.reasoningAbilityAvg}%</span>
              </div>
              <Progress value={summary.reasoningAbilityAvg} className="h-2" />
              <p className="text-[10px] text-muted-foreground">Logical & analytical reasoning</p>
            </div>

            <div className="p-4 rounded-xl bg-muted/30 border space-y-2">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-muted-foreground">Adv. Quant & Reasoning</span>
                <span className="text-foreground text-sm font-black">{summary.advancedQuantReasoningAvg}%</span>
              </div>
              <Progress value={summary.advancedQuantReasoningAvg} className="h-2" />
              <p className="text-[10px] text-muted-foreground">Advanced math & data analysis</p>
            </div>

            <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 space-y-2 col-span-2 sm:col-span-1">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-indigo-600 dark:text-indigo-400">Hands-on Coding</span>
                <span className="text-indigo-600 dark:text-indigo-400 text-sm font-black">{summary.codingAvg}%</span>
              </div>
              <Progress value={summary.codingAvg} className="h-2 bg-indigo-500/20" />
              <p className="text-[10px] text-indigo-600/80 dark:text-indigo-400/80">Programming logic & DSA</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assessment Trend Chart */}
      {isMounted && chartData && chartData.length > 0 && (
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-indigo-500" /> Assessment Comparison & Progress Trend
              </CardTitle>
              <CardDescription>
                Combined performance comparison across colleges and test reports from all uploaded NQT test files.
              </CardDescription>
            </div>

            {/* Navigation Arrows for College Graphs */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-muted-foreground font-medium">
                {chartData.length <= 5
                  ? `${chartData.length} ${chartData.length === 1 ? 'College' : 'Colleges'}`
                  : `Showing ${chartPageIndex * 5 + 1} - ${Math.min((chartPageIndex + 1) * 5, chartData.length)} of ${chartData.length}`}
              </span>

              {chartData.length > 5 && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 rounded-lg cursor-pointer"
                    disabled={chartPageIndex === 0}
                    onClick={() => setChartPageIndex(p => Math.max(0, p - 1))}
                    title="Previous Colleges"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 rounded-lg cursor-pointer"
                    disabled={chartPageIndex >= totalChartPages - 1}
                    onClick={() => setChartPageIndex(p => Math.min(totalChartPages - 1, p + 1))}
                    title="Next Colleges"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={paginatedChartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: any, name: any) => [`${value}%`, `${name} Avg`]}
                    labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                  <Bar dataKey="Aptitude" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Coding" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Overall" fill="#f05136" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Navigation Section */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={activeTab === "students" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("students")}
              className="font-semibold text-xs rounded-lg"
            >
              <UserCheck className="h-3.5 w-3.5 mr-1.5" />
              All Student Records ({allStudents.length})
            </Button>

            <Button
              variant={activeTab === "consolidated" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("consolidated")}
              className="font-semibold text-xs rounded-lg"
            >
              <Activity className="h-3.5 w-3.5 mr-1.5" />
              Consolidated Student Progress ({consolidatedStudents.length})
            </Button>

            <Button
              variant={activeTab === "assessments" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("assessments")}
              className="font-semibold text-xs rounded-lg"
            >
              <Layers className="h-3.5 w-3.5 mr-1.5" />
              Assessment Reports ({assessments.length})
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">

            {/* Column Visibility Selector Popover */}
            {activeTab === "students" && (
              <Popover>
                <PopoverTrigger className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold rounded-lg border bg-background px-3 py-1.5 hover:bg-muted transition-colors shadow-2xs cursor-pointer">
                  <Columns className="h-3.5 w-3.5" />
                  Columns
                </PopoverTrigger>
                <PopoverContent className="w-56 p-3 bg-popover rounded-xl shadow-xl border text-xs" align="end">
                  <div className="font-bold border-b pb-2 mb-2 text-foreground">Toggle Columns</div>
                  <div className="space-y-1.5 max-h-56 overflow-y-auto">
                    {NQT_COLUMNS.map(col => (
                      <label key={col.key} className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-muted/60 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={visibleCols[col.key]}
                          onChange={e => setVisibleCols(prev => ({ ...prev, [col.key]: e.target.checked }))}
                          className="rounded border-muted-foreground/30 text-primary"
                        />
                        <span className="font-medium text-foreground">{col.label}</span>
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {/* Reset Column Filters Button */}
            {activeTab === "students" && activeColumnFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAllColumnFilters}
                className="text-xs text-destructive hover:bg-destructive/10 font-semibold rounded-lg"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Reset Filters ({activeColumnFilterCount})
              </Button>
            )}

            <div className="w-full sm:w-64">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={
                    activeTab === "assessments"
                      ? "Search assessment..."
                      : "Search Reg No, Name, Email..."
                  }
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 text-sm rounded-lg"
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Quick Preset Filter Buttons Bar */}
          <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-muted/30 border text-xs">
            <span className="text-[11px] font-bold text-muted-foreground mr-1 uppercase tracking-wider flex items-center gap-1">
              <Filter className="h-3 w-3 text-primary" /> Quick Filters:
            </span>

            <button
              onClick={() => setPresetFilter("all")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${presetFilter === "all"
                  ? "bg-foreground text-background shadow-xs"
                  : "bg-background border text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
            >
              All Records ({allStudents.length})
            </button>

            <button
              onClick={() => setPresetFilter("attempted")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${presetFilter === "attempted"
                  ? "bg-blue-600 text-white shadow-xs font-bold"
                  : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 hover:bg-blue-500/20"
                }`}
            >
              <CheckCircle2 className="h-3 w-3" /> Attempted ({allStudents.filter(s => s.assessmentName !== "Not Attempted").length})
            </button>

            <button
              onClick={() => setPresetFilter("unattempted")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${presetFilter === "unattempted"
                  ? "bg-amber-600 text-white shadow-xs font-bold"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20"
                }`}
            >
              <HelpCircle className="h-3 w-3" /> Not Attempted ({allStudents.filter(s => s.assessmentName === "Not Attempted").length})
            </button>

            <button
              onClick={() => setPresetFilter("top")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${presetFilter === "top"
                  ? "bg-emerald-600 text-white shadow-xs font-bold"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                }`}
            >
              <Award className="h-3 w-3" /> Top Performers (≥60%) ({allStudents.filter(s => s.overall >= 60 && s.assessmentName !== "Not Attempted").length})
            </button>

            <button
              onClick={() => setPresetFilter("atRisk")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${presetFilter === "atRisk"
                  ? "bg-rose-600 text-white shadow-xs font-bold"
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20"
                }`}
            >
              <TrendingUp className="h-3 w-3 rotate-180" /> At-Risk (&lt;40%) ({allStudents.filter(s => s.overall < 40 && s.assessmentName !== "Not Attempted").length})
            </button>

            {activeTab === "consolidated" && (
              <button
                onClick={() => setPresetFilter("growth")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${presetFilter === "growth"
                    ? "bg-indigo-600 text-white shadow-xs font-bold"
                    : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20"
                  }`}
              >
                <ArrowUpRight className="h-3 w-3" /> Growth (+%) ({consolidatedStudents.filter(s => s.attempts.length > 1 && s.deltaOverall > 0).length})
              </button>
            )}

            {presetFilter !== "all" && (
              <button
                onClick={() => setPresetFilter("all")}
                className="text-[10px] text-destructive hover:underline font-bold ml-auto cursor-pointer"
              >
                Reset Filter
              </button>
            )}
          </div>
          {/* VIEW 1: All Student Test Records */}
          {activeTab === "students" && (
            <div className="rounded-xl border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 text-xs uppercase tracking-wider font-bold">
                    <TableHead className="font-bold text-center w-10">#</TableHead>
                    {NQT_COLUMNS.map(col => {
                      if (!visibleCols[col.key]) return null;
                      const isFiltered = (columnFilters[col.key]?.length || 0) > 0;

                      return (
                        <TableHead key={col.key} className="py-2.5 px-3">
                          <div className="flex items-center justify-between gap-1">
                            <button
                              onClick={() => handleToggleSort(col.key)}
                              className="flex items-center gap-1 font-bold hover:text-foreground transition-colors text-left"
                            >
                              <span>{col.label}</span>
                              {sortKey === col.key ? (
                                sortDir === "asc" ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />
                              ) : (
                                <ArrowUpDown className="h-3 w-3 text-muted-foreground/40 hover:text-muted-foreground" />
                              )}
                            </button>

                            <Popover>
                              <PopoverTrigger
                                className={`p-1 rounded-md hover:bg-muted/80 transition-colors ${isFiltered ? "text-primary bg-primary/10 border border-primary/20" : "text-muted-foreground/50 hover:text-foreground"
                                  }`}
                                title={`Filter ${col.label}`}
                              >
                                <Filter className="h-3 w-3" />
                              </PopoverTrigger>
                              <PopoverContent className="w-64 p-0 border-none shadow-none" align="start">
                                <NqtColumnFilterPopoverContent
                                  columnKey={col.key}
                                  label={col.label}
                                  students={allStudents}
                                  activeFilters={columnFilters[col.key] || []}
                                  onApplyFilter={vals => handleApplyColumnFilter(col.key, vals)}
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </TableHead>
                      );
                    })}
                    <TableHead className="font-bold text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {paginatedStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                        {assessments.length === 0 ? (
                          <div className="flex flex-col items-center justify-center space-y-3">
                            <FileSpreadsheet className="h-10 w-10 text-muted-foreground/40" />
                            <p className="font-semibold text-foreground/80">No FACE NQT Data Uploaded Yet</p>
                            <p className="text-xs text-muted-foreground max-w-md">
                              Upload FACE NQT Excel files to view student section performance & track aptitude scores.
                            </p>
                            <Button size="sm" onClick={() => fileInputRef.current?.click()} className="mt-2 text-xs">
                              <Upload className="h-3.5 w-3.5 mr-1.5" /> Select NQT File
                            </Button>
                          </div>
                        ) : (
                          "No matching student records found."
                        )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedStudents.map((st, idx) => {
                      const globalIdx = ((currentPage - 1) * pageSize) + idx + 1;
                      return (
                        <TableRow
                          key={`${st.assessmentId}-${idx}`}
                          onClick={() => openStudentProgress(st.registrationNumber || st.email || st.name)}
                          className="hover:bg-muted/50 cursor-pointer transition-colors"
                        >
                          <TableCell className="text-center text-xs font-mono text-muted-foreground font-semibold">
                            {globalIdx}
                          </TableCell>

                          {visibleCols["registrationNumber"] && (
                            <TableCell className="font-mono text-xs font-bold">
                              {st.registrationNumber ? (
                                <span className="text-primary">{st.registrationNumber}</span>
                              ) : (
                                <span className="text-muted-foreground/60 italic text-[11px]">— Unlinked</span>
                              )}
                            </TableCell>
                          )}

                          {visibleCols["name"] && (
                            <TableCell className="font-semibold text-foreground text-xs">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span>{st.name}</span>
                                {((st as any).attemptsCount || (st as any).attempts?.length || 1) > 1 && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20" title={`${(st as any).attemptsCount || (st as any).attempts?.length} test uploads aggregated into averages`}>
                                    {(st as any).attemptsCount || (st as any).attempts?.length} Tests (Avg)
                                  </span>
                                )}
                              </div>
                            </TableCell>
                          )}

                          {visibleCols["email"] && (
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {st.email ? (
                                <span className="text-foreground/90">{st.email}</span>
                              ) : (
                                <span className="text-muted-foreground/50 italic">—</span>
                              )}
                            </TableCell>
                          )}

                          {visibleCols["department"] && (
                            <TableCell className="text-xs text-muted-foreground">
                              {st.department || st.college ? (
                                <span>{[st.department, st.college].filter(Boolean).join(" • ")}</span>
                              ) : (
                                <span className="text-muted-foreground/50 italic">—</span>
                              )}
                            </TableCell>
                          )}



                          {visibleCols["aptitude"] && (
                            <TableCell className="text-center bg-indigo-500/5 font-bold text-xs text-indigo-600 dark:text-indigo-400">
                              {st.assessmentName === "Not Attempted" ? (
                                <span className="text-muted-foreground/50 font-normal">—</span>
                              ) : (
                                <div className="flex flex-col items-center">
                                  <span>{st.aptitude}%</span>
                                  <span className="text-[9px] font-normal text-muted-foreground" title={`Num: ${st.numerical}% | Verbal: ${st.verbal}% | Reasoning: ${st.reasoning}% | AdvQuant: ${st.advQuant}%`}>
                                    N:{st.numerical}% V:{st.verbal}% R:{st.reasoning}% AQ:{st.advQuant}%
                                  </span>
                                </div>
                              )}
                            </TableCell>
                          )}

                          {visibleCols["coding"] && (
                            <TableCell className="text-center text-xs font-medium">
                              {st.assessmentName === "Not Attempted" ? (
                                <span className="text-muted-foreground/50 font-normal">—</span>
                              ) : (
                                <span>{st.coding}%</span>
                              )}
                            </TableCell>
                          )}

                          {visibleCols["overall"] && (
                            <TableCell className="text-center">
                              {st.assessmentName === "Not Attempted" ? (
                                <span className="text-muted-foreground/50 text-xs italic px-2 py-0.5 rounded bg-muted/60">—</span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                                  {st.overall}%
                                </span>
                              )}
                            </TableCell>
                          )}

                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={(e) => { e.stopPropagation(); openEditStudentModal(st); }}
                                className="inline-flex items-center gap-1 text-[11px] font-medium border rounded-md px-2 py-1 transition-all shadow-2xs hover:bg-muted"
                                title="Read & Update Student Details & Scores"
                              >
                                <Pencil className="h-3 w-3 text-muted-foreground" />
                                Update
                              </button>

                              <button
                                onClick={() => openStudentProgress(st.registrationNumber || st.email || st.name)}
                                className="inline-flex items-center gap-1 text-[11px] font-medium border rounded-md px-2 py-1 transition-all shadow-2xs"
                                style={{ color: "#3b82f6", borderColor: `#3b82f655`, background: `#3b82f60d` }}
                              >
                                <TrendingUp className="h-3 w-3" />
                                Progress
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* VIEW 2: Consolidated Student Progress Tracking */}
          {activeTab === "consolidated" && (
            <div className="rounded-xl border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 text-xs uppercase tracking-wider font-bold">
                    <TableHead className="font-bold text-center w-10">#</TableHead>
                    <TableHead className="font-bold">Reg Number / Student</TableHead>
                    <TableHead className="font-bold text-center">Tests Taken</TableHead>
                    <TableHead className="font-bold text-center bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">Average Overall %</TableHead>
                    <TableHead className="font-bold text-center bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">Latest Aptitude %</TableHead>
                    <TableHead className="font-bold text-center">Latest Coding %</TableHead>
                    <TableHead className="font-bold text-center">Latest Overall %</TableHead>
                    <TableHead className="font-bold text-center">First Test Overall</TableHead>
                    <TableHead className="font-bold text-center">Progress Delta</TableHead>
                    <TableHead className="font-bold text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedConsolidated.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                        No consolidated student records available. Upload NQT reports to see student progress across tests.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedConsolidated.map((st, idx) => {
                      const globalIdx = ((currentPage - 1) * pageSize) + idx + 1;
                      return (
                        <TableRow
                          key={st.key}
                          onClick={() => openStudentProgress(st.key)}
                          className="hover:bg-muted/50 cursor-pointer transition-colors"
                        >
                          <TableCell className="text-center text-xs font-mono text-muted-foreground font-semibold">
                            {globalIdx}
                          </TableCell>

                          <TableCell className="text-xs">
                            <div className="font-bold text-foreground">
                              {st.name}
                            </div>
                            <div className="font-mono text-[11px] text-primary">
                              {st.registrationNumber ? st.registrationNumber : "No Reg No"}
                              {st.email ? ` • ${st.email}` : ""}
                            </div>
                            {(st.department || st.college) && (
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                {[st.department, st.college].filter(Boolean).join(" • ")}
                              </div>
                            )}
                          </TableCell>

                          <TableCell className="text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-muted border">
                              {st.attempts.length} Test{st.attempts.length > 1 ? "s" : ""}
                            </span>
                          </TableCell>

                          <TableCell className="text-center bg-emerald-500/5 font-extrabold text-xs text-emerald-700 dark:text-emerald-400">
                            {st.avgOverall}%
                          </TableCell>

                          <TableCell className="text-center bg-indigo-500/5 font-bold text-xs text-indigo-600 dark:text-indigo-400">
                            {st.latestAptitude}%
                          </TableCell>

                          <TableCell className="text-center text-xs font-medium">{st.latestCoding}%</TableCell>

                          <TableCell className="text-center font-bold text-xs">
                            {st.latestOverall}%
                          </TableCell>

                          <TableCell className="text-center text-xs text-muted-foreground">
                            {st.firstOverall}%
                          </TableCell>

                          <TableCell className="text-center">
                            {st.attempts.length > 1 ? (
                              st.deltaOverall >= 0 ? (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                  <ArrowUpRight className="h-3 w-3" /> +{st.deltaOverall}%
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold bg-destructive/10 text-destructive border border-destructive/20">
                                  <ArrowDownRight className="h-3 w-3" /> {st.deltaOverall}%
                                </span>
                              )
                            ) : (
                              <span className="text-xs text-muted-foreground/60 italic">Base test</span>
                            )}
                          </TableCell>

                          <TableCell className="text-center">
                            <button
                              onClick={() => openStudentProgress(st.key)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold border rounded-md px-2.5 py-1.5 transition-all shadow-2xs"
                              style={{ color: "#3b82f6", borderColor: `#3b82f655`, background: `#3b82f60d` }}
                            >
                              <TrendingUp className="h-3.5 w-3.5" />
                              See Progress
                            </button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* VIEW 3: Assessment Reports Overview Table */}
          {activeTab === "assessments" && (
            <div className="rounded-xl border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 text-xs uppercase tracking-wider font-bold">
                    <TableHead className="font-bold">Assessment Name</TableHead>
                    <TableHead className="font-bold text-center">Conducted / Students</TableHead>
                    <TableHead className="font-bold text-center bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">Aptitude Avg %</TableHead>
                    <TableHead className="font-bold text-center">Coding Avg %</TableHead>
                    <TableHead className="font-bold text-center">Overall Avg %</TableHead>
                    <TableHead className="w-12 text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssessments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        No NQT assessment reports found. Upload an Excel file to see report data.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAssessments.map(item => {
                      const aptAvg = item.aptitudeAvg || Math.round(((item.numericalAbilityAvg + item.verbalAbilityAvg + item.reasoningAbilityAvg + item.advancedQuantReasoningAvg) / 4) * 100) / 100;
                      return (
                        <TableRow key={item.id} className="hover:bg-muted/30">
                          <TableCell className="font-semibold text-foreground">
                            {getCollegeDisplayName(item)}
                            {getCollegeDisplayName(item) !== item.assessmentName && (
                              <span className="block text-[11px] font-normal text-muted-foreground">{item.assessmentName}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                              {item.assessmentsConducted} Conducted
                            </span>
                          </TableCell>

                          <TableCell className="text-center bg-indigo-500/5 font-bold text-indigo-600 dark:text-indigo-400">
                            {aptAvg}%
                          </TableCell>

                          <TableCell className="text-center font-medium">{item.codingAvg}%</TableCell>

                          <TableCell className="text-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                              {item.overallAvg}%
                            </span>
                          </TableCell>

                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(item.id, item.assessmentName)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                              title={`Delete assessment ${item.assessmentName}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination Bar */}
          {activeTab !== "assessments" && (
            <div className="flex items-center justify-between flex-wrap gap-2 pt-3 border-t border-border mt-3 text-xs">
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground font-medium">
                  Showing {activeTab === "students" ? (filteredStudents.length > 0 ? ((currentPage - 1) * pageSize) + 1 : 0) : (filteredConsolidated.length > 0 ? ((currentPage - 1) * pageSize) + 1 : 0)} - {Math.min(currentPage * pageSize, activeTab === "students" ? filteredStudents.length : filteredConsolidated.length)} of {activeTab === "students" ? filteredStudents.length : filteredConsolidated.length} entries
                </p>
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => {
                    setPageSize(Number(v));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-7 w-24 text-xs font-semibold rounded-lg bg-background border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 / page</SelectItem>
                    <SelectItem value="25">25 / page</SelectItem>
                    <SelectItem value="50">50 / page</SelectItem>
                    <SelectItem value="100">100 / page</SelectItem>
                    <SelectItem value="250">250 / page</SelectItem>
                    <SelectItem value="500">500 / page</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0 font-bold"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                  title="First Page"
                >
                  «
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0 font-bold"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                  title="Previous Page"
                >
                  ‹
                </Button>
                <div className="flex items-center gap-1 px-2 font-medium">
                  <span className="text-xs text-muted-foreground">Page</span>
                  <span className="text-xs font-bold text-foreground">{currentPage}</span>
                  <span className="text-xs text-muted-foreground">of</span>
                  <span className="text-xs font-bold text-foreground">
                    {activeTab === "students" ? totalStudentPages : totalConsolidatedPages}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0 font-bold"
                  disabled={currentPage === (activeTab === "students" ? totalStudentPages : totalConsolidatedPages)}
                  onClick={() => setCurrentPage(p => p + 1)}
                  title="Next Page"
                >
                  ›
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0 font-bold"
                  disabled={currentPage === (activeTab === "students" ? totalStudentPages : totalConsolidatedPages)}
                  onClick={() => setCurrentPage(activeTab === "students" ? totalStudentPages : totalConsolidatedPages)}
                  title="Last Page"
                >
                  »
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── UPLOAD CONFIRMATION DIALOG: Ask to Increment Assessments Conducted ── */}
      {pendingUploads && (
        <Dialog open={!!pendingUploads} onOpenChange={(o) => { if (!o) setPendingUploads(null); }}>
          <DialogContent className="max-w-md rounded-2xl border bg-card shadow-2xl p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-primary" /> Confirm Assessment Upload
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                Importing report: <b className="text-foreground">{pendingUploads[0]?.assessmentName}</b>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="p-3.5 rounded-xl bg-muted/40 border text-xs space-y-1.5">
                <p><b>Detected Test Records:</b> {pendingUploads.reduce((sum, a) => sum + (a.students?.length || 0), 0)} student scores</p>
                <p><b>Parsed Overall Average:</b> {pendingUploads[0]?.overallAvg}%</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground block">
                  Should this upload increase the total count of Assessments Conducted?
                </label>
                <p className="text-[11px] text-muted-foreground">
                  Confirm or update the count of assessments conducted to add to your header stats.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Conducted Count:</span>
                  <Input
                    type="number"
                    min="1"
                    value={conductedCountInput}
                    onChange={(e) => setConductedCountInput(Math.max(1, parseInt(e.target.value) || 1))}
                    className="h-9 text-sm font-bold w-32"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" size="sm" onClick={() => setPendingUploads(null)}>
                Cancel
              </Button>
              <Button size="sm" onClick={confirmImportWithConductedCount} className="font-semibold">
                Confirm & Import
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ── SEE PROGRESS DIALOG MODAL (Matches HIRE Score Progress History Modal) ── */}
      {progressStudent && (
        <Dialog open={!!progressStudent} onOpenChange={(o) => { if (!o) setProgressStudent(null); }}>
          <DialogContent className="sm:!max-w-[1050px] w-[95vw] max-h-[90vh] overflow-y-auto p-0 rounded-2xl border bg-card shadow-2xl">
            {/* Modal Header */}
            <DialogHeader className="p-5 border-b bg-muted/30">
              <div className="flex items-start justify-between">
                <div>
                  <DialogTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
                    <TrendingUp className="h-5 w-5 text-blue-500" /> Student NQT Progress Timeline
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-1">
                    Historical test scores & module performance progression for {progressStudent.name}
                  </DialogDescription>
                </div>
              </div>

              {/* Student Identity Card */}
              <div className="mt-4 p-3.5 rounded-xl bg-background border flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <p className="font-bold text-foreground text-sm">
                    {progressStudent.name}
                  </p>
                  <div className="font-mono text-primary text-xs font-medium mt-0.5 flex flex-wrap items-center gap-2">
                    {progressStudent.registrationNumber && <span>{progressStudent.registrationNumber}</span>}
                    {progressStudent.email && <span>• {progressStudent.email}</span>}
                  </div>
                  {(progressStudent.department || progressStudent.college) && (
                    <div className="text-[11px] text-muted-foreground mt-0.5 font-medium">
                      {[progressStudent.department, progressStudent.college].filter(Boolean).join(" • ")}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                    Avg Overall: {progressStudent.avgOverall}%
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    {progressStudent.attempts.length} Test Attempt{progressStudent.attempts.length > 1 ? "s" : ""}
                  </span>
                  {progressStudent.attempts.length > 1 && (
                    progressStudent.deltaOverall >= 0 ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-0.5">
                        <ArrowUpRight className="h-3.5 w-3.5" /> +{progressStudent.deltaOverall}% Growth
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-destructive/10 text-destructive border border-destructive/20 flex items-center gap-0.5">
                        <ArrowDownRight className="h-3.5 w-3.5" /> {progressStudent.deltaOverall}% Change
                      </span>
                    )
                  )}
                </div>
              </div>
            </DialogHeader>

            <div className="p-6 pb-10 space-y-6">
              {/* Score Trend Bar Visualization */}
              <div className="p-4 rounded-xl border bg-muted/20 space-y-2">
                <p className="text-xs font-bold uppercase text-muted-foreground">Test Overall Score Progression</p>
                <div className="flex items-end gap-3 h-28 pt-4">
                  {progressStudent.attempts.map((att, i) => {
                    const isLatest = i === progressStudent.attempts.length - 1;
                    const heightPct = Math.max(att.overall, 15);
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center relative group">
                        <span className={`text-[10px] font-bold mb-1 ${isLatest ? "text-primary" : "text-muted-foreground"}`}>
                          {att.overall}%
                        </span>
                        <div
                          className={`w-full max-w-[28px] rounded-t-md transition-all duration-300 ${isLatest ? "bg-primary" : "bg-muted-foreground/40"}`}
                          style={{ height: `${heightPct}%` }}
                          title={`${att.assessmentName}: ${att.overall}%`}
                        />
                        <span className="text-[10px] font-semibold text-muted-foreground mt-1">#{i + 1}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Chronological Test Logs List */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-foreground uppercase tracking-wider">Attempt Logs ({progressStudent.attempts.length})</p>
                {progressStudent.attempts.map((att, i) => {
                  const isLatest = i === progressStudent.attempts.length - 1;
                  const isExpanded = expandedLogIdx === i;
                  const formattedDate = new Date(att.uploadedAt).toLocaleDateString(undefined, {
                    month: "short", day: "numeric", year: "numeric"
                  });

                  return (
                    <div
                      key={i}
                      onClick={() => setExpandedLogIdx(isExpanded ? null : i)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${isLatest ? "bg-primary/5 border-primary/30" : "bg-card hover:bg-muted/30"}`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Big Score Badge */}
                        <div
                          className="flex flex-col items-center justify-center min-w-[56px] h-12 rounded-lg text-white font-extrabold shadow-sm shrink-0"
                          style={{ backgroundColor: isLatest ? BRAND_RED : "#4b5563" }}
                        >
                          <span className="text-lg leading-none">{att.overall}%</span>
                          <span className="text-[8px] uppercase tracking-wider opacity-90 mt-0.5">Overall</span>
                        </div>

                        {/* Test Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-bold truncate max-w-[260px] ${isLatest ? "text-primary" : "text-foreground"}`}>
                              {att.assessmentName}
                            </span>
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" /> {formattedDate}
                            </span>
                          </div>

                          {/* Quick Module Summary Line */}
                          <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-muted-foreground border-t border-dashed pt-2">
                            <span>Aptitude: <b className="text-indigo-600 dark:text-indigo-400">{att.aptitude}%</b></span>
                            <span>Adv Quant: <b>{att.advQuant}%</b></span>
                            <span>Coding: <b>{att.coding}%</b></span>
                          </div>
                        </div>
                      </div>

                      {/* Expandable Module Breakdown Details */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs" onClick={(e) => e.stopPropagation()}>
                          <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 col-span-2">
                            <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">Aptitude 4-Module Breakdown</p>
                            <div className="grid grid-cols-2 gap-1 mt-1 text-[11px]">
                              <span>Numerical: <b>{att.numerical}%</b></span>
                              <span>Verbal: <b>{att.verbal}%</b></span>
                              <span>Reasoning: <b>{att.reasoning}%</b></span>
                              <span>Adv Quant: <b>{att.advQuant}%</b></span>
                            </div>
                          </div>

                          <div className="p-2 rounded-lg bg-muted/40 border">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Coding</p>
                            <p className="text-base font-bold text-foreground mt-1">{att.coding}%</p>
                          </div>

                          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                            <p className="text-[10px] font-bold text-primary uppercase">Overall Score</p>
                            <p className="text-base font-extrabold text-primary mt-1">{att.overall}%</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── EDIT / UPDATE STUDENT & SCORES DIALOG ── */}
      {editingStudent && (
        <Dialog open={!!editingStudent} onOpenChange={o => { if (!o) setEditingStudent(null); }}>
          <DialogContent className="sm:!max-w-[640px] w-[95vw] rounded-2xl border bg-card shadow-2xl p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                <Pencil className="h-5 w-5 text-primary" /> Read & Update Student Record
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                Edit student profile details and NQT assessment module scores.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3 max-h-[70vh] overflow-y-auto pr-1">
              <div className="space-y-3 p-3.5 rounded-xl bg-muted/30 border text-xs">
                <p className="font-bold text-foreground text-xs border-b pb-1">Student Profile Info</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground">Student Name</label>
                    <Input
                      value={editForm.name}
                      onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                      className="h-8 text-xs font-semibold mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground">Reg Number</label>
                    <Input
                      value={editForm.registrationNumber}
                      onChange={e => setEditForm(f => ({ ...f, registrationNumber: e.target.value }))}
                      className="h-8 text-xs font-mono font-semibold mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground">Email Address</label>
                    <Input
                      value={editForm.email}
                      onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                      className="h-8 text-xs font-mono mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground">Department / College</label>
                    <Input
                      value={editForm.department}
                      onChange={e => setEditForm(f => ({ ...f, department: e.target.value }))}
                      className="h-8 text-xs mt-1"
                      placeholder="e.g. CSE • SDNB"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 p-3.5 rounded-xl bg-indigo-500/5 border border-indigo-500/20 text-xs">
                <p className="font-bold text-indigo-600 dark:text-indigo-400 text-xs border-b border-indigo-500/20 pb-1">
                  NQT Assessment Module Scores (%)
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground">Numerical Ability %</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={editForm.numerical}
                      onChange={e => setEditForm(f => ({ ...f, numerical: Number(e.target.value) }))}
                      className="h-8 text-xs font-bold mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground">Verbal Ability %</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={editForm.verbal}
                      onChange={e => setEditForm(f => ({ ...f, verbal: Number(e.target.value) }))}
                      className="h-8 text-xs font-bold mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground">Reasoning Ability %</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={editForm.reasoning}
                      onChange={e => setEditForm(f => ({ ...f, reasoning: Number(e.target.value) }))}
                      className="h-8 text-xs font-bold mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground">Adv. Quant & Reasoning %</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={editForm.advQuant}
                      onChange={e => setEditForm(f => ({ ...f, advQuant: Number(e.target.value) }))}
                      className="h-8 text-xs font-bold mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground">Coding %</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={editForm.coding}
                      onChange={e => setEditForm(f => ({ ...f, coding: Number(e.target.value) }))}
                      className="h-8 text-xs font-bold mt-1"
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t mt-2">
              <Button variant="outline" size="sm" onClick={() => setEditingStudent(null)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveStudentEdit} className="font-semibold">
                <Save className="h-3.5 w-3.5 mr-1" />
                Save & Update Record
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Interactive Column Mapping Dialog */}
      <NqtImportDialog
        open={mappingDialogOpen}
        onClose={() => setMappingDialogOpen(false)}
        onImported={(newAssessments) => {
          const updated = addNqtAssessments(newAssessments);
          setAssessments(updated);
        }}
      />
    </div>
  );
}

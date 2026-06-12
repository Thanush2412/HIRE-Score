"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, Search, FileText, ExternalLink, CheckCircle2, AlertCircle,
  Eye, Download, ChevronRight, Filter, Check, FolderOpen,
  Sparkles, Globe, ShieldCheck, FileCheck2, LayoutList, RefreshCw, X
} from "lucide-react";
import { StoredStudent } from "@/lib/db";

// ── Types ─────────────────────────────────────────────────────────────────────
interface VerifiableItem {
  key: string;
  name: string;
  category: "Academic" | "Language" | "Technical" | "Industry";
  value?: string | number;
  url?: string;
  type: "file" | "link";
  detail?: string;
}

interface Settings {
  colleges: Array<{
    name: string;
    stream: "engineering" | "arts";
    courses: Array<{
      name: string;
      degreeType: "ug" | "pg";
      years: string[];
    }>;
  }>;
}

export default function UserVerifyPage() {
  const router = useRouter();
  const [students, setStudents] = useState<StoredStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<StoredStudent | null>(null);
  const [selectedItem, setSelectedItem] = useState<VerifiableItem | null>(null);

  // Search & Filter state
  const [search, setSearch] = useState("");
  const [selectedCollege, setSelectedCollege] = useState("all");
  const [selectedCourse, setSelectedCourse] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");
  const [selectedStream, setSelectedStream] = useState("all");
  const [uploadStatusFilter, setUploadStatusFilter] = useState("all"); // all, has_uploads, missing_uploads

  const [settings, setSettings] = useState<Settings>({ colleges: [] });

  // ── Load Settings & Students ──────────────────────────────────────────────
  useEffect(() => {
    // Auth Check
    const auth = sessionStorage.getItem("hire_auth");
    if (!auth) {
      router.replace("/login");
      return;
    }

    Promise.all([
      fetch("/api/settings").then(r => r.json()),
      fetch("/api/students").then(r => r.json())
    ])
      .then(([settingsData, studentsData]) => {
        if (settingsData && Array.isArray(settingsData.colleges)) {
          setSettings(settingsData);
        }
        if (Array.isArray(studentsData)) {
          setStudents(studentsData);
          if (studentsData.length > 0) {
            setSelectedStudent(studentsData[0]);
          }
        }
      })
      .catch(err => {
        console.error("Failed to load verify page data:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // ── Helper to compile student items ──────────────────────────────────────
  const getVerifiableItems = (s: StoredStudent): VerifiableItem[] => {
    const items: VerifiableItem[] = [];

    // Academic
    if (s.xMarksheetUrl) {
      items.push({
        key: "x_marksheet",
        name: "Class X (10th) Marksheet",
        category: "Academic",
        value: `${s.xMarks}%`,
        url: s.xMarksheetUrl,
        type: "file"
      });
    } else {
      items.push({
        key: "x_marksheet_missing",
        name: "Class X (10th) Marksheet",
        category: "Academic",
        value: `${s.xMarks}%`,
        type: "file"
      });
    }

    if (s.xiiMarksheetUrl) {
      items.push({
        key: "xii_marksheet",
        name: "Class XII (12th) Marksheet",
        category: "Academic",
        value: `${s.xiiMarks}%`,
        url: s.xiiMarksheetUrl,
        type: "file"
      });
    } else {
      items.push({
        key: "xii_marksheet_missing",
        name: "Class XII (12th) Marksheet",
        category: "Academic",
        value: `${s.xiiMarks}%`,
        type: "file"
      });
    }

    if (s.ugSemesterMarks && Array.isArray(s.ugSemesterMarks)) {
      s.ugSemesterMarks.forEach((sem, idx) => {
        items.push({
          key: `ug_sem_${idx}`,
          name: `UG ${sem.semester} Marksheet`,
          category: "Academic",
          value: `${sem.percentage}%`,
          url: sem.fileUrl,
          type: "file"
        });
      });
    }

    if (s.pgSemesterMarks && Array.isArray(s.pgSemesterMarks)) {
      s.pgSemesterMarks.forEach((sem, idx) => {
        items.push({
          key: `pg_sem_${idx}`,
          name: `PG ${sem.semester} Marksheet`,
          category: "Academic",
          value: `${sem.percentage}%`,
          url: sem.fileUrl,
          type: "file"
        });
      });
    }

    // Language
    const langCerts = [
      { key: "cefrGrammar", name: "CEFR Grammar Certificate", val: s.cefrGrammar, url: s.certUrls?.cefrGrammar },
      { key: "efListening", name: "EF SET Listening Certificate", val: s.efSetListening, url: s.certUrls?.efListening },
      { key: "efSpeaking", name: "EF SET Speaking Certificate", val: s.efSetSpeaking, url: s.certUrls?.efSpeaking },
      { key: "efReading", name: "EF SET Reading Certificate", val: s.efSetReading, url: s.certUrls?.efReading },
      { key: "efWriting", name: "EF SET Writing Certificate", val: s.efSetWriting, url: s.certUrls?.efWriting }
    ];

    langCerts.forEach(c => {
      if (c.url || c.val) {
        items.push({
          key: `lang_${c.key}`,
          name: c.name,
          category: "Language",
          value: c.val || undefined,
          url: c.url,
          type: "file"
        });
      }
    });

    // Technical
    if (s.leetcodeUrl) {
      items.push({
        key: "tech_leetcode",
        name: "Leetcode Profile",
        category: "Technical",
        value: s.leetcodeRank ? `Rank: ${s.leetcodeRank}` : undefined,
        url: s.leetcodeUrl,
        type: "link"
      });
    }
    if (s.githubUrl) {
      items.push({
        key: "tech_github",
        name: "GitHub Profile",
        category: "Technical",
        url: s.githubUrl,
        type: "link"
      });
    }

    if (s.internalCodeathonDetails && Array.isArray(s.internalCodeathonDetails)) {
      s.internalCodeathonDetails.forEach((c, idx) => {
        items.push({
          key: `internal_codeathon_${idx}`,
          name: `Internal Codeathon: ${c.title || `Event ${idx + 1}`}`,
          category: "Technical",
          url: c.fileUrl || c.link,
          type: c.fileUrl ? "file" : "link",
          detail: c.description
        });
      });
    }

    if (s.externalCodeathonDetails && Array.isArray(s.externalCodeathonDetails)) {
      s.externalCodeathonDetails.forEach((c, idx) => {
        items.push({
          key: `external_codeathon_${idx}`,
          name: `External Codeathon: ${c.title || `Event ${idx + 1}`}`,
          category: "Technical",
          url: c.fileUrl || c.link,
          type: c.fileUrl ? "file" : "link",
          detail: c.description
        });
      });
    }

    if (s.fullLengthProjectDetails && Array.isArray(s.fullLengthProjectDetails)) {
      s.fullLengthProjectDetails.forEach((p, idx) => {
        items.push({
          key: `full_project_${idx}`,
          name: `Full Project: ${p.title || `Project ${idx + 1}`}`,
          category: "Technical",
          url: p.fileUrl || p.link,
          type: p.fileUrl ? "file" : "link",
          detail: p.description
        });
      });
    }

    // Industry
    if (s.globalCertDetails && Array.isArray(s.globalCertDetails)) {
      s.globalCertDetails.forEach((c, idx) => {
        items.push({
          key: `global_cert_${idx}`,
          name: `Global Cert: ${c.name || `Cert ${idx + 1}`}`,
          category: "Industry",
          value: c.issuer,
          url: c.fileUrl || c.link,
          type: c.fileUrl ? "file" : "link"
        });
      });
    }

    if (s.otherCertDetails && Array.isArray(s.otherCertDetails)) {
      s.otherCertDetails.forEach((c, idx) => {
        items.push({
          key: `other_cert_${idx}`,
          name: `Other Cert: ${c.name || `Cert ${idx + 1}`}`,
          category: "Industry",
          value: c.issuer,
          url: c.fileUrl || c.link,
          type: c.fileUrl ? "file" : "link"
        });
      });
    }

    return items;
  };

  // ── Calculate Stats for Student List ─────────────────────────────────────
  const studentStats = useMemo(() => {
    const map = new Map<string, { uploaded: number; total: number }>();
    students.forEach(s => {
      const items = getVerifiableItems(s);
      const total = items.length;
      const uploaded = items.filter(item => !!item.url).length;
      map.set(s.id, { uploaded, total });
    });
    return map;
  }, [students]);

  // ── Available options for filters ─────────────────────────────────────────
  const availableColleges = useMemo(() => {
    return Array.from(new Set(students.map(s => s.college).filter(Boolean))).sort();
  }, [students]);

  const availableCourses = useMemo(() => {
    let list = students;
    if (selectedCollege !== "all") list = list.filter(s => s.college === selectedCollege);
    return Array.from(new Set(list.map(s => s.department).filter(Boolean))).sort();
  }, [students, selectedCollege]);

  const availableYears = useMemo(() => {
    let list = students;
    if (selectedCollege !== "all") list = list.filter(s => s.college === selectedCollege);
    if (selectedCourse !== "all") list = list.filter(s => s.department === selectedCourse);
    return Array.from(new Set(list.map(s => s.year).filter(Boolean))).sort();
  }, [students, selectedCollege, selectedCourse]);

  // Reset page-level filters when parent filter changes
  useEffect(() => {
    setSelectedCourse("all");
    setSelectedYear("all");
  }, [selectedCollege]);

  useEffect(() => {
    setSelectedYear("all");
  }, [selectedCourse]);

  // ── Filtered Student List ────────────────────────────────────────────────
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      // Search
      const searchStr = `${s.name} ${s.registrationNumber}`.toLowerCase();
      if (search && !searchStr.includes(search.toLowerCase())) return false;

      // College
      if (selectedCollege !== "all" && s.college !== selectedCollege) return false;

      // Course
      if (selectedCourse !== "all" && s.department !== selectedCourse) return false;

      // Year
      if (selectedYear !== "all" && s.year !== selectedYear) return false;

      // Stream
      if (selectedStream !== "all" && (s.stream ?? "engineering").toLowerCase() !== selectedStream) return false;

      // Upload status
      const stats = studentStats.get(s.id);
      if (stats) {
        if (uploadStatusFilter === "has_uploads" && stats.uploaded === 0) return false;
        if (uploadStatusFilter === "missing_uploads" && stats.uploaded === stats.total) return false;
      }

      return true;
    });
  }, [students, search, selectedCollege, selectedCourse, selectedYear, selectedStream, uploadStatusFilter, studentStats]);

  // ── Selected Student items ────────────────────────────────────────────────
  const selectedStudentItems = useMemo(() => {
    if (!selectedStudent) return [];
    return getVerifiableItems(selectedStudent);
  }, [selectedStudent]);

  // Auto-select first item when student changes
  useEffect(() => {
    if (selectedStudentItems.length > 0) {
      // Find first item with url to preview
      const firstWithUrl = selectedStudentItems.find(item => !!item.url);
      setSelectedItem(firstWithUrl || selectedStudentItems[0]);
    } else {
      setSelectedItem(null);
    }
  }, [selectedStudent, selectedStudentItems]);

  const itemsByCategory = useMemo(() => {
    const categories: Record<VerifiableItem["category"], VerifiableItem[]> = {
      Academic: [],
      Language: [],
      Technical: [],
      Industry: []
    };
    selectedStudentItems.forEach(item => {
      categories[item.category].push(item);
    });
    return categories;
  }, [selectedStudentItems]);

  // Clear preview choice
  const handleSelectStudent = (s: StoredStudent) => {
    setSelectedStudent(s);
  };

  const handleExportCSV = () => {
    const headers = [
      "Name",
      "Registration Number",
      "College",
      "Department",
      "Year",
      "Stream",
      "Class X Marksheet",
      "Class XII Marksheet",
      "UG Semester Marksheet",
      "CEFR Grammar",
      "EF SET Listening",
      "EF SET Speaking",
      "EF SET Reading",
      "EF SET Writing",
      "Internal Codeathons",
      "External Codeathons",
      "Full Length Projects",
      "Global Certifications"
    ];

    const rows = filteredStudents.map(s => {
      const yn = (val: any) => (val ? "Yes" : "No");

      const ugStatus = (s.ugSemesterMarks || []).some(sem => !!sem.fileUrl) ? "Yes" : "No";

      const intCodeStatus = (s.internalCodeathonDetails || []).length > 0
        ? ((s.internalCodeathonDetails || []).every(d => !!d.fileUrl) ? "Yes" : "No")
        : "N/A";

      const extCodeStatus = (s.externalCodeathonDetails || []).length > 0
        ? ((s.externalCodeathonDetails || []).every(d => !!d.fileUrl) ? "Yes" : "No")
        : "N/A";

      const projStatus = (s.fullLengthProjectDetails || []).length > 0
        ? ((s.fullLengthProjectDetails || []).every(d => !!d.fileUrl) ? "Yes" : "No")
        : "N/A";

      const globalCertStatus = (s.globalCertDetails || []).length > 0
        ? ((s.globalCertDetails || []).every(d => !!d.fileUrl) ? "Yes" : "No")
        : "N/A";

      return [
        s.name,
        s.registrationNumber,
        s.college || "",
        s.department,
        s.year,
        s.stream || "",
        yn(s.xMarksheetUrl),
        yn(s.xiiMarksheetUrl),
        ugStatus,
        yn(s.certUrls?.cefrGrammar),
        yn(s.certUrls?.efListening),
        yn(s.certUrls?.efSpeaking),
        yn(s.certUrls?.efReading),
        yn(s.certUrls?.efWriting),
        intCodeStatus,
        extCodeStatus,
        projStatus,
        globalCertStatus
      ];
    });

    const csvContent = "\uFEFF" + [headers, ...rows]
      .map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `certificate_verification_report_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isPDF = (url?: string) => {
    if (!url) return false;
    return url.toLowerCase().split("?")[0].endsWith(".pdf");
  };

  const isImage = (url?: string) => {
    if (!url) return false;
    const path = url.toLowerCase().split("?")[0];
    return path.endsWith(".png") || path.endsWith(".jpg") || path.endsWith(".jpeg") || path.endsWith(".webp");
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-3 text-muted-foreground">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-semibold">Loading verification interface…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] bg-background">
      {/* ── Filter Bar ── */}
      <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border/80 bg-card rounded-2xl shadow-sm mb-4">
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider shrink-0">
          <Filter className="h-3.5 w-3.5" /> Filters
        </div>

        {/* College Filter */}
        <select
          value={selectedCollege}
          onChange={(e) => setSelectedCollege(e.target.value)}
          className="h-9 px-3 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring max-w-[200px]"
        >
          <option value="all">All Colleges</option>
          {availableColleges.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Course Filter */}
        <select
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
          className="h-9 px-3 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring max-w-[200px]"
        >
          <option value="all">All Departments</option>
          {availableCourses.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        {/* Year Filter */}
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className="h-9 px-3 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring w-28"
        >
          <option value="all">All Years</option>
          {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
        </select>

        {/* Stream Filter */}
        <select
          value={selectedStream}
          onChange={(e) => setSelectedStream(e.target.value)}
          className="h-9 px-3 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring w-32"
        >
          <option value="all">All Streams</option>
          <option value="engineering">Engineering</option>
          <option value="arts">Arts</option>
        </select>

        {/* Upload Status Filter */}
        <select
          value={uploadStatusFilter}
          onChange={(e) => setUploadStatusFilter(e.target.value)}
          className="h-9 px-3 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring w-44"
        >
          <option value="all">All Statuses</option>
          <option value="has_uploads">Has Uploaded Docs</option>
          <option value="missing_uploads">Missing Proofs / Files</option>
        </select>

        {/* Actions on the Right */}
        <div className="flex items-center gap-3 ml-auto">
          {(selectedCollege !== "all" || selectedCourse !== "all" || selectedYear !== "all" || selectedStream !== "all" || uploadStatusFilter !== "all" || search !== "") && (
            <button
              onClick={() => {
                setSelectedCollege("all");
                setSelectedCourse("all");
                setSelectedYear("all");
                setSelectedStream("all");
                setUploadStatusFilter("all");
                setSearch("");
              }}
              className="text-xs font-semibold text-destructive hover:underline cursor-pointer"
            >
              Clear all
            </button>
          )}
          <button
            onClick={handleExportCSV}
            className="h-9 px-3.5 rounded-xl border border-border hover:bg-muted text-xs font-semibold flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-muted/20"
          >
            <Download className="h-3.5 w-3.5" /> Export Audit CSV
          </button>
        </div>
      </div>

      {/* ── Main Workspace: 3 Panels ── */}
      <div className="flex flex-1 gap-4 overflow-hidden min-h-0">
        
        {/* PANEL 1: Search & Student list (Left) */}
        <div className="w-80 flex flex-col border border-border/80 rounded-2xl bg-card overflow-hidden shrink-0 shadow-sm">
          {/* Search Header */}
          <div className="p-3 border-b border-border/60 bg-muted/20">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search candidates..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-4 text-xs rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground font-semibold px-1">
              <span>{filteredStudents.length} candidates found</span>
            </div>
          </div>

          {/* Student Scroll Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/40">
            {filteredStudents.length > 0 ? (
              filteredStudents.map(s => {
                const isSelected = selectedStudent?.id === s.id;
                const stats = studentStats.get(s.id) || { uploaded: 0, total: 0 };
                const pct = stats.total > 0 ? Math.round((stats.uploaded / stats.total) * 100) : 0;
                
                return (
                  <div
                    key={s.id}
                    onClick={() => handleSelectStudent(s)}
                    className={`p-3.5 cursor-pointer transition-all flex flex-col gap-1.5 hover:bg-muted/30 select-none ${
                      isSelected
                        ? "bg-primary/5 dark:bg-primary/10 border-l-4 border-primary"
                        : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-bold text-foreground truncate max-w-[180px]">{s.name}</p>
                      <span className="text-[10px] font-bold tabular-nums text-muted-foreground/80">{s.hireScore}</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground/80">
                      <span className="font-mono truncate max-w-[120px]">{s.registrationNumber}</span>
                      <span className="truncate max-w-[100px] text-right">{s.department}</span>
                    </div>

                    {/* Progress micro-bar */}
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            pct === 100
                              ? "bg-emerald-500"
                              : pct > 50
                              ? "bg-amber-500"
                              : "bg-muted-foreground/40"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[9px] font-bold shrink-0 text-muted-foreground">
                        {stats.uploaded}/{stats.total} proofs
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground gap-2">
                <FolderOpen className="h-8 w-8 opacity-40" />
                <p className="text-xs font-semibold">No candidates match filters</p>
              </div>
            )}
          </div>
        </div>

        {/* PANEL 2: Student details & items list (Middle) */}
        <div className="flex-1 flex flex-col border border-border/80 rounded-2xl bg-card overflow-hidden shadow-sm">
          {selectedStudent ? (
            <>
              {/* Candidate Info Header */}
              <div className="p-4 border-b border-border/60 bg-muted/10 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-black text-foreground">{selectedStudent.name}</h2>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {selectedStudent.registrationNumber} • {selectedStudent.college} • {selectedStudent.department}
                  </p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full bg-muted text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Year {selectedStudent.year}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                      {selectedStudent.stream}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                      HIRE Score: {selectedStudent.hireScore}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => router.push(`/students/${selectedStudent.registrationNumber}`)}
                  className="h-8 px-3 rounded-lg border border-border hover:bg-muted text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 text-muted-foreground hover:text-foreground"
                >
                  View Profile <ChevronRight className="h-3 w-3" />
                </button>
              </div>

              {/* Items List grouped by category */}
              <div className="flex-1 overflow-y-auto p-4 space-y-5">
                {(Object.keys(itemsByCategory) as Array<keyof typeof itemsByCategory>).map((catName) => {
                  const items = itemsByCategory[catName];
                  if (items.length === 0) return null;

                  return (
                    <div key={catName} className="space-y-2">
                      <h3 className="text-xs font-bold text-muted-foreground/80 uppercase tracking-widest px-1">
                        {catName}
                      </h3>
                      <div className="border border-border/40 rounded-xl divide-y divide-border/30 overflow-hidden bg-background">
                        {items.map((item) => {
                          const isSelected = selectedItem?.key === item.key;
                          const hasUrl = !!item.url;

                          return (
                            <div
                              key={item.key}
                              onClick={() => setSelectedItem(item)}
                              className={`p-3 flex items-center justify-between gap-4 cursor-pointer transition-all hover:bg-muted/10 ${
                                isSelected ? "bg-primary/5 dark:bg-primary/10 font-medium" : ""
                              }`}
                            >
                              <div className="min-w-0 flex-1 flex items-start gap-2.5">
                                <div className="mt-0.5 shrink-0">
                                  {hasUrl ? (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                  ) : (
                                    <AlertCircle className="h-4 w-4 text-muted-foreground/50" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-foreground truncate">
                                    {item.name}
                                  </p>
                                  {item.detail && (
                                    <p className="text-[10px] text-muted-foreground truncate max-w-[280px]">
                                      {item.detail}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                {item.value && (
                                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                                    {item.value}
                                  </span>
                                )}

                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  hasUrl 
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400" 
                                    : "bg-muted text-muted-foreground"
                                }`}>
                                  {hasUrl ? (item.type === "file" ? "Uploaded" : "Link Valid") : "Not Uploaded"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-muted-foreground gap-3">
              <ShieldCheck className="h-12 w-12 opacity-30" />
              <p className="text-sm font-semibold">Select a candidate to start verification</p>
            </div>
          )}
        </div>

        {/* PANEL 3: Live Previewer (Right) */}
        <div className="w-[500px] flex flex-col border border-border/80 rounded-2xl bg-card overflow-hidden shrink-0 shadow-sm">
          {selectedItem && selectedItem.url ? (
            <div className="flex flex-col h-full">
              {/* Preview Header */}
              <div className="p-3 border-b border-border/60 bg-muted/15 flex items-center justify-between">
                <div className="min-w-0 flex-1 pr-2">
                  <p className="text-xs font-black text-foreground truncate">{selectedItem.name}</p>
                  <p className="text-[9px] text-muted-foreground truncate max-w-[320px] font-mono mt-0.5">
                    {selectedItem.url}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={selectedItem.url}
                    target="_blank"
                    rel="noreferrer"
                    title="Open in new tab"
                    className="h-8 w-8 rounded-lg border border-border hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  {selectedItem.type === "file" && (
                    <a
                      href={selectedItem.url}
                      download
                      title="Download file"
                      className="h-8 w-8 rounded-lg border border-border hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>

              {/* Preview Body */}
              <div className="flex-1 bg-muted/10 relative overflow-hidden">
                {isPDF(selectedItem.url) ? (
                  <iframe
                    src={`https://docs.google.com/viewer?url=${encodeURIComponent(selectedItem.url)}&embedded=true`}
                    className="w-full h-full border-0 bg-background"
                    title="PDF Document Viewer"
                  />
                ) : isImage(selectedItem.url) ? (
                  <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
                    <img
                      src={selectedItem.url}
                      alt={selectedItem.name}
                      className="max-w-full max-h-full object-contain rounded-lg border border-border/40 shadow-md"
                    />
                  </div>
                ) : (
                  // Link Profile / Fallback
                  <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center gap-4 bg-background">
                    <div className="h-16 w-16 rounded-3xl bg-primary/10 flex items-center justify-center border border-primary/20">
                      <Globe className="h-7 w-7 text-primary" />
                    </div>
                    <div className="space-y-1 max-w-xs">
                      <h4 className="text-xs font-bold text-foreground">External Link Preview</h4>
                      <p className="text-[11px] text-muted-foreground">
                        This is an external URL/profile link (e.g. GitHub or Leetcode). We cannot preview it directly inside the pane due to security settings.
                      </p>
                    </div>
                    <a
                      href={selectedItem.url}
                      target="_blank"
                      rel="noreferrer"
                      className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-sm"
                    >
                      Visit External Link <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Empty Previewer Fallback
            <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-muted/5">
              <div className="w-48 h-48 border-2 border-dashed border-border/60 rounded-3xl flex flex-col items-center justify-center gap-4 p-6 select-none bg-card/60">
                <FileText className="h-10 w-10 text-muted-foreground/30 animate-pulse" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-muted-foreground/90">No Preview Selected</p>
                  <p className="text-[10px] text-muted-foreground/60 leading-normal">
                    {selectedItem 
                      ? "This item has no uploaded document file." 
                      : "Select an uploaded certificate from the middle panel to view its preview here."}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

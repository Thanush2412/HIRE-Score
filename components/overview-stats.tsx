"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import {
  Users, Trophy, TrendingUp, GraduationCap,
  Brain, Code, Award, Target, Zap, Medal, ChevronLeft, ChevronRight,
  Star, ArrowUp, ArrowDown, BarChart3, Download, Columns,
} from "lucide-react";
import { StoredStudent } from "@/lib/db";
import { useChartColors } from "@/hooks/use-chart-colors";

const TC = { academic: "#2563eb", cognitive: "#7c3aed", technical: "#0891b2", industry: "#059669" };

function TT({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))", borderRadius: 8, padding: "6px 10px", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
      <p style={{ fontWeight: 600 }}>{d.name || d.subject || d.label}</p>
      <p style={{ fontWeight: 700, marginTop: 2 }}>{payload[0].value}%</p>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }: any) {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-4 hover:shadow-md transition-shadow">
      <div className="h-9 w-9 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: `${color}18` }}>
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <p className="text-2xl font-black tabular-nums text-foreground">{value}</p>
      <p className="text-xs font-semibold text-muted-foreground mt-0.5">{label}</p>
      <p className="text-[11px] text-muted-foreground/60 mt-0.5">{sub}</p>
    </div>
  );
}

export function OverviewStats({ refresh }: { refresh?: number }) {
  const router = useRouter();
  const [students, setStudents] = useState<StoredStudent[]>([]);
  const [allStudents, setAllStudents] = useState<StoredStudent[]>([]);
  const [page, setPage] = useState(1);
  const [leaderMode, setLeaderMode] = useState<"top" | "bottom">("top");
  const [selectedStudent, setSelectedStudent] = useState<StoredStudent | null>(null);

  // Leaderboard column visibility
  type LeaderCol = "regNo" | "dept" | "stream" | "year" | "academic" | "cognitive" | "technical" | "industry";
  const ALL_LEADER_COLS: { key: LeaderCol; label: string }[] = [
    { key: "regNo",     label: "Reg No."  },
    { key: "dept",      label: "Dept"     },
    { key: "stream",    label: "Stream"   },
    { key: "year",      label: "Year"     },
    { key: "academic",  label: "Academic" },
    { key: "cognitive", label: "Cognitive"},
    { key: "technical", label: "Technical"},
    { key: "industry",  label: "Industry" },
  ];
  const [visibleCols, setVisibleCols] = useState<Set<LeaderCol>>(
    new Set(["regNo", "dept", "stream", "academic", "cognitive", "technical", "industry"])
  );
  const [colMenuOpen, setColMenuOpen] = useState(false);
  const toggleCol = (k: LeaderCol) =>
    setVisibleCols(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const [isSharedView, setIsSharedView] = useState(false);
  const [shareFilter, setShareFilter] = useState<{ college: string; colleges?: string[]; courses: string[]; years?: string[] } | null>(null);
  
  // Filter states
  const [selectedCollege, setSelectedCollege] = useState<string>("all");
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedStream, setSelectedStream] = useState<string>("all");
  const [selectedDegreeType, setSelectedDegreeType] = useState<string>("ug");
  const [graphDegreeType, setGraphDegreeType] = useState<string>("ug");
  
  // Settings and Hover states
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
  const [settings, setSettings] = useState<Settings>({ colleges: [] });
  const [previewStudent, setPreviewStudent] = useState<StoredStudent | null>(null);
  const [previewPos, setPreviewPos] = useState({ x: 0, y: 0 });

  const PER = 15;
  const { tick, border } = useChartColors();

  // Load Settings
  useEffect(() => {
    fetch("/api/settings")
      .then(r => r.json())
      .then(data => {
        if (data && Array.isArray(data.colleges)) {
          setSettings(data);
        }
      })
      .catch(err => {
        console.error("Failed to load settings:", err);
      });
  }, []);

  useEffect(() => {
    // Check if there's a share filter
    const shareFilterStr = sessionStorage.getItem("shareFilter");
    const filter = shareFilterStr ? JSON.parse(shareFilterStr) : null;
    setIsSharedView(!!filter);
    setShareFilter(filter);
    
    let url = "/api/students";
    
    if (filter) {
      const params = new URLSearchParams();
      // Support multiple colleges
      if (filter.colleges && filter.colleges.length > 0) {
        params.set("colleges", JSON.stringify(filter.colleges));
      } else if (filter.college) {
        params.set("college", filter.college);
      }
      if (filter.courses && filter.courses.length > 0) {
        params.set("courses", JSON.stringify(filter.courses));
      }
      if (filter.years && filter.years.length > 0) {
        params.set("years", JSON.stringify(filter.years));
      }
      url = `/api/students?${params.toString()}`;
    }
    
    fetch(url).then(r => r.json()).then(data => {
      if (Array.isArray(data)) {
        setAllStudents(data);
        setStudents(data);
      } else {
        console.error("API returned non-array data:", data);
        setAllStudents([]);
        setStudents([]);
      }
    }).catch(err => {
      console.error("Failed to fetch students:", err);
    });
  }, [refresh]);
  
  useEffect(() => { setPage(1); }, [students.length]);

  // Sync graphDegreeType with selectedDegreeType
  useEffect(() => {
    setGraphDegreeType(selectedDegreeType);
  }, [selectedDegreeType]);

  // Reset filters on stream/degree change
  useEffect(() => {
    setSelectedCollege("all");
    setSelectedCourse("all");
    setSelectedYear("all");
  }, [selectedDegreeType, selectedStream]);

  // Populate dropdowns from Settings
  const hasCollegeData = settings.colleges && settings.colleges.length > 0;

  const availableColleges = isSharedView && shareFilter
    ? (shareFilter.colleges?.length ? shareFilter.colleges : [shareFilter.college])
    : settings.colleges
        .filter(col => {
          if (selectedStream !== "all" && col.stream !== selectedStream) return false;
          return col.courses.some((co: any) => co.degreeType === selectedDegreeType);
        })
        .map(col => col.name)
        .sort() as string[];

  const availableCourses = (() => {
    if (isSharedView && shareFilter && shareFilter.courses && shareFilter.courses.length > 0) {
      return shareFilter.courses;
    }
    if (selectedCollege === "all") {
      const coursesSet = new Set<string>();
      settings.colleges.forEach(col => {
        if (selectedStream !== "all" && col.stream !== selectedStream) return;
        col.courses.forEach((co: any) => {
          if (co.degreeType === selectedDegreeType) {
            coursesSet.add(co.name);
          }
        });
      });
      return Array.from(coursesSet).sort();
    } else {
      const col = settings.colleges.find(c => c.name === selectedCollege);
      if (!col) return [];
      return col.courses
        .filter((co: any) => co.degreeType === selectedDegreeType)
        .map((co: any) => co.name)
        .sort();
    }
  })();

  const availableYears = (() => {
    if (isSharedView && shareFilter && shareFilter.years && shareFilter.years.length > 0) {
      return shareFilter.years;
    }
    const yearsSet = new Set<string>();
    settings.colleges.forEach(col => {
      if (selectedCollege !== "all" && col.name !== selectedCollege) return;
      if (selectedStream !== "all" && col.stream !== selectedStream) return;
      col.courses.forEach((co: any) => {
        if (co.degreeType !== selectedDegreeType) return;
        if (selectedCourse !== "all" && co.name !== selectedCourse) return;
        co.years.forEach((yr: string) => {
          yearsSet.add(yr);
        });
      });
    });
    return Array.from(yearsSet).sort();
  })();

  // Apply filters
  useEffect(() => {
    let filtered = [...allStudents];
    if (selectedStream !== "all") filtered = filtered.filter(s => (s.stream ?? "").toLowerCase() === selectedStream);
    filtered = filtered.filter(s => (s.degreeType ?? "ug").toLowerCase() === selectedDegreeType);
    if (selectedCollege !== "all") filtered = filtered.filter(s => s.college === selectedCollege);
    if (selectedCourse !== "all") filtered = filtered.filter(s => s.department === selectedCourse);
    if (selectedYear !== "all") filtered = filtered.filter(s => s.year === selectedYear);
    setStudents(filtered);
    setPage(1);
  }, [selectedCollege, selectedCourse, selectedYear, selectedStream, selectedDegreeType, allStudents]);

  const total = students.length;
  const degreeTotal = allStudents.filter(s => (s.degreeType ?? "ug").toLowerCase() === selectedDegreeType).length;
  const allTotal = allStudents.length;
  const hasActiveFilter = selectedCollege !== "all" || selectedCourse !== "all" || selectedYear !== "all" || selectedStream !== "all";


  // Only show "no data" when there are truly no students at all
  if (allTotal === 0) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-muted-foreground">
      <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
        <Users className="h-8 w-8" />
      </div>
      <p className="font-semibold text-foreground">No data yet</p>
      <p className="text-sm">Import students to see analytics</p>
    </div>
  );

  // When filters return 0 results, show a message with stats still visible
  if (total === 0) return (
    <div className="space-y-5 pb-8">
      {/* Filter bar still shown */}
      <div className="flex items-center gap-3 p-4 rounded-2xl border bg-card shadow-sm flex-wrap">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Target className="h-4 w-4" /> Filter:
        </div>
        <select value={selectedDegreeType} onChange={(e) => setSelectedDegreeType(e.target.value)}
          className="h-9 px-3 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="ug">UG</option>
          <option value="pg">PG</option>
        </select>
        <select value={selectedStream} onChange={(e) => setSelectedStream(e.target.value)}
          className="h-9 px-3 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="all">All Streams</option>
          <option value="engineering">Engineering</option>
          <option value="arts">Arts</option>
        </select>
        {!isSharedView && (
          hasCollegeData ? (
            <select value={selectedCollege} onChange={(e) => { setSelectedCollege(e.target.value); setSelectedCourse("all"); setSelectedYear("all"); }}
              className="h-9 px-3 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="all">All Colleges</option>
              {availableColleges.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          ) : (
            <span className="text-xs text-muted-foreground italic">No college data</span>
          )
        )}
        <select value={selectedCourse} onChange={(e) => { setSelectedCourse(e.target.value); setSelectedYear("all"); }}
          disabled={!isSharedView && (!hasCollegeData || selectedCollege === "all")}
          className="h-9 px-3 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed">
          <option value="all">All Courses</option>
          {availableCourses.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}
          disabled={selectedCollege === "all" && !isSharedView}
          className="h-9 px-3 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed">
          <option value="all">All Years</option>
          {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        {hasActiveFilter && (
          <button onClick={() => { setSelectedStream("all"); setSelectedCollege("all"); setSelectedCourse("all"); setSelectedYear("all"); }}
            className="text-xs text-primary hover:underline">Clear all</button>
        )}
        <div className="ml-auto text-xs text-muted-foreground">
          Showing <span className="font-bold text-foreground">0</span> of <span className="font-bold text-foreground">{degreeTotal}</span> students
        </div>
      </div>
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground bg-card rounded-2xl border">
        <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
          <Users className="h-6 w-6" />
        </div>
        <p className="font-semibold text-foreground">No students match the current filters</p>
        <p className="text-sm">Try adjusting or clearing the filters</p>
        <button onClick={() => { setSelectedStream("all"); setSelectedCollege("all"); setSelectedCourse("all"); setSelectedYear("all"); }}
          className="text-xs text-primary hover:underline font-medium mt-1">Clear all filters</button>
      </div>
    </div>
  );

  const depts = new Set(students.map(s => s.department)).size;

  // ── Year-wise breakdown with correct denominators per year ──────────────
  // Engineering: 1st→450, 2nd→600, 3rd→850, 4th→1000
  // Arts:        1st→450, 2nd→700, 3rd→1000

  type YearDenom = { max: number; academic: number; cognitive: number; technical: number; industry: number; label: string };

  const getYearDenom = (year: string, stream?: string): YearDenom => {
    const y = year.toLowerCase().trim();
    const isArts = (stream ?? "").toLowerCase() === "arts";

    if (y.includes("fresh") || y === "1" || y.includes("first") || y.includes("1st")) {
      return { max: 450,  academic: 150, cognitive: 300, technical: 0,   industry: 0,   label: "First Year" };
    }
    if (y === "2" || y.includes("second") || y.includes("2nd")) {
      return isArts
        ? { max: 700,  academic: 150, cognitive: 300, technical: 150, industry: 100, label: "Second Year" }
        : { max: 600,  academic: 150, cognitive: 300, technical: 150, industry: 0,   label: "Second Year" };
    }
    if (y === "3" || y.includes("third") || y.includes("3rd")) {
      return isArts
        ? { max: 1000, academic: 150, cognitive: 300, technical: 400, industry: 150, label: "Third Year" }
        : { max: 850,  academic: 150, cognitive: 300, technical: 300, industry: 100, label: "Third Year" };
    }
    // Engineering 4th year only
    if (y === "4" || y.includes("fourth") || y.includes("4th")) {
      return { max: 1000, academic: 150, cognitive: 300, technical: 400, industry: 150, label: "Fourth Year" };
    }
    return { max: 1000, academic: 150, cognitive: 300, technical: 400, industry: 150, label: "Fourth Year" };
  };

  // Per-student year-adjusted score percentage (score / their year's max)
  const getStudentPct = (s: StoredStudent) => s.hireScore / getYearDenom(s.year, s.stream).max;

  // Readiness thresholds based on year-adjusted percentage
  // ≥70% of year max = Hire Ready
  const ready    = students.filter(s => getStudentPct(s) >= 0.70).length;

  // Avg HIRE score (raw) and avg year-adjusted percentage
  const avgHire    = Math.round(students.reduce((a, s) => a + s.hireScore, 0) / total);
  const avgPct     = Math.round(students.reduce((a, s) => a + getStudentPct(s) * 100, 0) / total);
  const maxScore   = Math.round(Math.max(...students.map(s => s.hireScore)));
  const minScore   = Math.round(Math.min(...students.map(s => s.hireScore)));
  const sorted     = [...students].sort((a, b) => a.hireScore - b.hireScore);
  const medianScore = Math.round(sorted[Math.floor(sorted.length / 2)]?.hireScore ?? 0);

  const avg = (key: keyof StoredStudent) => Math.round(students.reduce((a, s) => a + (s[key] as number), 0) / total);
  const avgAcademic = avg("academicRegulatory");
  const avgCognitive = avg("cognitiveLinguistic");
  const avgTechnical = avg("technicalProficiency");
  const avgIndustry = avg("industryValidation");

  // Avg tier maxes — computed from each student's actual year+stream denom
  const avgMaxAcademic  = Math.round(students.reduce((a, s) => a + getYearDenom(s.year, s.stream).academic,  0) / total);
  const avgMaxCognitive = Math.round(students.reduce((a, s) => a + getYearDenom(s.year, s.stream).cognitive, 0) / total);
  const avgMaxTechnical = Math.round(students.reduce((a, s) => a + getYearDenom(s.year, s.stream).technical, 0) / total);
  const avgMaxIndustry  = Math.round(students.reduce((a, s) => a + getYearDenom(s.year, s.stream).industry,  0) / total);

  // Dept stats — readiness based on year-adjusted percentage
  const deptStats = Array.from(new Set(students.map(s => s.department))).map(dept => {
    const ds = students.filter(s => s.department === dept);
    const dAvg = Math.round(ds.reduce((a, s) => a + s.hireScore, 0) / ds.length);
    return {
      name: dept.length > 10 ? dept.slice(0, 10) + "…" : dept,
      avg: dAvg,
      count: ds.length,
      ready: ds.filter(s => getStudentPct(s) >= 0.70).length,
    };
  }).sort((a, b) => b.avg - a.avg).slice(0, 8);

  // Radar — normalize each tier against its actual avg max
  const radarData = [
    { subject: "Academic",  score: avgMaxAcademic  > 0 ? Math.round((avgAcademic  / avgMaxAcademic)  * 100) : 0 },
    { subject: "Cognitive", score: avgMaxCognitive > 0 ? Math.round((avgCognitive / avgMaxCognitive) * 100) : 0 },
    { subject: "Technical", score: avgMaxTechnical > 0 ? Math.round((avgTechnical / avgMaxTechnical) * 100) : 0 },
    { subject: "Industry",  score: avgMaxIndustry  > 0 ? Math.round((avgIndustry  / avgMaxIndustry)  * 100) : 0 },
  ];

  // ── Year-wise chart data — split by stream ───────────────────────────────
  const graphStudents = allStudents.filter(s => {
    if ((s.degreeType ?? "ug").toLowerCase() !== graphDegreeType) return false;
    if (selectedStream !== "all" && (s.stream ?? "").toLowerCase() !== selectedStream) return false;
    if (selectedCollege !== "all" && s.college !== selectedCollege) return false;
    if (selectedCourse !== "all" && s.department !== selectedCourse) return false;
    return true;
  });

  const flatYearStats: any[] = [];
  Array.from(new Set(graphStudents.map(s => s.year))).sort().forEach(year => {
    const ys = graphStudents.filter(s => s.year === year);
    const engS = ys.filter(s => (s.stream ?? "engineering").toLowerCase() === "engineering");
    const artsS = ys.filter(s => (s.stream ?? "").toLowerCase() === "arts");

    const getAvg = (list: StoredStudent[]) => list.length ? Math.round(list.reduce((a, s) => a + s.hireScore, 0) / list.length) : 0;
    
    const yearLabel = getYearDenom(year).label;
    
    if (engS.length > 0) {
      flatYearStats.push({
        label: `${yearLabel} Eng`,
        score: getAvg(engS),
        stream: "engineering",
        count: engS.length,
        yearLabel,
        year
      });
    }
    if (artsS.length > 0) {
      flatYearStats.push({
        label: `${yearLabel} Arts`,
        score: getAvg(artsS),
        stream: "arts",
        count: artsS.length,
        yearLabel,
        year
      });
    }
  });

  // Leaderboard
  const ranked = [...students].sort((a, b) => b.hireScore - a.hireScore);
  const displayRanked = leaderMode === "top" ? ranked : [...ranked].reverse();
  const totalPages = Math.ceil(displayRanked.length / PER);
  const start = (page - 1) * PER;
  const pageRows = displayRanked.slice(start, start + PER);

  // Export full leaderboard as CSV
  const exportLeaderboard = () => {
    const headers = ["Rank", "Name", "Reg No.", "Department", "Year", "Stream",
      "Academic (150)", "Cognitive (300)", "Technical (400)", "Industry (150)", "HIRE Score (1000)"];
    const rows = ranked.map((s, i) => [
      i + 1, s.name, s.registrationNumber, s.department, s.year,
      (s.stream ?? "engineering"),
      Math.round(s.academicRegulatory), Math.round(s.cognitiveLinguistic),
      Math.round(s.technicalProficiency), Math.round(s.industryValidation),
      Math.round(s.hireScore),
    ]);
    const csv = [headers, ...rows]
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leaderboard_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5 pb-8">

      {/* Filter Dropdowns */}
      <div className="flex items-center gap-3 p-4 rounded-2xl border bg-card shadow-sm flex-wrap">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Target className="h-4 w-4" />
          Filter:
        </div>

        <select value={selectedDegreeType} onChange={(e) => setSelectedDegreeType(e.target.value)}
          className="h-9 px-3 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="ug">UG</option>
          <option value="pg">PG</option>
        </select>

        <select value={selectedStream} onChange={(e) => setSelectedStream(e.target.value)}
          className="h-9 px-3 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="all">All Streams</option>
          <option value="engineering">Engineering</option>
          <option value="arts">Arts</option>
        </select>
        
        {!isSharedView && (
          hasCollegeData ? (
            <select value={selectedCollege} onChange={(e) => { setSelectedCollege(e.target.value); setSelectedCourse("all"); setSelectedYear("all"); }}
              className="h-9 px-3 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="all">All Colleges</option>
              {availableColleges.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          ) : (
            <span className="text-xs text-muted-foreground italic">No college data — assign colleges via import or student form</span>
          )
        )}

        <select value={selectedCourse} onChange={(e) => { setSelectedCourse(e.target.value); setSelectedYear("all"); }}
          disabled={!isSharedView && (!hasCollegeData || selectedCollege === "all")}
          className="h-9 px-3 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed">
          <option value="all">All Courses</option>
          {availableCourses.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}
          disabled={selectedCollege === "all" && !isSharedView}
          className="h-9 px-3 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed">
          <option value="all">All Years</option>
          {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
        </select>

        {hasActiveFilter && (
          <button onClick={() => { setSelectedStream("all"); setSelectedCollege("all"); setSelectedCourse("all"); setSelectedYear("all"); }}
            className="text-xs text-primary hover:underline">
            Clear all
          </button>
        )}

        <div className="ml-auto text-xs text-muted-foreground">
          Showing <span className="font-bold text-foreground">{students.length}</span> of <span className="font-bold text-foreground">{degreeTotal}</span> students
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard icon={Users}        label="Total Students"   value={total}       sub={`${depts} departments`}                                         color="#1e293b" />
        <StatCard icon={Trophy}       label="Avg HIRE Score"   value={avgHire}     sub={`Avg ${avgPct}% of year max · Median: ${medianScore}`}           color="#d97706" />
        <StatCard icon={TrendingUp}   label="Placement Ready"  value={ready}       sub={`${Math.round((ready/total)*100)}% · ≥70% of year max`}          color="#059669" />
      </div>

      {/* ── Quick stats strip ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Highest Score", value: maxScore, icon: ArrowUp,   color: "#059669" },
          { label: "Median Score",  value: medianScore, icon: BarChart3, color: "#7c3aed" },
          { label: "Lowest Score",  value: minScore, icon: ArrowDown, color: "#dc2626" },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl border border-border p-3 flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${s.color}18` }}>
              <s.icon className="h-4 w-4" style={{ color: s.color }} />
            </div>
            <div>
              <p className="text-lg font-black tabular-nums" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground font-semibold">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tier averages ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Academic",  icon: GraduationCap, score: avgAcademic,  max: avgMaxAcademic  || 150, color: TC.academic },
          { label: "Cognitive", icon: Brain,         score: avgCognitive, max: avgMaxCognitive || 300, color: TC.cognitive },
          { label: "Technical", icon: Code,          score: avgTechnical, max: avgMaxTechnical || 400, color: TC.technical },
          { label: "Industry",  icon: Award,         score: avgIndustry,  max: avgMaxIndustry  || 150, color: TC.industry },
        ].map(t => {
          const pct = Math.round((t.score / t.max) * 100);
          return (
            <div key={t.label} className="bg-card rounded-2xl border border-border shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${t.color}18` }}>
                  <t.icon className="h-4 w-4" style={{ color: t.color }} />
                </div>
                <span className="text-xs font-bold text-muted-foreground">{t.label}</span>
              </div>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-xl font-black tabular-nums" style={{ color: t.color }}>{t.score}</span>
                <span className="text-xs text-muted-foreground">/{t.max}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: t.color }} />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5">{pct}% avg</p>
            </div>
          );
        })}
      </div>

      {/* ── Radar + Year ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Radar */}
        <div className="bg-card rounded-2xl border border-border shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-bold text-foreground">Avg Tier Performance</p>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <RadarChart data={radarData}>
              <PolarGrid stroke={border} />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: 700, fill: tick }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Radar dataKey="score" stroke={TC.academic} strokeWidth={2} fill={TC.academic} fillOpacity={0.15}
                dot={{ r: 3, fill: TC.academic, strokeWidth: 0 }} />
              <Tooltip content={<TT />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Year-wise */}
        <div className="bg-card rounded-2xl border border-border shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-bold text-foreground">Avg Score by Year & Stream</p>
            </div>
            <select 
              value={graphDegreeType} 
              onChange={(e) => setGraphDegreeType(e.target.value)}
              className="h-7 px-2 text-[10px] font-bold rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="ug">UG Only</option>
              <option value="pg">PG Only</option>
            </select>
          </div>
          <p className="text-[10px] text-muted-foreground mb-3">Comparison of average HIRE scores between Engineering and Arts</p>
          {flatYearStats.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={flatYearStats}
                  margin={{ top: 8, right: 8, left: -20, bottom: 20 }}
                  barCategoryGap="20%"
                >
                  <XAxis 
                    dataKey="label" 
                    tick={{ fontSize: 8, fill: tick }} 
                    tickLine={false} 
                    axisLine={false}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                  />
                  <YAxis domain={[0, 1000]} tick={{ fontSize: 9, fill: tick }} tickLine={false} axisLine={false} />
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    const maxVal = getYearDenom(d.year, d.stream).max;
                    const pct = Math.round((d.score / maxVal) * 100);
                    const streamColor = d.stream === "arts" ? "#7c3aed" : "#0ea5e9";
                    return (
                      <div className="bg-card border border-border rounded-xl shadow-xl p-3 text-xs min-w-[200px] pointer-events-none space-y-1">
                        <p className="font-bold text-foreground border-b border-border pb-1 mb-1">
                          {d.yearLabel} — {d.stream === "arts" ? "Arts" : "Engineering"}
                        </p>
                        <div className="flex items-center justify-between gap-4 py-0.5">
                          <span className="text-muted-foreground">Avg Score:</span>
                          <span className="font-bold text-foreground">{d.score} <span className="text-[10px] text-muted-foreground/60">/ {maxVal}</span></span>
                        </div>
                        <div className="flex items-center justify-between gap-4 py-0.5">
                          <span className="text-muted-foreground">Percentage:</span>
                          <span className="font-bold" style={{ color: streamColor }}>{pct}%</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 py-0.5">
                          <span className="text-muted-foreground">Candidates:</span>
                          <span className="font-medium text-foreground">{d.count} {d.count === 1 ? "student" : "students"}</span>
                        </div>
                      </div>
                    );
                  }} />
                  <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                    {flatYearStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.stream === "arts" ? "#7c3aed" : "#0ea5e9"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
 
              <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border/40">
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-semibold">
                  <span className="h-2.5 w-2.5 rounded-sm bg-[#0ea5e9]" />
                  Engineering
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-semibold">
                  <span className="h-2.5 w-2.5 rounded-sm bg-[#7c3aed]" />
                  Arts
                </div>
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground mt-4">No year data available for selected filter</p>
          )}
        </div>
      </div>

      {/* ── Dept Performance ── */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border">
          <GraduationCap className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-bold text-foreground">Department Performance</p>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              <th className="text-left px-5 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Dept</th>
              <th className="text-center px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Students</th>
              <th className="text-center px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Avg Score</th>
              <th className="text-center px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Ready</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {deptStats.map((d, i) => (
              <tr key={d.name} className="hover:bg-muted/30 transition-colors">
                <td className="px-5 py-2.5 font-medium text-foreground flex items-center gap-2">
                  {i === 0 && <Star className="h-3 w-3 text-amber-400 shrink-0" />}
                  {d.name}
                </td>
                <td className="px-3 py-2.5 text-center text-muted-foreground">{d.count}</td>
                <td className="px-3 py-2.5 text-center font-bold tabular-nums" style={{ color: d.avg >= 700 ? "#059669" : d.avg >= 500 ? "#d97706" : "#dc2626" }}>{d.avg}</td>
                <td className="px-3 py-2.5 text-center">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: "#059669", backgroundColor: "#ecfdf5" }}>{d.ready}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Leaderboard ── */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <Medal className="h-4 w-4 text-amber-500" />
            <p className="text-sm font-bold text-foreground">Leaderboard</p>
            <span className="text-xs bg-muted text-muted-foreground font-semibold px-2 py-0.5 rounded-full">{ranked.length}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Column visibility */}
            <div className="relative">
              <button
                onClick={() => setColMenuOpen(o => !o)}
                className={`h-7 px-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors ${colMenuOpen ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted text-muted-foreground"}`}
              >
                <Columns className="h-3 w-3" /> Columns
              </button>
              {colMenuOpen && (
                <div className="absolute right-0 top-9 z-30 bg-card border border-border rounded-xl shadow-xl p-3 w-44 space-y-1.5" onClick={e => e.stopPropagation()}>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Toggle Columns</p>
                  {ALL_LEADER_COLS.map(col => (
                    <label key={col.key} className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={visibleCols.has(col.key)}
                        onChange={() => toggleCol(col.key)}
                        className="cursor-pointer"
                      />
                      <span className="text-xs font-medium group-hover:text-primary transition-colors">{col.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            {/* Export */}
            <button
              onClick={exportLeaderboard}
              className="h-7 px-2.5 rounded-lg border border-border hover:bg-muted text-xs font-semibold flex items-center gap-1.5 text-muted-foreground transition-colors"
            >
              <Download className="h-3 w-3" /> Export CSV
            </button>
            {/* Top / Bottom toggle */}
            <div className="flex rounded-lg border border-border overflow-hidden text-xs">
              <button
                onClick={() => { setLeaderMode("top"); setPage(1); }}
                className={`px-3 py-1.5 font-semibold flex items-center gap-1 transition-colors ${leaderMode === "top" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}
              >
                <ArrowUp className="h-3 w-3" /> Top
              </button>
              <button
                onClick={() => { setLeaderMode("bottom"); setPage(1); }}
                className={`px-3 py-1.5 font-semibold flex items-center gap-1 transition-colors ${leaderMode === "bottom" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}
              >
                <ArrowDown className="h-3 w-3" /> Bottom
              </button>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">{start + 1}–{Math.min(start + PER, ranked.length)} of {ranked.length}</span>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="h-7 w-7 rounded-lg border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40 transition-colors">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="h-7 w-7 rounded-lg border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40 transition-colors">
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Header row — dynamic based on visible cols */}
        <div className="flex gap-2 bg-muted/40 px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border">
          <span className="w-8 shrink-0">#</span>
          <span className="flex-1 min-w-0">Name</span>
          {visibleCols.has("regNo")     && <span className="w-28 shrink-0">Reg No.</span>}
          {visibleCols.has("dept")      && <span className="w-24 shrink-0">Dept</span>}
          {visibleCols.has("year")      && <span className="w-20 shrink-0">Year</span>}
          {visibleCols.has("stream")    && <span className="w-16 shrink-0">Stream</span>}
          {visibleCols.has("academic")  && <span className="w-14 shrink-0 text-right">Acad</span>}
          {visibleCols.has("cognitive") && <span className="w-14 shrink-0 text-right">Cog</span>}
          {visibleCols.has("technical") && <span className="w-14 shrink-0 text-right">Tech</span>}
          {visibleCols.has("industry")  && <span className="w-14 shrink-0 text-right">Ind</span>}
          <span className="w-16 shrink-0 text-right">HIRE</span>
        </div>

        <div className="divide-y divide-border/40">
          {pageRows.map((s, idx) => {
            const rank = start + idx + 1;
            const pct = getStudentPct(s);
            const hireColor = pct >= 0.70 ? "#059669" : pct >= 0.50 ? "#d97706" : "#dc2626";
            return (
              <div key={s.id}
                onClick={() => isSharedView ? setSelectedStudent(s) : router.push(`/students/${s.registrationNumber}`)}
                className="flex gap-2 px-5 py-3 cursor-pointer hover:bg-muted/40 transition-colors items-center group">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                  leaderMode === "top" && rank === 1 ? "bg-amber-400 text-white" :
                  leaderMode === "top" && rank === 2 ? "bg-slate-400 text-white" :
                  leaderMode === "top" && rank === 3 ? "bg-orange-400 text-white" :
                  "bg-muted text-muted-foreground"
                }`}>{rank}</div>
                <span className="flex-1 min-w-0 text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors relative"
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setPreviewPos({ x: rect.right + 8, y: rect.top });
                    setPreviewStudent(s);
                  }}
                  onMouseLeave={() => setPreviewStudent(null)}
                >
                  {s.name}
                </span>
                {visibleCols.has("regNo")     && <span className="w-28 shrink-0 font-mono text-[11px] text-muted-foreground truncate">{s.registrationNumber}</span>}
                {visibleCols.has("dept")      && <span className="w-24 shrink-0 text-[11px] text-muted-foreground truncate">{s.department}</span>}
                {visibleCols.has("year")      && <span className="w-20 shrink-0 text-[11px] text-muted-foreground truncate">{s.year}</span>}
                {visibleCols.has("stream")    && (
                  <span className="w-16 shrink-0 text-[10px] font-semibold">
                    {(s.stream ?? "").toLowerCase() === "arts"
                      ? <span className="px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400">Arts</span>
                      : <span className="px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">Engg</span>
                    }
                  </span>
                )}
                {visibleCols.has("academic")  && <span className="w-14 shrink-0 text-right text-xs font-semibold tabular-nums" style={{ color: TC.academic }}>{Math.round(s.academicRegulatory)}</span>}
                {visibleCols.has("cognitive") && <span className="w-14 shrink-0 text-right text-xs font-semibold tabular-nums" style={{ color: TC.cognitive }}>{Math.round(s.cognitiveLinguistic)}</span>}
                {visibleCols.has("technical") && <span className="w-14 shrink-0 text-right text-xs font-semibold tabular-nums" style={{ color: TC.technical }}>{Math.round(s.technicalProficiency)}</span>}
                {visibleCols.has("industry")  && <span className="w-14 shrink-0 text-right text-xs font-semibold tabular-nums" style={{ color: TC.industry }}>{Math.round(s.industryValidation)}</span>}
                <span className="w-16 shrink-0 text-right text-sm font-black tabular-nums" style={{ color: hireColor }}>{s.hireScore}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Student Detail Side Panel */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50" onClick={() => setSelectedStudent(null)}>
          <div className="h-full w-full max-w-2xl bg-background shadow-2xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 z-10 bg-background border-b px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">{selectedStudent.name}</h2>
                <p className="text-xs text-muted-foreground">{selectedStudent.registrationNumber} • {selectedStudent.department}</p>
              </div>
              <button onClick={() => setSelectedStudent(null)} className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center">
                <span className="text-xl">×</span>
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* HIRE Score */}
              <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">HIRE Score</p>
                <p className="text-5xl font-black" style={{ color: getStudentPct(selectedStudent) >= 0.70 ? "#059669" : getStudentPct(selectedStudent) >= 0.50 ? "#d97706" : "#dc2626" }}>
                  {selectedStudent.hireScore}
                </p>
                <p className="text-xs text-muted-foreground mt-2">out of {getYearDenom(selectedStudent.year, selectedStudent.stream).max} · {Math.round(getStudentPct(selectedStudent) * 100)}%</p>
              </div>

              {/* Tier Scores */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Academic", score: Math.round(selectedStudent.academicRegulatory), max: 150, color: TC.academic },
                  { label: "Cognitive", score: Math.round(selectedStudent.cognitiveLinguistic), max: 300, color: TC.cognitive },
                  { label: "Technical", score: Math.round(selectedStudent.technicalProficiency), max: 400, color: TC.technical },
                  { label: "Industry", score: Math.round(selectedStudent.industryValidation), max: 150, color: TC.industry },
                ].map(t => {
                  const pct = Math.round((t.score / t.max) * 100);
                  return (
                    <div key={t.label} className="p-4 rounded-xl border bg-card">
                      <p className="text-xs font-bold text-muted-foreground mb-2">{t.label}</p>
                      <div className="flex items-baseline gap-1 mb-2">
                        <span className="text-2xl font-black" style={{ color: t.color }}>{t.score}</span>
                        <span className="text-xs text-muted-foreground">/{t.max}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: t.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Academic Details */}
              <div className="space-y-3">
                <p className="text-sm font-bold">Academic Details</p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-muted-foreground mb-1">X Marks</p>
                    <p className="font-bold">{selectedStudent.xMarks}%</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-muted-foreground mb-1">XII Marks</p>
                    <p className="font-bold">{selectedStudent.xiiMarks}%</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-muted-foreground mb-1">UG Percentage</p>
                    <p className="font-bold">{selectedStudent.ugPercentage}%</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-muted-foreground mb-1">Arrears</p>
                    <p className="font-bold" style={{ color: selectedStudent.noOfArrears > 0 ? "#dc2626" : "#059669" }}>
                      {selectedStudent.noOfArrears}
                    </p>
                  </div>
                </div>
              </div>

              {/* Sub-Scores */}
              <div className="space-y-3">
                <p className="text-sm font-bold">Performance Breakdown</p>
                <div className="space-y-2 text-xs">
                  {[
                    { label: "Aptitude", score: selectedStudent.aptitudeTotal, max: 150 },
                    { label: "Communication", score: selectedStudent.communicationTotal, max: 150 },
                    { label: "Coding Practice", score: selectedStudent.codingPractice, max: 125 },
                    { label: "Coding Assessment", score: selectedStudent.codingAssessment, max: 175 },
                    { label: "Projects", score: selectedStudent.miniProjects + selectedStudent.fullLengthProjectScore, max: 50 },
                    { label: "Certifications", score: selectedStudent.globalCertScore + selectedStudent.otherCertScore, max: 150 },
                  ].map(item => {
                    const pct = Math.round((item.score / item.max) * 100);
                    return (
                      <div key={item.label}>
                        <div className="flex justify-between mb-1">
                          <span className="text-muted-foreground">{item.label}</span>
                          <span className="font-semibold">{item.score}/{item.max}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
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
    </div>
  );
}

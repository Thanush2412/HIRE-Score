"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { parseFpcNqtExcel, computeFpcNqtSummary } from "@/lib/nqt-parser";
import { getStoredNqtAssessments, addNqtAssessments, deleteNqtAssessment, clearNqtAssessments } from "@/lib/nqt-store";
import { FpcNqtAssessment, FpcNqtStudentResult } from "@/lib/nqt-types";
import { NqtImportDialog } from "@/components/nqt-import-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  Upload, FileSpreadsheet, Trash2, Award, TrendingUp, BarChart3, Search,
  CheckCircle2, Sparkles, UserCheck, Users, Layers, SlidersHorizontal, ArrowUpRight, ArrowDownRight, Activity, Brain, Calendar, HelpCircle
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from "recharts";

const BRAND_RED = "#F05136";

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
  deltaOverall: number;
  matchedDbStudent: boolean;
}

export function NqtDashboard() {
  const [assessments, setAssessments] = useState<FpcNqtAssessment[]>([]);
  const [activeTab, setActiveTab] = useState<"students" | "consolidated" | "assessments">("students");
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAssessments(getStoredNqtAssessments());
  }, []);

  const summary = computeFpcNqtSummary(assessments);

  // Extract raw student records across all uploaded assessments
  const allStudents = useMemo(() => {
    const list: (FpcNqtStudentResult & { assessmentName: string; assessmentId: string; uploadedAt: string })[] = [];
    assessments.forEach(ass => {
      if (ass.students && ass.students.length > 0) {
        ass.students.forEach(st => {
          const num = st.numerical || 0;
          const verb = st.verbal || 0;
          const reas = st.reasoning || 0;
          const adv = st.advQuant || 0;
          const apt = st.aptitude || Math.round(((num + verb + reas + adv) / 4) * 100) / 100;

          list.push({
            ...st,
            aptitude: apt,
            assessmentName: ass.assessmentName,
            assessmentId: ass.id,
            uploadedAt: ass.uploadedAt,
          });
        });
      }
    });
    return list;
  }, [assessments]);

  // Group student records by Reg Number (or email/name) to build consolidated progress tracking
  const consolidatedStudents = useMemo<StudentConsolidated[]>(() => {
    const map = new Map<string, StudentConsolidated>();

    allStudents.forEach(st => {
      const key = st.registrationNumber
        ? String(st.registrationNumber).trim().toLowerCase()
        : st.email
          ? String(st.email).trim().toLowerCase()
          : String(st.name).trim().toLowerCase();

      if (!key) return;

      const existing = map.get(key);
      const attemptItem = {
        ...st,
        assessmentName: st.assessmentName,
        uploadedAt: st.uploadedAt,
      };

      if (!existing) {
        map.set(key, {
          key,
          registrationNumber: st.registrationNumber || "",
          name: st.name,
          email: st.email || "",
          department: st.department || "",
          college: st.college || "",
          attempts: [attemptItem],
          firstOverall: st.overall,
          latestOverall: st.overall,
          latestAptitude: st.aptitude,
          latestCoding: st.coding,
          deltaOverall: 0,
          matchedDbStudent: !!st.matchedDbStudent,
        });
      } else {
        existing.attempts.push(attemptItem);
        // Sort attempts chronologically
        existing.attempts.sort((a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime());
        const first = existing.attempts[0].overall;
        const latest = existing.attempts[existing.attempts.length - 1].overall;
        existing.firstOverall = first;
        existing.latestOverall = latest;
        existing.latestAptitude = existing.attempts[existing.attempts.length - 1].aptitude;
        existing.latestCoding = existing.attempts[existing.attempts.length - 1].coding;
        existing.deltaOverall = Math.round((latest - first) * 100) / 100;
        if (st.matchedDbStudent) existing.matchedDbStudent = true;
      }
    });

    return Array.from(map.values());
  }, [allStudents]);

  // Recharts Assessment Progress Trend dataset
  const chartData = useMemo(() => {
    return assessments.map(ass => ({
      name: ass.assessmentName.length > 18 ? `${ass.assessmentName.slice(0, 18)}...` : ass.assessmentName,
      fullName: ass.assessmentName,
      Aptitude: ass.aptitudeAvg || Math.round(((ass.numericalAbilityAvg + ass.verbalAbilityAvg + ass.reasoningAbilityAvg + ass.advancedQuantReasoningAvg) / 4) * 100) / 100,
      Coding: ass.codingAvg,
      Overall: ass.overallAvg,
    }));
  }, [assessments]);

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

  const handleDelete = (id: string) => {
    const updated = deleteNqtAssessment(id);
    setAssessments(updated);
  };

  const handleClearAll = () => {
    if (confirm("Are you sure you want to delete all FACE NQT records?")) {
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

  const filteredAssessments = assessments.filter(a =>
    a.assessmentName.toLowerCase().includes(search.toLowerCase())
  );

  const filteredStudents = allStudents.filter(s =>
    (s.name && s.name.toLowerCase().includes(search.toLowerCase())) ||
    (s.registrationNumber && s.registrationNumber.toLowerCase().includes(search.toLowerCase())) ||
    (s.email && s.email.toLowerCase().includes(search.toLowerCase())) ||
    (s.assessmentName && s.assessmentName.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredConsolidated = consolidatedStudents.filter(s =>
    (s.name && s.name.toLowerCase().includes(search.toLowerCase())) ||
    (s.registrationNumber && s.registrationNumber.toLowerCase().includes(search.toLowerCase())) ||
    (s.email && s.email.toLowerCase().includes(search.toLowerCase()))
  );

  const matchedStudentCount = allStudents.filter(s => s.matchedDbStudent || s.registrationNumber).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-primary" /> FACE NQT Assessment Dashboard
          </h1>
          <p className="text-muted-foreground text-sm">
            Upload FACE NQT reports, track consolidated student progress & module performance across assessments.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {consolidatedStudents.length > 0 && (
            <button
              onClick={() => openStudentProgress(consolidatedStudents[0].key)}
              className="flex items-center gap-1.5 text-xs font-semibold border rounded-lg px-3 py-2 transition-all shadow-sm"
              style={{ color: "#3b82f6", borderColor: `#3b82f655`, background: `#3b82f60d` }}
            >
              <TrendingUp className="h-4 w-4" />
              See Progress
            </button>
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xlsx,.xls,.csv"
            className="hidden"
          />

          <Button
            onClick={() => setMappingDialogOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md text-xs py-2"
          >
            <SlidersHorizontal className="h-4 w-4 mr-1.5" />
            Import NQT Data
          </Button>

          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="font-medium text-xs py-2"
          >
            <Upload className="h-4 w-4 mr-1.5" />
            {isUploading ? "Uploading..." : "Quick Upload"}
          </Button>

          {assessments.length > 0 && (
            <Button variant="outline" size="icon" onClick={handleClearAll} title="Clear All Records">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      </div>

      {uploadMessage && (
        <div className={`p-4 rounded-lg text-sm font-medium border ${uploadMessage.startsWith("✅") ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-destructive/10 border-destructive/20 text-destructive"}`}>
          {uploadMessage}
        </div>
      )}

      {/* Top Header Metrics Row — Featuring Assessments Conducted Prominently */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
              Total tests conducted count
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Unique Students</CardTitle>
            <Users className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{consolidatedStudents.length > 0 ? consolidatedStudents.length : summary.totalConducted}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {matchedStudentCount > 0 ? `${matchedStudentCount} linked with Reg Numbers` : "Evaluated students"}
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
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Aptitude Combined Avg</CardTitle>
            <Activity className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{summary.aptitudeAvg}%</div>
            <p className="text-xs text-muted-foreground mt-1">Num + Verb + Reas + AdvQuant</p>
          </CardContent>
        </Card>
      </div>

      {/* Module Overview Section: Aptitude Heading (Numerical + Verbal + Reasoning + AdvQuant Combined) */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" /> Module Performance Breakdown
          </CardTitle>
          <CardDescription>
            Consolidated percentage score average per competency module (Numerical, Verbal, Reasoning, and Advanced Quant & Reasoning combined into Aptitude).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-3">
          {/* Module 1: Aptitude (Combined Numerical, Verbal, Reasoning & Advanced Quant) */}
          <div className="space-y-3 p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20 md:col-span-2">
            <div className="flex justify-between items-center text-sm font-bold">
              <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 text-base">
                <Brain className="h-5 w-5" /> Aptitude (Combined Numerical, Verbal, Reasoning & Adv Quant)
              </span>
              <span className="text-indigo-600 dark:text-indigo-400 text-xl font-black">{summary.aptitudeAvg}%</span>
            </div>
            <Progress value={summary.aptitudeAvg} className="h-2.5 bg-indigo-500/20" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-muted-foreground pt-2 border-t border-indigo-500/10">
              <div className="p-2 rounded bg-background/60 border">Numerical: <b className="text-foreground">{summary.numericalAbilityAvg}%</b></div>
              <div className="p-2 rounded bg-background/60 border">Verbal: <b className="text-foreground">{summary.verbalAbilityAvg}%</b></div>
              <div className="p-2 rounded bg-background/60 border">Reasoning: <b className="text-foreground">{summary.reasoningAbilityAvg}%</b></div>
              <div className="p-2 rounded bg-background/60 border">Adv Quant: <b className="text-foreground">{summary.advancedQuantReasoningAvg}%</b></div>
            </div>
          </div>

          {/* Module 2: Coding */}
          <div className="space-y-3 p-4 rounded-xl bg-muted/30 border">
            <div className="flex justify-between items-center text-sm font-bold">
              <span className="text-foreground">Coding</span>
              <span className="text-primary text-lg font-bold">{summary.codingAvg}%</span>
            </div>
            <Progress value={summary.codingAvg} className="h-2.5" />
            <p className="text-[11px] text-muted-foreground">Hands-on programming & DSA logic</p>
          </div>
        </CardContent>
      </Card>

      {/* Assessment Trend Progress Chart (Visible when multiple reports exist) */}
      {assessments.length > 1 && (
        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-500" /> Assessment Comparison & Progress Trend
            </CardTitle>
            <CardDescription>
              Performance trend across uploaded NQT test reports over time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: any) => [`${value}%`]}
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

      {/* Data Navigation Section with 3 Views */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
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
          </div>

          <div className="w-full sm:w-72">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={
                  activeTab === "assessments"
                    ? "Search assessment name..."
                    : "Search Reg No, Name or Email..."
                }
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 text-sm rounded-lg"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* VIEW 1: All Student Test Records */}
          {activeTab === "students" && (
            <div className="rounded-xl border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 text-xs uppercase tracking-wider font-bold">
                    <TableHead className="font-bold">Reg Number</TableHead>
                    <TableHead className="font-bold">Student Name</TableHead>
                    <TableHead className="font-bold">Test Report</TableHead>
                    <TableHead className="font-bold text-center bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">Aptitude %</TableHead>
                    <TableHead className="font-bold text-center">Coding %</TableHead>
                    <TableHead className="font-bold text-center">Overall %</TableHead>
                    <TableHead className="font-bold text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
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
                    filteredStudents.map((st, idx) => (
                      <TableRow key={`${st.assessmentId}-${idx}`} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-xs font-bold">
                          {st.registrationNumber ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-primary">{st.registrationNumber}</span>
                              {st.matchedDbStudent && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" title="Matched to Student DB">
                                  DB Match
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground/60 italic text-[11px]">— Unlinked</span>
                          )}
                        </TableCell>

                        <TableCell className="font-semibold text-foreground text-xs">{st.name}</TableCell>

                        <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate" title={st.assessmentName}>
                          {st.assessmentName}
                        </TableCell>

                        {/* Combined Aptitude Column (Numerical + Verbal + Reasoning + AdvQuant) */}
                        <TableCell className="text-center bg-indigo-500/5 font-bold text-xs text-indigo-600 dark:text-indigo-400">
                          <div className="flex flex-col items-center">
                            <span>{st.aptitude}%</span>
                            <span className="text-[9px] font-normal text-muted-foreground" title={`Num: ${st.numerical}% | Verbal: ${st.verbal}% | Reasoning: ${st.reasoning}% | AdvQuant: ${st.advQuant}%`}>
                              N:{st.numerical}% V:{st.verbal}% R:{st.reasoning}% AQ:{st.advQuant}%
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="text-center text-xs font-medium">{st.coding}%</TableCell>

                        <TableCell className="text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                            {st.overall}%
                          </span>
                        </TableCell>

                        <TableCell className="text-center">
                          <button
                            onClick={() => openStudentProgress(st.registrationNumber || st.email || st.name)}
                            className="inline-flex items-center gap-1 text-[11px] font-medium border rounded-md px-2 py-1 transition-all shadow-2xs"
                            style={{ color: "#3b82f6", borderColor: `#3b82f655`, background: `#3b82f60d` }}
                          >
                            <TrendingUp className="h-3 w-3" />
                            See Progress
                          </button>
                        </TableCell>
                      </TableRow>
                    ))
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
                    <TableHead className="font-bold">Reg Number / Student</TableHead>
                    <TableHead className="font-bold text-center">Tests Taken</TableHead>
                    <TableHead className="font-bold text-center bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">Latest Aptitude %</TableHead>
                    <TableHead className="font-bold text-center">Latest Coding %</TableHead>
                    <TableHead className="font-bold text-center">Latest Overall %</TableHead>
                    <TableHead className="font-bold text-center">First Test Overall</TableHead>
                    <TableHead className="font-bold text-center">Progress Delta</TableHead>
                    <TableHead className="font-bold text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredConsolidated.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                        No consolidated student records available. Upload NQT reports to see student progress across tests.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredConsolidated.map((st) => (
                      <TableRow key={st.key} className="hover:bg-muted/30">
                        <TableCell className="text-xs">
                          <div className="font-bold text-foreground">{st.name}</div>
                          <div className="font-mono text-[11px] text-primary">{st.registrationNumber || st.email || "Unlinked"}</div>
                        </TableCell>

                        <TableCell className="text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-muted border">
                            {st.attempts.length} Test{st.attempts.length > 1 ? "s" : ""}
                          </span>
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
                    ))
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
                          <TableCell className="font-semibold text-foreground">{item.assessmentName}</TableCell>
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
                              size="icon"
                              onClick={() => handleDelete(item.id)}
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl border bg-card shadow-2xl">
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
              <div className="mt-4 p-3 rounded-xl bg-background border flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <p className="font-bold text-foreground text-sm">{progressStudent.name}</p>
                  <p className="font-mono text-primary text-xs font-medium">{progressStudent.registrationNumber || progressStudent.email || "Unlinked"}</p>
                </div>
                <div className="flex items-center gap-2">
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

            <div className="p-6 space-y-6">
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

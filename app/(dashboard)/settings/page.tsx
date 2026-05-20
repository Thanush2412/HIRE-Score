"use client";

import { useEffect, useRef, useState } from "react";
import {
  Plus, Trash2, Save, Building2, BookOpen, ChevronDown, ChevronUp,
  Download, Upload, CheckCircle2, XCircle, AlertTriangle, Settings2, Eye, Database
} from "lucide-react";

interface CourseItem {
  id: number;
  name: string;
  originalName: string;   // tracks the name as it was when loaded / last saved
  degreeType: "ug" | "pg";
  years: string[];
  expanded: boolean;
  newYear: string;
}

interface CollegeItem {
  id: number;
  name: string;
  originalName: string;   // tracks the name as it was when loaded / last saved
  stream: "engineering" | "arts";
  courses: CourseItem[];
  expanded: boolean;
  newCourse: string;
}

interface DeleteTarget {
  type: "college" | "course" | "year";
  collegeId: number;
  courseId?: number;
  yearIndex?: number;
  label: string;
}

let nextId = 1;
function genId() { return nextId++; }

export default function SettingsPage() {
  const [colleges, setColleges] = useState<CollegeItem[]>([]);
  const [selectedCollegeId, setSelectedCollegeId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"configure" | "preview">("configure");
  const [newCollegeName, setNewCollegeName] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [loaded, setLoaded] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialCollegesRef = useRef<string>("");

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/settings")
      .then(r => r.json())
      .then(data => {
        const cols: CollegeItem[] = (data.colleges ?? []).map((col: { name: string; stream?: string; degreeType?: string; courses: { name: string; degreeType?: string; years: string[] }[] }) => {
          const colDegreeType = col.degreeType === "pg" ? "pg" : "ug";
          return {
            id: genId(),
            name: col.name,
            originalName: col.name,
            stream: (col.stream === "arts" ? "arts" : "engineering") as "engineering" | "arts",
            expanded: true,
            newCourse: "",
            courses: (col.courses ?? []).map((co: { name: string; degreeType?: string; years: string[] }) => ({
              id: genId(),
              name: co.name,
              originalName: co.name,
              degreeType: (co.degreeType === "pg" || (!co.degreeType && colDegreeType === "pg") ? "pg" : "ug") as "ug" | "pg",
              years: [...(co.years ?? [])],
              expanded: false,
              newYear: "",
            })),
          };
        });
        setColleges(cols);
        initialCollegesRef.current = JSON.stringify(cols.map(c => ({
          name: c.name,
          stream: c.stream,
          courses: c.courses.map(co => ({ name: co.name, degreeType: co.degreeType, years: [...co.years] })),
        })));
        if (cols.length > 0) {
          setSelectedCollegeId(cols[0].id);
        }
        setLoaded(true);
      })
      .catch(err => {
        console.error("Failed to load settings:", err);
        setLoaded(true);
      });
  }, []);

  // ── Auto Save Debounce ────────────────────────────────────────────────────
  useEffect(() => {
    if (!loaded) return;

    // Deep compare name, stream, courses, degreeType, and years to check if anything changed
    const currentSerialized = JSON.stringify(colleges.map(c => ({
      name: c.name,
      stream: c.stream,
      courses: c.courses.map(co => ({ name: co.name, degreeType: co.degreeType, years: [...co.years] })),
    })));

    if (currentSerialized === initialCollegesRef.current) {
      // No structural changes, do not schedule auto-save
      return;
    }

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    setStatus("saving");
    saveTimeoutRef.current = setTimeout(() => {
      handleSave();
    }, 1200);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [colleges, loaded]);

  // ── Save Function ────────────────────────────────────────────────────────
  async function handleSave() {
    const payload = {
      colleges: colleges.map(col => ({
        name: col.name,
        stream: col.stream,
        courses: col.courses.map(co => ({
          name: co.name,
          degreeType: co.degreeType,
          years: [...co.years],
        })),
      })),
    };

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const renamePromises: Promise<any>[] = [];
      for (const col of colleges) {
        for (const co of col.courses) {
          if (co.originalName && co.name && co.name !== co.originalName) {
            renamePromises.push(
              fetch("/api/settings/rename-course", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  collegeName: col.name,
                  oldName: co.originalName,
                  newName: co.name,
                }),
              }).then(r => r.json())
            );
          }
        }
      }

      await Promise.all(renamePromises);

      if (!res.ok) throw new Error("Save settings failed");

      const savedSerialized = JSON.stringify(colleges.map(c => ({
        name: c.name,
        stream: c.stream,
        courses: c.courses.map(co => ({ name: co.name, degreeType: co.degreeType, years: [...co.years] })),
      })));
      initialCollegesRef.current = savedSerialized;

      setColleges(prev =>
        prev.map(c => ({
          ...c,
          originalName: c.name,
          courses: c.courses.map(co => ({ ...co, originalName: co.name })),
        }))
      );
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } catch (err) {
      console.error(err);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  }

  // ── Colleges Handlers ─────────────────────────────────────────────────────
  function handleAddCollege() {
    const name = newCollegeName.trim();
    if (!name) return;
    if (colleges.some(c => c.name === name)) return;
    const newId = genId();
    setColleges(prev => [
      ...prev,
      { id: newId, name, originalName: "", stream: "engineering", courses: [], expanded: true, newCourse: "" },
    ]);
    setSelectedCollegeId(newId);
    setNewCollegeName("");
  }

  function handleRemoveCollege(id: number) {
    const target = colleges.find(c => c.id === id);
    if (!target) return;
    setDeleteTarget({
      type: "college",
      collegeId: id,
      label: target.name || "Unnamed College",
    });
  }

  function handleRenameCollege(id: number, newName: string) {
    setColleges(prev => prev.map(c => (c.id === id ? { ...c, name: newName } : c)));
  }

  // ── Courses Handlers ──────────────────────────────────────────────────────
  function handleNewCourseInput(collegeId: number, val: string) {
    setColleges(prev => prev.map(c => (c.id === collegeId ? { ...c, newCourse: val } : c)));
  }

  function handleAddCourse(collegeId: number) {
    setColleges(prev =>
      prev.map(col => {
        if (col.id !== collegeId) return col;
        const name = col.newCourse.trim();
        if (!name) return col;
        if (col.courses.some(co => co.name === name)) return col;
        return {
          ...col,
          newCourse: "",
          courses: [
            ...col.courses,
            { id: genId(), name, originalName: "", degreeType: "ug", years: [], expanded: false, newYear: "" },
          ],
        };
      })
    );
  }

  function handleRemoveCourse(collegeId: number, courseId: number) {
    const col = colleges.find(c => c.id === collegeId);
    const co = col?.courses.find(c => c.id === courseId);
    if (!co) return;
    setDeleteTarget({
      type: "course",
      collegeId,
      courseId,
      label: `${co.name} (${col?.name})`,
    });
  }

  function handleToggleCourse(collegeId: number, courseId: number) {
    setColleges(prev =>
      prev.map(col => {
        if (col.id !== collegeId) return col;
        return {
          ...col,
          courses: col.courses.map(co => (co.id === courseId ? { ...co, expanded: !co.expanded } : co)),
        };
      })
    );
  }

  function handleRenameCourse(collegeId: number, courseId: number, name: string) {
    setColleges(prev =>
      prev.map(col => {
        if (col.id !== collegeId) return col;
        return {
          ...col,
          courses: col.courses.map(co => (co.id === courseId ? { ...co, name } : co)),
        };
      })
    );
  }

  // ── Years Handlers ────────────────────────────────────────────────────────
  function handleNewYearInput(collegeId: number, courseId: number, val: string) {
    setColleges(prev =>
      prev.map(col => {
        if (col.id !== collegeId) return col;
        return {
          ...col,
          courses: col.courses.map(co => (co.id === courseId ? { ...co, newYear: val } : co)),
        };
      })
    );
  }

  function handleAddYear(collegeId: number, courseId: number) {
    setColleges(prev =>
      prev.map(col => {
        if (col.id !== collegeId) return col;
        return {
          ...col,
          courses: col.courses.map(co => {
            if (co.id !== courseId) return co;
            const yr = co.newYear.trim();
            if (!yr) return co;
            if (co.years.includes(yr)) return co;
            return {
              ...co,
              newYear: "",
              years: [...co.years, yr],
            };
          }),
        };
      })
    );
  }

  function handleRemoveYear(collegeId: number, courseId: number, yearIndex: number) {
    const col = colleges.find(c => c.id === collegeId);
    const co = col?.courses.find(c => c.id === courseId);
    const yr = co?.years[yearIndex];
    if (!yr) return;
    setDeleteTarget({
      type: "year",
      collegeId,
      courseId,
      yearIndex,
      label: `${yr} from ${co?.name}`,
    });
  }

  // ── Confirm Delete ────────────────────────────────────────────────────────
  function confirmDelete() {
    if (!deleteTarget) return;
    if (deleteTarget.type === "college") {
      setColleges(prev => {
        const next = prev.filter(c => c.id !== deleteTarget.collegeId);
        if (selectedCollegeId === deleteTarget.collegeId) {
          setSelectedCollegeId(next.length > 0 ? next[0].id : null);
        }
        return next;
      });
    } else if (deleteTarget.type === "course") {
      setColleges(prev => prev.map(col =>
        col.id === deleteTarget.collegeId
          ? { ...col, courses: col.courses.filter(co => co.id !== deleteTarget.courseId) }
          : col
      ));
    } else if (deleteTarget.type === "year") {
      setColleges(prev => prev.map(col =>
        col.id === deleteTarget.collegeId
          ? {
              ...col,
              courses: col.courses.map(co =>
                co.id === deleteTarget.courseId
                  ? { ...co, years: co.years.filter((_, i) => i !== deleteTarget.yearIndex) }
                  : co
              ),
            }
          : col
      ));
    }
    setDeleteTarget(null);
  }

  // ── Export ────────────────────────────────────────────────────────────────
  function handleExport() {
    const payload = {
      colleges: colleges.map(col => ({
        name: col.name,
        stream: col.stream,
        courses: col.courses.map(co => ({ name: co.name, degreeType: co.degreeType, years: [...co.years] })),
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hire-score-settings-backup.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Import ────────────────────────────────────────────────────────────────
  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (!Array.isArray(parsed.colleges)) { alert("Invalid settings file"); return; }
        const cols: CollegeItem[] = parsed.colleges.map((col: { name: string; stream?: string; degreeType?: string; courses: { name: string; degreeType?: string; years: string[] }[] }) => {
          const colDegreeType = col.degreeType === "pg" ? "pg" : "ug";
          return {
            id: genId(),
            name: col.name,
            originalName: col.name,
            stream: (col.stream === "arts" ? "arts" : "engineering") as "engineering" | "arts",
            expanded: true,
            newCourse: "",
            courses: (col.courses ?? []).map((co: { name: string; degreeType?: string; years: string[] }) => ({
              id: genId(),
              name: co.name,
              originalName: co.name,
              degreeType: (co.degreeType === "pg" || (!co.degreeType && colDegreeType === "pg") ? "pg" : "ug") as "ug" | "pg",
              years: [...(co.years ?? [])],
              expanded: false,
              newYear: "",
            })),
          };
        });
        setColleges(cols);
        initialCollegesRef.current = "";
        if (cols.length > 0) {
          setSelectedCollegeId(cols[0].id);
        }
      } catch {
        alert("Invalid settings file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-8 px-2 sm:px-0">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Settings</h1>
          <p className="text-xs text-muted-foreground mt-1">Configure your organization's colleges, courses, and year configurations.</p>
        </div>
        <div className="flex items-center gap-3">
          {status !== "idle" && (
            <div className="text-xs text-muted-foreground mr-2 flex items-center gap-1.5">
              {status === "saving" && <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
              {status === "saved" && <span className="h-2 w-2 rounded-full bg-emerald-500" />}
              {status === "error" && <span className="h-2 w-2 rounded-full bg-destructive" />}
              <span className="capitalize">{status === "saving" ? "Saving..." : status}</span>
            </div>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={status === "saving"}
            className={[
              "flex items-center gap-2 h-10 px-5 rounded-xl text-xs font-semibold shadow-sm transition-all disabled:cursor-wait shrink-0",
              status === "saved"  ? "bg-emerald-600 hover:bg-emerald-700 text-white" :
              status === "error"  ? "bg-destructive text-white hover:bg-destructive/95" :
              status === "saving" ? "bg-primary/70 text-white" :
              "bg-primary text-primary-foreground hover:opacity-90",
            ].join(" ")}
          >
            {status === "saved"  ? <><CheckCircle2 className="h-4 w-4" /> Saved</> :
             status === "error"  ? <><XCircle className="h-4 w-4" /> Error — Retry</> :
             status === "saving" ? <><Save className="h-4 w-4 animate-pulse" /> Saving</> :
             <><Save className="h-4 w-4" /> Save Changes</>}
          </button>
        </div>
      </div>

      {/* ── Tabs Navigation ── */}
      <div className="flex border-b border-border gap-2 text-sm">
        <button
          type="button"
          onClick={() => setActiveTab("configure")}
          className={`flex items-center gap-2 px-4 py-2.5 font-medium border-b-2 transition-all -mb-px ${
            activeTab === "configure"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Settings2 className="h-4 w-4" />
          Configure
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("preview")}
          className={`flex items-center gap-2 px-4 py-2.5 font-medium border-b-2 transition-all -mb-px ${
            activeTab === "preview"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Eye className="h-4 w-4" />
          Live Preview
        </button>

      </div>

      {/* ── Configure Tab ── */}
      {activeTab === "configure" && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Left panel: Colleges List */}
          <div className="md:col-span-4 space-y-4">
            <div className="bg-card rounded-2xl border border-border p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Colleges</span>
                <span className="text-xs bg-muted px-2 py-0.5 rounded-full font-medium text-muted-foreground">
                  {colleges.length} total
                </span>
              </div>

              {colleges.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground italic">
                  No colleges configured yet. Add one below.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
                  {colleges.map(college => {
                    const isSelected = college.id === selectedCollegeId;
                    return (
                      <div
                        key={college.id}
                        onClick={() => setSelectedCollegeId(college.id)}
                        className={`flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-all ${
                          isSelected
                            ? "bg-primary/5 border-primary text-primary shadow-sm"
                            : "bg-card hover:bg-muted/30 border-border text-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Building2 className={`h-4 w-4 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate leading-tight">{college.name || "Unnamed College"}</p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                                college.stream === "arts" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                              }`}>
                                {college.stream === "arts" ? "Arts" : "Engg"}
                              </span>
                              <span className="text-[9px] text-muted-foreground">
                                {college.courses.length} course{college.courses.length !== 1 ? "s" : ""}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveCollege(college.id);
                          }}
                          className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Add College Form */}
            <div className="bg-card rounded-2xl border border-border p-4 shadow-sm space-y-3">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide block">Add New College</span>
              <div className="space-y-2">
                <input
                  type="text"
                  value={newCollegeName}
                  onChange={e => setNewCollegeName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddCollege(); } }}
                  placeholder="e.g. Sri Venkateswara College"
                  className="w-full h-9 px-3 text-xs rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={handleAddCollege}
                  className="w-full h-9 flex items-center justify-center gap-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  <Plus className="h-3.5 w-3.5" /> Add College
                </button>
              </div>
            </div>
          </div>

          {/* Right panel: Selected College Details */}
          <div className="md:col-span-8">
            {selectedCollegeId === null ? (
              <div className="bg-card rounded-2xl border border-dashed border-border p-12 text-center shadow-sm">
                <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-semibold">No college selected</p>
                <p className="text-xs text-muted-foreground mt-1">Select an existing college from the list on the left, or add a new one.</p>
              </div>
            ) : (() => {
              const selectedCollege = colleges.find(c => c.id === selectedCollegeId);
              if (!selectedCollege) return null;
              return (
                <div className="bg-card rounded-2xl border border-border shadow-sm divide-y divide-border overflow-hidden">
                  {/* College Details Header */}
                  <div className="p-5 bg-muted/20 space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-bold text-primary uppercase tracking-wider block mb-1">Editing College</span>
                        <input
                          type="text"
                          value={selectedCollege.name}
                          onChange={e => handleRenameCollege(selectedCollege.id, e.target.value)}
                          placeholder="College name"
                          className="w-full h-9 px-2 text-base font-bold rounded-lg border border-transparent hover:border-border focus:border-primary bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors"
                        />
                      </div>
                      
                      {/* Stream Switcher */}
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Stream</span>
                        <div className="flex rounded-lg border border-border overflow-hidden text-xs bg-background">
                          <button
                            type="button"
                            onClick={() => setColleges(prev => prev.map(c => c.id === selectedCollege.id ? { ...c, stream: "engineering" } : c))}
                            className={`px-3 py-1.5 font-semibold transition-colors ${selectedCollege.stream === "engineering" ? "bg-blue-600 text-white" : "hover:bg-muted text-muted-foreground"}`}
                          >
                            Engineering
                          </button>
                          <button
                            type="button"
                            onClick={() => setColleges(prev => prev.map(c => c.id === selectedCollege.id ? { ...c, stream: "arts" } : c))}
                            className={`px-3 py-1.5 font-semibold transition-colors ${selectedCollege.stream === "arts" ? "bg-purple-600 text-white" : "hover:bg-muted text-muted-foreground"}`}
                          >
                            Arts
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Course Configuration Panel */}
                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Courses ({selectedCollege.courses.length})</h3>
                    </div>

                    {selectedCollege.courses.length === 0 ? (
                      <div className="bg-muted/10 rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground italic">
                        No courses configured for this college. Add one below to begin.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {selectedCollege.courses.map(course => (
                          <div key={course.id} className="bg-muted/30 rounded-xl border border-border overflow-hidden">
                            {/* Course Header */}
                            <div className="flex items-center gap-3 p-3">
                              <div className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                                <BookOpen className="h-3.5 w-3.5 text-blue-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <input
                                  type="text"
                                  value={course.name}
                                  onChange={e => handleRenameCourse(selectedCollege.id, course.id, e.target.value)}
                                  placeholder="Course name (e.g. B.Tech CSE)"
                                  className="w-full h-7 px-2 text-sm font-semibold rounded border border-transparent hover:border-border focus:border-primary bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors"
                                />
                                <p className="text-[10px] text-muted-foreground mt-0.5 px-2">
                                  {course.years.length} year{course.years.length !== 1 ? "s" : ""}
                                  {course.years.length > 0 && ` · ${course.years.join(", ")}`}
                                </p>
                              </div>
                              
                              {/* Degree type selector */}
                              <div className="flex rounded-lg border border-border overflow-hidden text-[10px] bg-background shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setColleges(prev => prev.map(col => col.id === selectedCollege.id ? {
                                    ...col,
                                    courses: col.courses.map(co => co.id === course.id ? { ...co, degreeType: "ug" } : co)
                                  } : col))}
                                  className={`px-2 py-1 font-semibold transition-colors ${course.degreeType === "ug" ? "bg-emerald-600 text-white" : "hover:bg-muted text-muted-foreground"}`}
                                >
                                  UG
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setColleges(prev => prev.map(col => col.id === selectedCollege.id ? {
                                    ...col,
                                    courses: col.courses.map(co => co.id === course.id ? { ...co, degreeType: "pg" } : co)
                                  } : col))}
                                  className={`px-2 py-1 font-semibold transition-colors ${course.degreeType === "pg" ? "bg-orange-600 text-white" : "hover:bg-muted text-muted-foreground"}`}
                                >
                                  PG
                                </button>
                              </div>
                              
                              {/* Accordion / Delete actions */}
                              <button
                                type="button"
                                onClick={() => handleToggleCourse(selectedCollege.id, course.id)}
                                className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors shrink-0"
                              >
                                {course.expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveCourse(selectedCollege.id, course.id)}
                                className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            {/* Years editor under course */}
                            {course.expanded && (
                              <div className="px-3 pb-3 pt-2 border-t border-border bg-background/50 space-y-2">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block">Configured Academic Years</span>
                                <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                                  {course.years.length === 0 && (
                                    <p className="text-[10px] text-muted-foreground italic self-center">No academic years added yet.</p>
                                  )}
                                  {course.years.map((year, yIdx) => (
                                    <span
                                      key={yIdx}
                                      className="flex items-center gap-1 bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300 text-[10px] font-semibold px-2 py-0.5 rounded-lg border border-purple-200/50 dark:border-purple-800/40"
                                    >
                                      {year}
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveYear(selectedCollege.id, course.id, yIdx)}
                                        className="hover:text-destructive transition-colors ml-0.5 leading-none"
                                      >
                                        ✕
                                      </button>
                                    </span>
                                  ))}
                                </div>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={course.newYear}
                                    onChange={e => handleNewYearInput(selectedCollege.id, course.id, e.target.value)}
                                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddYear(selectedCollege.id, course.id); } }}
                                    placeholder="e.g., 1st Year, 2nd Year"
                                    className="flex-1 h-8 px-3 text-xs rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleAddYear(selectedCollege.id, course.id)}
                                    className="h-8 px-3 flex items-center gap-1 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
                                  >
                                    <Plus className="h-3 w-3" /> Add
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Course Row */}
                    <div className="flex gap-2 pt-3 border-t border-border mt-2">
                      <input
                        type="text"
                        value={selectedCollege.newCourse}
                        onChange={e => handleNewCourseInput(selectedCollege.id, e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddCourse(selectedCollege.id); } }}
                        placeholder="Add course (e.g., B.Tech CSE)"
                        className="flex-1 h-9 px-3 text-xs rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddCourse(selectedCollege.id)}
                        className="h-9 px-4 flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 whitespace-nowrap transition-opacity"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Course
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── Live Preview Tab ── */}
      {activeTab === "preview" && (
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-muted/20">
            <div>
              <p className="text-sm font-bold">Live Configuration Structure</p>
              <p className="text-[10px] text-muted-foreground">Hierarchy tree mapping: Colleges → Courses (UG/PG) → Years</p>
            </div>
            <span className="text-xs bg-muted px-2.5 py-0.5 rounded-full font-semibold text-muted-foreground">
              {colleges.length} college{colleges.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="p-6 space-y-6">
            {colleges.length === 0 ? (
              <p className="text-muted-foreground italic text-xs text-center py-8">No colleges configured yet. Add them in the Configure tab.</p>
            ) : colleges.map(college => (
              <div key={college.id} className="space-y-3 pb-5 border-b border-border/40 last:border-0 last:pb-0">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <p className="text-sm font-bold text-foreground">
                    {college.name || <em className="text-muted-foreground font-normal">Unnamed</em>}
                  </p>
                  <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${college.stream === "arts" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"}`}>
                    {college.stream === "arts" ? "Arts" : "Engineering"}
                  </span>
                </div>
                
                <div className="ml-8 space-y-3">
                  {college.courses.length === 0 ? (
                    <p className="text-muted-foreground italic text-xs">No courses configured.</p>
                  ) : college.courses.map(course => (
                    <div key={course.id} className="flex items-start gap-4 text-xs">
                      <div className="flex items-center gap-2 min-w-[160px] shrink-0 bg-muted/40 px-2.5 py-1.5 rounded-lg border border-border/40">
                        <BookOpen className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="font-semibold text-foreground truncate">{course.name}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0 ${course.degreeType === "pg" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"}`}>
                          {course.degreeType?.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-1.5">
                        {course.years.length === 0 ? (
                          <span className="text-muted-foreground italic text-[10px]">No years</span>
                        ) : course.years.map((year, yidx) => (
                          <span key={yidx} className="bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded text-[10px] font-semibold border border-purple-200/40 dark:border-purple-800/20">
                            {year}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}



      {/* ── Delete Confirmation Dialog ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in" onClick={() => setDeleteTarget(null)}>
          <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm font-bold">Confirm Delete</p>
                <p className="text-xs text-muted-foreground mt-0.5">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-foreground mb-1">
              Are you sure you want to delete <span className="font-semibold">"{deleteTarget.label}"</span>?
            </p>
            {deleteTarget.type === "college" && (
              <p className="text-xs text-destructive mt-1">This will also remove all courses and years inside it.</p>
            )}
            {deleteTarget.type === "course" && (
              <p className="text-xs text-destructive mt-1">This will also remove all years inside this course.</p>
            )}
            <div className="flex gap-2 mt-5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 h-10 rounded-xl border border-border text-xs font-semibold hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="flex-1 h-10 rounded-xl bg-destructive text-white text-xs font-semibold hover:bg-destructive/90 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

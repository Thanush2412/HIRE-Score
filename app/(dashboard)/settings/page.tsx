"use client";

import { useEffect, useRef, useState } from "react";
import {
  Plus, Trash2, Save, Building2, BookOpen, ChevronDown, ChevronUp,
  Download, Upload, CheckCircle2, XCircle, AlertTriangle,
} from "lucide-react";

interface CourseItem {
  id: number;
  name: string;
  originalName: string;   // tracks the name as it was when loaded / last saved
  years: string[];
  expanded: boolean;
  newYear: string;
}

interface CollegeItem {
  id: number;
  name: string;
  originalName: string;   // tracks the name as it was when loaded / last saved
  stream: "engineering" | "arts";
  degreeType: "ug" | "pg";
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
  const [newCollegeName, setNewCollegeName] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [loaded, setLoaded] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/settings")
      .then(r => r.json())
      .then(data => {
        const cols: CollegeItem[] = (data.colleges ?? []).map((col: { name: string; stream?: string; degreeType?: string; courses: { name: string; years: string[] }[] }) => ({
          id: genId(),
          name: col.name,
          originalName: col.name,
          stream: (col.stream === "arts" ? "arts" : "engineering") as "engineering" | "arts",
          degreeType: (col.degreeType === "pg" ? "pg" : "ug") as "ug" | "pg",
          expanded: true,
          newCourse: "",
          courses: (col.courses ?? []).map((co: { name: string; years: string[] }) => ({
            id: genId(),
            name: co.name,
            originalName: co.name,
            years: [...(co.years ?? [])],
            expanded: false,
            newYear: "",
          })),
        }));
        setColleges(cols);
        setLoaded(true);
      })
      .catch(err => {
        console.error("Failed to load settings:", err);
        setLoaded(true);
      });
  }, []);

  // ── Auto-save on changes ──────────────────────────────────────────────────
  useEffect(() => {
    if (!loaded) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      handleSave();
    }, 2000); // longer debounce — only fires after 2s of inactivity
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colleges, loaded]);

  // ── Save ──────────────────────────────────────────────────────────────────
  function handleSave() {
    setStatus("saving");
    const payload = {
      colleges: colleges.map(col => ({
        name: col.name,
        stream: col.stream,
        degreeType: col.degreeType,
        courses: col.courses.map(co => ({
          name: co.name,
          years: [...co.years],
        })),
      })),
    };

    // Collect rename operations: courses whose name changed
    const renames: { collegeName: string; oldName: string; newName: string }[] = [];
    for (const col of colleges) {
      for (const co of col.courses) {
        if (co.originalName && co.originalName !== co.name && co.originalName.trim() !== "") {
          // Use the college's current saved name (originalName) as the lookup key
          renames.push({ collegeName: col.originalName || col.name, oldName: co.originalName, newName: co.name });
        }
      }
    }

    const settingsSave = fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const renameOps = renames.map(r =>
      fetch("/api/settings/rename-course", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(r),
      })
    );

    Promise.all([settingsSave, ...renameOps])
      .then(responses => {
        if (responses.some(r => !r.ok)) throw new Error("One or more requests failed");
        // Update originalNames to current names after successful save
        setColleges(prev => prev.map(col => ({
          ...col,
          originalName: col.name,
          courses: col.courses.map(co => ({ ...co, originalName: co.name })),
        })));
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 2000);
      })
      .catch(err => {
        console.error("Save failed:", err);
        setStatus("error");
        setTimeout(() => setStatus("idle"), 3000);
      });
  }

  // ── College: add ──────────────────────────────────────────────────────────
  function handleAddCollege() {
    const name = newCollegeName.trim();
    if (!name) return;
    if (colleges.some(c => c.name === name)) return;
    setColleges(prev => [
      ...prev,
      { id: genId(), name, originalName: "", stream: "engineering", degreeType: "ug", courses: [], expanded: true, newCourse: "" },
    ]);
    setNewCollegeName("");
  }

  // ── College: remove ───────────────────────────────────────────────────────
  function handleRemoveCollege(id: number) {
    const college = colleges.find(c => c.id === id);
    if (!college) return;
    setDeleteTarget({ type: "college", collegeId: id, label: college.name || "this college" });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    if (deleteTarget.type === "college") {
      setColleges(prev => prev.filter(c => c.id !== deleteTarget.collegeId));
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

  // ── College: toggle expand ────────────────────────────────────────────────
  function handleToggleCollege(id: number) {
    setColleges(prev =>
      prev.map(c => c.id === id ? { ...c, expanded: !c.expanded } : c)
    );
  }

  // ── College: rename ───────────────────────────────────────────────────────
  function handleRenameCollege(id: number, name: string) {
    setColleges(prev =>
      prev.map(c => c.id === id ? { ...c, name } : c)
    );
  }

  // ── College: new course input ─────────────────────────────────────────────
  function handleNewCourseInput(collegeId: number, value: string) {
    setColleges(prev =>
      prev.map(c => c.id === collegeId ? { ...c, newCourse: value } : c)
    );
  }

  // ── Course: add ───────────────────────────────────────────────────────────
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
            { id: genId(), name, originalName: "", years: [], expanded: false, newYear: "" },
          ],
        };
      })
    );
  }

  // ── Course: remove ────────────────────────────────────────────────────────
  function handleRemoveCourse(collegeId: number, courseId: number) {
    const college = colleges.find(c => c.id === collegeId);
    const course = college?.courses.find(co => co.id === courseId);
    if (!course) return;
    setDeleteTarget({ type: "course", collegeId, courseId, label: course.name || "this course" });
  }

  // ── Course: toggle expand ─────────────────────────────────────────────────
  function handleToggleCourse(collegeId: number, courseId: number) {
    setColleges(prev =>
      prev.map(col =>
        col.id === collegeId
          ? {
              ...col,
              courses: col.courses.map(co =>
                co.id === courseId ? { ...co, expanded: !co.expanded } : co
              ),
            }
          : col
      )
    );
  }

  // ── Course: rename ────────────────────────────────────────────────────────
  function handleRenameCourse(collegeId: number, courseId: number, name: string) {
    setColleges(prev =>
      prev.map(col =>
        col.id === collegeId
          ? {
              ...col,
              courses: col.courses.map(co =>
                co.id === courseId ? { ...co, name } : co
              ),
            }
          : col
      )
    );
  }

  // ── Course: new year input ────────────────────────────────────────────────
  function handleNewYearInput(collegeId: number, courseId: number, value: string) {
    setColleges(prev =>
      prev.map(col =>
        col.id === collegeId
          ? {
              ...col,
              courses: col.courses.map(co =>
                co.id === courseId ? { ...co, newYear: value } : co
              ),
            }
          : col
      )
    );
  }

  // ── Year: add ─────────────────────────────────────────────────────────────
  function handleAddYear(collegeId: number, courseId: number) {
    setColleges(prev =>
      prev.map(col =>
        col.id === collegeId
          ? {
              ...col,
              courses: col.courses.map(co => {
                if (co.id !== courseId) return co;
                const year = co.newYear.trim();
                if (!year || co.years.includes(year)) return co;
                return { ...co, newYear: "", years: [...co.years, year] };
              }),
            }
          : col
      )
    );
  }

  // ── Year: remove ──────────────────────────────────────────────────────────
  function handleRemoveYear(collegeId: number, courseId: number, yearIndex: number) {
    const college = colleges.find(c => c.id === collegeId);
    const course = college?.courses.find(co => co.id === courseId);
    const year = course?.years[yearIndex];
    setDeleteTarget({ type: "year", collegeId, courseId, yearIndex, label: year || "this year" });
  }

  // ── Export ────────────────────────────────────────────────────────────────
  function handleExport() {
    const payload = {
      colleges: colleges.map(col => ({
        name: col.name,
        courses: col.courses.map(co => ({ name: co.name, years: [...co.years] })),
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hire-settings.json";
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
        const cols: CollegeItem[] = parsed.colleges.map((col: { name: string; stream?: string; courses: { name: string; years: string[] }[] }) => ({
          id: genId(),
          name: col.name,
          originalName: col.name,
          stream: (col.stream === "arts" ? "arts" : "engineering") as "engineering" | "arts",
          expanded: true,
          newCourse: "",
          courses: (col.courses ?? []).map((co: { name: string; years: string[] }) => ({
            id: genId(),
            name: co.name,
            originalName: co.name,
            years: [...(co.years ?? [])],
            expanded: false,
            newYear: "",
          })),
        }));
        setColleges(cols);
      } catch {
        alert("Invalid settings file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (!loaded) {
    return (
      <div className="max-w-4xl mx-auto pt-8 text-center text-sm text-muted-foreground">
        Loading settings…
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-8 px-2 sm:px-0">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-base sm:text-lg font-bold">Settings</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Configure colleges, courses, and years</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="file"
            accept=".json"
            id="import-settings"
            className="hidden"
            onChange={handleImport}
          />
          <label
            htmlFor="import-settings"
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-border text-xs font-semibold hover:bg-muted transition-colors cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5" /> Import
          </label>
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-border text-xs font-semibold hover:bg-muted transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> Export
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={status === "saving"}
            className={[
              "flex items-center gap-2 h-9 px-4 rounded-xl text-xs font-semibold transition-all disabled:cursor-wait",
              status === "saved"  ? "bg-emerald-600 text-white" :
              status === "error"  ? "bg-destructive text-destructive-foreground" :
              status === "saving" ? "bg-primary/70 text-primary-foreground" :
              "bg-primary text-primary-foreground hover:opacity-90",
            ].join(" ")}
          >
            {status === "saved"  ? <><CheckCircle2 className="h-3.5 w-3.5" /> Saved!</> :
             status === "error"  ? <><XCircle className="h-3.5 w-3.5" /> Error — Retry</> :
             status === "saving" ? <><Save className="h-3.5 w-3.5 animate-pulse" /> Saving…</> :
             <><Save className="h-3.5 w-3.5" /> Save Changes</>}
          </button>
        </div>
      </div>

      {/* ── College list ── */}
      <div className="space-y-4">
        {colleges.length === 0 && (
          <div className="bg-card rounded-2xl border border-dashed border-border p-8 text-center">
            <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-semibold mb-1">No colleges configured</p>
            <p className="text-xs text-muted-foreground">Add a college below, then click Save Changes</p>
          </div>
        )}

        {colleges.map(college => (
          <div key={college.id} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">

            {/* College header row */}
            <div className="flex items-center gap-3 p-4 border-b border-border bg-muted/20">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={college.name}
                  onChange={e => handleRenameCollege(college.id, e.target.value)}
                  placeholder="College name"
                  className="w-full h-8 px-2 text-sm font-bold rounded border border-transparent hover:border-border focus:border-primary bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors"
                />
                <p className="text-[10px] text-muted-foreground mt-0.5 px-2">
                  {college.courses.length} course{college.courses.length !== 1 ? "s" : ""}
                </p>
              </div>
              {/* Stream toggle */}
              <div className="flex rounded-lg border border-border overflow-hidden text-[11px] shrink-0">
                <button
                  type="button"
                  onClick={() => setColleges(prev => prev.map(c => c.id === college.id ? { ...c, stream: "engineering" } : c))}
                  className={`px-2 py-1 font-semibold transition-colors ${college.stream === "engineering" ? "bg-blue-600 text-white" : "hover:bg-muted text-muted-foreground"}`}
                >
                  Engg
                </button>
                <button
                  type="button"
                  onClick={() => setColleges(prev => prev.map(c => c.id === college.id ? { ...c, stream: "arts" } : c))}
                  className={`px-2 py-1 font-semibold transition-colors ${college.stream === "arts" ? "bg-purple-600 text-white" : "hover:bg-muted text-muted-foreground"}`}
                >
                  Arts
                </button>
              </div>

              {/* Degree Type toggle */}
              <div className="flex rounded-lg border border-border overflow-hidden text-[11px] shrink-0">
                <button
                  type="button"
                  onClick={() => setColleges(prev => prev.map(c => c.id === college.id ? { ...c, degreeType: "ug" } : c))}
                  className={`px-2 py-1 font-semibold transition-colors ${college.degreeType === "ug" ? "bg-emerald-600 text-white" : "hover:bg-muted text-muted-foreground"}`}
                >
                  UG
                </button>
                <button
                  type="button"
                  onClick={() => setColleges(prev => prev.map(c => c.id === college.id ? { ...c, degreeType: "pg" } : c))}
                  className={`px-2 py-1 font-semibold transition-colors ${college.degreeType === "pg" ? "bg-orange-600 text-white" : "hover:bg-muted text-muted-foreground"}`}
                >
                  PG
                </button>
              </div>
              <button
                type="button"
                onClick={() => handleToggleCollege(college.id)}
                className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors shrink-0"
              >
                {college.expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={() => handleRemoveCollege(college.id)}
                className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {/* College body */}
            {college.expanded && (
              <div className="p-4 space-y-3">

                {college.courses.length === 0 && (
                  <p className="text-xs text-muted-foreground italic text-center py-2">No courses yet</p>
                )}

                {college.courses.map(course => (
                  <div key={course.id} className="bg-muted/30 rounded-xl border border-border overflow-hidden">

                    {/* Course header row */}
                    <div className="flex items-center gap-3 p-3">
                      <div className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                        <BookOpen className="h-3.5 w-3.5 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          value={course.name}
                          onChange={e => handleRenameCourse(college.id, course.id, e.target.value)}
                          placeholder="Course name"
                          className="w-full h-7 px-2 text-sm font-semibold rounded border border-transparent hover:border-border focus:border-primary bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors"
                        />
                        <p className="text-[10px] text-muted-foreground mt-0.5 px-2">
                          {course.years.length} year{course.years.length !== 1 ? "s" : ""}
                          {course.years.length > 0 && ` · ${course.years.join(", ")}`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleCourse(college.id, course.id)}
                        className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors shrink-0"
                      >
                        {course.expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveCourse(college.id, course.id)}
                        className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Years panel */}
                    {course.expanded && (
                      <div className="px-3 pb-3 pt-2 border-t border-border bg-background/50 space-y-2">
                        <p className="text-xs font-semibold">Years</p>
                        <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                          {course.years.length === 0 && (
                            <p className="text-[10px] text-muted-foreground italic self-center">No years yet</p>
                          )}
                          {course.years.map((year, yIdx) => (
                            <span
                              key={yIdx}
                              className="flex items-center gap-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-[11px] font-medium px-2 py-1 rounded border border-purple-200 dark:border-purple-800"
                            >
                              {year}
                              <button
                                type="button"
                                onClick={() => handleRemoveYear(college.id, course.id, yIdx)}
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
                            onChange={e => handleNewYearInput(college.id, course.id, e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddYear(college.id, course.id); } }}
                            placeholder="e.g., 1st Year"
                            className="flex-1 h-7 px-2 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddYear(college.id, course.id)}
                            className="h-7 px-2.5 flex items-center gap-1 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90"
                          >
                            <Plus className="h-3 w-3" /> Add
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Add course row */}
                <div className="flex gap-2 pt-1 border-t border-border">
                  <input
                    type="text"
                    value={college.newCourse}
                    onChange={e => handleNewCourseInput(college.id, e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddCourse(college.id); } }}
                    placeholder="Add course (e.g., B.Tech CSE)"
                    className="flex-1 h-8 px-3 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddCourse(college.id)}
                    className="h-8 px-3 flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 whitespace-nowrap"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Course
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Add College ── */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-4">
        <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Add New College</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={newCollegeName}
            onChange={e => setNewCollegeName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddCollege(); } }}
            placeholder="College name (e.g., Sri Venkateswara College of Engineering)"
            className="flex-1 h-9 px-3 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="button"
            onClick={handleAddCollege}
            className="h-9 px-4 flex items-center gap-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 whitespace-nowrap"
          >
            <Plus className="h-4 w-4" /> Add College
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">
          After configuring, click <strong>Save Changes</strong> to persist.
        </p>
      </div>

      {/* ── Preview ── */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <div>
            <p className="text-sm font-bold">Preview</p>
            <p className="text-[10px] text-muted-foreground">College → Courses → Years</p>
          </div>
          <span className="text-[10px] text-muted-foreground">
            {colleges.length} college{colleges.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="p-5 space-y-4">
          {colleges.length === 0 ? (
            <p className="text-muted-foreground italic text-xs text-center">No colleges configured</p>
          ) : colleges.map(college => (
            <div key={college.id} className="space-y-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <p className="text-sm font-bold">
                  {college.name || <em className="text-muted-foreground font-normal">Unnamed</em>}
                </p>
                <div className="flex gap-1">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${college.stream === "arts" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"}`}>
                    {college.stream === "arts" ? "Arts" : "Engineering"}
                  </span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${college.degreeType === "pg" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"}`}>
                    {college.degreeType === "pg" ? "PG" : "UG"}
                  </span>
                </div>
              </div>
              <div className="ml-6 space-y-1.5">
                {college.courses.length === 0 ? (
                  <p className="text-muted-foreground italic text-xs">No courses</p>
                ) : college.courses.map(course => (
                  <div key={course.id} className="flex items-start gap-3 text-xs">
                    <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded font-semibold min-w-[120px] shrink-0">
                      {course.name}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {course.years.length === 0 ? (
                        <span className="text-muted-foreground italic text-[10px]">No years</span>
                      ) : course.years.map((year, yidx) => (
                        <span key={yidx} className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded text-[10px] font-medium">
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

      {/* ── Delete Confirmation Dialog ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDeleteTarget(null)}>
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
                className="flex-1 h-9 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="flex-1 h-9 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
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

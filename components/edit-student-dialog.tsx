"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StoredStudent } from "@/lib/db";
import { Loader2, AlertCircle, Save, X, User, GraduationCap, Languages, Code2 } from "lucide-react";

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

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

export function EditStudentDialog({
  open,
  student,
  onClose,
  onSave,
}: {
  open: boolean;
  student: StoredStudent | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState<Partial<StoredStudent>>({});
  const [settings, setSettings] = useState<Settings>({ colleges: [] });
  const [loading, setLoading] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [error, setError] = useState("");

  // Load settings once when open
  useEffect(() => {
    if (open) {
      setSettingsLoading(true);
      fetch("/api/settings")
        .then((r) => r.json())
        .then((data) => {
          setSettings(data);
        })
        .catch((err) => {
          console.error("Failed to load settings:", err);
          setError("Failed to load college settings.");
        })
        .finally(() => {
          setSettingsLoading(false);
        });
    }
  }, [open]);

  // Set form draft when student changes
  useEffect(() => {
    if (student) {
      setForm({ ...student });
      setError("");
    } else {
      setForm({});
    }
  }, [student, open]);

  if (!student) return null;

  const setVal = (key: keyof StoredStudent, val: any) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  // Helper variables for cascading college selectors
  const selectedCollege = settings.colleges?.find((c) => c.name === form.college);
  const selectedCourse = selectedCollege?.courses?.find((c) => c.name === form.department);
  const availableYears = selectedCourse?.years || [];

  const handleCollegeChange = (collegeName: string | null) => {
    if (!collegeName) return;
    const col = settings.colleges?.find((c) => c.name === collegeName);
    setForm((prev) => ({
      ...prev,
      college: collegeName,
      department: "",
      year: "",
      stream: col?.stream || "engineering",
    }));
  };

  const handleCourseChange = (courseName: string | null) => {
    if (!courseName) return;
    const col = settings.colleges?.find((c) => c.name === form.college);
    const co = col?.courses?.find((c) => c.name === courseName);
    setForm((prev) => ({
      ...prev,
      department: courseName,
      year: "",
      degreeType: co?.degreeType || "ug",
    }));
  };

  const handleSave = async () => {
    setError("");
    if (!form.name?.trim() || !form.registrationNumber?.trim()) {
      setError("Name and Registration Number are required.");
      return;
    }
    if (!form.college || !form.department || !form.year) {
      setError("College, Department, and Year are required.");
      return;
    }

    setLoading(true);
    try {
      // Coerce numeric types exactly as expected by formula calculation engines
      const payload = {
        ...form,
        xMarks: Number(form.xMarks) || 0,
        xiiMarks: Number(form.xiiMarks) || 0,
        ugPercentage: Number(form.ugPercentage) || 0,
        pgPercentage:
          form.pgPercentage === null ||
          form.pgPercentage === undefined ||
          String(form.pgPercentage).trim() === "" ||
          String(form.pgPercentage).trim() === "—" ||
          String(form.pgPercentage).trim() === "NA"
            ? null
            : Number(form.pgPercentage),
        noOfArrears: Number(form.noOfArrears) || 0,
        historyOfArrears: Number(form.historyOfArrears) || 0,
        quants: Number(form.quants) || 0,
        logical: Number(form.logical) || 0,
        verbal: Number(form.verbal) || 0,
        leetcodeRank: Number(String(form.leetcodeRank || "").replace(/[^0-9]/g, "")) || 0,
        fopAssessment: Number(form.fopAssessment) || 0,
        dsaAssessment: Number(form.dsaAssessment) || 0,
        internalCodeathon: Number(form.internalCodeathon) || 0,
        externalCodeathon: Number(form.externalCodeathon) || 0,
        githubProjects: Number(form.githubProjects) || 0,
        fullLengthProjects: Number(form.fullLengthProjects) || 0,
        globalCertification: Number(form.globalCertification) || 0,
        otherCertifications: Number(form.otherCertifications) || 0,
      };

      const res = await fetch("/api/students", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(await res.text() || "Failed to save student details.");
      }

      onSave();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while saving student details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !loading && onClose()}>
      <DialogContent className="sm:!max-w-[1050px] w-[95vw] max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-2xl relative border shadow-2xl">
        {/* Top Premium Gradient Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-purple-500 to-pink-500 z-50" />

        <DialogHeader className="px-6 py-4 border-b bg-muted/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-sm font-black text-primary border border-primary/10 shadow-inner shrink-0 font-bold">
              {student.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <DialogTitle className="text-base font-bold">Edit Student Profile</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Modify details for <span className="font-semibold text-foreground">{student.name}</span> ({student.registrationNumber})
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="mx-6 mt-4 rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-3 flex items-start gap-3 shrink-0">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-destructive">{error}</p>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
          {settingsLoading ? (
            <div className="flex items-center justify-center py-20 flex-1">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Tabs defaultValue="identity" className="flex flex-col h-full overflow-hidden">
              <div className="px-6 border-b bg-muted/5 shrink-0">
                <TabsList className="w-full justify-start h-12 bg-transparent gap-8 p-0 rounded-none border-b-0">
                  <TabsTrigger
                    value="identity"
                    className="data-[state=active]:border-primary data-[state=active]:text-primary border-b-2 border-transparent rounded-none px-1 py-3 text-xs font-semibold transition-all h-full bg-transparent shadow-none flex items-center gap-2 hover:text-foreground/80"
                  >
                    <User className="h-4 w-4" /> Identity
                  </TabsTrigger>
                  <TabsTrigger
                    value="academics"
                    className="data-[state=active]:border-primary data-[state=active]:text-primary border-b-2 border-transparent rounded-none px-1 py-3 text-xs font-semibold transition-all h-full bg-transparent shadow-none flex items-center gap-2 hover:text-foreground/80"
                  >
                    <GraduationCap className="h-4 w-4" /> Academics
                  </TabsTrigger>
                  <TabsTrigger
                    value="language"
                    className="data-[state=active]:border-primary data-[state=active]:text-primary border-b-2 border-transparent rounded-none px-1 py-3 text-xs font-semibold transition-all h-full bg-transparent shadow-none flex items-center gap-2 hover:text-foreground/80"
                  >
                    <Languages className="h-4 w-4" /> Language
                  </TabsTrigger>
                  <TabsTrigger
                    value="technical"
                    className="data-[state=active]:border-primary data-[state=active]:text-primary border-b-2 border-transparent rounded-none px-1 py-3 text-xs font-semibold transition-all h-full bg-transparent shadow-none flex items-center gap-2 hover:text-foreground/80"
                  >
                    <Code2 className="h-4 w-4" /> Tech & Certs
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 min-h-0 overflow-hidden">
                {/* --- IDENTITY TAB --- */}
                <TabsContent value="identity" className="h-full m-0 focus-visible:outline-none overflow-hidden flex flex-col data-[state=inactive]:hidden">
                  <ScrollArea className="h-full">
                    <div className="p-6 space-y-6">
                      <div className="flex items-center gap-2 pb-2 border-b border-muted">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                          <User className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-semibold tracking-tight text-foreground/90">Personal & Institution Details</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">
                            Student Name <span className="text-rose-500 font-bold ml-0.5">*</span>
                          </Label>
                          <Input
                            value={form.name ?? ""}
                            onChange={(e) => setVal("name", e.target.value)}
                            placeholder="Enter Name"
                            className="h-9 text-xs focus-visible:ring-primary"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">
                            Registration Number <span className="text-rose-500 font-bold ml-0.5">*</span>
                          </Label>
                          <Input
                            value={form.registrationNumber ?? ""}
                            onChange={(e) => setVal("registrationNumber", e.target.value)}
                            placeholder="Enter Registration Number"
                            className="h-9 text-xs font-mono focus-visible:ring-primary"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">
                            College <span className="text-rose-500 font-bold ml-0.5">*</span>
                          </Label>
                          <Select value={form.college || ""} onValueChange={handleCollegeChange}>
                            <SelectTrigger className="h-9 text-xs focus-visible:ring-primary w-full">
                              <SelectValue placeholder="Select College" />
                            </SelectTrigger>
                            <SelectContent>
                              {settings.colleges?.map((c) => (
                                <SelectItem key={c.name} value={c.name} className="text-xs">
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">
                            Department <span className="text-rose-500 font-bold ml-0.5">*</span>
                          </Label>
                          <Select value={form.department || ""} onValueChange={handleCourseChange}>
                            <SelectTrigger className="h-9 text-xs focus-visible:ring-primary w-full">
                              <SelectValue placeholder="Select Department" />
                            </SelectTrigger>
                            <SelectContent>
                              {selectedCollege?.courses?.map((c) => (
                                <SelectItem key={c.name} value={c.name} className="text-xs">
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">
                            Year <span className="text-rose-500 font-bold ml-0.5">*</span>
                          </Label>
                          <Select value={form.year || ""} onValueChange={(v) => setVal("year", v)}>
                            <SelectTrigger className="h-9 text-xs focus-visible:ring-primary w-full">
                              <SelectValue placeholder="Select Year" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableYears.map((y) => (
                                <SelectItem key={y} value={y} className="text-xs">
                                  {y}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Degree Type</Label>
                          <Select
                            value={form.degreeType || "ug"}
                            onValueChange={(v) => setVal("degreeType", v)}
                          >
                            <SelectTrigger className="h-9 text-xs focus-visible:ring-primary w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ug" className="text-xs">UG</SelectItem>
                              <SelectItem value="pg" className="text-xs">PG</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Phone</Label>
                          <Input
                            value={form.phone ?? ""}
                            onChange={(e) => setVal("phone", e.target.value)}
                            placeholder="Phone number"
                            className="h-9 text-xs focus-visible:ring-primary"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Email</Label>
                          <Input
                            type="email"
                            value={form.email ?? ""}
                            onChange={(e) => setVal("email", e.target.value)}
                            placeholder="Email address"
                            className="h-9 text-xs focus-visible:ring-primary"
                          />
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* --- ACADEMICS TAB --- */}
                <TabsContent value="academics" className="h-full m-0 focus-visible:outline-none overflow-hidden flex flex-col data-[state=inactive]:hidden">
                  <ScrollArea className="h-full">
                    <div className="p-6 space-y-6">
                      <div className="flex items-center gap-2 pb-2 border-b border-muted">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                          <GraduationCap className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-semibold tracking-tight text-foreground/90">Academic Performance</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Class X Marks %</Label>
                          <Input
                            type="number"
                            step="any"
                            value={form.xMarks ?? ""}
                            onChange={(e) => setVal("xMarks", e.target.value)}
                            placeholder="Class X Percentage"
                            className="h-9 text-xs focus-visible:ring-primary"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Class XII Marks %</Label>
                          <Input
                            type="number"
                            step="any"
                            value={form.xiiMarks ?? ""}
                            onChange={(e) => setVal("xiiMarks", e.target.value)}
                            placeholder="Class XII Percentage"
                            className="h-9 text-xs focus-visible:ring-primary"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">UG Percentage</Label>
                          <Input
                            type="number"
                            step="any"
                            value={form.ugPercentage ?? ""}
                            onChange={(e) => setVal("ugPercentage", e.target.value)}
                            placeholder="UG Aggregate Percentage"
                            className="h-9 text-xs focus-visible:ring-primary"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">PG Percentage (Leave empty if N/A)</Label>
                          <Input
                            type="number"
                            step="any"
                            value={
                              form.pgPercentage === null || form.pgPercentage === undefined
                                ? ""
                                : form.pgPercentage
                            }
                            onChange={(e) => setVal("pgPercentage", e.target.value)}
                            placeholder="PG Percentage (optional)"
                            className="h-9 text-xs focus-visible:ring-primary"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Active Arrears</Label>
                          <Input
                            type="number"
                            value={form.noOfArrears ?? ""}
                            onChange={(e) => setVal("noOfArrears", e.target.value)}
                            placeholder="Count of active arrears"
                            className="h-9 text-xs focus-visible:ring-primary"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">History of Arrears</Label>
                          <Input
                            type="number"
                            value={form.historyOfArrears ?? ""}
                            onChange={(e) => setVal("historyOfArrears", e.target.value)}
                            placeholder="Total history of arrears"
                            className="h-9 text-xs focus-visible:ring-primary"
                          />
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* --- LANGUAGE TAB --- */}
                <TabsContent value="language" className="h-full m-0 focus-visible:outline-none overflow-hidden flex flex-col data-[state=inactive]:hidden">
                  <ScrollArea className="h-full">
                    <div className="p-6 space-y-6">
                      <div className="flex items-center gap-2 pb-2 border-b border-muted">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                          <Languages className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-semibold tracking-tight text-foreground/90">Language & Communication Levels</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">CEFR Level</Label>
                          <Select
                            value={form.cefrGrammar || ""}
                            onValueChange={(v) => setVal("cefrGrammar", v)}
                          >
                            <SelectTrigger className="h-9 text-xs focus-visible:ring-primary w-full">
                              <SelectValue placeholder="Select Level" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none" className="text-xs italic">— None</SelectItem>
                              {CEFR_LEVELS.map((lvl) => (
                                <SelectItem key={lvl} value={lvl} className="text-xs font-semibold">
                                  {lvl}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">EF SET Listening</Label>
                          <Select
                            value={form.efSetListening || ""}
                            onValueChange={(v) => setVal("efSetListening", v)}
                          >
                            <SelectTrigger className="h-9 text-xs focus-visible:ring-primary w-full">
                              <SelectValue placeholder="Select Level" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none" className="text-xs italic">— None</SelectItem>
                              {CEFR_LEVELS.map((lvl) => (
                                <SelectItem key={lvl} value={lvl} className="text-xs font-semibold">
                                  {lvl}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">EF SET Speaking</Label>
                          <Select
                            value={form.efSetSpeaking || ""}
                            onValueChange={(v) => setVal("efSetSpeaking", v)}
                          >
                            <SelectTrigger className="h-9 text-xs focus-visible:ring-primary w-full">
                              <SelectValue placeholder="Select Level" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none" className="text-xs italic">— None</SelectItem>
                              {CEFR_LEVELS.map((lvl) => (
                                <SelectItem key={lvl} value={lvl} className="text-xs font-semibold">
                                  {lvl}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">EF SET Reading</Label>
                          <Select
                            value={form.efSetReading || ""}
                            onValueChange={(v) => setVal("efSetReading", v)}
                          >
                            <SelectTrigger className="h-9 text-xs focus-visible:ring-primary w-full">
                              <SelectValue placeholder="Select Level" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none" className="text-xs italic">— None</SelectItem>
                              {CEFR_LEVELS.map((lvl) => (
                                <SelectItem key={lvl} value={lvl} className="text-xs font-semibold">
                                  {lvl}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">EF SET Writing</Label>
                          <Select
                            value={form.efSetWriting || ""}
                            onValueChange={(v) => setVal("efSetWriting", v)}
                          >
                            <SelectTrigger className="h-9 text-xs focus-visible:ring-primary w-full">
                              <SelectValue placeholder="Select Level" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none" className="text-xs italic">— None</SelectItem>
                              {CEFR_LEVELS.map((lvl) => (
                                <SelectItem key={lvl} value={lvl} className="text-xs font-semibold">
                                  {lvl}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* --- TECHNICAL TAB --- */}
                <TabsContent value="technical" className="h-full m-0 focus-visible:outline-none overflow-hidden flex flex-col data-[state=inactive]:hidden">
                  <ScrollArea className="h-full">
                    <div className="p-6 space-y-6">
                      <div className="flex items-center gap-2 pb-2 border-b border-muted">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                          <Code2 className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-semibold tracking-tight text-foreground/90">Technical Profile & Certifications</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                        <div className="space-y-1.5 col-span-1">
                          <Label className="text-xs font-medium">LeetCode Rank</Label>
                          <Input
                            value={form.leetcodeRank ?? ""}
                            onChange={(e) => setVal("leetcodeRank", e.target.value)}
                            placeholder="Enter rank"
                            className="h-9 text-xs focus-visible:ring-primary"
                          />
                        </div>
                        <div className="space-y-1.5 col-span-1">
                          <Label className="text-xs font-medium">LeetCode URL</Label>
                          <Input
                            value={form.leetcodeUrl ?? ""}
                            onChange={(e) => setVal("leetcodeUrl", e.target.value)}
                            placeholder="leetcode.com/u/..."
                            className="h-9 text-xs focus-visible:ring-primary"
                          />
                        </div>
                        <div className="space-y-1.5 col-span-1 sm:col-span-2">
                          <Label className="text-xs font-medium">GitHub Profile URL</Label>
                          <Input
                            value={form.githubUrl ?? ""}
                            onChange={(e) => setVal("githubUrl", e.target.value)}
                            placeholder="github.com/..."
                            className="h-9 text-xs focus-visible:ring-primary"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">FOP Assessment</Label>
                          <Input
                            type="number"
                            step="any"
                            value={form.fopAssessment ?? ""}
                            onChange={(e) => setVal("fopAssessment", e.target.value)}
                            placeholder="Marks"
                            className="h-9 text-xs focus-visible:ring-primary"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">DSA Assessment</Label>
                          <Input
                            type="number"
                            step="any"
                            value={form.dsaAssessment ?? ""}
                            onChange={(e) => setVal("dsaAssessment", e.target.value)}
                            placeholder="Marks"
                            className="h-9 text-xs focus-visible:ring-primary"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Internal Codeathon</Label>
                          <Input
                            type="number"
                            value={form.internalCodeathon ?? ""}
                            onChange={(e) => setVal("internalCodeathon", e.target.value)}
                            placeholder="Events count"
                            className="h-9 text-xs focus-visible:ring-primary"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">External Codeathon</Label>
                          <Input
                            type="number"
                            value={form.externalCodeathon ?? ""}
                            onChange={(e) => setVal("externalCodeathon", e.target.value)}
                            placeholder="Events count"
                            className="h-9 text-xs focus-visible:ring-primary"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">GitHub Projects</Label>
                          <Input
                            type="number"
                            value={form.githubProjects ?? ""}
                            onChange={(e) => setVal("githubProjects", e.target.value)}
                            placeholder="Projects count"
                            className="h-9 text-xs focus-visible:ring-primary"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Full Length Projects</Label>
                          <Input
                            type="number"
                            value={form.fullLengthProjects ?? ""}
                            onChange={(e) => setVal("fullLengthProjects", e.target.value)}
                            placeholder="Projects count"
                            className="h-9 text-xs focus-visible:ring-primary"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Global Certification</Label>
                          <Input
                            type="number"
                            value={form.globalCertification ?? ""}
                            onChange={(e) => setVal("globalCertification", e.target.value)}
                            placeholder="Certifications count"
                            className="h-9 text-xs focus-visible:ring-primary"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Other Certifications</Label>
                          <Input
                            type="number"
                            value={form.otherCertifications ?? ""}
                            onChange={(e) => setVal("otherCertifications", e.target.value)}
                            placeholder="Certifications count"
                            className="h-9 text-xs focus-visible:ring-primary"
                          />
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </TabsContent>
              </div>
            </Tabs>
          )}
        </div>

        <DialogFooter className="px-6 py-3.5 border-t bg-card shrink-0 flex items-center justify-between gap-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={loading}
            className="text-xs h-9 px-4 border-muted-foreground/20 hover:bg-muted/50 transition-colors"
          >
            <X className="h-3.5 w-3.5 mr-1.5" /> Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={loading || settingsLoading}
            onClick={handleSave}
            className="text-xs h-9 px-4 gap-1.5 bg-gradient-to-r from-primary to-primary/95 shadow-md hover:shadow-lg hover:brightness-105 active:scale-95 transition-all text-primary-foreground font-semibold"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" /> Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

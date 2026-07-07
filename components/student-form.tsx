"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { StudentData } from "@/lib/types";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  CheckCircle2, User, BookOpen, Code2, Languages, Upload, Link,
  Plus, Trash2, Info, ChevronRight, ChevronLeft, Award, GraduationCap,
  FileText, Globe, Zap, AlertCircle, Check, Loader2
} from "lucide-react";

const CEFR = ["A1", "A2", "B1", "B2", "C1", "C2"];

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

type FormState = {
  college: string; course: string; year: string;
  name: string; registrationNumber: string;
  phone: string; email: string;
  degreeType: "ug" | "pg";
  xMarks: string; xiiMarks: string; ugPercentage: string; pgPercentage: string;
  noOfArrears: string; historyOfArrears: string;
  cefrGrammar: string;
  efSetListening: string; efSetSpeaking: string; efSetReading: string; efSetWriting: string;
  leetcodeRank: string; leetcodeUrl: string; githubUrl: string;
  fopAssessment: string; dsaAssessment: string;
  internalCodeathon: string; externalCodeathon: string;
  githubProjects: string; fullLengthProjects: string;
  globalCertification: string; otherCertifications: string;
};

type Project = { title: string; description: string; link: string };
type CertEntry = { name: string; issuer: string; link: string };

const blank: FormState = {
  college: "", course: "", year: "",
  name: "", registrationNumber: "",
  phone: "", email: "",
  degreeType: "ug",
  xMarks: "", xiiMarks: "", ugPercentage: "", pgPercentage: "",
  noOfArrears: "", historyOfArrears: "",
  cefrGrammar: "",
  efSetListening: "", efSetSpeaking: "", efSetReading: "", efSetWriting: "",
  leetcodeRank: "", leetcodeUrl: "", githubUrl: "",
  fopAssessment: "", dsaAssessment: "",
  internalCodeathon: "", externalCodeathon: "",
  githubProjects: "", fullLengthProjects: "",
  globalCertification: "", otherCertifications: "",
};

function toStudentData(f: FormState): StudentData & { college: string } {
  const n = (v: string, def = 0) => { const x = parseFloat(v); return isNaN(x) ? def : x; };
  const ni = (v: string, def = 0) => { const x = parseInt(v.replace(/[,~\s]/g, "")); return isNaN(x) ? def : x; };
  const pgValue = f.pgPercentage.trim().toUpperCase() === "NA" || f.pgPercentage.trim() === ""
    ? null
    : n(f.pgPercentage);
  return {
    name: f.name.trim(),
    registrationNumber: f.registrationNumber.trim(),
    college: f.college.trim(),
    department: f.course.trim(),
    year: f.year,
    phone: f.phone.trim(),
    email: f.email.trim(),
    degreeType: (f.degreeType || "ug") as "ug" | "pg",
    xMarks: n(f.xMarks), xiiMarks: n(f.xiiMarks),
    ugPercentage: n(f.ugPercentage),
    pgPercentage: pgValue,
    noOfArrears: ni(f.noOfArrears), historyOfArrears: ni(f.historyOfArrears),
    quants: 0, logical: 0, verbal: 0,
    cefrGrammar: f.cefrGrammar,
    efSetListening: f.efSetListening, efSetSpeaking: f.efSetSpeaking,
    efSetReading: f.efSetReading, efSetWriting: f.efSetWriting,
    leetcodeRank: ni(f.leetcodeRank),
    leetcodeUrl: f.leetcodeUrl.trim(),
    githubUrl: f.githubUrl.trim(),
    fopAssessment: n(f.fopAssessment), dsaAssessment: n(f.dsaAssessment),
    internalCodeathon: n(f.internalCodeathon), externalCodeathon: n(f.externalCodeathon),
    githubProjects: n(f.githubProjects), fullLengthProjects: n(f.fullLengthProjects),
    globalCertification: n(f.globalCertification), otherCertifications: n(f.otherCertifications),
    xScore: 0, xiiScore: 0, ugScore: 0, academicAggregate: 0, noOfArrearsScore: 0, historyArrearsScore: 0,
    standingArrears: 0, quantsScore: 0, logicalScore: 0, verbalScore: 0, aptitudeTotal: 0, cefrGrammarScore: 0,
    efListeningScore: 0, efSpeakingScore: 0, efReadingScore: 0, efWritingScore: 0,
    communicationTotal: 0, codingPractice: 0, codingAssessment: 0, codeathonHackathon: 0, miniProjects: 0,
    fullLengthProjectScore: 0, globalCertScore: 0, otherCertScore: 0, academicRegulatory: 0,
    cognitiveLinguistic: 0, technicalProficiency: 0, industryValidation: 0, hireScore: 0,
  };
}

// ── Step definitions ──────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "Identity",   icon: User,         short: "Who" },
  { id: 2, label: "Academics",  icon: GraduationCap, short: "Edu" },
  { id: 3, label: "Language",   icon: Languages,    short: "Lang" },
  { id: 4, label: "Technical",  icon: Code2,        short: "Tech" },
];

// ── Reusable sub-components ───────────────────────────────────────────────────

function FieldLabel({ children, required, tooltip }: { children: React.ReactNode; required?: boolean; tooltip?: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-1.5">
      <span className="text-[13px] font-medium text-foreground/80">{children}</span>
      {required && <span className="text-[10px] font-semibold text-rose-500 leading-none">*</span>}
      {tooltip && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger render={<button type="button" className="inline-flex items-center text-muted-foreground/60 hover:text-primary transition-colors cursor-help" />}>
              <Info className="h-3.5 w-3.5" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
              {tooltip}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

function SectionHeading({ icon: Icon, label, accent }: { icon: React.ElementType; label: string; accent?: string }) {
  return (
    <div className={`flex items-center gap-2 mb-4 pb-2 border-b ${accent ?? "border-border/60"}`}>
      <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${accent ? "bg-primary/10" : "bg-muted"}`}>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <span className="text-sm font-semibold tracking-tight">{label}</span>
    </div>
  );
}

function UploadButton({
  id, accept, uploaded, label, onChange,
}: {
  id: string; accept: string; uploaded?: string; label: string;
  onChange: (files: FileList | null) => void;
}) {
  return (
    <div>
      <input type="file" accept={accept} className="hidden" id={id} onChange={(e) => onChange(e.target.files)} />
      <label
        htmlFor={id}
        className={`flex items-center gap-2 h-9 px-3 text-xs rounded-lg border-2 border-dashed cursor-pointer transition-all select-none ${
          uploaded
            ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
            : "border-border hover:border-primary/60 hover:bg-primary/5 text-muted-foreground"
        }`}
      >
        {uploaded ? (
          <><CheckCircle2 className="h-3.5 w-3.5 shrink-0" /><span className="truncate max-w-[180px]">{uploaded}</span></>
        ) : (
          <><Upload className="h-3.5 w-3.5 shrink-0" /><span>{label}</span></>
        )}
      </label>
    </div>
  );
}

function CardEntry({
  index, label, onRemove, children,
}: {
  index: number; label: string; onRemove: () => void; children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-background shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40 border-b">
        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          {label} {index + 1}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" /> Remove
        </button>
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  );
}

function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 text-xs font-semibold text-primary hover:text-primary/80 transition-colors group"
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-primary/40 group-hover:border-primary transition-colors">
        <Plus className="h-3.5 w-3.5" />
      </span>
      {label}
    </button>
  );
}

// ── Progress stepper ──────────────────────────────────────────────────────────
function StepBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        const done = step.id < current;
        const active = step.id === current;
        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                  done
                    ? "border-primary bg-primary text-primary-foreground"
                    : active
                    ? "border-primary bg-primary/10 text-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.12)]"
                    : "border-border bg-background text-muted-foreground"
                }`}
              >
                {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span className={`text-[11px] font-semibold hidden sm:block ${active ? "text-primary" : done ? "text-primary/70" : "text-muted-foreground"}`}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mb-5 rounded-full transition-all duration-300 ${done ? "bg-primary" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main Form Component ───────────────────────────────────────────────────────
export function StudentForm({ onSuccess }: { onSuccess?: () => void }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState<FormState>(blank);
  const [projects, setProjects] = useState<Project[]>([{ title: "", description: "", link: "" }]);
  const [fullProjects, setFullProjects] = useState<Project[]>([]);
  const [internalCodeathonEntries, setInternalCodeathonEntries] = useState<Project[]>([]);
  const [externalCodeathonEntries, setExternalCodeathonEntries] = useState<Project[]>([]);
  const [globalCerts, setGlobalCerts] = useState<CertEntry[]>([]);
  const [otherCerts, setOtherCerts] = useState<CertEntry[]>([]);
  const [settings, setSettings] = useState<Settings>({ colleges: [] });
  const [loading, setLoading] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [done, setDone] = useState<"added" | "updated" | false>(false);
  const [error, setError] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<{ x?: string; xii?: string }>({});
  const [uploadedUrls, setUploadedUrls] = useState<{
    x?: string; xii?: string;
    certUrls?: Record<string, string>;
    ugSemUrls?: Record<number, string>;
    pgSemUrls?: Record<number, string>;
    internalCodeathonUrls?: Record<number, string>;
    externalCodeathonUrls?: Record<number, string>;
    fullProjectUrls?: Record<number, string>;
    globalCertUrls?: Record<number, string>;
    otherCertUrls?: Record<number, string>;
  }>({});
  const [certUploads, setCertUploads] = useState<Record<string, string>>({});
  const [ugSemesters, setUgSemesters] = useState<{ label: string; file?: string; percentage: string }[]>([
    { label: "Semester 1", file: undefined, percentage: "" },
  ]);
  const [pgSemesters, setPgSemesters] = useState<{ label: string; file?: string; percentage: string }[]>([]);

  // ── Shared upload helper ──────────────────────────────────────────────────
  const uploadToStorage = async (file: File, path: string): Promise<string | null> => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("path", path);
    try {
      const res = await fetch("/api/upload-file", { method: "POST", body: fd });
      if (!res.ok) { console.error("Upload failed:", await res.text()); return null; }
      const data = await res.json();
      return data.url as string;
    } catch (e) {
      console.error("Upload error:", e);
      return null;
    }
  };

  const regNo = () => form.registrationNumber.trim() || "unknown";

  // ── Get stream from selected college ──────────────────────────────────────
  const getStreamFromCollege = (): "engineering" | "arts" => {
    const selectedCollege = settings.colleges?.find(c => c.name === form.college);
    return selectedCollege?.stream || "engineering";
  };

  // ── Cert file upload handler (used by Step3 and Step4) ───────────────────
  const handleCertFileUpload = async (key: string, file: File) => {
    const ext = file.name.split(".").pop() ?? "pdf";
    const path = `${regNo()}/certs/${key}.${ext}`;
    setCertUploads(prev => ({ ...prev, [key]: file.name }));
    const url = await uploadToStorage(file, path);
    if (url) {
      setUploadedUrls(prev => ({
        ...prev,
        certUrls: { ...(prev.certUrls ?? {}), [key]: url },
      }));
    }
  };

  // ── Technical file upload handler (codeathon, projects, global certs) ────
  const handleTechFileUpload = async (
    category: "internalCodeathon" | "externalCodeathon" | "fullProject" | "globalCert" | "otherCert",
    idx: number,
    file: File
  ) => {
    const ext = file.name.split(".").pop() ?? "pdf";
    const path = `${regNo()}/docs/${category}_${idx}.${ext}`;
    const url = await uploadToStorage(file, path);
    if (!url) return;
    const keyMap: Record<string, keyof typeof uploadedUrls> = {
      internalCodeathon: "internalCodeathonUrls",
      externalCodeathon: "externalCodeathonUrls",
      fullProject: "fullProjectUrls",
      globalCert: "globalCertUrls",
      otherCert: "otherCertUrls",
    };
    const stateKey = keyMap[category];
    setUploadedUrls(prev => ({
      ...prev,
      [stateKey]: { ...((prev[stateKey] as Record<number, string>) ?? {}), [idx]: url },
    }));
  };

  useEffect(() => {
    setSettingsLoading(true);
    fetch("/api/settings")
      .then(r => r.json())
      .then(data => {
        setSettings(data);
        setSettingsLoading(false);
      })
      .catch(() => {
        setError("Failed to load settings. Please refresh the page.");
        setSettingsLoading(false);
      });
  }, []);

  const set = (k: keyof FormState, v: string | null) => setForm((p) => ({ ...p, [k]: v ?? "" }));

  const selectedCollege = settings.colleges?.find(c => c.name === form.college);
  const selectedCourse = selectedCollege?.courses?.find(c => c.name === form.course);
  const availableYears = selectedCourse?.years || [];

  const handleCollegeChange = (college: string | null) => {
    setForm(p => ({
      ...p,
      college: college || "",
      course: "",
      year: "",
      degreeType: "ug"
    }));
  };

  const handleCourseChange = (course: string | null) => {
    const col = settings.colleges?.find(c => c.name === form.college);
    const co = col?.courses?.find(c => c.name === course);
    setForm(p => ({
      ...p,
      course: course || "",
      year: "",
      degreeType: co?.degreeType || "ug"
    }));
  };

  const handleFileUpload = async (level: "x" | "xii", files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const ext = file.name.split(".").pop() ?? "pdf";
    const path = `${regNo()}/marksheets/${level}.${ext}`;
    setUploadedFiles(prev => ({ ...prev, [level]: file.name }));
    const url = await uploadToStorage(file, path);
    if (url) setUploadedUrls(prev => ({ ...prev, [level]: url }));
  };

  const handleSemFileUpload = async (level: "ug" | "pg", idx: number, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const ext = file.name.split(".").pop() ?? "pdf";
    const path = `${regNo()}/marksheets/${level}_sem_${idx}.${ext}`;
    if (level === "ug") {
      setUgSemesters(prev => { const n = [...prev]; n[idx] = { ...n[idx], file: file.name }; return n; });
    } else {
      setPgSemesters(prev => { const n = [...prev]; n[idx] = { ...n[idx], file: file.name }; return n; });
    }
    const url = await uploadToStorage(file, path);
    if (url) {
      const key = level === "ug" ? "ugSemUrls" : "pgSemUrls";
      setUploadedUrls(prev => ({ ...prev, [key]: { ...(prev[key] ?? {}), [idx]: url } }));
    }
  };

  const handleSemPctChange = (level: "ug" | "pg", idx: number, val: string) => {
    if (level === "ug") {
      setUgSemesters(prev => {
        const next = [...prev];
        next[idx] = { ...next[idx], percentage: val };
        const filled = next.filter(s => s.percentage !== "");
        const avg = filled.length
          ? (filled.reduce((sum, s) => sum + (parseFloat(s.percentage) || 0), 0) / filled.length).toFixed(2)
          : "";
        set("ugPercentage", avg);
        return next;
      });
    } else {
      setPgSemesters(prev => {
        const next = [...prev];
        next[idx] = { ...next[idx], percentage: val };
        const filled = next.filter(s => s.percentage !== "");
        const avg = filled.length
          ? (filled.reduce((sum, s) => sum + (parseFloat(s.percentage) || 0), 0) / filled.length).toFixed(2)
          : "";
        set("pgPercentage", avg);
        return next;
      });
    }
  };

  const validateStep = (step: number): boolean => {
    setError("");
    switch (step) {
      case 1:
        if (!form.name.trim() || !form.registrationNumber.trim()) {
          setError("Name and Registration Number are required.");
          return false;
        }
        if (!form.college || !form.course || !form.year) {
          setError("Please select College, Course, and Year.");
          return false;
        }
        if (!form.phone.trim() || !form.email.trim()) {
          setError("Phone and Email are required.");
          return false;
        }
        if (form.phone.replace(/\D/g, "").length !== 10) {
          setError("Phone number must be exactly 10 digits (without country code).");
          return false;
        }
        return true;
      case 2:
        if (!uploadedFiles.x || !form.xMarks) {
          setError("Please upload X (10th) marksheet AND enter percentage.");
          return false;
        }
        if (!uploadedFiles.xii || !form.xiiMarks) {
          setError("Please upload XII (12th) marksheet AND enter percentage.");
          return false;
        }
        if (!form.ugPercentage) {
          setError("Please add at least one UG semester with a percentage.");
          return false;
        }
        return true;
      case 3:
        const cefrFields: [keyof FormState, string][] = [
          ["cefrGrammar", "CEFR"],
          ["efSetListening", "EF SET Listening"],
          ["efSetSpeaking", "EF SET Speaking"],
          ["efSetReading", "EF SET Reading"],
          ["efSetWriting", "EF SET Writing"],
        ];
        for (const [key, label] of cefrFields) {
          if (!form[key] || !(form[key] as string).trim()) {
            setError(`Please select level for ${label}.`);
            return false;
          }
          if (!certUploads[key as string]) {
            setError(`Please upload certificate for ${label}.`);
            return false;
          }
        }
        return true;
      case 4:
        if (!form.leetcodeUrl.trim() || !form.githubUrl.trim()) {
          setError("LeetCode and GitHub URLs are required.");
          return false;
        }
        if (!form.internalCodeathon) {
          setError("Please select Internal Codeathon Count.");
          return false;
        }
        if (!form.externalCodeathon) {
          setError("Please select External Codeathon Count.");
          return false;
        }

        for (let i = 0; i < internalCodeathonEntries.length; i++) {
          if (!(internalCodeathonEntries[i] as Project & { file?: string }).file) {
            setError(`Please upload certificate for Internal Codeathon Event ${i + 1}.`);
            return false;
          }
        }
        for (let i = 0; i < externalCodeathonEntries.length; i++) {
          if (!(externalCodeathonEntries[i] as Project & { file?: string }).file) {
            setError(`Please upload certificate for External Codeathon Event ${i + 1}.`);
            return false;
          }
        }
        for (let i = 0; i < fullProjects.length; i++) {
          if (!(fullProjects[i] as Project & { file?: string }).file) {
            setError(`Please upload project file for Full Length Project ${i + 1}.`);
            return false;
          }
        }
        for (let i = 0; i < globalCerts.length; i++) {
          if (!(globalCerts[i] as CertEntry & { file?: string }).file) {
            setError(`Please upload certificate for Global Certification ${i + 1}.`);
            return false;
          }
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
    }
  };

  const handlePrev = () => {
    setError("");
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateStep(currentStep)) return;

    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...toStudentData(form),
          stream: getStreamFromCollege(), // Add stream based on selected college
          ugSemesterMarks: ugSemesters.filter(s => s.percentage).map((s, i) => ({
            semester: s.label,
            percentage: parseFloat(s.percentage),
            fileUrl: uploadedUrls.ugSemUrls?.[i],
          })),
          pgSemesterMarks: pgSemesters.filter(s => s.percentage).map((s, i) => ({
            semester: s.label,
            percentage: parseFloat(s.percentage),
            fileUrl: uploadedUrls.pgSemUrls?.[i],
          })),
          xMarksheetUrl: uploadedUrls.x,
          xiiMarksheetUrl: uploadedUrls.xii,
          certUrls: uploadedUrls.certUrls,
          projects: projects.filter(p => p.title.trim()),
          fullLengthProjectDetails: fullProjects.filter(p => p.title.trim()).map((p, i) => ({
            ...p,
            fileUrl: uploadedUrls.fullProjectUrls?.[i],
          })),
          internalCodeathonDetails: internalCodeathonEntries.filter(p => p.title.trim()).map((p, i) => ({
            ...p,
            fileUrl: uploadedUrls.internalCodeathonUrls?.[i],
          })),
          externalCodeathonDetails: externalCodeathonEntries.filter(p => p.title.trim()).map((p, i) => ({
            ...p,
            fileUrl: uploadedUrls.externalCodeathonUrls?.[i],
          })),
          globalCertDetails: globalCerts.filter(c => c.name.trim()).map((c, i) => ({
            ...c,
            fileUrl: uploadedUrls.globalCertUrls?.[i],
          })),
          otherCertDetails: otherCerts.filter(c => c.name.trim()).map((c, i) => ({
            ...c,
            fileUrl: uploadedUrls.otherCertUrls?.[i],
          })),
        }),
      });
      if (res.ok) {
        setDone(res.status === 200 ? "updated" : "added");
        setForm(blank);
        setUploadedFiles({});
        setCertUploads({});
        setProjects([]);
        setFullProjects([]);
        setInternalCodeathonEntries([]);
        setExternalCodeathonEntries([]);
        setGlobalCerts([]);
        setOtherCerts([]);
        setUgSemesters([{ label: "Semester 1", file: undefined, percentage: "" }]);
        setPgSemesters([]);
        setCurrentStep(1);
        setTimeout(() => {
          setDone(false);
          if (onSuccess) onSuccess();
        }, 3000);
      } else {
        const d = await res.json();
        setError(d.error ?? "Failed to save student.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm(blank);
    setError("");
    setUploadedFiles({});
    setCertUploads({});
    setProjects([]);
    setFullProjects([]);
    setInternalCodeathonEntries([]);
    setExternalCodeathonEntries([]);
    setGlobalCerts([]);
    setOtherCerts([]);
    setUgSemesters([{ label: "Semester 1", file: undefined, percentage: "" }]);
    setPgSemesters([]);
    setCurrentStep(1);
  };

  if (done) {
    const isUpdate = done === "updated";
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center px-4">
        <div className={`h-20 w-20 rounded-3xl flex items-center justify-center mb-6 shadow-lg ${
          isUpdate
            ? "bg-gradient-to-br from-blue-500 to-blue-600"
            : "bg-gradient-to-br from-emerald-500 to-emerald-600"
        }`}>
          <CheckCircle2 className="h-10 w-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold mb-2">
          {isUpdate ? "Student Updated!" : "Student Added Successfully!"}
        </h2>
        <p className="text-sm text-muted-foreground max-w-md">
          {isUpdate
            ? "The student record has been updated with the new information."
            : "All scores have been computed and the student profile is ready."}
        </p>
        <div className="mt-8 flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          Redirecting...
        </div>
      </div>
    );
  }

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading form...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight mb-2">Add New Student</h1>
        <p className="text-sm text-muted-foreground">Complete all required fields across the four sections</p>
      </div>

      <StepBar current={currentStep} total={STEPS.length} />

      {error && (
        <div className="mb-6 rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-3 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="bg-card rounded-2xl border shadow-sm p-6 md:p-8 mb-6">
          {currentStep === 1 && <Step1Identity form={form} set={set} settings={settings} selectedCollege={selectedCollege} selectedCourse={selectedCourse} availableYears={availableYears} handleCollegeChange={handleCollegeChange} handleCourseChange={handleCourseChange} />}
          {currentStep === 2 && <Step2Academics form={form} set={set} uploadedFiles={uploadedFiles} handleFileUpload={handleFileUpload} ugSemesters={ugSemesters} setUgSemesters={setUgSemesters} pgSemesters={pgSemesters} setPgSemesters={setPgSemesters} handleSemFileUpload={handleSemFileUpload} handleSemPctChange={handleSemPctChange} />}
          {currentStep === 3 && <Step3Language form={form} set={set} certUploads={certUploads} setCertUploads={setCertUploads} onCertFileUpload={handleCertFileUpload} />}
          {currentStep === 4 && <Step4Technical form={form} set={set} internalCodeathonEntries={internalCodeathonEntries} setInternalCodeathonEntries={setInternalCodeathonEntries} externalCodeathonEntries={externalCodeathonEntries} setExternalCodeathonEntries={setExternalCodeathonEntries} fullProjects={fullProjects} setFullProjects={setFullProjects} globalCerts={globalCerts} setGlobalCerts={setGlobalCerts} onTechFileUpload={handleTechFileUpload} />}
        </div>

        <div className="flex items-center justify-between gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrev}
            disabled={currentStep === 1}
            className="h-11 px-6"
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={resetForm}
            className="h-11 px-6 text-muted-foreground hover:text-foreground"
          >
            Reset Form
          </Button>

          {currentStep < STEPS.length ? (
            <Button type="button" onClick={handleNext} className="h-11 px-8">
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button type="submit" disabled={loading} className="h-11 px-8 bg-primary hover:bg-primary/90 shadow-md">
              {loading ? (
                <><div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> Saving...</>
              ) : (
                <><CheckCircle2 className="h-4 w-4 mr-2" /> Submit</>
              )}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

// ── Step 1: Identity ──────────────────────────────────────────────────────────
function Step1Identity({
  form, set, settings, selectedCollege, selectedCourse, availableYears,
  handleCollegeChange, handleCourseChange,
}: {
  form: FormState;
  set: (k: keyof FormState, v: string | null) => void;
  settings: Settings;
  selectedCollege: Settings["colleges"][0] | undefined;
  selectedCourse: Settings["colleges"][0]["courses"][0] | undefined;
  availableYears: string[];
  handleCollegeChange: (v: string | null) => void;
  handleCourseChange: (v: string | null) => void;
}) {
  return (
    <div className="space-y-8">
      <SectionHeading icon={User} label="Personal Information" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <FieldLabel required>Student Name</FieldLabel>
          <Input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Enter full name"
            className="h-10"
            required
          />
        </div>
        <div>
          <FieldLabel required>Registration Number</FieldLabel>
          <Input
            value={form.registrationNumber}
            onChange={(e) => set("registrationNumber", e.target.value)}
            placeholder="Enter registration number"
            className="h-10 font-mono"
            required
          />
        </div>
        <div>
          <FieldLabel required>Phone Number</FieldLabel>
          <Input
            value={form.phone}
            onChange={(e) => {
              let val = e.target.value.replace(/\D/g, "");
              if (val.startsWith("91") && val.length > 10) {
                val = val.slice(2);
              } else if (val.startsWith("0") && val.length > 10) {
                val = val.slice(1);
              }
              set("phone", val.slice(0, 10));
            }}
            placeholder="9876543210"
            type="tel"
            className="h-10"
            maxLength={10}
            required
          />
        </div>
        <div>
          <FieldLabel required>Email Address</FieldLabel>
          <Input
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="student@gmail.com"
            type="email"
            className="h-10"
            required
          />
        </div>
      </div>

      <Separator className="my-6" />

      <SectionHeading icon={GraduationCap} label="Academic Program" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="md:col-span-2">
          <FieldLabel required>College / Institution</FieldLabel>
          <Select value={form.college} onValueChange={handleCollegeChange}>
            <SelectTrigger className="h-10 w-full">
              <SelectValue placeholder="Select college" />
            </SelectTrigger>
            <SelectContent>
              {settings.colleges?.length > 0 ? (
                settings.colleges.map((c) => (
                  <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                ))
              ) : (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">No colleges configured</div>
              )}
            </SelectContent>
          </Select>
        </div>
        <div>
          <FieldLabel required>Course / Department</FieldLabel>
          <Select value={form.course} onValueChange={handleCourseChange} disabled={!form.college}>
            <SelectTrigger className="h-10 w-full">
              <SelectValue placeholder={form.college ? "Select course" : "Select college first"} />
            </SelectTrigger>
            <SelectContent>
              {selectedCollege?.courses && selectedCollege.courses.length > 0 ? (
                selectedCollege.courses.map((c) => (
                  <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                ))
              ) : (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">No courses available</div>
              )}
            </SelectContent>
          </Select>
        </div>
        <div>
          <FieldLabel required>Year</FieldLabel>
          <Select value={form.year} onValueChange={(v) => set("year", v)} disabled={!form.course}>
            <SelectTrigger className="h-10 w-full">
              <SelectValue placeholder={form.course ? "Select year" : "Select course first"} />
            </SelectTrigger>
            <SelectContent>
              {availableYears.length > 0 ? (
                availableYears.map((y) => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))
              ) : (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">No years available</div>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

// ── Step 2: Academics ─────────────────────────────────────────────────────────
function Step2Academics({
  form, set, uploadedFiles, handleFileUpload,
  ugSemesters, setUgSemesters, pgSemesters, setPgSemesters,
  handleSemFileUpload, handleSemPctChange,
}: {
  form: FormState;
  set: (k: keyof FormState, v: string | null) => void;
  uploadedFiles: { x?: string; xii?: string };
  handleFileUpload: (level: "x" | "xii", files: FileList | null) => void;
  ugSemesters: { label: string; file?: string; percentage: string }[];
  setUgSemesters: React.Dispatch<React.SetStateAction<{ label: string; file?: string; percentage: string }[]>>;
  pgSemesters: { label: string; file?: string; percentage: string }[];
  setPgSemesters: React.Dispatch<React.SetStateAction<{ label: string; file?: string; percentage: string }[]>>;
  handleSemFileUpload: (level: "ug" | "pg", idx: number, files: FileList | null) => void;
  handleSemPctChange: (level: "ug" | "pg", idx: number, val: string) => void;
}) {
  return (
    <div className="space-y-8">
      <SectionHeading icon={FileText} label="Education Marksheets" />

      {/* X Marks */}
      <div className="rounded-xl border bg-gradient-to-br from-blue-50/50 to-indigo-50/30 dark:from-blue-950/20 dark:to-indigo-950/10 p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold">X (10th Standard)</h3>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <UploadButton
              id="x-marks-upload"
              accept=".xlsx,.xls,.pdf"
              uploaded={uploadedFiles.x}
              label="Upload X Marksheet *"
              onChange={(files) => handleFileUpload("x", files)}
            />
          </div>
          <Input
            type="number"
            value={form.xMarks}
            onChange={(e) => set("xMarks", e.target.value)}
            min={0}
            max={100}
            step="0.01"
            placeholder="Enter % *"
            className="h-9 w-full sm:w-40"
            required
          />
        </div>
      </div>

      {/* XII Marks */}
      <div className="rounded-xl border bg-gradient-to-br from-purple-50/50 to-pink-50/30 dark:from-purple-950/20 dark:to-pink-950/10 p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold">XII (12th Standard)</h3>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <UploadButton
              id="xii-marks-upload"
              accept=".xlsx,.xls,.pdf"
              uploaded={uploadedFiles.xii}
              label="Upload XII Marksheet *"
              onChange={(files) => handleFileUpload("xii", files)}
            />
          </div>
          <Input
            type="number"
            value={form.xiiMarks}
            onChange={(e) => set("xiiMarks", e.target.value)}
            min={0}
            max={100}
            step="0.01"
            placeholder="Enter percentage *"
            className="h-9 w-full sm:w-40"
            required
          />
        </div>
      </div>

      <Separator className="my-6" />

      {/* UG Semesters */}
      <div className="rounded-xl border bg-gradient-to-br from-emerald-50/50 to-teal-50/30 dark:from-emerald-950/20 dark:to-teal-950/10 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold">UG Semester Marks *</h3>
          </div>
          {form.ugPercentage && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
              <span className="text-xs font-medium text-muted-foreground">Overall:</span>
              <span className="text-sm font-bold text-primary">{form.ugPercentage}%</span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {ugSemesters.map((sem, idx) => (
            <div key={idx} className="flex items-center gap-2 p-3 rounded-lg bg-white dark:bg-background border">
              <Input
                value={sem.label}
                onChange={(e) => setUgSemesters(prev => prev.map((s, i) => i === idx ? { ...s, label: e.target.value } : s))}
                placeholder="Sem 1"
                className="h-9 w-28 text-xs shrink-0"
              />
              <div className="flex-1 min-w-0">
                <input
                  type="file"
                  accept=".xlsx,.xls,.pdf"
                  onChange={(e) => handleSemFileUpload("ug", idx, e.target.files)}
                  className="hidden"
                  id={`ug-sem-${idx}`}
                />
                <label
                  htmlFor={`ug-sem-${idx}`}
                  className={`flex items-center gap-2 h-9 px-3 text-xs rounded-lg border-2 border-dashed cursor-pointer transition-all truncate ${
                    sem.file
                      ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                      : "border-border hover:border-primary/60 hover:bg-primary/5 text-muted-foreground"
                  }`}
                >
                  {sem.file ? (
                    <><CheckCircle2 className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{sem.file}</span></>
                  ) : (
                    <><Upload className="h-3.5 w-3.5 shrink-0" /><span>Upload marksheet</span></>
                  )}
                </label>
              </div>
              <Input
                type="number"
                value={sem.percentage}
                onChange={(e) => handleSemPctChange("ug", idx, e.target.value)}
                min={0}
                max={100}
                step="0.01"
                placeholder="%"
                className="h-9 w-24 text-xs shrink-0"
              />
              {ugSemesters.length > 1 && (
                <button
                  type="button"
                  onClick={() => setUgSemesters(prev => {
                    const next = prev.filter((_, i) => i !== idx);
                    const filled = next.filter(s => s.percentage !== "");
                    const avg = filled.length
                      ? (filled.reduce((sum, s) => sum + parseFloat(s.percentage), 0) / filled.length).toFixed(2)
                      : "";
                    set("ugPercentage", avg);
                    return next;
                  })}
                  className="h-8 w-8 shrink-0 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4">
          <AddButton
            onClick={() => setUgSemesters(prev => [...prev, { label: `Semester ${prev.length + 1}`, file: undefined, percentage: "" }])}
            label="Add Semester"
          />
        </div>
      </div>

      {/* PG Semesters (Optional) */}
      <div className="rounded-xl border bg-gradient-to-br from-amber-50/50 to-orange-50/30 dark:from-amber-950/20 dark:to-orange-950/10 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold">PG Semester Marks <span className="text-xs font-normal text-muted-foreground">(Optional)</span></h3>
          </div>
          {form.pgPercentage && form.pgPercentage !== "NA" && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
              <span className="text-xs font-medium text-muted-foreground">Overall:</span>
              <span className="text-sm font-bold text-primary">{form.pgPercentage}%</span>
            </div>
          )}
        </div>

        {pgSemesters.length > 0 && (
          <div className="space-y-3 mb-4">
            {pgSemesters.map((sem, idx) => (
              <div key={idx} className="flex items-center gap-2 p-3 rounded-lg bg-white dark:bg-background border">
                <Input
                  value={sem.label}
                  onChange={(e) => setPgSemesters(prev => prev.map((s, i) => i === idx ? { ...s, label: e.target.value } : s))}
                  placeholder="Sem 1"
                  className="h-9 w-28 text-xs shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <input
                    type="file"
                    accept=".xlsx,.xls,.pdf"
                    onChange={(e) => handleSemFileUpload("pg", idx, e.target.files)}
                    className="hidden"
                    id={`pg-sem-${idx}`}
                  />
                  <label
                    htmlFor={`pg-sem-${idx}`}
                    className={`flex items-center gap-2 h-9 px-3 text-xs rounded-lg border-2 border-dashed cursor-pointer transition-all truncate ${
                      sem.file
                        ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                        : "border-border hover:border-primary/60 hover:bg-primary/5 text-muted-foreground"
                    }`}
                  >
                    {sem.file ? (
                      <><CheckCircle2 className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{sem.file}</span></>
                    ) : (
                      <><Upload className="h-3.5 w-3.5 shrink-0" /><span>Upload marksheet</span></>
                    )}
                  </label>
                </div>
                <Input
                  type="number"
                  value={sem.percentage}
                  onChange={(e) => handleSemPctChange("pg", idx, e.target.value)}
                  min={0}
                  max={100}
                  step="0.01"
                  placeholder="%"
                  className="h-9 w-24 text-xs shrink-0"
                />
                <button
                  type="button"
                  onClick={() => setPgSemesters(prev => {
                    const next = prev.filter((_, i) => i !== idx);
                    const filled = next.filter(s => s.percentage !== "");
                    const avg = filled.length
                      ? (filled.reduce((sum, s) => sum + parseFloat(s.percentage), 0) / filled.length).toFixed(2)
                      : "";
                    set("pgPercentage", avg);
                    return next;
                  })}
                  className="h-8 w-8 shrink-0 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <AddButton
          onClick={() => setPgSemesters(prev => [...prev, { label: `Semester ${prev.length + 1}`, file: undefined, percentage: "" }])}
          label="Add PG Semester"
        />
      </div>

      <Separator className="my-6" />

      <SectionHeading icon={AlertCircle} label="Arrears Information" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <FieldLabel tooltip="Number of current standing arrears">Current Arrears</FieldLabel>
          <Input
            type="number"
            value={form.noOfArrears}
            onChange={(e) => set("noOfArrears", e.target.value)}
            min={0}
            placeholder="0"
            className="h-10"
          />
        </div>
        <div>
          <FieldLabel tooltip="Total number of arrears in academic history">History of Arrears</FieldLabel>
          <Input
            type="number"
            value={form.historyOfArrears}
            onChange={(e) => set("historyOfArrears", e.target.value)}
            min={0}
            placeholder="0"
            className="h-10"
          />
        </div>
      </div>
    </div>
  );
}

// ── Step 3: Language ──────────────────────────────────────────────────────────
function Step3Language({
  form, set, certUploads, setCertUploads, onCertFileUpload,
}: {
  form: FormState;
  set: (k: keyof FormState, v: string | null) => void;
  certUploads: Record<string, string>;
  setCertUploads: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onCertFileUpload: (key: string, file: File) => Promise<void>;
}) {
  const cefrFields: [keyof FormState, string][] = [
    ["cefrGrammar", "CEFR"],
  ];

  const efSetFields: [keyof FormState, string][] = [
    ["efSetListening", "Listening"],
    ["efSetSpeaking", "Speaking"],
    ["efSetReading", "Reading"],
    ["efSetWriting", "Writing"],
  ];

  return (
    <div className="space-y-8">
      <SectionHeading icon={Globe} label="CEFR Levels" />
      <p className="text-xs text-muted-foreground -mt-4 mb-4">
        Select the CEFR level achieved and upload the certificate for each test
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {cefrFields.map(([key, label]) => (
          <div key={key} className="rounded-xl border bg-gradient-to-br from-blue-50/50 to-cyan-50/30 dark:from-blue-950/20 dark:to-cyan-950/10 p-4">
            <FieldLabel required>{label}</FieldLabel>
            <Select value={form[key] as string} onValueChange={(v) => set(key, v)}>
              <SelectTrigger className="h-10 w-full mt-2">
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                {CEFR.map((lv) => (
                  <SelectItem key={lv} value={lv}>{lv}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="mt-3">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                id={`cert-${key}`}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onCertFileUpload(String(key), file);
                }}
              />
              <label
                htmlFor={`cert-${key}`}
                className={`flex items-center gap-2 h-10 w-full px-3 text-xs rounded-lg border-2 border-dashed cursor-pointer transition-all ${
                  certUploads[key]
                    ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                    : "border-border hover:border-primary/60 hover:bg-primary/5 text-muted-foreground"
                }`}
              >
                {certUploads[key] ? (
                  <><CheckCircle2 className="h-4 w-4 shrink-0" /><span className="truncate">{certUploads[key]}</span></>
                ) : (
                  <><Upload className="h-4 w-4 shrink-0" /><span>Upload certificate *</span></>
                )}
              </label>
            </div>
          </div>
        ))}
      </div>

      <Separator className="my-6" />

      <SectionHeading icon={Languages} label="EF SET Scores" />
      <p className="text-xs text-muted-foreground -mt-4 mb-4">
        Select the EF SET level for each skill and upload the certificate
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {efSetFields.map(([key, label]) => (
          <div key={key} className="rounded-xl border bg-gradient-to-br from-purple-50/50 to-pink-50/30 dark:from-purple-950/20 dark:to-pink-950/10 p-4">
            <FieldLabel required>{label}</FieldLabel>
            <Select value={form[key] as string} onValueChange={(v) => set(key, v)}>
              <SelectTrigger className="h-10 w-full mt-2">
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                {CEFR.map((lv) => (
                  <SelectItem key={lv} value={lv}>{lv}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="mt-3">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                id={`cert-${key}`}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onCertFileUpload(String(key), file);
                }}
              />
              <label
                htmlFor={`cert-${key}`}
                className={`flex items-center gap-2 h-10 w-full px-3 text-xs rounded-lg border-2 border-dashed cursor-pointer transition-all ${
                  certUploads[key]
                    ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                    : "border-border hover:border-primary/60 hover:bg-primary/5 text-muted-foreground"
                }`}
              >
                {certUploads[key] ? (
                  <><CheckCircle2 className="h-4 w-4 shrink-0" /><span className="truncate">{certUploads[key]}</span></>
                ) : (
                  <><Upload className="h-4 w-4 shrink-0" /><span>Upload certificate *</span></>
                )}
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Step 4: Technical ─────────────────────────────────────────────────────────
function Step4Technical({
  form, set,
  internalCodeathonEntries, setInternalCodeathonEntries,
  externalCodeathonEntries, setExternalCodeathonEntries,
  fullProjects, setFullProjects,
  globalCerts, setGlobalCerts,
  onTechFileUpload,
}: {
  form: FormState;
  set: (k: keyof FormState, v: string | null) => void;
  internalCodeathonEntries: Project[];
  setInternalCodeathonEntries: React.Dispatch<React.SetStateAction<Project[]>>;
  externalCodeathonEntries: Project[];
  setExternalCodeathonEntries: React.Dispatch<React.SetStateAction<Project[]>>;
  fullProjects: Project[];
  setFullProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  globalCerts: CertEntry[];
  setGlobalCerts: React.Dispatch<React.SetStateAction<CertEntry[]>>;
  onTechFileUpload: (category: "internalCodeathon" | "externalCodeathon" | "fullProject" | "globalCert" | "otherCert", idx: number, file: File) => Promise<void>;
}) {
  const [loadingRank, setLoadingRank] = useState(false);
  const [rankError, setRankError] = useState("");

  const extractLeetCodeUsername = (val: string): string => {
    let clean = val.trim();
    if (!clean.includes("/") && !clean.includes("leetcode.com")) {
      return clean;
    }
    clean = clean.replace(/^(https?:\/\/)?(www\.)?leetcode\.com\/(u\/)?/i, "");
    clean = clean.split(/[?#]/)[0];
    clean = clean.replace(/\/+$/, "");
    
    const parts = clean.split("/").filter(Boolean);
    const firstPart = parts[0] || "";

    const invalidUsernames = new Set([
      "problems", "contest", "explore", "discuss", "tag", "api",
      "support", "articles", "list", "u", "playground", "desktop"
    ]);

    if (invalidUsernames.has(firstPart.toLowerCase())) {
      return "";
    }
    return firstPart;
  };

  const triggerFetchRank = async (urlOrUsername: string) => {
    const username = extractLeetCodeUsername(urlOrUsername);
    if (!username) {
      setRankError("Could not extract username from LeetCode URL");
      return;
    }
    
    setLoadingRank(true);
    setRankError("");
    try {
      const res = await fetch("/api/leetcode-rank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to fetch rank");
      }
      const data = await res.json();
      if (data.ranking !== undefined) {
        set("leetcodeRank", String(data.ranking));
      } else {
        throw new Error("Rank not found in response");
      }
    } catch (err: any) {
      console.error(err);
      setRankError(err.message || "Error fetching rank");
    } finally {
      setLoadingRank(false);
    }
  };

  return (
    <div className="space-y-8">
      <SectionHeading icon={Link} label="Profile Links" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <FieldLabel required>LeetCode Profile URL</FieldLabel>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={form.leetcodeUrl}
              onChange={(e) => set("leetcodeUrl", e.target.value)}
              onBlur={(e) => {
                if (e.target.value.trim()) {
                  triggerFetchRank(e.target.value);
                }
              }}
              onPaste={(e) => {
                const pastedText = e.clipboardData.getData("text");
                if (pastedText.trim()) {
                  triggerFetchRank(pastedText);
                }
              }}
              placeholder="https://leetcode.com/u/username"
              className="h-10 pl-10 pr-24 font-mono text-xs"
              required
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {loadingRank ? (
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin text-primary" />
                  Fetching
                </span>
              ) : form.leetcodeUrl ? (
                <button
                  type="button"
                  onClick={() => triggerFetchRank(form.leetcodeUrl)}
                  className="text-[10px] font-bold text-primary hover:text-primary/80 bg-primary/5 hover:bg-primary/10 px-2 py-1 rounded-md transition-all cursor-pointer"
                >
                  Fetch
                </button>
              ) : null}
            </div>
          </div>
          {rankError && (
            <p className="text-[11px] text-destructive mt-1 flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" />
              {rankError}
            </p>
          )}
        </div>
        <div>
          <FieldLabel required>GitHub Profile URL</FieldLabel>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={form.githubUrl}
              onChange={(e) => set("githubUrl", e.target.value)}
              placeholder="https://github.com/username"
              className="h-10 pl-10 font-mono text-xs"
              required
            />
          </div>
        </div>
      </div>

      <Separator className="my-6" />

      <SectionHeading icon={Zap} label="Coding Practice" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <FieldLabel tooltip="Your current LeetCode rank (fetched automatically)">LeetCode Rank</FieldLabel>
          <Input
            type="text"
            value={form.leetcodeRank}
            readOnly
            placeholder="Fetched automatically"
            className="h-10 font-mono bg-muted/50 cursor-not-allowed text-muted-foreground select-none"
          />
        </div>
        <div>
          <FieldLabel tooltip="Number of GitHub repositories (max 15)">GitHub Projects Count</FieldLabel>
          <Input
            type="number"
            value={form.githubProjects}
            onChange={(e) => set("githubProjects", e.target.value)}
            min={0}
            placeholder="e.g. 8"
            className="h-10"
          />
        </div>
      </div>

      <Separator className="my-6" />

      <SectionHeading icon={Award} label="Competitions & Events" />

      {/* Internal Codeathon */}
      <div className="rounded-xl border bg-gradient-to-br from-blue-50/50 to-indigo-50/30 dark:from-blue-950/20 dark:to-indigo-950/10 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold">Internal Codeathon Events</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Count:</span>
            <Input
              type="number"
              value={form.internalCodeathon}
              onChange={(e) => {
                const val = e.target.value;
                set("internalCodeathon", val);
                const count = parseInt(val) || 0;
                setInternalCodeathonEntries(prev => {
                  if (prev.length < count) {
                    const next = [...prev];
                    while (next.length < count) {
                      next.push({ title: "", description: "", link: "" });
                    }
                    return next;
                  } else {
                    return prev.slice(0, count);
                  }
                });
              }}
              min={0}
              placeholder="0"
              className="h-8 w-20 text-center"
            />
          </div>
        </div>

        {internalCodeathonEntries.length > 0 && (
          <div className="space-y-3 mb-4">
            {internalCodeathonEntries.map((entry, i) => (
              <CardEntry
                key={i}
                index={i}
                label="Event"
                onRemove={() => {
                  const next = internalCodeathonEntries.filter((_, idx) => idx !== i);
                  setInternalCodeathonEntries(next);
                  set("internalCodeathon", String(next.length));
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg"
                    id={`int-code-file-${i}`}
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setInternalCodeathonEntries(p => p.map((x, idx) => idx === i ? { ...x, file: f.name } : x as Project & { file?: string }));
                        onTechFileUpload("internalCodeathon", i, f);
                      }
                    }}
                  />
                  <label
                    htmlFor={`int-code-file-${i}`}
                    className={`flex-1 flex items-center gap-2 h-9 px-3 text-xs rounded-lg border-2 border-dashed cursor-pointer transition-all truncate ${
                      (entry as Project & { file?: string }).file
                        ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                        : "border-border hover:border-primary/60 hover:bg-primary/5 text-muted-foreground"
                    }`}
                  >
                    {(entry as Project & { file?: string }).file ? (
                      <><CheckCircle2 className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{(entry as Project & { file?: string }).file}</span></>
                    ) : (
                      <><Upload className="h-3.5 w-3.5 shrink-0" /><span>Upload certificate *</span></>
                    )}
                  </label>
                </div>
                <Input
                  value={entry.title}
                  onChange={(e) => setInternalCodeathonEntries(p => p.map((x, idx) => idx === i ? { ...x, title: e.target.value } : x))}
                  placeholder="Event name"
                  className="h-9 text-sm mb-2"
                />
                <Textarea
                  value={entry.description}
                  onChange={(e) => setInternalCodeathonEntries(p => p.map((x, idx) => idx === i ? { ...x, description: e.target.value } : x))}
                  placeholder="Brief description"
                  className="text-xs min-h-[60px] resize-none mb-2"
                  rows={2}
                />
                <div className="relative">
                  <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={entry.link}
                    onChange={(e) => setInternalCodeathonEntries(p => p.map((x, idx) => idx === i ? { ...x, link: e.target.value } : x))}
                    placeholder="Event link (optional)"
                    className="h-9 text-xs pl-9 font-mono"
                  />
                </div>
              </CardEntry>
            ))}
          </div>
        )}

        <AddButton
          onClick={() => {
            const next = [...internalCodeathonEntries, { title: "", description: "", link: "" }];
            setInternalCodeathonEntries(next);
            set("internalCodeathon", String(next.length));
          }}
          label="Add Internal Event"
        />
      </div>

      {/* External Codeathon */}
      <div className="rounded-xl border bg-gradient-to-br from-purple-50/50 to-pink-50/30 dark:from-purple-950/20 dark:to-pink-950/10 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold">External Codeathon Events</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Count:</span>
            <Input
              type="number"
              value={form.externalCodeathon}
              onChange={(e) => {
                const val = e.target.value;
                set("externalCodeathon", val);
                const count = parseInt(val) || 0;
                setExternalCodeathonEntries(prev => {
                  if (prev.length < count) {
                    const next = [...prev];
                    while (next.length < count) {
                      next.push({ title: "", description: "", link: "" });
                    }
                    return next;
                  } else {
                    return prev.slice(0, count);
                  }
                });
              }}
              min={0}
              placeholder="0"
              className="h-8 w-20 text-center"
            />
          </div>
        </div>

        {externalCodeathonEntries.length > 0 && (
          <div className="space-y-3 mb-4">
            {externalCodeathonEntries.map((entry, i) => (
              <CardEntry
                key={i}
                index={i}
                label="Event"
                onRemove={() => {
                  const next = externalCodeathonEntries.filter((_, idx) => idx !== i);
                  setExternalCodeathonEntries(next);
                  set("externalCodeathon", String(next.length));
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg"
                    id={`ext-code-file-${i}`}
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setExternalCodeathonEntries(p => p.map((x, idx) => idx === i ? { ...x, file: f.name } : x as Project & { file?: string }));
                        onTechFileUpload("externalCodeathon", i, f);
                      }
                    }}
                  />
                  <label
                    htmlFor={`ext-code-file-${i}`}
                    className={`flex-1 flex items-center gap-2 h-9 px-3 text-xs rounded-lg border-2 border-dashed cursor-pointer transition-all truncate ${
                      (entry as Project & { file?: string }).file
                        ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                        : "border-border hover:border-primary/60 hover:bg-primary/5 text-muted-foreground"
                    }`}
                  >
                    {(entry as Project & { file?: string }).file ? (
                      <><CheckCircle2 className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{(entry as Project & { file?: string }).file}</span></>
                    ) : (
                      <><Upload className="h-3.5 w-3.5 shrink-0" /><span>Upload certificate *</span></>
                    )}
                  </label>
                </div>
                <Input
                  value={entry.title}
                  onChange={(e) => setExternalCodeathonEntries(p => p.map((x, idx) => idx === i ? { ...x, title: e.target.value } : x))}
                  placeholder="Event name"
                  className="h-9 text-sm mb-2"
                />
                <Textarea
                  value={entry.description}
                  onChange={(e) => setExternalCodeathonEntries(p => p.map((x, idx) => idx === i ? { ...x, description: e.target.value } : x))}
                  placeholder="Brief description"
                  className="text-xs min-h-[60px] resize-none mb-2"
                  rows={2}
                />
                <div className="relative">
                  <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={entry.link}
                    onChange={(e) => setExternalCodeathonEntries(p => p.map((x, idx) => idx === i ? { ...x, link: e.target.value } : x))}
                    placeholder="Event link (optional)"
                    className="h-9 text-xs pl-9 font-mono"
                  />
                </div>
              </CardEntry>
            ))}
          </div>
        )}

        <AddButton
          onClick={() => {
            const next = [...externalCodeathonEntries, { title: "", description: "", link: "" }];
            setExternalCodeathonEntries(next);
            set("externalCodeathon", String(next.length));
          }}
          label="Add External Event"
        />
      </div>

      <Separator className="my-6" />

      <SectionHeading icon={Code2} label="Projects & Certifications" />

      {/* Full Length Projects */}
      <div className="rounded-xl border bg-gradient-to-br from-emerald-50/50 to-teal-50/30 dark:from-emerald-950/20 dark:to-teal-950/10 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold">Full Length Projects</h3>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
            <span className="text-xs font-medium text-muted-foreground">Count:</span>
            <span className="text-sm font-bold text-primary">{fullProjects.length}</span>
          </div>
        </div>

        {fullProjects.length > 0 && (
          <div className="space-y-3 mb-4">
            {fullProjects.map((proj, i) => (
              <CardEntry
                key={i}
                index={i}
                label="Project"
                onRemove={() => {
                  const next = fullProjects.filter((_, idx) => idx !== i);
                  setFullProjects(next);
                  set("fullLengthProjects", String(next.length));
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="file"
                    accept=".pdf,.zip,.png,.jpg"
                    id={`full-proj-file-${i}`}
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setFullProjects(p => p.map((x, idx) => idx === i ? { ...x, file: f.name } : x as Project & { file?: string }));
                        onTechFileUpload("fullProject", i, f);
                      }
                    }}
                  />
                  <label
                    htmlFor={`full-proj-file-${i}`}
                    className={`flex-1 flex items-center gap-2 h-9 px-3 text-xs rounded-lg border-2 border-dashed cursor-pointer transition-all truncate ${
                      (proj as Project & { file?: string }).file
                        ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                        : "border-border hover:border-primary/60 hover:bg-primary/5 text-muted-foreground"
                    }`}
                  >
                    {(proj as Project & { file?: string }).file ? (
                      <><CheckCircle2 className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{(proj as Project & { file?: string }).file}</span></>
                    ) : (
                      <><Upload className="h-3.5 w-3.5 shrink-0" /><span>Upload project file *</span></>
                    )}
                  </label>
                </div>
                <Input
                  value={proj.title}
                  onChange={(e) => setFullProjects(p => p.map((x, idx) => idx === i ? { ...x, title: e.target.value } : x))}
                  placeholder="Project title"
                  className="h-9 text-sm mb-2"
                />
                <Textarea
                  value={proj.description}
                  onChange={(e) => setFullProjects(p => p.map((x, idx) => idx === i ? { ...x, description: e.target.value } : x))}
                  placeholder="Brief description"
                  className="text-xs min-h-[60px] resize-none mb-2"
                  rows={2}
                />
                <div className="relative">
                  <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={proj.link}
                    onChange={(e) => setFullProjects(p => p.map((x, idx) => idx === i ? { ...x, link: e.target.value } : x))}
                    placeholder="https://github.com/username/repo"
                    className="h-9 text-xs pl-9 font-mono"
                  />
                </div>
              </CardEntry>
            ))}
          </div>
        )}

        {fullProjects.length < 2 && (
          <AddButton
            onClick={() => {
              const next = [...fullProjects, { title: "", description: "", link: "" }];
              setFullProjects(next);
              set("fullLengthProjects", String(next.length));
            }}
            label="Add Project"
          />
        )}
      </div>

      {/* Global Certifications */}
      <div className="rounded-xl border bg-gradient-to-br from-amber-50/50 to-orange-50/30 dark:from-amber-950/20 dark:to-orange-950/10 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold">Global Certifications</h3>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
            <span className="text-xs font-medium text-muted-foreground">Count:</span>
            <span className="text-sm font-bold text-primary">{globalCerts.length}</span>
          </div>
        </div>

        {globalCerts.length > 0 && (
          <div className="space-y-3 mb-4">
            {globalCerts.map((cert, i) => (
              <CardEntry
                key={i}
                index={i}
                label="Certification"
                onRemove={() => {
                  const next = globalCerts.filter((_, idx) => idx !== i);
                  setGlobalCerts(next);
                  set("globalCertification", String(next.length));
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg"
                    id={`gcert-file-${i}`}
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setGlobalCerts(p => p.map((x, idx) => idx === i ? { ...x, file: f.name } : x as CertEntry & { file?: string }));
                        onTechFileUpload("globalCert", i, f);
                      }
                    }}
                  />
                  <label
                    htmlFor={`gcert-file-${i}`}
                    className={`flex-1 flex items-center gap-2 h-9 px-3 text-xs rounded-lg border-2 border-dashed cursor-pointer transition-all truncate ${
                      (cert as CertEntry & { file?: string }).file
                        ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                        : "border-border hover:border-primary/60 hover:bg-primary/5 text-muted-foreground"
                    }`}
                  >
                    {(cert as CertEntry & { file?: string }).file ? (
                      <><CheckCircle2 className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{(cert as CertEntry & { file?: string }).file}</span></>
                    ) : (
                      <><Upload className="h-3.5 w-3.5 shrink-0" /><span>Upload certificate *</span></>
                    )}
                  </label>
                </div>
                <Input
                  value={cert.name}
                  onChange={(e) => setGlobalCerts(p => p.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x))}
                  placeholder="Certification name (e.g. AWS Solutions Architect)"
                  className="h-9 text-sm mb-2"
                />
                <Input
                  value={cert.issuer}
                  onChange={(e) => setGlobalCerts(p => p.map((x, idx) => idx === i ? { ...x, issuer: e.target.value } : x))}
                  placeholder="Issuing body (e.g. Amazon Web Services)"
                  className="h-9 text-sm mb-2"
                />
                <div className="relative">
                  <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={cert.link}
                    onChange={(e) => setGlobalCerts(p => p.map((x, idx) => idx === i ? { ...x, link: e.target.value } : x))}
                    placeholder="Certificate URL or credential ID"
                    className="h-9 text-xs pl-9 font-mono"
                  />
                </div>
              </CardEntry>
            ))}
          </div>
        )}

        {globalCerts.length < 2 && (
          <AddButton
            onClick={() => {
              const next = [...globalCerts, { name: "", issuer: "", link: "" }];
              setGlobalCerts(next);
              set("globalCertification", String(next.length));
            }}
            label="Add Certification"
          />
        )}
      </div>

      {/* Other Certifications Count */}
      <div className="rounded-xl border bg-muted/30 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Other Certifications</h3>
          </div>
          <Input
            type="number"
            value={form.otherCertifications}
            onChange={(e) => set("otherCertifications", e.target.value)}
            min={0}
            placeholder="0"
            className="h-10 w-32 text-center"
          />
        </div>
      </div>
    </div>
  );
}

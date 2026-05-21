"use client";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell,
} from "recharts";
import { StoredStudent } from "@/lib/db";
import { Trophy, GraduationCap, Brain, Languages, Code2, Award } from "lucide-react";

const BRAND = "#f05136";

// ── Score bar ─────────────────────────────────────────────────────────────────
function ScoreBar({ label, value, max, color = BRAND }: { label: string; value: number; max: number; color?: string }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">{value}<span className="text-muted-foreground font-normal">/{max}</span></span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

// ── Tier card ─────────────────────────────────────────────────────────────────
function TierCard({ icon: Icon, label, score, max, color, children }: {
  icon: React.ElementType; label: string; score: number; max: number; color: string; children: React.ReactNode;
}) {
  const pct = Math.round((score / max) * 100);
  return (
    <div className="rounded-xl border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}18` }}>
            <Icon className="h-3.5 w-3.5" style={{ color }} />
          </div>
          <span className="text-sm font-semibold">{label}</span>
        </div>
        <div className="text-right">
          <span className="text-lg font-bold tabular-nums" style={{ color }}>{score}</span>
          <span className="text-xs text-muted-foreground">/{max}</span>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

// ── Custom tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="font-medium">{label}</p>
      <p className="text-primary font-bold">{payload[0].value}</p>
    </div>
  );
}

// ── Main dialog ───────────────────────────────────────────────────────────────
export function StudentAnalytics({ student, open, onClose }: {
  student: StoredStudent | null; open: boolean; onClose: () => void;
}) {
  if (!student) return null;

  const s = student;

  function getYearDenom(year: string, stream?: string) {
    const y = year.toLowerCase().trim();
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

  const denom = getYearDenom(s.year, s.stream);
  const hireMax = denom.max;
  const hirePct = Math.round((s.hireScore / hireMax) * 100);

  // Radar data — tier scores as % of year-adjusted max
  const radarData = [
    { subject: "Academic", score: denom.academic > 0 ? Math.round((s.academicRegulatory / denom.academic) * 100) : 0, fullMark: 100 },
    { subject: "Cognitive", score: denom.cognitive > 0 ? Math.round((s.cognitiveLinguistic / denom.cognitive) * 100) : 0, fullMark: 100 },
    { subject: "Technical", score: denom.technical > 0 ? Math.round((s.technicalProficiency / denom.technical) * 100) : 0, fullMark: 100 },
    { subject: "Industry", score: denom.industry > 0 ? Math.round((s.industryValidation / denom.industry) * 100) : 0, fullMark: 100 },
  ];

  // Bar chart — sub-scores
  const barData = [
    { name: "Acad Agg", value: s.academicAggregate, max: 100 },
    { name: "Arrears", value: s.standingArrears, max: 50 },
    { name: "Aptitude", value: s.aptitudeTotal, max: 150 },
    { name: "Comm.", value: s.communicationTotal, max: 150 },
    { name: "Coding Prac", value: s.codingPractice, max: 125 },
    { name: "Coding Asmt", value: s.codingAssessment, max: 175 },
    { name: "Codeathon", value: s.codeathonHackathon, max: 50 },
    { name: "Projects", value: s.miniProjects + s.fullLengthProjectScore, max: 50 },
    { name: "Certs", value: s.globalCertScore + s.otherCertScore, max: 150 },
  ];

  const cefrLevel = (v: string) => {
    const map: Record<string, number> = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };
    return map[v] ?? 0;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-6 py-4">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="text-lg font-bold">{s.name}</DialogTitle>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="font-mono text-xs text-muted-foreground">{s.registrationNumber}</span>
                  <Badge variant="outline" className="text-[10px] border-primary/30 text-primary bg-primary/5">{s.department}</Badge>
                  <Badge variant="secondary" className="text-[10px]">{s.year}</Badge>
                </div>
              </div>
              {/* HIRE Score ring */}
              <div className="flex flex-col items-center shrink-0">
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-4 border-primary/20">
                  <svg className="absolute inset-0 -rotate-90" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="28" fill="none" stroke={BRAND} strokeWidth="4"
                      strokeDasharray={`${hirePct * 1.759} 175.9`} strokeLinecap="round" />
                  </svg>
                  <div className="text-center">
                    <p className="text-base font-bold leading-none" style={{ color: BRAND }}>{s.hireScore}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">HIRE</p>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{hirePct}% of {hireMax}</p>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-6">
          {/* Charts row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Radar */}
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Tier Performance (%)</p>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                  <Radar name="Score" dataKey="score" stroke={BRAND} fill={BRAND} fillOpacity={0.2} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Bar */}
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Sub-Score Breakdown</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                    {barData.map((_, i) => (
                      <Cell key={i} fill={BRAND} fillOpacity={0.7 + (i % 3) * 0.1} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tier breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TierCard icon={GraduationCap} label="Academic & Regulatory" score={Math.round(s.academicRegulatory)} max={denom.academic || 150} color="#f05136">
              <ScoreBar label="Academic Aggregate" value={s.academicAggregate} max={100} />
              <ScoreBar label="Standing Arrears" value={s.standingArrears} max={50} />
            </TierCard>

            <TierCard icon={Brain} label="Cognitive & Linguistic" score={Math.round(s.cognitiveLinguistic)} max={denom.cognitive || 300} color="#8b5cf6">
              <ScoreBar label="Aptitude (150)" value={s.aptitudeTotal} max={150} color="#8b5cf6" />
              <ScoreBar label="Communication (150)" value={s.communicationTotal} max={150} color="#8b5cf6" />
            </TierCard>

            <TierCard icon={Code2} label="Technical Proficiency" score={Math.round(s.technicalProficiency)} max={denom.technical || 400} color="#0ea5e9">
              <ScoreBar label="Coding Practice (125)" value={s.codingPractice} max={125} color="#0ea5e9" />
              <ScoreBar label="Coding Assessment (175)" value={s.codingAssessment} max={175} color="#0ea5e9" />
              <ScoreBar label="Codeathon (50)" value={s.codeathonHackathon} max={50} color="#0ea5e9" />
              <ScoreBar label="Projects (50)" value={s.miniProjects + s.fullLengthProjectScore} max={50} color="#0ea5e9" />
            </TierCard>

            <TierCard icon={Award} label="Industry Validation" score={Math.round(s.industryValidation)} max={denom.industry || 150} color="#10b981">
              <ScoreBar label="Global Cert (100)" value={s.globalCertScore} max={100} color="#10b981" />
              <ScoreBar label="Other Cert (50)" value={s.otherCertScore} max={50} color="#10b981" />
            </TierCard>
          </div>

          <Separator />

          {/* Raw data grid */}
          <div className="space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Raw Input Data</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {[
                { l: "X Marks", v: `${s.xMarks}%` },
                { l: "XII Marks", v: `${s.xiiMarks}%` },
                { l: "UG %", v: `${s.ugPercentage}%` },
                { l: "PG %", v: s.pgPercentage ? `${s.pgPercentage}%` : "N/A" },
                { l: "Arrears", v: String(s.noOfArrears) },
                { l: "Hist. Arrears", v: String(s.historyOfArrears) },
                { l: "Quants", v: `${s.quants}/50` },
                { l: "Logical", v: `${s.logical}/50` },
                { l: "Verbal", v: `${s.verbal}/50` },
                { l: "CEFR Grammar", v: s.cefrGrammar || "—" },
                { l: "EF Listening", v: s.efSetListening || "—" },
                { l: "EF Speaking", v: s.efSetSpeaking || "—" },
                { l: "EF Reading", v: s.efSetReading || "—" },
                { l: "EF Writing", v: s.efSetWriting || "—" },
                { l: "Leetcode", v: s.leetcodeRank || "—" },
                { l: "FOP", v: `${s.fopAssessment}/75` },
                { l: "DSA", v: `${s.dsaAssessment}/100` },
                { l: "Int. Codeathon", v: `${s.internalCodeathon}/20` },
                { l: "Ext. Codeathon", v: `${s.externalCodeathon}/30` },
                { l: "GitHub Proj", v: String(s.githubProjects) },
                { l: "Full Proj", v: String(s.fullLengthProjects) },
                { l: "Global Cert", v: String(s.globalCertification) },
                { l: "Other Cert", v: String(s.otherCertifications) },
              ].map(({ l, v }) => (
                <div key={l} className="rounded-lg bg-muted/40 px-3 py-2">
                  <p className="text-[10px] text-muted-foreground">{l}</p>
                  <p className="text-sm font-semibold mt-0.5">{v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

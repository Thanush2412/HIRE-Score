"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { StoredStudent } from "@/lib/db";
import { Download, Loader2, TrendingUp, X, Activity, Calendar } from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────
const TOTAL_MAX = 1000;
const RED = "#F05136";
const DARK_STATS_BG = "linear-gradient(90deg, #2B2B2B 0%, #484848 100%)";

// ── Tier definitions (order matches image: 1 Academic, 2 Technical, 3 Cognitive, 4 Industry) ──
const TIER_META = [
  {
    key: "academicRegulatory" as const,
    tierLabel: "Tier 1",
    label: "Academic & Regulatory",
    max: 150,
    rows: [
      { label: "X Marks", raw: "xMarks" as const, score: "xScore" as const },
      { label: "Xii Marks", raw: "xiiMarks" as const, score: "xiiScore" as const },
      { label: "UG Percentage", raw: "ugPercentage" as const, score: "ugScore" as const },
      { label: "No. of Arrears", raw: "noOfArrears" as const, score: "noOfArrearsScore" as const },
      { label: "History of Arrears", raw: "historyOfArrears" as const, score: "historyArrearsScore" as const },
    ],
  },
  {
    key: "technicalProficiency" as const,
    tierLabel: "Tier 2",
    label: "Technical Proficiency",
    max: 400,
    rows: [
      { label: "Leetcode Rank", raw: "leetcodeRank" as const, score: "codingPractice" as const },
      { label: "FOP Assessment", raw: "fopAssessment" as const, score: "fopAssessment" as const },
      { label: "Internal Codeathon", raw: "internalCodeathon" as const, score: "internalCodeathon" as const },
      { label: "GitHub Projects", raw: "githubProjects" as const, score: "miniProjects" as const },
      { label: "Full Length Projects", raw: "fullLengthProjects" as const, score: "fullLengthProjectScore" as const },
      { label: "DSA", raw: "dsaAssessment" as const, score: "dsaAssessment" as const },
    ],
  },
  {
    key: "cognitiveLinguistic" as const,
    tierLabel: "Tier 3",
    label: "Cognitive & Linguistic",
    max: 300,
    rows: [
      { label: "Quants", raw: "quants" as const, score: "quantsScore" as const },
      { label: "Logical", raw: "logical" as const, score: "logicalScore" as const },
      { label: "Verbal", raw: "verbal" as const, score: "verbalScore" as const },
      { label: "CEFR", raw: "cefrGrammar" as const, score: "cefrGrammarScore" as const },
      { label: "EF SET Listening", raw: "efSetListening" as const, score: "efListeningScore" as const },
      { label: "EF SET Speaking", raw: "efSetSpeaking" as const, score: "efSpeakingScore" as const },
      { label: "EF SET Reading", raw: "efSetReading" as const, score: "efReadingScore" as const },
      { label: "EF SET Writing", raw: "efSetWriting" as const, score: "efWritingScore" as const },
    ],
  },
  {
    key: "industryValidation" as const,
    tierLabel: "Tier 4",
    label: "Industry Validation",
    max: 150,
    rows: [
      { label: "Global Certification", raw: "globalCertification" as const, score: "globalCertScore" as const },
      { label: "Other Certifications", raw: "otherCertifications" as const, score: "otherCertScore" as const },
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function readiness(pct: number) {
  if (pct >= 0.70) return { label: "Hire Ready", color: RED };
  if (pct >= 0.50) return { label: "Moderate", color: RED };
  return { label: "Not Ready", color: RED };
}

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

// ── Donut ring — same structure as V2 ScoreRing, V1 red colour + gradient ─────
function DonutRing({ score, max, pct }: { score: number; max: number; pct: number }) {
  const r = 45;
  const circumference = 2 * Math.PI * r;
  const dash = pct * circumference;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
      <div style={{ position: "relative", width: 120, height: 120, flexShrink: 0 }}>
        <svg width="120" height="120" viewBox="0 0 100 100"
          style={{ transform: "rotate(-90deg)" }}>
          {/* Track */}
          <circle cx="50" cy="50" r={r} fill="none" stroke="transparent" strokeWidth="9" />
          {/* Arc — solid red */}
          <circle cx="50" cy="50" r={r} fill="none"
            stroke={RED} strokeWidth="9"
            strokeDasharray={`${dash} ${circumference}`}
            strokeLinecap="round" />
        </svg>
        {/* Score + "of max" pill inside ring */}
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          gap: 4,
        }}>
          <span style={{ fontSize: 24, fontWeight: 900, color: RED, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
            {score}
          </span>
          {/* "of X" — SVG: stroked rect, red border, transparent fill, red text */}
          <span style={{
            fontSize: 9, color: RED, fontWeight: 500,
            border: `1px solid ${RED}`,
            borderRadius: "4px 0 0 4px",
            padding: "1px 6px",
            background: "transparent",
            lineHeight: 1.4,
          }}>
            of {max}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Tier card — SVG: rx=45 → scaled 15px ─────────────────────────────────────
function TierCard({ tier, s }: { tier: typeof TIER_META[0]; s: StoredStudent }) {
  const tierScore = Math.round(s[tier.key] as number);

  return (
    <div style={{ background: "#fff", borderRadius: 15, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
      <div style={{ display: "flex", alignItems: "stretch" }}>

        {/* LEFT — SVG: divider at x=826, card left x=99 → 727/2282*800=255px wide */}
        <div style={{
          display: "flex", flexDirection: "column", justifyContent: "center",
          padding: "20px 16px 20px 20px",
          width: 200, flexShrink: 0,
        }}>
          {/* SVG: font-size=43.4 weight=500 #2D2D2D → 14px */}
          <p style={{ fontSize: 14, fontWeight: 500, color: "#2D2D2D", margin: 0, lineHeight: 1 }}>
            {tier.tierLabel} —
          </p>
          {/* SVG: font-size=51.4 weight=bold #2D2D2D → 17px */}
          <p style={{ fontSize: 17, fontWeight: 700, color: "#2D2D2D", margin: "4px 0 0", lineHeight: 1.2 }}>
            {tier.label}
          </p>
        </div>

        {/* Vertical red divider — SVG: stroke-width=9 → scaled 3px */}
        <div style={{ width: 3, background: RED, margin: "16px 0", flexShrink: 0, borderRadius: 2 }} />

        {/* CENTER: donut ring */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "16px 20px", flexShrink: 0, marginLeft: "2%" }}>
          <DonutRing score={tierScore} max={tier.max} pct={tier.max > 0 ? Math.min(tierScore / tier.max, 1) : 0} />
        </div>

        {/* RIGHT: parameter / score table */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", padding: "16px 20px 16px 16px", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", paddingBottom: 8, paddingRight: 16, width: "70%" }}>
                  <span style={{
                    display: "block", width: "80%",
                    fontSize: 10, fontWeight: 800, color: RED,
                    border: `2px solid ${RED}`,
                    borderRadius: 4,
                    padding: "2px 0 2px 4px",
                    textAlign: "left",
                  }}>
                    Parameter
                  </span>
                </th>
                <th style={{ textAlign: "left", paddingBottom: 8, width: "30%" }}>
                  <span style={{
                    display: "block", width: "80%",
                    fontSize: 10, fontWeight: 800, color: RED,
                    border: `2px solid ${RED}`,
                    borderRadius: 4,
                    padding: "2px 0 2px 4px",
                    textAlign: "left",
                  }}>
                    Score
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {tier.rows.map((row, i) => {
                const raw = s[row.raw];
                const scored = s[row.score] as number;
                
                let displayVal = "";
                if (row.raw === "leetcodeRank") {
                  const rankVal = Number(raw);
                  displayVal = (!raw || isNaN(rankVal) || rankVal <= 0 || rankVal >= 5000000)
                    ? "Unranked"
                    : rankVal.toLocaleString();
                } else {
                  displayVal = typeof raw === "string" && raw !== ""
                    ? raw
                    : scored === 0 ? "00" : String(scored);
                }
                return (
                  <tr key={i}>
                    <td style={{ fontSize: 12, fontWeight: 600, color: RED, padding: "3.5px 16px 3.5px 0", whiteSpace: "nowrap" }}>
                      {row.label}
                    </td>
                    <td style={{ fontSize: 12, fontWeight: 600, color: RED, padding: "3.5px 0", whiteSpace: "nowrap" }}>
                      {displayVal}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [student, setStudent] = useState<StoredStudent | null>(null);
  const [allStudents, setAllStudents] = useState<StoredStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingPage, setExportingPage] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [expandedLogIndex, setExpandedLogIndex] = useState<number | null>(null);

  useEffect(() => {
    setIsAdmin(sessionStorage.getItem("hire_auth") === "1");
  }, []);

  useEffect(() => {
    fetch("/api/students")
      .then(r => r.json())
      .then((data: StoredStudent[]) => {
        setAllStudents(data);
        setStudent(data.find(s => s.registrationNumber === params.regno) || null);
      })
      .finally(() => setLoading(false));
  }, [params.regno]);

  const fetchHistory = async () => {
    if (history.length > 0) {
      setShowHistoryModal(true);
      return;
    }
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/students/history?regNo=${encodeURIComponent(String(params.regno))}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
        setShowHistoryModal(true);
      }
    } catch (e) {
      console.error("Failed to load history:", e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleExportPage = async () => {
    if (!student) return;
    setExportingPage(true);
    try {
      const res = await fetch(`/api/export-pdf/${student.id}`);
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `HIRE_Score_${student.registrationNumber}_${student.name.replace(/\s+/g, "_")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportingPage(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="h-8 w-8 rounded-full border-2 border-muted border-t-primary animate-spin" />
        <p className="text-sm">Loading profile…</p>
      </div>
    </div>
  );
  if (!student) return (
    <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
      Candidate not found
    </div>
  );

  const s = student;
  const status = readiness(s.hireScore / TOTAL_MAX);

  // Peer stats
  const allSorted = [...allStudents].sort((a, b) => b.hireScore - a.hireScore);
  const rank = allSorted.findIndex(p => p.id === s.id) + 1;
  const percentile = allStudents.length > 1
    ? Math.round(((allStudents.length - rank) / (allStudents.length - 1)) * 100) : 100;
  const deptPeers = allStudents.filter(p => p.department === s.department && p.id !== s.id);
  const deptRank = [...deptPeers, s].sort((a, b) => b.hireScore - a.hireScore).findIndex(p => p.id === s.id) + 1;
  const deptAvg = deptPeers.length > 0
    ? Math.round([...deptPeers, s].reduce((a, p) => a + p.hireScore, 0) / (deptPeers.length + 1))
    : s.hireScore;
  const collegePeers = s.college ? allStudents.filter(p => p.college === s.college) : allStudents;
  const collegeAvg = collegePeers.length > 0
    ? Math.round(collegePeers.reduce((a, p) => a + p.hireScore, 0) / collegePeers.length)
    : s.hireScore;

  return (
    <div className="min-h-screen" style={{ background: "#f2f2f2" }}>

      {/* ── Top toolbar ── */}
      <div className="bg-white border-b px-4 py-2.5 flex items-center justify-between print:hidden">
        <div className="cursor-pointer" onClick={() => router.push("/")}>
          <img src="/logo.png" alt="HIRE Logo" className="h-8 w-auto dark:bg-white dark:rounded dark:p-0.5" />
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button onClick={fetchHistory} disabled={loadingHistory}
              className="flex items-center gap-2 text-xs border rounded-lg px-3 py-1.5 transition-colors disabled:opacity-60 font-medium"
              style={{ color: "#3b82f6", borderColor: `#3b82f655`, background: `#3b82f60d` }}>
              {loadingHistory ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <TrendingUp className="h-3.5 w-3.5" />}
              See Progress
            </button>
          )}
          <button onClick={handleExportPage} disabled={exportingPage}
            className="flex items-center gap-2 text-xs border rounded-lg px-3 py-1.5 transition-colors disabled:opacity-60"
            style={{ color: RED, borderColor: `${RED}55`, background: `${RED}0d` }}>
            {exportingPage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            {exportingPage ? "Generating…" : "Export PDF"}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-5 space-y-3">

        {/* ══════════════════════════════════════════════════════
              CONTAINER 1 — Red card  SVG: rx=36
              CONTAINER 2 — Stats bar SVG: rx=46
              Stats bar: 43% hidden behind red card, 57% visible below
          ══════════════════════════════════════════════════════ */}
        <div style={{ position: "relative", paddingBottom: 52 }}>

          {/* ── STATS BAR — z=0, absolute at bottom ── */}
          <div style={{
            background: DARK_STATS_BG,
            borderRadius: 16,
            display: "flex", alignItems: "center",
            padding: "24px 24px 10px 24px",
            position: "absolute",
            bottom: 0, left: 24, right: 24,
            zIndex: 0,
            boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
            height: 72,
          }}>
            {([
              { val: `#${rank}`, lbl: "Overall Rank", sub: `of ${allStudents.length}` },
              { val: `${percentile}th`, lbl: "Percentile", sub: "" },
              ...(deptPeers.length > 0 ? [
                { val: `#${deptRank}`, lbl: `Dept Rank of ${deptPeers.length + 1}`, sub: "" },
                { val: String(deptAvg), lbl: "Dept Avg", sub: "" },
                { val: String(collegeAvg), lbl: "College Avg", sub: "" },
              ] : []),
            ] as { val: string; lbl: string; sub: string }[]).map((stat, i, arr) => (
              <div key={i} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <p style={{ fontSize: 18, fontWeight: 800, color: "#fff", lineHeight: 1, margin: 0, fontVariantNumeric: "tabular-nums" }}>
                    {stat.val}
                  </p>
                  <p style={{ fontSize: 8, fontWeight: 600, color: "rgba(255,255,255,0.75)", margin: "2px 0 0", lineHeight: 1.3 }}>
                    {stat.lbl}
                  </p>
                  {stat.sub && (
                    <p style={{ fontSize: 8, fontWeight: 600, color: "rgba(255,255,255,0.55)", margin: 0 }}>
                      {stat.sub}
                    </p>
                  )}
                </div>
                {i < arr.length - 1 && (
                  <div style={{ width: 1.5, height: 36, background: "rgba(255,255,255,0.3)", flexShrink: 0 }} />
                )}
              </div>
            ))}
          </div>

          {/* ── RED CARD — z=1, covers top 43% of stats bar ── */}
          <div style={{
            background: RED,
            borderRadius: 13,
            boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
            position: "relative",
            zIndex: 1,
            display: "flex",
            alignItems: "stretch",
          }}>
            {/* Left: avatar + name + stats */}
            <div style={{ display: "flex", alignItems: "center", padding: "16px 14px 16px 18px", flex: 1, minWidth: 0 }}>

              {/* Avatar */}
              <div style={{
                width: 68, height: 68, borderRadius: "9999px",
                background: "#fff", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20, fontWeight: 900, color: "#000",
                marginRight: 14,
              }}>
                {getInitials(s.name)}
              </div>

              {/* Name + stats */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: "0 0 6px 0", lineHeight: 1.1 }}>
                  {s.name}
                </h1>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "4px 16px", flexWrap: "wrap" }}>
                  {([
                    ["Department", s.department],
                    ["Year", s.year],
                    ["UG %", `${s.ugPercentage}%`],
                    ...(s.pgPercentage != null ? [["PG %", `${s.pgPercentage}%`]] : []),
                    ["Arrears", s.noOfArrears === 0 ? "None" : String(s.noOfArrears)],
                  ] as [string, string][]).map(([lbl, val]) => (
                    <div key={lbl} style={{ display: "flex", flexDirection: "column", lineHeight: 1, ...(lbl === "Department" ? { minWidth: 0, maxWidth: 160 } : {}) }}>
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.75)", fontWeight: 500 }}>{lbl}</span>
                      <span style={{
                        fontSize: 16, color: "#fff", fontWeight: 600, marginTop: 1,
                        ...(lbl === "Department" ? { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" } : {}),
                      }}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* White panel — SVG: floats inside red (gap on top/right/bottom), left flush, right corners large */}
            <div style={{
              flexShrink: 0,
              background: "#fff",
              borderRadius: "0 22px 22px 0",
              margin: "8px 8px 8px 0",
              display: "flex",
              alignItems: "stretch",
              minWidth: 210,
            }}>
              {/* LEFT: PLACEMENT STATUS + status value */}
              <div style={{
                display: "flex", flexDirection: "column", justifyContent: "space-between",
                padding: "14px 10px 14px 16px", flex: "0 0 95px",
              }}>
                {/* Top: PLACEMENT STATUS */}
                <span style={{
                  fontSize: 10, fontWeight: 800, color: RED,
                  textTransform: "uppercase", letterSpacing: "0.05em", lineHeight: 1.3,
                  display: "block",
                }}>
                  PLACEMENT<br />STATUS
                </span>
                {/* Bottom: status value large */}
                <span style={{
                  fontSize: 22, fontWeight: 800, color: status.color,
                  lineHeight: 1.1, display: "block",
                }}>
                  {status.label.includes(" ") ? (
                    <>{status.label.split(" ")[0]}<br />{status.label.split(" ").slice(1).join(" ")}</>
                  ) : status.label}
                </span>
              </div>

              {/* RIGHT: Hire Score label + big number + pill */}
              <div style={{
                display: "flex", flexDirection: "column", justifyContent: "space-between",
                padding: "14px 16px 14px 8px", flex: 1,
              }}>
                {/* Top: Hire Score label */}
                <span style={{ fontSize: 18, fontWeight: 700, color: RED, lineHeight: 1 }}>
                  Hire Score
                </span>
                {/* Bottom: number + pill */}
                <div>
                  <span style={{
                    display: "block",
                    fontSize: String(s.hireScore).length > 4 ? 38 : 48, fontWeight: 900, color: RED,
                    lineHeight: 1, letterSpacing: "-1.5px", fontVariantNumeric: "tabular-nums",
                  }}>
                    {s.hireScore}
                  </span>
                  <span style={{
                    display: "inline-block", marginTop: 5,
                    fontSize: 10, color: "#fff", background: RED,
                    borderRadius: 5, padding: "3px 8px",
                    fontWeight: 600, letterSpacing: "0.02em",
                  }}>
                    of {TOTAL_MAX}
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* ══════════════════════════════════════════════════════
              TIER CARDS
          ══════════════════════════════════════════════════════ */}
        {TIER_META.map(tier => (
          <TierCard key={tier.key} tier={tier} s={s} />
        ))}

        {/* ══════════════════════════════════════════════════════
              BOTTOM ROW — Improvement Roadmap + Overall Score
          ══════════════════════════════════════════════════════ */}
        <div style={{ display: "flex", gap: 10, alignItems: "stretch" }}>

          {/* Improvement Roadmap */}
          <div style={{
            flex: 1, background: "#fff", borderRadius: 22,
            boxShadow: "0 2px 10px rgba(0,0,0,0.07)",
            padding: "16px 14px",
          }}>
            {/* Title — centered, black bold */}
            <p style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a", margin: "0 0 12px 0", textAlign: "center" }}>
              Improvement Roadmap
            </p>

            {/* 3 dark cards */}
            <div style={{ display: "flex", gap: 8 }}>
              {[
                {
                  area: "Aptitude",
                  tip: s.aptitudeTotal < 120 ? "Target 120+ Across Quants, Logical & Verbal" : "Strong aptitude performance",
                  action: s.aptitudeTotal < 120 ? "Practice Daily Aptitude Tests For 30–45 Min" : null,
                },
                {
                  area: "Communication",
                  tip: s.communicationTotal < 120 ? "Improve CEFR & EF SET Scores To B2+" : "Strong communication performance",
                  action: s.communicationTotal < 120 ? "Practice English Communication Daily" : null,
                },
                {
                  area: "Coding Practice",
                  tip: s.codingPractice < 100 ? "Improve Leetcode Rank Below 150k" : "Strong coding practice",
                  action: s.codingPractice < 100 ? "Solve 2–3 Problems Daily On Leetcode" : null,
                },
              ].map((item, i) => (
                <div key={i} style={{
                  flex: 1,
                  background: "linear-gradient(135deg, #2B2B2B 0%, #474747 100%)",
                  borderRadius: 14,
                  padding: "12px 10px",
                  display: "flex", flexDirection: "column", gap: 8,
                }}>
                  {/* Circle icon + area label — centered, same row */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: "9999px",
                      background: "rgba(255,255,255,0.15)", flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <div style={{
                        width: 13, height: 13, borderRadius: "9999px",
                        border: "1px solid rgba(255,255,255,0.7)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <div style={{ width: 7, height: 7, borderRadius: "9999px", background: "#fff" }} />
                      </div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 800, color: "#fff", lineHeight: 1 }}>
                      {item.area}
                    </span>
                  </div>

                  {/* Tip text — centered */}
                  <p style={{ fontSize: 9, fontWeight: 600, color: "#fff", margin: 0, lineHeight: 1.5, textAlign: "center" }}>
                    {item.tip}
                  </p>

                  {/* Action pill — full width, all corners rounded, centered text */}
                  {item.action && (
                    <div style={{
                      border: "1.5px solid rgba(255,255,255,0.35)",
                      borderRadius: 8,
                      padding: "5px 6px",
                      marginTop: "auto",
                      textAlign: "center",
                      width: "100%",
                      boxSizing: "border-box",
                      background: "rgba(255,255,255,0.08)",
                    }}>
                      <p style={{ fontSize: 11, fontWeight: 800, color: "#fff", margin: 0, lineHeight: 1.4 }}>
                        {item.action}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Overall Score */}
          <div style={{
            width: 175, background: "#fff", borderRadius: 22,
            boxShadow: "0 2px 10px rgba(0,0,0,0.07)",
            padding: "20px 16px",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: 8,
          }}>
            {/* Title */}
            <p style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a", margin: 0, textAlign: "center" }}>
              Overall Score
            </p>
            {/* Score number */}
            <p style={{
              fontSize: String(s.hireScore).length > 4 ? 44 : 68, fontWeight: 900, color: RED,
              margin: 0, lineHeight: 1,
              fontVariantNumeric: "tabular-nums", textAlign: "center",
            }}>
              {s.hireScore}
            </p>
            {/* "of 1000" — red fill, ALL corners rounded */}
            <div style={{
              background: RED, borderRadius: 7,
              padding: "4px 14px",
            }}>
              <span style={{ fontSize: 12, color: "#fff", fontWeight: 700 }}>of {TOTAL_MAX}</span>
            </div>
            {/* Status */}
            <p style={{ fontSize: 16, fontWeight: 800, color: RED, margin: 0, textAlign: "center" }}>
              {readiness(s.hireScore / TOTAL_MAX).label}
            </p>
          </div>

        </div>

      </div>

      {showHistoryModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(4px)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}>
          <div style={{
            backgroundColor: "#fff",
            borderRadius: 20,
            width: "100%",
            maxWidth: 700,
            maxHeight: "85vh",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
            overflow: "hidden",
          }}>
            {/* Header */}
            <div style={{
              padding: "20px 24px",
              borderBottom: "1px solid #e5e7eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "#111827", margin: 0 }}>
                  Candidate Progress & Score History
                </h3>
                <p style={{ fontSize: 12, color: "#6b7280", margin: "2px 0 0 0" }}>
                  Tracking updates and performance changes over time for {s.name} ({s.registrationNumber})
                </p>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                style={{
                  padding: 6,
                  borderRadius: "50%",
                  border: "none",
                  background: "#f3f4f6",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#374151",
                }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div style={{
              padding: 24,
              overflowY: "auto",
              flex: 1,
            }}>
              {history.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "#6b7280" }}>
                  <Activity style={{ height: 40, width: 40, margin: "0 auto 12px auto", opacity: 0.5 }} />
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>No history logs found</p>
                  <p style={{ margin: "4px 0 0 0", fontSize: 12 }}>Updates will appear here as they are imported or edited.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                  {/* Score Chart Representation */}
                  <div style={{
                    background: "linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)",
                    borderRadius: 16,
                    padding: 18,
                    border: "1px solid #e5e7eb",
                  }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#374151", margin: "0 0 16px 0" }}>
                      HIRE Score Progression Timeline
                    </p>
                    <div style={{
                      display: "flex",
                      alignItems: "flex-end",
                      justifyContent: "space-between",
                      height: 120,
                      padding: "0 10px 10px 10px",
                      borderBottom: "2px solid #d1d5db",
                      position: "relative",
                      gap: 12,
                    }}>
                      {history.map((h, i) => {
                        const scoreHeight = (h.hireScore / TOTAL_MAX) * 100;
                        return (
                          <div key={i} style={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            position: "relative",
                          }}>
                            {/* Score Tooltip/Label */}
                            <span style={{
                              fontSize: 10,
                              fontWeight: 800,
                              color: RED,
                              marginBottom: 4,
                              lineHeight: 1,
                            }}>
                              {h.hireScore}
                            </span>
                            {/* Bar */}
                            <div style={{
                              width: 24,
                              height: `${Math.max(scoreHeight, 8)}%`,
                              background: i === history.length - 1 ? RED : "linear-gradient(180deg, #9ca3af 0%, #4b5563 100%)",
                              borderRadius: "6px 6px 0 0",
                              transition: "height 0.3s ease",
                              cursor: "pointer",
                            }} title={`Score: ${h.hireScore}`} />
                            {/* Index Indicator */}
                            <span style={{
                              position: "absolute",
                              bottom: -22,
                              fontSize: 9,
                              fontWeight: 700,
                              color: "#6b7280",
                            }}>
                              #{i + 1}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ marginTop: 28, display: "flex", justifyContent: "space-between", fontSize: 10, color: "#6b7280" }}>
                      <span>First Log</span>
                      <span>Latest Active State</span>
                    </div>
                  </div>

                  {/* Log Timeline List */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#374151", margin: "0 0 4px 0" }}>
                      Detailed Event Logs (Click cards to expand details)
                    </p>
                    {history.map((h, i) => {
                      const dateStr = new Date(h.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                      const isLatest = i === history.length - 1;
                      const isExpanded = expandedLogIndex === i;
                      return (
                        <div key={i} 
                          onClick={() => setExpandedLogIndex(isExpanded ? null : i)}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            padding: 14,
                            border: "1px solid #e5e7eb",
                            borderRadius: 12,
                            background: isLatest ? "#fef2f2" : "#fff",
                            borderColor: isLatest ? "#fecaca" : "#e5e7eb",
                            cursor: "pointer",
                            boxShadow: isExpanded ? "0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)" : "none",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <div style={{ display: "flex", gap: 16 }}>
                            {/* Left: Score Badge */}
                            <div style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              minWidth: 60,
                              height: 52,
                              background: isLatest ? RED : "#f3f4f6",
                              color: isLatest ? "#fff" : "#1f2937",
                              borderRadius: 10,
                              padding: "4px 8px",
                              flexShrink: 0,
                            }}>
                              <span style={{ fontSize: 16, fontWeight: 900 }}>{h.hireScore}</span>
                              <span style={{ fontSize: 8, opacity: 0.8, textTransform: "uppercase", fontWeight: 700 }}>Score</span>
                            </div>

                            {/* Right: Info */}
                            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                              <div style={{ display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "space-between" }}>
                                <span style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: isLatest ? RED : "#374151",
                                  background: isLatest ? "#ffe4e6" : "#e5e7eb",
                                  padding: "2px 8px",
                                  borderRadius: 4,
                                }}>
                                  {h.actionType}
                                </span>
                                <span style={{ fontSize: 10, color: "#6b7280", display: "flex", alignItems: "center", gap: 4 }}>
                                  <Calendar className="h-3 w-3" />
                                  {dateStr}
                                </span>
                              </div>
                              {/* Sub scores details */}
                              <div style={{
                                display: "flex",
                                gap: 12,
                                marginTop: 8,
                                fontSize: 10,
                                color: "#4b5563",
                                borderTop: "1px dashed #e5e7eb",
                                paddingTop: 6,
                              }}>
                                <span>Acad: <b>{h.academicRegulatory}</b></span>
                                <span>Apt: <b>{h.computed.aptitudeTotal}</b></span>
                                <span>Comm: <b>{h.computed.communicationTotal}</b></span>
                                <span>Tech: <b>{h.technicalProficiency}</b></span>
                                <span>Ind: <b>{h.industryValidation}</b></span>
                              </div>
                            </div>
                          </div>

                          {/* Expanded Details */}
                          {isExpanded && (
                            <div style={{
                              marginTop: 12,
                              paddingTop: 12,
                              borderTop: "1px solid #e5e7eb",
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                              gap: 12,
                            }} onClick={(e) => e.stopPropagation()}>
                              {/* Tier 1 */}
                              <div style={{ background: "#f9fafb", padding: 8, borderRadius: 8, border: "1px solid #f3f4f6" }}>
                                <p style={{ fontSize: 9, fontWeight: 800, color: "#4b5563", textTransform: "uppercase", marginBottom: 6 }}>Acad & Reg ({h.academicRegulatory})</p>
                                <div style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 10, color: "#1f2937" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>X Marks:</span><b>{h.raw.xMarks}%</b></div>
                                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>XII Marks:</span><b>{h.raw.xiiMarks}%</b></div>
                                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>UG %:</span><b>{h.raw.ugPercentage}%</b></div>
                                  {h.raw.pgPercentage !== null && (
                                    <div style={{ display: "flex", justifyContent: "space-between" }}><span>PG %:</span><b>{h.raw.pgPercentage}%</b></div>
                                  )}
                                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>Arrears:</span><b>{h.raw.noOfArrears}</b></div>
                                </div>
                              </div>

                              {/* Tier 2 Aptitude */}
                              <div style={{ background: "#f9fafb", padding: 8, borderRadius: 8, border: "1px solid #f3f4f6" }}>
                                <p style={{ fontSize: 9, fontWeight: 800, color: "#4b5563", textTransform: "uppercase", marginBottom: 6 }}>Aptitude ({h.computed.aptitudeTotal})</p>
                                <div style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 10, color: "#1f2937" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>Quants:</span><b>{h.raw.quants}</b></div>
                                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>Logical:</span><b>{h.raw.logical}</b></div>
                                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>Verbal:</span><b>{h.raw.verbal}</b></div>
                                </div>
                              </div>

                              {/* Tier 2 Communication */}
                              <div style={{ background: "#f9fafb", padding: 8, borderRadius: 8, border: "1px solid #f3f4f6" }}>
                                <p style={{ fontSize: 9, fontWeight: 800, color: "#4b5563", textTransform: "uppercase", marginBottom: 6 }}>Communication ({h.computed.communicationTotal})</p>
                                <div style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 10, color: "#1f2937" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>CEFR:</span><b>{h.raw.cefrGrammar || "N/A"}</b></div>
                                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>Listening:</span><b>{h.raw.efSetListening || "N/A"}</b></div>
                                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>Speaking:</span><b>{h.raw.efSetSpeaking || "N/A"}</b></div>
                                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>Reading:</span><b>{h.raw.efSetReading || "N/A"}</b></div>
                                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>Writing:</span><b>{h.raw.efSetWriting || "N/A"}</b></div>
                                </div>
                              </div>

                              {/* Tier 3 Technical */}
                              <div style={{ background: "#f9fafb", padding: 8, borderRadius: 8, border: "1px solid #f3f4f6" }}>
                                <p style={{ fontSize: 9, fontWeight: 800, color: "#4b5563", textTransform: "uppercase", marginBottom: 6 }}>Technical ({h.technicalProficiency})</p>
                                <div style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 10, color: "#1f2937" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>LeetCode:</span><b>{h.raw.leetcodeRank || "N/A"}</b></div>
                                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>FOP Score:</span><b>{h.raw.fopAssessment}</b></div>
                                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>DSA Score:</span><b>{h.raw.dsaAssessment}</b></div>
                                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>Codeathons:</span><b>{h.raw.internalCodeathon + h.raw.externalCodeathon}</b></div>
                                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>Proj (GH/FL):</span><b>{h.raw.githubProjects}/{h.raw.fullLengthProjects}</b></div>
                                </div>
                              </div>

                              {/* Tier 4 Industry */}
                              <div style={{ background: "#f9fafb", padding: 8, borderRadius: 8, border: "1px solid #f3f4f6" }}>
                                <p style={{ fontSize: 9, fontWeight: 800, color: "#4b5563", textTransform: "uppercase", marginBottom: 6 }}>Industry ({h.industryValidation})</p>
                                <div style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 10, color: "#1f2937" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>Global Certs:</span><b>{h.raw.globalCertification}</b></div>
                                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>Other Certs:</span><b>{h.raw.otherCertifications}</b></div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: "16px 24px",
              borderTop: "1px solid #e5e7eb",
              backgroundColor: "#f9fafb",
              display: "flex",
              justifyContent: "flex-end",
            }}>
              <button
                onClick={() => setShowHistoryModal(false)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  backgroundColor: "#fff",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#374151",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Pure TypeScript HTML string builder for V1 layout â€” matches the red-themed V1 UI.
// No React, no react-dom/server. Safe to import in Next.js API route handlers.
import { StoredStudent } from "./db";

const RED = "#F05136";
const DARK_STATS_BG = "linear-gradient(90deg, #2B2B2B 0%, #484848 100%)";

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

function esc(v: unknown): string {
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function readiness(score: number) {
  if (score >= 700) return "Hire Ready";
  if (score >= 500) return "Moderate";
  return "Not Ready";
}

function getInitials(name: string): string {
  return name.split(" ").filter(Boolean).map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function donutRing(score: number, max: number): string {
  const r = 45;
  const circumference = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(score / max, 1) : 0;
  const dash = pct * circumference;

  return `
  <div style="position:relative;width:120px;height:120px;flex-shrink:0">
    <svg width="120" height="120" viewBox="0 0 100 100" style="transform:rotate(-90deg)">
      <circle cx="50" cy="50" r="${r}" fill="none" stroke="transparent" stroke-width="9"/>
      <circle cx="50" cy="50" r="${r}" fill="none" stroke="${RED}" stroke-width="9"
        stroke-dasharray="${dash.toFixed(2)} ${circumference.toFixed(2)}" stroke-linecap="round"/>
    </svg>
    <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px">
      <span style="font-size:24px;font-weight:900;color:${RED};line-height:1;font-variant-numeric:tabular-nums">${score}</span>
      <span style="font-size:9px;color:${RED};font-weight:500;border:1px solid ${RED};border-radius:4px 0 0 4px;padding:1px 6px;background:transparent;line-height:1.4">of ${max}</span>
    </div>
  </div>`;
}

function tierCard(tier: typeof TIER_META[0], s: StoredStudent): string {
  const tierScore = Math.round(s[tier.key] as number);

  const rowsHtml = tier.rows.map((row) => {
    const raw = s[row.raw];
    const scored = s[row.score] as number;
    const displayVal = row.raw === "leetcodeRank"
      ? (raw && raw !== 0 ? raw : "—")
      : typeof raw === "string" && raw !== ""
      ? raw
      : scored === 0 ? "00" : scored;
    return `
    <tr>
      <td style="font-size:12px;font-weight:600;color:${RED};padding:3.5px 16px 3.5px 0;white-space:nowrap">${esc(row.label)}</td>
      <td style="font-size:12px;font-weight:600;color:${RED};padding:3.5px 0;white-space:nowrap">${esc(displayVal)}</td>
    </tr>`;
  }).join("");

  return `
  <div style="background:#fff;border-radius:15px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);margin-bottom:10px">
    <div style="display:flex;align-items:stretch">

      <!-- Left: tier label -->
      <div style="display:flex;flex-direction:column;justify-content:center;padding:20px 16px 20px 20px;width:200px;flex-shrink:0">
        <p style="font-size:14px;font-weight:500;color:#2D2D2D;margin:0;line-height:1">${esc(tier.tierLabel)} &mdash;</p>
        <p style="font-size:17px;font-weight:700;color:#2D2D2D;margin:4px 0 0;line-height:1.2">${esc(tier.label)}</p>
      </div>

      <!-- Red vertical divider -->
      <div style="width:3px;background:${RED};margin:16px 0;flex-shrink:0;border-radius:2px"></div>

      <!-- Center: donut ring -->
      <div style="display:flex;align-items:center;justify-content:center;padding:16px 20px;flex-shrink:0;margin-left:2%">
        ${donutRing(tierScore, tier.max)}
      </div>

      <!-- Right: parameter table -->
      <div style="flex:1;display:flex;align-items:center;padding:16px 20px 16px 16px;overflow-x:auto">
        <table style="width:100%;border-collapse:separate;border-spacing:0">
          <thead>
            <tr>
              <th style="text-align:left;padding-bottom:8px;padding-right:16px;width:70%">
                <span style="display:block;width:80%;font-size:10px;font-weight:800;color:${RED};border:2px solid ${RED};border-radius:4px;padding:2px 0 2px 4px;text-align:left">Parameter</span>
              </th>
              <th style="text-align:left;padding-bottom:8px;width:30%">
                <span style="display:block;width:80%;font-size:10px;font-weight:800;color:${RED};border:2px solid ${RED};border-radius:4px;padding:2px 0 2px 4px;text-align:left">Score</span>
              </th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>

    </div>
  </div>`;
}

export function buildPdfHtmlV1(s: StoredStudent, allStudents: StoredStudent[]): string {
  const TOTAL_MAX = 1000;
  const statusLabel = readiness(s.hireScore);

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

  // Stats bar items
  const statsItems: { val: string; lbl: string; sub: string }[] = [
    { val: `#${rank}`, lbl: "Overall Rank", sub: `of ${allStudents.length}` },
    { val: `${percentile}th`, lbl: "Percentile", sub: "" },
    ...(deptPeers.length > 0 ? [
      { val: `#${deptRank}`, lbl: `Dept Rank of ${deptPeers.length + 1}`, sub: "" },
      { val: String(deptAvg), lbl: "Dept Avg", sub: "" },
      { val: String(collegeAvg), lbl: "College Avg", sub: "" },
    ] : []),
  ];

  const statsBarHtml = statsItems.map((stat, idx, arr) => `
    <div style="display:flex;align-items:center;flex:1">
      <div style="flex:1;text-align:center">
        <p style="font-size:18px;font-weight:800;color:#fff;line-height:1;margin:0;font-variant-numeric:tabular-nums">${esc(stat.val)}</p>
        <p style="font-size:8px;font-weight:600;color:rgba(255,255,255,0.75);margin:2px 0 0;line-height:1.3">${esc(stat.lbl)}</p>
        ${stat.sub ? `<p style="font-size:8px;font-weight:600;color:rgba(255,255,255,0.55);margin:0">${esc(stat.sub)}</p>` : ""}
      </div>
      ${idx < arr.length - 1 ? `<div style="width:1.5px;height:36px;background:rgba(255,255,255,0.3);flex-shrink:0"></div>` : ""}
    </div>`).join("");

  // Student detail items
  const detailItems: [string, string][] = [
    ["Department", s.department],
    ["Year", s.year],
    ["UG %", `${s.ugPercentage}%`],
    ...(s.pgPercentage != null ? [["PG %", `${s.pgPercentage}%`] as [string, string]] : []),
    ["Arrears", s.noOfArrears === 0 ? "None" : String(s.noOfArrears)],
  ];

  const detailHtml = detailItems.map(([lbl, val]) => `
    <div style="display:flex;flex-direction:column;line-height:1${lbl === "Department" ? ";min-width:0;max-width:160px" : ""}">
      <span style="font-size:10px;color:rgba(255,255,255,0.75);font-weight:500">${esc(lbl)}</span>
      <span style="font-size:16px;color:#fff;font-weight:600;margin-top:1px${lbl === "Department" ? ";overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block" : ""}">${esc(val)}</span>
    </div>`).join("");

  // Tier cards
  const tierCardsHtml = TIER_META.map(tier => tierCard(tier, s)).join("");

  // Improvement roadmap
  const roadmapItems = [
    {
      area: "Aptitude",
      tip: s.aptitudeTotal < 120 ? "Target 120+ Across Quants, Logical & Verbal" : "Strong aptitude performance",
      action: s.aptitudeTotal < 120 ? "Practice Daily Aptitude Tests For 30â€“45 Min" : null,
    },
    {
      area: "Communication",
      tip: s.communicationTotal < 120 ? "Improve CEFR & EF SET Scores To B2+" : "Strong communication performance",
      action: s.communicationTotal < 120 ? "Practice English Communication Daily" : null,
    },
    {
      area: "Coding Practice",
      tip: s.codingPractice < 100 ? "Improve Leetcode Rank Below 150k" : "Strong coding practice",
      action: s.codingPractice < 100 ? "Solve 2â€“3 Problems Daily On Leetcode" : null,
    },
  ];

  const roadmapCardsHtml = roadmapItems.map(item => `
    <div style="flex:1;background:linear-gradient(135deg,#2B2B2B 0%,#474747 100%);border-radius:14px;padding:12px 10px;display:flex;flex-direction:column;gap:8px">
      <div style="display:flex;align-items:center;justify-content:center;gap:7px">
        <div style="width:18px;height:18px;border-radius:9999px;background:rgba(255,255,255,0.15);flex-shrink:0;display:flex;align-items:center;justify-content:center">
          <div style="width:13px;height:13px;border-radius:9999px;border:1px solid rgba(255,255,255,0.7);display:flex;align-items:center;justify-content:center">
            <div style="width:7px;height:7px;border-radius:9999px;background:#fff"></div>
          </div>
        </div>
        <span style="font-size:11px;font-weight:800;color:#fff;line-height:1">${esc(item.area)}</span>
      </div>
      <p style="font-size:9px;font-weight:600;color:#fff;margin:0;line-height:1.5;text-align:center">${esc(item.tip)}</p>
      ${item.action ? `
      <div style="border:1.5px solid rgba(255,255,255,0.35);border-radius:8px;padding:5px 6px;margin-top:auto;text-align:center;width:100%;box-sizing:border-box;background:rgba(255,255,255,0.08)">
        <p style="font-size:11px;font-weight:800;color:#fff;margin:0;line-height:1.4">${esc(item.action)}</p>
      </div>` : ""}
    </div>`).join("");

  const body = `
<div style="width:820px;background:#f2f2f2;font-family:Arial,Helvetica,sans-serif;padding:0 16px 16px;box-sizing:border-box;color:#0f172a">

  <!-- LOGO BAR â€” gap above header for college/company logos -->
  <div style="height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 8px;margin-bottom:4px">
    <!-- Left logo: site logo -->
    <div style="display:flex;align-items:center;width:120px;height:44px">
      <img src="data:image/png;base64,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" style="height:44px;width:auto;object-fit:contain" alt="Logo" />
    </div>
    <!-- Centre title -->
    <div style="text-align:center">
      <p style="font-size:11px;font-weight:800;color:#374151;margin:0;letter-spacing:0.06em;text-transform:uppercase">HIRE Score Report</p>
      <p style="font-size:9px;color:#9ca3af;margin:2px 0 0;font-weight:500">${esc(s.registrationNumber)}</p>
    </div>
    <!-- Right logo: FACE Prep -->
    <div style="display:flex;align-items:center;justify-content:flex-end;width:140px">
      <svg width="140" height="18" viewBox="0 0 508 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path fill-rule="evenodd" clip-rule="evenodd" d="M85.1797 1.5484H126.25V13.9355H98.6697V26.3226H124.18V38.7097H98.6697V62.4516H85.1797V1.5484ZM151.33 1.5484H162.48L189.11 62.4516H173.89L168.62 49.5484H144.84L139.74 62.4516H124.87L151.33 1.5484ZM156.51 19.2688L149.08 38.1936H164.04L156.51 19.2688ZM235.28 17.3763C233.96 15.7706 232.33 14.5376 230.4 13.6774C228.47 12.8172 226.23 12.3871 223.7 12.3871C221.16 12.3871 218.81 12.8745 216.65 13.8495C214.49 14.8244 212.62 16.1864 211.03 17.9355C209.45 19.6846 208.21 21.7634 207.31 24.172C206.42 26.5807 205.97 29.19 205.97 32C205.97 34.8674 206.42 37.491 207.31 39.871C208.21 42.2509 209.43 44.3154 210.99 46.0645C212.54 47.8136 214.37 49.1756 216.48 50.1505C218.58 51.1255 220.84 51.6129 223.27 51.6129C226.03 51.6129 228.48 51.0394 230.62 49.8925C232.75 48.7455 234.51 47.1398 235.89 45.0753L247.13 53.4194C244.54 57.0323 241.25 59.6989 237.27 61.4194C233.3 63.1398 229.2 64 224.99 64C220.21 64 215.8 63.2545 211.77 61.7634C207.73 60.2724 204.24 58.1362 201.3 55.3548C198.36 52.5735 196.07 49.2043 194.43 45.2473C192.79 41.2903 191.96 36.8746 191.96 32C191.96 27.1254 192.79 22.7097 194.43 18.7527C196.07 14.7957 198.36 11.4265 201.3 8.6452C204.24 5.8638 207.73 3.7276 211.77 2.2366C215.8 0.745499 220.21 0 224.99 0C226.72 0 228.53 0.157699 230.4 0.473099C232.27 0.788499 234.12 1.2903 235.93 1.9785C237.75 2.6667 239.49 3.5842 241.16 4.7312C242.84 5.8781 244.33 7.2831 245.66 8.9462L235.28 17.3763ZM255 1.5484H296.59V13.9355H268.49V25.2903H295.03V37.6774H268.49V50.0645H298.14V62.4516H255V1.5484Z" fill="black"/>
        <path d="M27.01 26.8387H13.51V40.2581H0V0H27.01H40.52V13.4194H27.01V26.8387Z" fill="#F05136"/>
        <path d="M10.3896 64.0016V50.5823H23.8997V37.1629L37.3997 37.1624V23.7436H50.9097V10.3242H64.4097V50.5823V64.0016H50.9097H10.3896Z" fill="#F05136"/>
        <mask id="mask0_1859_3005" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="318" y="0" width="191" height="64">
          <path d="M318.939 0H508.01L480.31 64H318.939V0Z" fill="white"/>
        </mask>
        <g mask="url(#mask0_1859_3005)">
          <path d="M318.939 0H508.01L480.31 64H318.939V0Z" fill="#F05136"/>
          <path d="M327.229 7.22559H345.67C348.24 7.22559 350.669 7.45779 352.959 7.92239C355.249 8.38689 357.239 9.18818 358.949 10.3262C360.659 11.4643 362.01 12.9972 363.02 14.9249C364.02 16.8527 364.52 19.2798 364.52 22.2062C364.52 25.0862 364.05 27.5017 363.12 29.4527C362.19 31.4037 360.9 32.9598 359.27 34.1211C357.63 35.2824 355.689 36.1069 353.449 36.5946C351.199 37.0824 348.78 37.3262 346.16 37.3262H338.17V56.5572H327.229V7.22559ZM338.17 28.1288H345.459C346.439 28.1288 347.39 28.0359 348.3 27.8501C349.21 27.6643 350.03 27.3507 350.75 26.9095C351.47 26.4682 352.06 25.8643 352.5 25.0978C352.95 24.3314 353.17 23.3675 353.17 22.2062C353.17 20.952 352.88 19.9417 352.29 19.1753C351.71 18.4088 350.96 17.8166 350.05 17.3985C349.14 16.9804 348.12 16.7133 347 16.5972C345.88 16.4811 344.8 16.423 343.78 16.423H338.17V28.1288ZM370.06 22.694H380.569V28.1288H380.709C381.829 26.0385 383.169 24.4708 384.709 23.4256C386.249 22.3804 388.19 21.8578 390.53 21.8578C391.13 21.8578 391.739 21.8811 392.349 21.9275C392.949 21.974 393.52 22.0669 394.03 22.2062V31.752C393.28 31.5198 392.549 31.3456 391.819 31.2295C391.099 31.1133 390.34 31.0553 389.54 31.0553C387.53 31.0553 385.95 31.334 384.78 31.8914C383.61 32.4488 382.709 33.2269 382.079 34.2256C381.449 35.2243 381.039 36.4204 380.849 37.814C380.669 39.2075 380.569 40.7404 380.569 42.4127V56.5572H370.06V22.694ZM429.56 50.7043C427.88 52.8411 425.759 54.4901 423.189 55.6514C420.619 56.8127 417.949 57.3933 415.199 57.3933C412.579 57.3933 410.12 56.9753 407.8 56.1391C405.49 55.303 403.48 54.1069 401.77 52.5507C400.07 50.9946 398.73 49.1249 397.74 46.9417C396.76 44.7585 396.27 42.3198 396.27 39.6256C396.27 36.9314 396.76 34.4927 397.74 32.3095C398.73 30.1262 400.07 28.2566 401.77 26.7004C403.48 25.1443 405.49 23.9482 407.8 23.112C410.12 22.2759 412.579 21.8578 415.199 21.8578C417.629 21.8578 419.829 22.2759 421.819 23.112C423.809 23.9482 425.49 25.1443 426.87 26.7004C428.24 28.2566 429.31 30.1262 430.06 32.3095C430.8 34.4927 431.18 36.9314 431.18 39.6256V42.9004H406.79C407.21 44.8979 408.12 46.4888 409.52 47.6733C410.92 48.8578 412.649 49.4501 414.709 49.4501C416.429 49.4501 417.899 49.0669 419.089 48.3004C420.279 47.534 421.319 46.5469 422.209 45.3391L429.56 50.7043ZM420.66 35.7933C420.71 34.0282 420.13 32.5185 418.91 31.2643C417.7 30.0101 416.129 29.383 414.219 29.383C413.049 29.383 412.02 29.5688 411.13 29.9404C410.24 30.312 409.479 30.7882 408.849 31.3688C408.219 31.9495 407.73 32.623 407.38 33.3895C407.03 34.1559 406.83 34.9572 406.79 35.7933H420.66ZM438.54 22.694H448.209V27.1533H448.349C448.769 26.5495 449.32 25.934 450 25.3069C450.67 24.6798 451.47 24.1107 452.38 23.5998C453.29 23.0888 454.279 22.6707 455.359 22.3456C456.429 22.0204 457.58 21.8578 458.79 21.8578C461.32 21.8578 463.61 22.2875 465.66 23.1469C467.72 24.0062 469.479 25.214 470.949 26.7701C472.419 28.3262 473.559 30.1727 474.349 32.3095C475.149 34.4462 475.54 36.792 475.54 39.3469C475.54 41.7159 475.179 43.9804 474.459 46.1404C473.729 48.3004 472.7 50.2165 471.37 51.8888C470.04 53.5611 468.42 54.8965 466.5 55.8953C464.59 56.894 462.409 57.3933 459.979 57.3933C457.789 57.3933 455.739 57.0566 453.849 56.383C451.959 55.7095 450.399 54.5598 449.189 52.934H449.05V72.444H438.54V22.694ZM448.209 39.6256C448.209 42.1804 448.94 44.2475 450.42 45.8269C451.89 47.4062 453.96 48.1959 456.62 48.1959C459.28 48.1959 461.349 47.4062 462.819 45.8269C464.289 44.2475 465.03 42.1804 465.03 39.6256C465.03 37.0707 464.289 35.0037 462.819 33.4243C461.349 31.8449 459.28 31.0553 456.62 31.0553C453.96 31.0553 451.89 31.8449 450.42 33.4243C448.94 35.0037 448.209 37.0707 448.209 39.6256Z" fill="white"/>
        </g>
      </svg>
    </div>
  </div>

  <!-- HEADER: red card overlapping stats bar -->
  <div style="position:relative;padding-bottom:52px;margin-bottom:10px">

    <!-- STATS BAR (behind red card) -->
    <div style="background:${DARK_STATS_BG};border-radius:16px;display:flex;align-items:center;padding:24px 24px 10px 24px;position:absolute;bottom:0;left:24px;right:24px;z-index:0;box-shadow:0 6px 20px rgba(0,0,0,0.35);height:72px">
      ${statsBarHtml}
    </div>

    <!-- RED CARD (on top) -->
    <div style="background:${RED};border-radius:13px;box-shadow:0 4px 24px rgba(0,0,0,0.12);position:relative;z-index:1;display:flex;align-items:stretch">

      <!-- Left: avatar + name + details -->
      <div style="display:flex;align-items:center;padding:16px 14px 16px 18px;flex:1;min-width:0">
        <!-- Avatar -->
        <div style="width:68px;height:68px;border-radius:9999px;background:#fff;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;color:#000;margin-right:14px">
          ${esc(getInitials(s.name))}
        </div>
        <!-- Name + details -->
        <div style="flex:1;min-width:0">
          <h1 style="font-size:22px;font-weight:800;color:#fff;margin:0 0 6px 0;line-height:1.1">${esc(s.name)}</h1>
          <div style="display:flex;align-items:flex-start;gap:4px 16px;flex-wrap:wrap">
            ${detailHtml}
          </div>
        </div>
      </div>

      <!-- White panel: placement status + hire score -->
      <div style="flex-shrink:0;background:#fff;border-radius:0 22px 22px 0;margin:8px 8px 8px 0;display:flex;align-items:stretch;min-width:210px">

        <!-- Placement status -->
        <div style="display:flex;flex-direction:column;justify-content:space-between;padding:14px 10px 14px 16px;flex:0 0 95px">
          <span style="font-size:10px;font-weight:800;color:${RED};text-transform:uppercase;letter-spacing:0.05em;line-height:1.3;display:block">PLACEMENT<br/>STATUS</span>
          <span style="font-size:22px;font-weight:800;color:${RED};line-height:1.1;display:block">
            ${statusLabel.includes(" ")
      ? `${esc(statusLabel.split(" ")[0])}<br/>${esc(statusLabel.split(" ").slice(1).join(" "))}`
      : esc(statusLabel)}
          </span>
        </div>

        <!-- Hire score -->
        <div style="display:flex;flex-direction:column;justify-content:space-between;padding:14px 16px 14px 8px;flex:1">
          <span style="font-size:18px;font-weight:700;color:${RED};line-height:1">Hire Score</span>
          <div>
            <span style="display:block;font-size:${String(s.hireScore).length > 4 ? '38px' : '48px'};font-weight:900;color:${RED};line-height:1;letter-spacing:-1.5px;font-variant-numeric:tabular-nums">${s.hireScore}</span>
            <span style="display:inline-block;margin-top:5px;font-size:10px;color:#fff;background:${RED};border-radius:5px;padding:3px 8px;font-weight:600;letter-spacing:0.02em">of ${TOTAL_MAX}</span>
          </div>
        </div>

      </div>
    </div>
  </div>

  <!-- TIER CARDS -->
  ${tierCardsHtml}

  <!-- BOTTOM ROW: Improvement Roadmap + Overall Score -->
  <div style="display:flex;gap:10px;align-items:stretch;margin-bottom:10px">

    <!-- Improvement Roadmap -->
    <div style="flex:1;background:#fff;border-radius:22px;box-shadow:0 2px 10px rgba(0,0,0,0.07);padding:16px 14px">
      <p style="font-size:15px;font-weight:700;color:#1a1a1a;margin:0 0 12px 0;text-align:center">Improvement Roadmap</p>
      <div style="display:flex;gap:8px">
        ${roadmapCardsHtml}
      </div>
    </div>

    <!-- Overall Score -->
    <div style="width:175px;background:#fff;border-radius:22px;box-shadow:0 2px 10px rgba(0,0,0,0.07);padding:20px 16px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px">
      <p style="font-size:15px;font-weight:700;color:#1a1a1a;margin:0;text-align:center">Overall Score</p>
      <p style="font-size:${String(s.hireScore).length > 4 ? '44px' : '68px'};font-weight:900;color:${RED};margin:0;line-height:1;font-variant-numeric:tabular-nums;text-align:center">${s.hireScore}</p>
      <div style="background:${RED};border-radius:7px;padding:4px 14px">
        <span style="font-size:12px;color:#fff;font-weight:700">of ${TOTAL_MAX}</span>
      </div>
      <p style="font-size:16px;font-weight:800;color:${RED};margin:0;text-align:center">${esc(statusLabel)}</p>
    </div>

  </div>

  <!-- SEAL AREA â€” gap at bottom for official stamp -->
  <div style="height:40mm;border:1.5px dashed #d1d5db;border-radius:10px;display:flex;align-items:center;justify-content:space-between;padding:0 32px;background:#fafafa">
    <!-- Left: authorised signatory placeholder -->
    <div style="display:flex;flex-direction:column;align-items:center;gap:6px">
      <div style="width:100px;height:1px;background:#d1d5db"></div>
      <span style="font-size:8px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:0.1em">Authorised Signatory</span>
    </div>
    
    <!-- Right: date placeholder -->
    <div style="display:flex;flex-direction:column;align-items:center;gap:6px">
      <div style="width:100px;height:1px;background:#d1d5db"></div>
      <span style="font-size:8px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:0.1em">Date</span>
    </div>
  </div>

</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body {
      background:#f2f2f2;
      font-family:Arial,Helvetica,sans-serif;
      display:flex;
      justify-content:center;
    }
  </style>
</head>
<body>${body}</body>
</html>`;
}
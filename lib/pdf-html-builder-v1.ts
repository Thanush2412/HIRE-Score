// Pure TypeScript HTML string builder for V1 layout — matches the red-themed V1 UI.
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
      { label: "X Marks",            raw: "xMarks" as const,           score: "xScore" as const              },
      { label: "Xii Marks",          raw: "xiiMarks" as const,         score: "xiiScore" as const            },
      { label: "UG Percentage",      raw: "ugPercentage" as const,     score: "ugScore" as const             },
      { label: "No. of Arrears",     raw: "noOfArrears" as const,      score: "noOfArrearsScore" as const    },
      { label: "History of Arrears", raw: "historyOfArrears" as const, score: "historyArrearsScore" as const },
    ],
  },
  {
    key: "technicalProficiency" as const,
    tierLabel: "Tier 2",
    label: "Technical Proficiency",
    max: 400,
    rows: [
      { label: "Leetcode Rank",        raw: "leetcodeRank" as const,       score: "codingPractice" as const         },
      { label: "FOP Assessment",       raw: "fopAssessment" as const,      score: "fopAssessment" as const          },
      { label: "Internal Codeathon",   raw: "internalCodeathon" as const,  score: "internalCodeathon" as const      },
      { label: "GitHub Projects",      raw: "githubProjects" as const,     score: "miniProjects" as const           },
      { label: "Full Length Projects", raw: "fullLengthProjects" as const, score: "fullLengthProjectScore" as const },
      { label: "DSA",                  raw: "dsaAssessment" as const,      score: "dsaAssessment" as const          },
    ],
  },
  {
    key: "cognitiveLinguistic" as const,
    tierLabel: "Tier 3",
    label: "Cognitive & Linguistic",
    max: 300,
    rows: [
      { label: "Quants",           raw: "quants" as const,         score: "quantsScore" as const      },
      { label: "Logical",          raw: "logical" as const,        score: "logicalScore" as const     },
      { label: "Verbal",           raw: "verbal" as const,         score: "verbalScore" as const      },
      { label: "CEFR A1 Grammar",  raw: "cefrA1Grammar" as const,  score: "cefrA1Score" as const      },
      { label: "CEFR A2 Grammar",  raw: "cefrA2Grammar" as const,  score: "cefrA2Score" as const      },
      { label: "EF SET Listening", raw: "efSetListening" as const, score: "efListeningScore" as const },
      { label: "EF SET Speaking",  raw: "efSetSpeaking" as const,  score: "efSpeakingScore" as const  },
      { label: "EF SET Reading",   raw: "efSetReading" as const,   score: "efReadingScore" as const   },
      { label: "EF SET Writing",   raw: "efSetWriting" as const,   score: "efWritingScore" as const   },
    ],
  },
  {
    key: "industryValidation" as const,
    tierLabel: "Tier 4",
    label: "Industry Validation",
    max: 150,
    rows: [
      { label: "Global Certification", raw: "globalCertification" as const, score: "globalCertScore" as const },
      { label: "Other Certifications", raw: "otherCertifications" as const, score: "otherCertScore" as const  },
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
    const displayVal = typeof raw === "string" && raw !== ""
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
        <p style="font-size:14px;font-weight:500;color:#2D2D2D;margin:0;line-height:1">${esc(tier.tierLabel)} —</p>
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
    { val: `#${rank}`,           lbl: "Overall Rank",                        sub: `of ${allStudents.length}` },
    { val: `${percentile}th`,    lbl: "Percentile",                          sub: "" },
    ...(deptPeers.length > 0 ? [
      { val: `#${deptRank}`,     lbl: `Dept Rank of ${deptPeers.length + 1}`, sub: "" },
      { val: String(deptAvg),    lbl: "Dept Avg",                            sub: "" },
      { val: String(collegeAvg), lbl: "College Avg",                         sub: "" },
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
    ["Year",       s.year],
    ["UG %",       `${s.ugPercentage}%`],
    ...(s.pgPercentage != null ? [["PG %", `${s.pgPercentage}%`] as [string, string]] : []),
    ["Arrears",    s.noOfArrears === 0 ? "None" : String(s.noOfArrears)],
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

  <!-- LOGO BAR — gap above header for college/company logos -->
  <div style="height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 8px;margin-bottom:4px">
    <!-- Left logo placeholder -->
    <div style="width:120px;height:44px;border:1.5px dashed #d1d5db;border-radius:8px;display:flex;align-items:center;justify-content:center">
      <span style="font-size:8px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:0.08em">College Logo</span>
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
            <span style="display:block;font-size:48px;font-weight:900;color:${RED};line-height:1;letter-spacing:-1.5px;font-variant-numeric:tabular-nums">${s.hireScore}</span>
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
      <p style="font-size:68px;font-weight:900;color:${RED};margin:0;line-height:1;font-variant-numeric:tabular-nums;text-align:center">${s.hireScore}</p>
      <div style="background:${RED};border-radius:7px;padding:4px 14px">
        <span style="font-size:12px;color:#fff;font-weight:700">of ${TOTAL_MAX}</span>
      </div>
      <p style="font-size:16px;font-weight:800;color:${RED};margin:0;text-align:center">${esc(statusLabel)}</p>
    </div>

  </div>

  <!-- SEAL AREA — gap at bottom for official stamp -->
  <div style="height:40mm;border:1.5px dashed #d1d5db;border-radius:10px;display:flex;align-items:center;justify-content:space-between;padding:0 32px;background:#fafafa">
    <!-- Left: authorised signatory placeholder -->
    <div style="display:flex;flex-direction:column;align-items:center;gap:6px">
      <div style="width:100px;height:1px;background:#d1d5db"></div>
      <span style="font-size:8px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:0.1em">Authorised Signatory</span>
    </div>
    <!-- Centre: official seal label -->
    <div style="display:flex;flex-direction:column;align-items:center;gap:6px">
      <div style="width:64px;height:64px;border-radius:9999px;border:1.5px dashed #d1d5db;display:flex;align-items:center;justify-content:center">
        <span style="font-size:7px;color:#d1d5db;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;text-align:center;line-height:1.4">Official<br/>Seal</span>
      </div>
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

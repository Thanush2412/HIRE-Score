const fs = require('fs');
const path = require('path');

const originalFilePath = path.join(process.cwd(), 'original_code.ts');
const targetFilePath = path.join(process.cwd(), 'lib/pdf-html-builder-v1.ts');

let content = fs.readFileSync(originalFilePath, 'utf8');

const logoBase64 = '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';

const functionSignature = 'export function buildPdfHtmlV1(s: StoredStudent, allStudents: StoredStudent[]): string {';

const newFunction = `export function buildPdfHtmlV1(s: StoredStudent, allStudents: StoredStudent[]): string {
  const LOGO_BASE64 = `${logoBase64}`;
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
  const statsItems = [
    { val: `#\${rank}`,           lbl: "Overall Rank",                        sub: `of \${allStudents.length}` },
    { val: `\${percentile}th`,    lbl: "Percentile",                          sub: "" },
    ...(deptPeers.length > 0 ? [
      { val: `#\${deptRank}`,     lbl: `Dept Rank of \${deptPeers.length + 1}`, sub: "" },
      { val: String(deptAvg),    lbl: "Dept Avg",                            sub: "" },
      { val: String(collegeAvg), lbl: "College Avg",                         sub: "" },
    ] : []),
  ];

  const statsBarHtml = statsItems.map((stat, idx, arr) => `
    <div style="display:flex;align-items:center;flex:1">
      <div style="flex:1;text-align:center">
        <p style="font-size:18px;font-weight:800;color:#fff;line-height:1;margin:0;font-variant-numeric:tabular-nums">\${esc(stat.val)}</p>
        <p style="font-size:8px;font-weight:600;color:rgba(255,255,255,0.75);margin:2px 0 0;line-height:1.3">\${esc(stat.lbl)}</p>
        \${stat.sub ? `<p style="font-size:8px;font-weight:600;color:rgba(255,255,255,0.55);margin:0">\${esc(stat.sub)}</p>` : ""}
      </div>
      \${idx < arr.length - 1 ? `<div style="width:1.5px;height:36px;background:rgba(255,255,255,0.3);flex-shrink:0"></div>` : ""}
    </div>`).join("");

  // Student detail items
  const detailItems = [
    ["Department", s.department],
    ["Year",       s.year],
    ["UG %",       `\${s.ugPercentage}%`],
    ...(s.pgPercentage != null ? [["PG %", `\${s.pgPercentage}%`]] : []),
    ["Arrears",    s.noOfArrears === 0 ? "None" : String(s.noOfArrears)],
  ];

  const detailHtml = detailItems.map(([lbl, val]) => `
    <div style="display:flex;flex-direction:column;line-height:1\${lbl === "Department" ? ";min-width:0;max-width:160px" : ""}">
      <span style="font-size:10px;color:rgba(255,255,255,0.75);font-weight:500">\${esc(lbl)}</span>
      <span style="font-size:16px;color:#fff;font-weight:600;margin-top:1px\${lbl === "Department" ? ";overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block" : ""}">\${esc(val)}</span>
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
        <span style="font-size:11px;font-weight:800;color:#fff;line-height:1">\${esc(item.area)}</span>
      </div>
      <p style="font-size:9px;font-weight:600;color:#fff;margin:0;line-height:1.5;text-align:center">\${esc(item.tip)}</p>
      \${item.action ? `
      <div style="border:1.5px solid rgba(255,255,255,0.35);border-radius:8px;padding:5px 6px;margin-top:auto;text-align:center;width:100%;box-sizing:border-box;background:rgba(255,255,255,0.08)">
        <p style="font-size:11px;font-weight:800;color:#fff;margin:0;line-height:1.4">\${esc(item.action)}</p>
      </div>` : ""}
    </div>`).join("");

  const body = `
<div style="width:820px;background:#f2f2f2;font-family:Arial,Helvetica,sans-serif;padding:0 16px 16px;box-sizing:border-box;color:#0f172a">

  <!-- LOGO BAR — HIRE logo on the left, Report details on the right -->
  <div style="height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 8px;margin-bottom:4px">
    <!-- Left: HIRE Logo -->
    <div style="display:flex;align-items:center;width:140px">
      <img src="data:image/png;base64,\${LOGO_BASE64}" style="height:44px;width:auto" />
    </div>
    <!-- Right: Title + Registration Number -->
    <div style="text-align:right">
      <p style="font-size:11px;font-weight:800;color:#374151;margin:0;letter-spacing:0.06em;text-transform:uppercase">HIRE Score Report</p>
      <p style="font-size:9px;color:#9ca3af;margin:2px 0 0;font-weight:500">\${esc(s.registrationNumber)}</p>
    </div>
  </div>

  <!-- HEADER: red card overlapping stats bar -->
  <div style="position:relative;padding-bottom:52px;margin-bottom:10px">

    <!-- STATS BAR (behind red card) -->
    <div style="background:\${DARK_STATS_BG};border-radius:16px;display:flex;align-items:center;padding:24px 24px 10px 24px;position:absolute;bottom:0;left:24px;right:24px;z-index:0;box-shadow:0 6px 20px rgba(0,0,0,0.35);height:72px">
      \${statsBarHtml}
    </div>

    <!-- RED CARD (on top) -->
    <div style="background:\${RED};border-radius:13px;box-shadow:0 4px 24px rgba(0,0,0,0.12);position:relative;z-index:1;display:flex;align-items:stretch">

      <!-- Left: avatar + name + details -->
      <div style="display:flex;align-items:center;padding:16px 14px 16px 18px;flex:1;min-width:0">
        <!-- Avatar -->
        <div style="width:68px;height:68px;border-radius:9999px;background:#fff;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;color:#000;margin-right:14px">
          \${esc(getInitials(s.name))}
        </div>
        <!-- Name + details -->
        <div style="flex:1;min-width:0">
          <h1 style="font-size:22px;font-weight:800;color:#fff;margin:0 0 6px 0;line-height:1.1">\${esc(s.name)}</h1>
          <div style="display:flex;align-items:flex-start;gap:4px 16px;flex-wrap:wrap">
            \${detailHtml}
          </div>
        </div>
      </div>

      <!-- White panel: placement status + hire score -->
      <div style="flex-shrink:0;background:#fff;border-radius:0 22px 22px 0;margin:8px 8px 8px 0;display:flex;align-items:stretch;min-width:210px">

        <!-- Placement status -->
        <div style="display:flex;flex-direction:column;justify-content:space-between;padding:14px 10px 14px 16px;flex:0 0 95px">
          <span style="font-size:10px;font-weight:800;color:\${RED};text-transform:uppercase;letter-spacing:0.05em;line-height:1.3;display:block">PLACEMENT<br/>STATUS</span>
          <span style="font-size:22px;font-weight:800;color:\${RED};line-height:1.1;display:block">
            \${statusLabel.includes(" ")
              ? `\${esc(statusLabel.split(" ")[0])}<br/>\${esc(statusLabel.split(" ").slice(1).join(" "))}`
              : esc(statusLabel)}
          </span>
        </div>

        <!-- Hire score -->
        <div style="display:flex;flex-direction:column;justify-content:space-between;padding:14px 16px 14px 8px;flex:1">
          <span style="font-size:18px;font-weight:700;color:\${RED};line-height:1">Hire Score</span>
          <div>
            <span style="display:block;font-size:48px;font-weight:900;color:\${RED};line-height:1;letter-spacing:-1.5px;font-variant-numeric:tabular-nums">\${s.hireScore}</span>
            <span style="display:inline-block;margin-top:5px;font-size:10px;color:#fff;background:\${RED};border-radius:5px;padding:3px 8px;font-weight:600;letter-spacing:0.02em">of \${TOTAL_MAX}</span>
          </div>
        </div>

      </div>
    </div>
  </div>

  <!-- TIER CARDS -->
  \${tierCardsHtml}

  <!-- BOTTOM ROW: Improvement Roadmap + Overall Score -->
  <div style="display:flex;gap:10px;align-items:stretch;margin-bottom:10px">

    <!-- Improvement Roadmap -->
    <div style="flex:1;background:#fff;border-radius:22px;box-shadow:0 2px 10px rgba(0,0,0,0.07);padding:16px 14px">
      <p style="font-size:15px;font-weight:700;color:#1a1a1a;margin:0 0 12px 0;text-align:center">Improvement Roadmap</p>
      <div style="display:flex;gap:8px">
        \${roadmapCardsHtml}
      </div>
    </div>

    <!-- Overall Score -->
    <div style="width:175px;background:#fff;border-radius:22px;box-shadow:0 2px 10px rgba(0,0,0,0.07);padding:20px 16px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px">
      <p style="font-size:15px;font-weight:700;color:#1a1a1a;margin:0;text-align:center">Overall Score</p>
      <p style="font-size:68px;font-weight:900;color:\${RED};margin:0;line-height:1;font-variant-numeric:tabular-nums;text-align:center">\${s.hireScore}</p>
      <div style="background:\${RED};border-radius:7px;padding:4px 14px">
        <span style="font-size:12px;color:#fff;font-weight:700">of \${TOTAL_MAX}</span>
      </div>
      <p style="font-size:16px;font-weight:800;color:\${RED};margin:0;text-align:center">\${esc(statusLabel)}</p>
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
<body>\${body}</body>
</html>`;
}`;

content = content.replace(/export function buildPdfHtmlV1\(s: StoredStudent, allStudents: StoredStudent\[]\): string {[^]+<\/html>`;
}/g, newFunction);

fs.writeFileSync(targetFilePath, content);
fs.unlinkSync(originalFilePath); // Clean up the temp file

console.log('File fixed successfully.');

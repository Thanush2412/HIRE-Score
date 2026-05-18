const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'lib/pdf-html-builder-v1.ts');
let content = fs.readFileSync(filePath, 'utf8');

const logoBase64 = `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`;

const startMarker = ').join("");';
const endMarker = '  <!-- HEADER: red card overlapping stats bar -->';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
    console.error('Markers not found');
    process.exit(1);
}

const body = `
  const LOGO_BASE64 = \`\${logoBase64}\`;

  const body = \`
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
  </div>\`;`;

const newContent = content.slice(0, startIndex + startMarker.length) + '\\n\\n' + body + '\\n\\n' + content.slice(endIndex);
fs.writeFileSync(filePath, newContent);

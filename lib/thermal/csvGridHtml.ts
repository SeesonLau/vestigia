// lib/thermal/csvGridHtml.ts
//Builds the WebView HTML for the colour-coded thermal CSV grid.
//Shared between the offline (AsyncStorage) and online (Supabase storage)
//CSV viewers.

const FRAME_COLS = 160;
const FRAME_ROWS = 120;
const CELL_PX    = 56;

function ironbow(t: number): [number, number, number] {
  const n = Math.max(0, Math.min(1, t));
  if (n < 0.20) { const f = n / 0.20;        return [Math.round(80 * f),         0,                     Math.round(120 * f)]    }
  if (n < 0.45) { const f = (n - 0.20) / 0.25; return [Math.round(80 + 120 * f),  0,                     Math.round(120 - 60 * f)] }
  if (n < 0.65) { const f = (n - 0.45) / 0.20; return [Math.round(200 + 55 * f),  Math.round(100 * f),   Math.round(60 - 60 * f)]  }
  if (n < 0.85) { const f = (n - 0.65) / 0.20; return [255,                       Math.round(100 + 120 * f), 0]                  }
  const f = (n - 0.85) / 0.15;                  return [255,                       Math.round(220 + 35 * f),  Math.round(200 * f)]
}

const hex2 = (v: number) => v.toString(16).padStart(2, "0");

export function buildCsvGridHtml(csvContent: string): string {
  const lines  = csvContent.trim().split("\n");
  const matrix = lines.map((l) => l.split(","));

  let minV = Infinity, maxV = -Infinity;
  for (const row of matrix) {
    for (const cell of row) {
      const v = parseFloat(cell);
      if (!isNaN(v) && v > 0.001) {
        if (v < minV) minV = v;
        if (v > maxV) maxV = v;
      }
    }
  }
  const range = (maxV - minV) > 0 ? maxV - minV : 1;

  let colorCss = "";
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    const [r, g, b] = ironbow(t);
    const lum     = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    const textClr = lum > 0.55 ? "#000" : "rgba(255,255,255,0.9)";
    colorCss += `.c${i}{background:#${hex2(r)}${hex2(g)}${hex2(b)};color:${textClr}}`;
  }

  let rows = "";
  for (let r = 0; r < matrix.length; r++) {
    rows += "<tr>";
    const row = matrix[r];
    for (let c = 0; c < row.length; c++) {
      const v   = parseFloat(row[c]);
      const isBg = isNaN(v) || v <= 0.001;
      if (isBg) {
        rows += "<td class='bg'>0.00</td>";
      } else {
        const bucket = Math.min(255, Math.round(((v - minV) / range) * 255));
        rows += `<td class='c${bucket}'>${v.toFixed(2)}</td>`;
      }
    }
    rows += "</tr>";
  }

  const tableW = FRAME_COLS * CELL_PX;
  const tableH = FRAME_ROWS * CELL_PX;

  return `<!DOCTYPE html><html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=${tableW},initial-scale=1,minimum-scale=0.01,maximum-scale=10,user-scalable=yes">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#111}
table{border-collapse:collapse;table-layout:fixed;width:${tableW}px;height:${tableH}px}
td{width:${CELL_PX}px;height:${CELL_PX}px;font-size:11px;font-family:monospace;text-align:center;vertical-align:middle;white-space:nowrap;border:1px solid rgba(255,255,255,0.06)}
.bg{background:#1c1c1c;color:rgba(255,255,255,0.18)}
${colorCss}
</style>
</head>
<body><table>${rows}</table></body>
</html>`;
}

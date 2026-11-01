// 벤치마크 라벨 시트 순수 함수 — CSV 읽기·쓰기, 시트 → 라벨 기록(형식 판별·저장된 라벨 되살리기), 진행 집계.

function parseCSV(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const rows = []; let row = [], field = "", i = 0, q = false; const n = text.length;
  while (i < n) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { field += '"'; i += 2; continue; } q = false; i++; continue; } field += c; i++; continue; }
    if (c === '"') { q = true; i++; continue; }
    if (c === ",") { row.push(field); field = ""; i++; continue; }
    if (c === "\r") { i++; continue; }
    if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; i++; continue; }
    field += c; i++;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function csvCell(v) { v = v == null ? "" : String(v); return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }

// CSV 글 → { header, records, scheme } (형식을 모르면 null)
function labelSheetFromCsv(text) {
  const rows = parseCSV(text).filter(r => r.length > 1 || (r.length === 1 && r[0] !== ""));
  if (rows.length < 2) return null;
  const header = rows[0].map(h => h.trim());
  const scheme = header.includes("human_label") ? LABEL_SCHEMES.faithfulness
    : header.includes("adjudicated_label") ? LABEL_SCHEMES.goldset : null;
  if (!scheme) return null;
  if (!header.includes(scheme.labelCol)) header.push(scheme.labelCol);
  if (!header.includes(scheme.notesCol)) header.push(scheme.notesCol);
  const records = rows.slice(1).map(cols => { const o = {}; header.forEach((h, k) => o[h] = cols[k] != null ? cols[k] : ""); return o; });
  return { header, records, scheme };
}

// 저장해 둔 [[라벨, 메모], …] 를 기록에 되살린다(기록을 바로 고친다)
function applySavedLabels(records, scheme, saved) {
  saved.forEach((p, k) => { if (records[k]) { records[k][scheme.labelCol] = p[0]; records[k][scheme.notesCol] = p[1]; } });
}

// 라벨 기록 → CSV 글(BOM 포함, CRLF)
function labelSheetToCsv(header, records) {
  return "﻿" + [header.map(csvCell).join(",")].concat(records.map(r => header.map(h => csvCell(r[h])).join(","))).join("\r\n") + "\r\n";
}

// 진행: 라벨 단 수·비율·선택지별 개수
function labelProgress(records, scheme) {
  const done = records.filter(x => x[scheme.labelCol]).length;
  const counts = {}; scheme.options.forEach(([v]) => counts[v] = 0);
  records.forEach(x => { if (counts[x[scheme.labelCol]] != null) counts[x[scheme.labelCol]]++; });
  return { done, pct: Math.round(done / records.length * 100), counts };
}

Object.assign(window, { parseCSV, csvCell, labelSheetFromCsv, applySavedLabels, labelSheetToCsv, labelProgress });

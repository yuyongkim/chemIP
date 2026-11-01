// 노출기준 비교 순수 함수(oel*) — 파일(oel/<CAS>.json, CONTRACT.md) → 표 모양, 단위 바꾸기, 통합 검색어 읽기.
// ppm ↔ mg/m³ 은 계산기와 같은 순수 함수(calc_physics.jsx calcPpmToMgm3·calcMgm3ToPpm, 몰부피 CALC_CONST.vm25)를 쓴다.
// React 없음. 시험: frontend/scripts/tests/test_oel.cjs.

const OEL_KINDS = ["TWA", "STEL", "C", "IDLH"];
const OEL_UNIT_NAMES = { ppm: "ppm", "mg/m3": "mg/m³", "f/cc": "f/cm³", mppcf: "mppcf" };
const OEL_UNIT_MODES = ["source", "ppm", "mg"];
const OEL_MODE_UNIT = { ppm: "ppm", mg: "mg/m3" };

function oelUnitName(u) {
  return OEL_UNIT_NAMES[u] || u || "";
}

// 표시 숫자: 원문 값은 그대로(불필요한 0 없이), 계산값은 유효숫자 3자리.
function oelFmt(v, derived = false) {
  if (v == null || !isFinite(v)) return "";
  const n = derived ? Number(Number(v).toPrecision(3)) : Number(v);
  return n.toLocaleString("en-US", { maximumFractionDigits: 10 });
}

// 파일 → [{ key, j, src, asOf, notes: [공통 표시], cells: { TWA: [{value, unit, note}], ... } }] (파일 순서 그대로).
// 한 묶음 = 관할 + 출처. 모든 값에 같은 표시(예: "Skin")는 notes 로 올리고, 값마다 다른 표시(형태·분진 구분)는 값에 남긴다.
function oelGroups(file) {
  const out = [];
  const byKey = new Map();
  for (const r of (file && file.rows) || []) {
    if (!OEL_KINDS.includes(r.kind)) continue;
    const key = `${r.j}|${r.src}`;
    let g = byKey.get(key);
    if (!g) {
      g = { key, j: r.j, src: r.src, asOf: "", rows: [] };
      byKey.set(key, g);
      out.push(g);
    }
    g.rows.push(r);
    if (r.as_of && r.as_of > g.asOf) g.asOf = r.as_of;
  }
  return out.map(g => {
    const allNotes = g.rows.map(r => r.note || "");
    const common = allNotes.every(n => n === allNotes[0]) ? allNotes[0] : "";
    const cells = Object.fromEntries(OEL_KINDS.map(k => [k, []]));
    for (const r of g.rows) cells[r.kind].push({ value: r.value, unit: r.unit, note: common ? "" : (r.note || "") });
    return { key: g.key, j: g.j, src: g.src, asOf: g.asOf, notes: common ? [common] : [], cells };
  });
}

// 이 물질에 ppm 값이 하나라도 있으면 기체·증기로 본다(mg/m³ → ppm 바꾸기를 허용).
function oelIsVapour(file) {
  return ((file && file.rows) || []).some(r => r.unit === "ppm");
}

// 칸 하나의 값들을 보일 모양으로: mode "source" 는 그대로, "ppm"·"mg" 는 같은 표시(note)끼리 묶어 그 단위 값이 있으면 그것,
// 없으면 다른 단위 값을 바꾼 계산값(derived)을, 바꿀 수 없으면 원문 값을 보인다.
function oelCellValues(values, mode, mw, vapour, vm = CALC_CONST.vm25) {
  const list = values || [];
  const target = OEL_MODE_UNIT[mode];
  if (!target) return list.map(v => ({ ...v, derived: false }));
  const byNote = new Map();
  for (const v of list) {
    if (!byNote.has(v.note)) byNote.set(v.note, []);
    byNote.get(v.note).push(v);
  }
  const out = [];
  for (const [note, vs] of byNote) {
    const hit = vs.find(v => v.unit === target);
    if (hit) { out.push({ ...hit, derived: false }); continue; }
    const other = vs.find(v => v.unit === (target === "ppm" ? "mg/m3" : "ppm"));
    const canConvert = other && mw > 0 && (target === "mg/m3" || vapour);
    if (canConvert) {
      const value = target === "mg/m3" ? calcPpmToMgm3(other.value, mw, vm) : calcMgm3ToPpm(other.value, mw, vm);
      out.push({ value, unit: target, note, derived: true });
      continue;
    }
    vs.forEach(v => out.push({ ...v, derived: false }));
  }
  return out;
}

// 분자량: 파일의 mw(KOSHA MSDS 9항에서 모은 값) → 없으면 화면이 가진 MSDS 9항(calcMolarMassFromSections).
function oelMolarMass(file, sections) {
  const m = Number(file && file.mw);
  if (m > 0) return m;
  return typeof calcMolarMassFromSections === "function" ? calcMolarMassFromSections(sections) : null;
}

// 통합 검색어 → { name, matched } : 노출기준 낱말(앞·뒤)을 떼고 남은 물질 이름. 낱말이 없으면 null.
// words 는 긴 것부터 맞춘다("occupational exposure limit" 이 "exposure limit" 보다 먼저).
function oelParseQuery(q, words) {
  const s = String(q || "").trim();
  if (!s) return null;
  const list = [...new Set(words || [])].sort((a, b) => b.length - a.length);
  const lower = s.toLowerCase();
  for (const w of list) {
    const lw = w.toLowerCase();
    const isAscii = /^[\x00-\x7f]+$/.test(w);
    const bound = (ch) => !ch || !isAscii || !/[a-z0-9]/i.test(ch);
    if (lower.endsWith(lw) && bound(lower[lower.length - lw.length - 1])) {
      const name = s.slice(0, s.length - w.length).replace(/[\s,·:]+$/, "").replace(/\s*(의|of)$/i, "").trim();
      if (name) return { name, matched: w };
    }
    if (lower.startsWith(lw) && bound(lower[lw.length])) {
      const name = s.slice(w.length).replace(/^[\s,·:]+/, "").replace(/^(of|for)\s+/i, "").trim();
      if (name) return { name, matched: w };
    }
  }
  return null;
}

// 통합 검색 답 한 줄: 관할마다 첫 TWA(없으면 STEL·C·IDLH) 값 하나.
function oelSummaryLine(file, sourceName, limit = 4) {
  const parts = [];
  for (const g of oelGroups(file)) {
    const kind = OEL_KINDS.find(k => g.cells[k].length);
    if (!kind) continue;
    const v = g.cells[kind][0];
    parts.push(`${sourceName(g.src)} ${kind} ${oelFmt(v.value)} ${oelUnitName(v.unit)}`);
    if (parts.length >= limit) break;
  }
  return parts.join(" · ");
}

Object.assign(window, {
  OEL_KINDS, OEL_UNIT_MODES, oelUnitName, oelFmt, oelGroups, oelIsVapour, oelCellValues, oelMolarMass, oelParseQuery, oelSummaryLine,
});

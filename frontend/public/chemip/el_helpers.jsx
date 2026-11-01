// 비상대응 기준(AEGL·ERPG·PAC) · 순수 함수(React·fetch 없음). 자료 모양: scripts/static_export/CONTRACT.md "el/<CAS>.json".
// - elAeglRows / elPacRows: 패널 표 줄, elEndpoint: 독성 끝점(ERPG-2 → AEGL-2 60분 → PAC-2), elOelCompare: 노출기준과 견주는 칩
// - elParseQuery / elAnswer: 통합 검색 "<물질> AEGL·ERPG·PAC" 바로 답 카드 모양
// 숫자 표기는 oel_helpers.jsx 의 oelFmt, ppm ↔ mg/m³ 은 calc_physics.jsx(25 °C, 1 atm). 시험: frontend/scripts/tests/test_emergency_limits.cjs

const EL_TIERS = ["1", "2", "3"];
const EL_AEGL_TIMES = ["10min", "30min", "60min", "4h", "8h"];
const EL_UNIT_NAMES = { ppm: "ppm", "mg/m3": "mg/m³" };

function elUnitName(u) {
  return EL_UNIT_NAMES[u] || u || "";
}

// 값 하나 → { text, mg?: { text, derived } } — ppm 값이면 mg/m³ 도(원문 대괄호 값, 없으면 분자량으로 바꾼 ≈ 값)
function elValue(v, unit, mw, mgGiven) {
  if (v == null || !isFinite(v)) return null;
  const out = { text: oelFmt(v), unit: elUnitName(unit) };
  if (unit === "ppm") {
    if (mgGiven != null && isFinite(mgGiven)) out.mg = { text: oelFmt(mgGiven), derived: false };
    else if (mw > 0) out.mg = { text: oelFmt(calcPpmToMgm3(v, mw, CALC_CONST.vm25), true), derived: true };
  }
  return out;
}

// AEGL 표: [{ tier, cells: [{ v: elValue | null, flag }] }] (EL_AEGL_TIMES 순서). 값 없는 단계도 줄로 둔다(NR 표시).
function elAeglRows(file) {
  const a = file && file.aegl;
  if (!a || !a.v) return [];
  return EL_TIERS.filter(k => a.v[k]).map(k => ({
    tier: k,
    cells: EL_AEGL_TIMES.map((t, i) => ({
      v: elValue(a.v[k][i], a.unit, file.mw, a.mg && a.mg[k] ? a.mg[k][i] : null),
      flag: (a.f && a.f[k] && a.f[k][i]) || "",
    })),
  }));
}

// PAC 표: [{ tier, pac: elValue, pacMg, family, flag, erpg: elValue | null }]
function elPacRows(file) {
  const p = file && file.pac;
  if (!p || !p.v) return [];
  const e = file.erpg;
  return EL_TIERS.map((k, i) => ({
    tier: k,
    pac: elValue(p.v[i], p.unit, null, null),
    pacMg: p.mg && p.mg[i] != null ? oelFmt(p.mg[i]) : "",
    family: (p.tiers && p.tiers[i]) || "",
    flag: (p.f && p.f[i]) || "",
    erpg: e && e.v ? elValue(e.v[i], e.unit, null, null) : null,
  })).filter(r => r.pac || r.erpg);
}

// 독성 끝점(참고) — ERPG-2 → AEGL-2(60분) → PAC-2. { via: "erpg"|"aegl"|"pac", value, unit, mg } 또는 null
function elEndpoint(file) {
  if (!file) return null;
  const e = file.erpg, a = file.aegl, p = file.pac;
  if (e && e.v && e.v[1] != null) return { via: "erpg", value: e.v[1], unit: e.unit, mg: p && p.unit === e.unit && p.mg ? p.mg[1] : null };
  if (a && a.v && a.v["2"] && a.v["2"][2] != null) {
    const mg = a.mg && a.mg["2"] ? a.mg["2"][2] : null;
    return { via: "aegl", value: a.v["2"][2], unit: a.unit, mg };
  }
  if (p && p.v && p.v[1] != null) return { via: "pac", value: p.v[1], unit: p.unit, mg: p.mg ? p.mg[1] : null };
  return null;
}

// 이 물질 자료가 있는 기준 수(AEGL·ERPG·PAC·probit)
function elCount(file) {
  if (!file) return 0;
  return ["aegl", "erpg", "pac", "probit"].filter(k => file[k]).length;
}

// 노출기준 파일(oel/<CAS>.json) 행 → 견주기 칩: 첫 KR TWA, 없으면 첫 US TWA, 그리고 NIOSH IDLH. [{ k, src, value, unit }]
function elOelPick(oelFile) {
  const rows = (oelFile && oelFile.rows) || [];
  const twa = rows.find(r => r.kind === "TWA" && r.j === "KR") || rows.find(r => r.kind === "TWA");
  const idlh = rows.find(r => r.kind === "IDLH");
  return [twa && { k: "twa", src: twa.src, j: twa.j, value: twa.value, unit: twa.unit },
    idlh && { k: "idlh", src: idlh.src, j: idlh.j, value: idlh.value, unit: idlh.unit }].filter(Boolean);
}

// 견주기 칩 전체: 노출기준(TWA·IDLH) + AEGL-2 60분 + PAC-2, 같은 단위로 볼 수 있게 원문 단위 그대로.
function elOelCompare(elFile, oelFile, labels, sourceName) {
  const L = labels.oel;
  const out = elOelPick(oelFile).map(x => ({
    k: x.k, label: x.k === "twa" ? L.twa(sourceName(x.src)) : L.idlh, text: `${oelFmt(x.value)} ${elUnitName(x.unit)}`,
  }));
  const a = elFile && elFile.aegl;
  if (a && a.v && a.v["2"] && a.v["2"][2] != null) out.push({ k: "aegl2", label: L.aegl2, text: `${oelFmt(a.v["2"][2])} ${elUnitName(a.unit)}` });
  const p = elFile && elFile.pac;
  if (p && p.v && p.v[1] != null) out.push({ k: "pac2", label: L.pac2, text: `${oelFmt(p.v[1])} ${elUnitName(p.unit)}` });
  return out;
}

// 통합 검색어 → { kind: "aegl"|"erpg"|"pac"|"all", substance } 또는 null (물성 답과 같은 낱말 규칙, facts_core.jsx factsParseQuery)
function elParseQuery(q, labelSets) {
  const r = factsParseQuery(q, (labelSets || []).map(L => L && L.query));
  return r ? { kind: r.prop, substance: r.substance } : null;
}

function elJoin(vals, unit) {
  const shown = vals.map(v => (v == null || !isFinite(v) ? "—" : oelFmt(v)));
  return shown.some(s => s !== "—") ? `${shown.join(" / ")} ${elUnitName(unit)}` : "";
}

// 파일 + 물어본 종류 → 답 카드 모양 또는 null. { kind, title, lines: [{ part, text }], note, href, cas, source }
// asked: 검색어의 물질 이름 — 한국어 화면에서 검색 결과 이름에 한글이 없으면 물어본 한글 이름을 제목에 쓴다.
function elAnswer(file, kind, item, labels, lang, asked = "") {
  if (!file || !elCount(file)) return null;
  const A = labels.answer;
  const kr = item ? chemSplitKoshaName(item.name).name : ""; // KOSHA "( 관용명 : … )" 뗀 이름(chem_name_core.jsx)
  const found = item ? (lang === "en" ? (item.name_en || kr) : (kr || item.name_en)) : (file.name || file.cas);
  const hangul = /[가-힣]/;
  const name = lang !== "en" && !hangul.test(found || "") && hangul.test(asked || "") ? asked : found;
  const href = `?view=product&pv=chemical&chem=${encodeURIComponent((item && (item.chem_id || item.cas_no)) || file.cas)}&anchor=el`;
  const a = file.aegl, e = file.erpg, p = file.pac;
  const lines = [];
  let note = "";
  const aeglLines = () => {
    if (!a || !a.v) return false;
    const at60 = elJoin(EL_TIERS.map(k => (a.v[k] ? a.v[k][2] : null)), a.unit);
    if (at60) lines.push({ part: A.aeglLine, text: at60 });
    const t2 = a.v["2"] ? elJoin(a.v["2"], a.unit) : "";
    if (t2) lines.push({ part: A.aegl2Times, text: t2 });
    return lines.length > 0;
  };
  const pacLine = () => {
    if (!p || !p.v) return false;
    const t = elJoin(p.v, p.unit);
    if (t) lines.push({ part: A.pacLine, text: t });
    return Boolean(t);
  };
  const erpgLine = () => {
    if (!e || !e.v) return false;
    const t = elJoin(e.v, e.unit);
    if (t) lines.push({ part: A.erpgLine, text: t });
    return Boolean(t);
  };
  if (kind === "aegl") { if (!aeglLines()) { note = A.noAegl; pacLine(); } }
  else if (kind === "erpg") { if (!erpgLine()) { note = A.noErpg; pacLine(); } }
  else if (kind === "pac") pacLine();
  else { aeglLines(); erpgLine(); pacLine(); }
  if (!lines.length) return null;
  const src = kind === "aegl" && a ? "epa_aegl" : "doe_pac_rev29";
  return { kind, title: A.title(A.kinds[kind] || kind, name || file.cas), lines, note, href, cas: file.cas,
    source: labels.sources[src] || src };
}

// 패널 아래 출처 줄: 파일에 쓰인 출처만, [{ sid, name, url }]
function elSourceList(file, index, labels) {
  const meta = (index && index.sources) || {};
  return ((file && file.src) || []).map(sid => ({ sid, name: labels.sources[sid] || (meta[sid] && meta[sid].name) || sid,
    url: (meta[sid] && meta[sid].url) || "" }));
}

Object.assign(window, {
  EL_TIERS, EL_AEGL_TIMES, elUnitName, elValue, elAeglRows, elPacRows, elEndpoint, elCount, elOelPick, elOelCompare,
  elParseQuery, elJoin, elAnswer, elSourceList,
});

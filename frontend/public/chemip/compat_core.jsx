// 저장 혼촉 매트릭스 순수 함수(cm*). 규칙: SAFETY_RULES.compat(safety_rules_data.jsx).
// 물질 하나의 반응성 분류 = [{ system: "kr"|"un"|"ghs", code, basis, source }].
//   1) 정적 g/reactive_class.json 에 그 CAS 가 있으면 그대로(cmClassesFromTable) — 파이썬 scripts/portal_build/reactive_class.py 가 만든 것
//   2) 없거나 정적 자료가 꺼져 있으면 그 물질의 MSDS 상세(2·9·14·15항)와 부속서 VI 항목으로 같은 규칙을 화면에서 적용(cmClassesFromDetail)
//      — reactive_groups.py 와 같은 결과(시험 tests/fixtures/safety_parse_cases.json).
// 짝 판정: 두 물질이 함께 가진 체계마다 분류 짝의 결과를 보고 가장 나쁜 것(x > c > o). 분류가 하나도 없는 물질과의 짝은 "unknown"(안전하다는 뜻 아님).

const CM_KR_RE = /(?:제\s*)?([1-6])\s*류/g;
const CM_UN_RE = /^\s*(\d(?:\.\d)?)/;
const CM_UN_TOKEN_RE = /(?<![\d.])(\d(?:\.\d)?)/g;
const CM_PH_RE = /(?<![\d.])(\d{1,2}(?:\.\d+)?)/;

function cmClassesFromTable(table, cas) {
  const rows = table?.classes?.[cas];
  if (!rows) return null;
  return rows.map(([system, code, basis, src]) => ({ system, code, basis, source: table.source_ids?.[src] || "" }));
}

function cmKrClasses(text, rules = SAFETY_RULES.compat) {
  const t = String(text || "").trim();
  if (!t || t.startsWith("해당없음") || t.startsWith("비위험물")) return [];
  const out = [];
  for (const m of t.matchAll(CM_KR_RE)) {
    if (!out.some(o => o.code === m[1])) out.push({ code: m[1], basis: `s15:${t.slice(0, 60)}` });
  }
  if (!out.length) {
    const kw = rules.systems.kr.item_keywords;
    const code = Object.keys(kw).find(c => kw[c].some(w => t.includes(w)));
    if (code) out.push({ code, basis: `s15:${t.slice(0, 60)}` });
  }
  return out;
}

function cmUnClasses(text, rules = SAFETY_RULES.compat) {
  const t = String(text || "").trim();
  if (!CM_UN_RE.test(t)) return [];
  const known = rules.systems.un.classes;
  const out = [];
  for (const m of t.matchAll(CM_UN_TOKEN_RE)) {
    let code = m[1];
    if (code.startsWith("1.")) code = "1";
    if (!known[code] || out.some(o => o.code === code)) continue;
    out.push({ code, basis: `s14:${t.slice(0, 30)}${out.length ? " (sub)" : ""}` });
  }
  return out;
}

function cmPhValue(text) {
  const m = String(text || "").match(CM_PH_RE);
  if (!m) return null;
  const v = Number(m[1]);
  return v >= 0 && v <= 14 ? v : null;
}

function cmAcidOrBase(names, ph, rules = SAFETY_RULES.compat) {
  const ab = rules.systems.ghs.acid_base;
  if (ph != null) {
    if (ph <= ab.ph_acid_max) return { code: "AC", basis: `ph:${ph}` };
    if (ph >= ab.ph_base_min) return { code: "BA", basis: `ph:${ph}` };
  }
  const acid = new RegExp(ab.acid_name, "i");
  const base = new RegExp(ab.base_name, "i");
  for (const raw of names || []) {
    const n = String(raw || "").trim();
    if (!n) continue;
    if (base.test(n)) return { code: "BA", basis: "name" };
    if (acid.test(n)) return { code: "AC", basis: "name" };
  }
  return null;
}

function cmHazardMatches(entry, wanted) {
  const { key, cat } = ghpEntryParts(entry);
  return wanted.includes(key) || wanted.includes(`${key}:${cat}`);
}

// GHS 유해성 항목(+ 이름·pH·EUH) → [{ code, basis }] (규칙 순서)
function cmGhsGroups(hazards, names, ph, euh, rules = SAFETY_RULES.compat) {
  const g = rules.systems.ghs;
  let out = [];
  Object.keys(g.from_hazards).forEach(code => {
    const hit = (hazards || []).find(h => cmHazardMatches(h, g.from_hazards[code]));
    if (hit) out.push({ code, basis: hit.replace(/\*+$/, "") });
  });
  Object.keys(g.from_supplemental).forEach(code => {
    const hit = (euh || []).find(c => g.from_supplemental[code].includes(c));
    if (hit) out.push({ code, basis: hit });
  });
  if (out.some(o => o.code === "CO")) {
    const ab = cmAcidOrBase(names, ph, rules);
    if (ab) out = out.map(o => (o.code === "CO" ? ab : o));
  }
  return out;
}

// 물질 상세(MSDS 2·9·14·15항) + 부속서 VI 항목들 → 반응성 분류(파이썬 reactive_class.py 의 KOSHA 행 + 부속서 VI 행)
function cmClassesFromDetail(detail, names, annexEntries, rules = SAFETY_RULES.compat) {
  const s2 = ghpMsdsItems(detail, 2), s9 = ghpMsdsItems(detail, 9), s14 = ghpMsdsItems(detail, 14), s15 = ghpMsdsItems(detail, 15);
  const out = [];
  const add = (system, code, basis, source) => {
    if (!out.some(o => o.system === system && o.code === code && o.basis === basis)) out.push({ system, code, basis, source });
  };
  cmKrClasses(s15.O06, rules).forEach(c => add("kr", c.code, c.basis, "kosha_msds_s15"));
  cmUnClasses(s14.N06, rules).forEach(c => add("un", c.code, c.basis, "kosha_msds_s14"));
  cmGhsGroups(ghpKoshaClassification(s2.B02), names, cmPhValue(s9.I08), [], rules).forEach(c => add("ghs", c.code, c.basis, "kosha_msds_s2"));
  const entries = annexEntries || [];
  if (entries.length) {
    const hazards = [...new Set(entries.flatMap(e => e.hazards || []))];
    const euh = [...new Set(entries.flatMap(e => e.euh || []))].sort();
    cmGhsGroups(hazards, [...(names || []), ...entries.map(e => e.name)], null, euh, rules)
      .forEach(c => add("ghs", c.code, `clp:${c.basis}`, "clp_annex6"));
  }
  return out;
}

// 고른 물질 하나의 분류: 정적 표에 있으면 표, 없으면 MSDS 상세(+ 부속서 VI)로. { classes, from: "table"|"detail"|null }
function cmSubstanceClasses({ cas, table, detail, names, annexEntries }) {
  const hit = cas ? cmClassesFromTable(table, cas) : null;
  if (hit) return { classes: hit, from: "table" };
  if (detail || (annexEntries && annexEntries.length)) return { classes: cmClassesFromDetail(detail, names, annexEntries), from: "detail" };
  return { classes: [], from: null };
}

/* ── 짝 판정 ── */
const CM_RANK = { o: 0, c: 1, x: 2 };

function cmWorse(a, b) {
  return CM_RANK[b] > CM_RANK[a] ? b : a;
}

// 한 체계의 분류 짝 → { outcome, code?, note } | null(규칙 없음 = 그 짝은 문제없음)
function cmRule(system, a, b, rules = SAFETY_RULES.compat) {
  const s = rules.systems[system];
  if (system === "ghs") {
    const hit = s.pairs.find(([x, y]) => (x === a && y === b) || (x === b && y === a));
    return hit ? { outcome: hit[2], note: s.notes[hit[3]] } : null;
  }
  const i = s.matrix_order.indexOf(a), j = s.matrix_order.indexOf(b);
  if (i < 0 || j < 0) return null;
  const code = s.matrix[i][j];
  if (code === "-") return { outcome: "o", code, note: s.notes[code] };
  const outcome = s.outcome_of ? s.outcome_of[code] : code;
  return { outcome, code, note: s.notes[code] };
}

// 두 물질의 분류 → { outcome: "x"|"c"|"o"|"unknown", reasons: [{ system, a, b, outcome, code, note }] }  reasons 는 나쁜 것부터
function cmPair(classesA, classesB, rules = SAFETY_RULES.compat) {
  const A = classesA || [], B = classesB || [];
  if (!A.length || !B.length) return { outcome: "unknown", reasons: [] };
  let outcome = "o";
  const reasons = [];
  Object.keys(rules.systems).forEach(system => {
    const ca = [...new Set(A.filter(c => c.system === system).map(c => c.code))];
    const cb = [...new Set(B.filter(c => c.system === system).map(c => c.code))];
    ca.forEach(a => cb.forEach(b => {
      const r = cmRule(system, a, b, rules);
      if (!r || r.outcome === "o") return;
      outcome = cmWorse(outcome, r.outcome);
      if (!reasons.some(x => x.system === system && ((x.a === a && x.b === b) || (x.a === b && x.b === a)))) {
        reasons.push({ system, a, b, outcome: r.outcome, code: r.code || "", note: r.note });
      }
    }));
  });
  reasons.sort((x, y) => CM_RANK[y.outcome] - CM_RANK[x.outcome]);
  return { outcome, reasons };
}

// 물질 목록 [{ id, classes }] → 짝 목록 [{ i, j, outcome, reasons }] (i < j) 와 칸 찾기
function cmMatrix(items, rules = SAFETY_RULES.compat) {
  const pairs = [];
  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) pairs.push({ i, j, ...cmPair(items[i].classes, items[j].classes, rules) });
  }
  return pairs;
}

function cmCell(pairs, i, j) {
  const [a, b] = i < j ? [i, j] : [j, i];
  return pairs.find(p => p.i === a && p.j === b) || null;
}

// 나쁜 짝부터(같으면 원래 순서)
function cmRankedPairs(pairs) {
  const order = { x: 0, c: 1, unknown: 2, o: 3 };
  return [...pairs].sort((p, q) => order[p.outcome] - order[q.outcome] || p.i - q.i || p.j - q.j);
}

// 분류 근거 글("s15:6류 질산", "clp:ox_liq:3", "ph:14", "name", "ox_liq:1") → { kind: "s15"|"s14"|"clp"|"ph"|"name"|"msds2", text, hazard?, sub? }
function cmBasisParts(basis) {
  const b = String(basis || "");
  const m = b.match(/^(s15|s14|ph):(.*)$/);
  if (m) {
    const sub = /\(sub\)$/.test(m[2]);
    return { kind: m[1], text: m[2].replace(/\s*\(sub\)$/, ""), sub };
  }
  if (b === "name" || b === "clp:name") return { kind: "name", text: "" };
  if (b.startsWith("clp:ph:")) return { kind: "ph", text: b.slice(7) };
  if (b.startsWith("clp:")) return { kind: "clp", text: b.slice(4), hazard: /^EUH/.test(b.slice(4)) ? null : ghpEntryParts(b.slice(4)) };
  return { kind: "msds2", text: b, hazard: /^EUH/.test(b) ? null : ghpEntryParts(b) };
}

// 분류 하나의 이름 { ko, en }
function cmClassName(system, code, rules = SAFETY_RULES.compat) {
  return rules.systems[system]?.classes?.[code] || { ko: code, en: code };
}

Object.assign(window, {
  cmClassesFromTable, cmKrClasses, cmUnClasses, cmPhValue, cmAcidOrBase, cmGhsGroups, cmClassesFromDetail, cmSubstanceClasses,
  cmRule, cmPair, cmMatrix, cmCell, cmRankedPairs, cmBasisParts, cmClassName,
});

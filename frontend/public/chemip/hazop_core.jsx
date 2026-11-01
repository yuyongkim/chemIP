// HAZOP 워크시트 순수 함수(hz*): 검토·구간·줄 만들기, 이탈 이름, 위험도, 저장 자료 정리, CSV, 제안 목록. React·fetch·localStorage 없음.
// 자료 모양: study = { v, name, drawing, date, team, processType, risk: { sMax, lMax, high, mid }, nodes: [node] }
//   node = { id, no, name, intent, drawing, equipment, substance: { chem_id, cas_no, name, name_en } | null, rows: [row] }
//   row  = { id, param, guide, deviation, causes, consequences, safeguards, S, L, recNo, rec, owner, due, status }
// 시험: frontend/scripts/tests/test_hazop.cjs

let hzSeq = 0;
function hzId(prefix) {
  hzSeq += 1;
  return `${prefix}${Date.now().toString(36)}${hzSeq.toString(36)}`;
}

function hzNewNode(no) {
  return { id: hzId("n"), no: String(no), name: "", intent: "", drawing: "", equipment: "pipe", substance: null, rows: [] };
}

function hzNewStudy() {
  return { v: 1, name: "", drawing: "", date: "", team: "", processType: "continuous", risk: { ...HAZOP_RISK_DEFAULT }, nodes: [hzNewNode(1)] };
}

// 이탈 이름: 정해진 이름(dev[param][guide]) → "변수 + 가이드워드" → 빈 글
function hzDeviationName(param, guide, L) {
  const named = L.dev?.[param]?.[guide];
  if (named) return named;
  const p = L.params?.[param] || "";
  const g = guide && guide !== "gen" ? L.guides?.[guide] || "" : "";
  return [p, g].filter(Boolean).join(" ");
}

function hzNewRow(param, guide, L, extra = {}) {
  return {
    id: hzId("r"), param: param || "", guide: guide || "", deviation: param ? hzDeviationName(param, guide, L) : "",
    causes: "", consequences: "", safeguards: "", S: null, L: null, recNo: "", rec: "", owner: "", due: "", status: "open",
    ...extra,
  };
}

// 공정 종류에 맞는 변수(회분식이 아니면 시간·순서 뺀다)
function hzParamsFor(processType) {
  return HAZOP_PARAMS.filter(p => !p.batch || processType === "batch");
}

function hzRowCount(node, param, guide) {
  return (node?.rows || []).filter(r => r.param === param && r.guide === guide).length;
}

// 이탈번호: "<구간 번호>-<순번>"
function hzRowNo(node, index) {
  return `${node?.no || "?"}-${index + 1}`;
}

function hzClampLevel(x, max) {
  const n = Math.round(Number(x));
  return Number.isFinite(n) && n >= 1 && n <= max ? n : null;
}

// 위험도 = S × L (둘 다 있을 때만)
function hzRiskScore(row, cfg) {
  const s = hzClampLevel(row?.S, cfg.sMax);
  const l = hzClampLevel(row?.L, cfg.lMax);
  return s && l ? s * l : null;
}

function hzRiskBand(score, cfg) {
  if (score == null) return "none";
  if (score >= cfg.high) return "high";
  if (score >= cfg.mid) return "mid";
  return "low";
}

// 위험도 설정 정리(척도 최대 2–6, 경계 1 ≤ mid ≤ high ≤ sMax·lMax)
function hzNormalizeRisk(raw) {
  const r = raw && typeof raw === "object" ? raw : {};
  const sMax = hzClampLevel(r.sMax, 6) || HAZOP_RISK_DEFAULT.sMax;
  const lMax = hzClampLevel(r.lMax, 6) || HAZOP_RISK_DEFAULT.lMax;
  const top = sMax * lMax;
  const high = Math.min(Math.max(Math.round(Number(r.high)) || HAZOP_RISK_DEFAULT.high, 1), top);
  const mid = Math.min(Math.max(Math.round(Number(r.mid)) || HAZOP_RISK_DEFAULT.mid, 1), high);
  return { sMax: Math.max(sMax, 2), lMax: Math.max(lMax, 2), high, mid };
}

const hzStr = (x, max = 4000) => (typeof x === "string" ? x.slice(0, max) : x == null ? "" : String(x).slice(0, max));

function hzNormalizeRow(r) {
  const o = r && typeof r === "object" ? r : {};
  return {
    id: hzStr(o.id, 40) || hzId("r"),
    param: hzStr(o.param, 40), guide: hzStr(o.guide, 40), deviation: hzStr(o.deviation, 300),
    causes: hzStr(o.causes), consequences: hzStr(o.consequences), safeguards: hzStr(o.safeguards),
    S: o.S == null || o.S === "" ? null : Number(o.S) || null, L: o.L == null || o.L === "" ? null : Number(o.L) || null,
    recNo: hzStr(o.recNo, 40), rec: hzStr(o.rec), owner: hzStr(o.owner, 200), due: hzStr(o.due, 40),
    status: HAZOP_STATUS.includes(o.status) ? o.status : "open",
  };
}

function hzNormalizeNode(n, i) {
  const o = n && typeof n === "object" ? n : {};
  const sub = o.substance && typeof o.substance === "object"
    ? { chem_id: hzStr(o.substance.chem_id, 60), cas_no: hzStr(o.substance.cas_no, 20), name: hzStr(o.substance.name, 200), name_en: hzStr(o.substance.name_en, 200), has_msds: Boolean(o.substance.has_msds) }
    : null;
  return {
    id: hzStr(o.id, 40) || hzId("n"), no: hzStr(o.no, 20) || String(i + 1), name: hzStr(o.name, 300), intent: hzStr(o.intent, 1000),
    drawing: hzStr(o.drawing, 100), equipment: HAZOP_EQUIPMENT.includes(o.equipment) ? o.equipment : "other", substance: sub,
    rows: (Array.isArray(o.rows) ? o.rows : []).slice(0, HAZOP_MAX_ROWS).map(hzNormalizeRow),
  };
}

// localStorage 에서 읽은 값 → 늘 쓸 수 있는 study(망가진 값은 새 검토)
function hzNormalizeStudy(raw) {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.nodes)) return hzNewStudy();
  const nodes = raw.nodes.slice(0, HAZOP_MAX_NODES).map(hzNormalizeNode);
  return {
    v: 1, name: hzStr(raw.name, 300), drawing: hzStr(raw.drawing, 100), date: hzStr(raw.date, 40), team: hzStr(raw.team, 500),
    processType: HAZOP_PROCESS_TYPES.includes(raw.processType) ? raw.processType : "continuous",
    risk: hzNormalizeRisk(raw.risk), nodes: nodes.length ? nodes : [hzNewNode(1)],
  };
}

// 여러 줄 칸에 한 줄 더하기(이미 같은 줄이 있으면 그대로)
function hzAppendLine(text, line) {
  const t = String(text || "");
  const add = String(line || "").trim();
  if (!add) return t;
  if (t.split(/\r?\n/).some(x => x.trim() === add)) return t;
  return t.trim() ? `${t.replace(/\s+$/, "")}\n${add}` : add;
}

function hzCsvCell(v) {
  const s = v == null ? "" : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// study → CSV 글(머리 줄 + 줄마다 한 행, 여러 줄 칸은 줄바꿈 그대로 따옴표 안에). 엑셀용 BOM 은 내려받는 쪽이 붙인다.
function hzCsv(study, L) {
  const C = L.cols;
  const cfg = study.risk;
  const head = [C.node, L.node.name, L.node.intent, C.param, C.guide, ...HAZOP_COLUMNS.map(k => C[k])];
  const lines = [head.map(hzCsvCell).join(",")];
  study.nodes.forEach(node => {
    node.rows.forEach((r, i) => {
      const score = hzRiskScore(r, cfg);
      const vals = {
        no: hzRowNo(node, i), deviation: r.deviation, causes: r.causes, consequences: r.consequences, safeguards: r.safeguards,
        S: r.S ?? "", L: r.L ?? "", risk: score == null ? "" : `${score} (${L.risk.bands[hzRiskBand(score, cfg)]})`,
        recNo: r.recNo, rec: r.rec, owner: r.owner, due: r.due, status: L.status[r.status] || r.status,
      };
      const row = [node.no, node.name, node.intent, L.params[r.param] || r.param, L.guides[r.guide] || r.guide, ...HAZOP_COLUMNS.map(k => vals[k])];
      lines.push(row.map(hzCsvCell).join(","));
    });
  });
  return lines.join("\r\n");
}

// MSDS 2항 H 문구 [{ code }] → 유해성 key(HAZOP_H_HAZARDS 순서, 겹치지 않게)
function hzHazardKeys(hazards) {
  const codes = new Set((hazards || []).flatMap(h => String(h.code || "").split("+")).map(c => c.trim().slice(0, 4).toUpperCase()));
  return HAZOP_H_HAZARDS.filter(h => h.codes.some(c => codes.has(c))).map(h => h.k);
}

// 사고 사례 응답(/api/integrations/incidents 모양) → { causes: [글], disciplines: [{ name, standards }] }
function hzIncidentHints(data, disciplineNames, max = 8) {
  const seen = new Set();
  const causes = [];
  ((data && data.cases) || []).forEach(c => (c.causes || []).forEach(x => {
    const t = String(x || "").trim();
    const k = t.toLowerCase();
    if (t && !seen.has(k) && causes.length < max) { seen.add(k); causes.push(t); }
  }));
  const disciplines = ((data && data.disciplines) || []).map(d => ({
    name: (disciplineNames && disciplineNames[d.key]) || d.label || d.key,
    standards: d.standards || "",
  }));
  return { causes, disciplines };
}

// 제안 묶음 [{ k, title, items: [{ field, text }] }] — 빈 묶음은 뺀다. field 는 causes | consequences | safeguards | rec
function hzSuggestions({ param, equipment, hazardKeys, factsItems, incidentHints }, L) {
  const S = L.suggest;
  const pick = (field, list) => (list || []).map(text => ({ field, text }));
  const groups = [];
  if (param) {
    groups.push({ k: "library", title: S.library, items: [
      ...pick("causes", L.causes[param]), ...pick("consequences", L.consequences[param]), ...pick("safeguards", L.safeguards[param]),
    ] });
  }
  if (equipment && (L.equipmentCauses[equipment] || []).length) {
    groups.push({ k: "equipment", title: S.equipment(L.equipment[equipment] || equipment), items: pick("causes", L.equipmentCauses[equipment]) });
  }
  if ((hazardKeys || []).length) {
    groups.push({ k: "hazards", title: S.hazards, items: pick("consequences", hazardKeys.map(k => L.hazards[k]).filter(Boolean)) });
  }
  if ((factsItems || []).length) {
    groups.push({ k: "facts", title: S.facts, items: pick("consequences", factsItems.map(f => `${f.label}: ${f.text}`)) });
  }
  if (incidentHints) {
    if (incidentHints.causes.length) groups.push({ k: "incidents", title: S.incidents, items: pick("causes", incidentHints.causes) });
    if (incidentHints.disciplines.length) {
      groups.push({ k: "disciplines", title: S.disciplines, items: pick("rec", incidentHints.disciplines.map(d => S.disciplineRec(d.name, d.standards))) });
    }
  }
  return groups.filter(g => g.items.length);
}

// 예시 검토(문구는 L.example)
function hzExampleStudy(L) {
  const E = L.example;
  const node = { ...hzNewNode(1), name: E.node, intent: E.intent, equipment: "tank",
    substance: { chem_id: "", cas_no: "108-88-3", name: E.substance, name_en: "Toluene", has_msds: false } };
  node.rows = E.rows.map((r, i) => hzNewRow(r.param, r.guide, L, { ...r, recNo: String(i + 1) }));
  return { ...hzNewStudy(), name: E.study, team: E.team, nodes: [node] };
}

Object.assign(window, {
  hzId, hzNewNode, hzNewStudy, hzDeviationName, hzNewRow, hzParamsFor, hzRowCount, hzRowNo, hzRiskScore, hzRiskBand,
  hzNormalizeRisk, hzNormalizeRow, hzNormalizeNode, hzNormalizeStudy, hzAppendLine, hzCsvCell, hzCsv, hzHazardKeys,
  hzIncidentHints, hzSuggestions, hzExampleStudy,
});

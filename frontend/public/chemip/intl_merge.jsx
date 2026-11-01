// 국가별 규제 순수 함수 — 응답(intl) 정리. React·문구 없음.
//   intlDedupe(jurisdictions)        같은 목록에 이름 표기만 다른 줄(Ethene / Ethylene)을 한 항목으로, 다른 이름은 aka.
//                                    "listed under another name"(EPCRA 313) 줄은 별칭, 기준 글이 다른 줄은 forms(형태별).
//                                    서버 쪽 같은 규칙: backend/core/intl_dedupe.py — 옛 정적 파일(p/<cas>.json)도 화면에서 합친다.
//   intlNamedItems(lists, meta)      상대국 법령 목록(intl_lists/, 수출입 탭과 같은 자료) 등재 → 같은 모양의 항목(관할별),
//                                    구조 칸(INTL_ENTRY_FACT_FIELDS, 예: REACH 등록 수)이 있으면 item.facts
//   intlCombine(intl, named)         둘을 합친 화면 자료 { cas_no, count(목록 수), jurisdictions, thresholds, named }
//   intlWithAdded(pageLists, added)  물질 파일(p/)의 intl_lists + 그 뒤에 추가된 목록 조각(g/intl_add_<n>.json) — 같은 list_id 는 물질 파일 것
// 시험: frontend/scripts/tests/test_intl_merge.cjs

const INTL_ALIAS_RE = /listed under another name/i;
// 목록 항목의 구조 칸(EU_REACH_REGISTERED: ECHA CHEM 값) — 화면이 따로 배치한다(reach_format.jsx). 같은 묶음: backend/core/intl_named_lists.py
const INTL_ENTRY_FACT_FIELDS = ["ec", "echa_id", "tonnage_band", "active_registrations", "registration_types", "nons",
  "first_registered", "last_updated", "url"];

// 목록 항목 → 그 구조 칸만 (없으면 빈 객체)
function intlEntryFacts(e) {
  const out = {};
  INTL_ENTRY_FACT_FIELDS.forEach(f => { if (e && e[f] !== undefined) out[f] = e[f]; });
  return out;
}

function intlNameKey(name) {
  return String(name || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function intlUniqueNames(names) {
  const seen = new Set();
  const out = [];
  names.forEach(n => {
    const t = String(n || "").trim();
    if (t && !seen.has(intlNameKey(t))) { seen.add(intlNameKey(t)); out.push(t); }
  });
  return out;
}

// 항목 → 원래 줄들 [{ detail, name }] (이미 합친 항목이면 forms·aka 를 다시 펼친다)
function intlRowsOf(item) {
  if (Array.isArray(item.forms) && item.forms.length) {
    return item.forms.flatMap(f => [f.name, ...(f.aka || [])].map(name => ({ detail: f.detail || "", name })))
      .concat((item.aka || []).map(name => ({ detail: "", name, alias: true })));
  }
  return [item.name, ...(item.aka || [])].map(name => ({ detail: item.detail || "", name }));
}

function intlPickNames(names, votes) {
  return names.map((n, i) => [n, i]).sort((a, b) => (votes.get(intlNameKey(b[0])) || 0) - (votes.get(intlNameKey(a[0])) || 0) || a[1] - b[1]).map(x => x[0]);
}

function intlMinQuantity(items) {
  const qs = items.map(x => x.quantity).filter(q => q && Number.isFinite(q.kg));
  return qs.length ? qs.reduce((a, b) => (b.kg < a.kg ? b : a)) : null;
}

// 한 목록(같은 regulation)의 항목들 → 하나
function intlMergeGroup(items, votes) {
  const rows = items.flatMap(intlRowsOf);
  const real = rows.filter(r => !r.alias && !INTL_ALIAS_RE.test(r.detail));
  const alias = rows.filter(r => r.alias || INTL_ALIAS_RE.test(r.detail));
  const body = real.length ? real : alias;
  const byDetail = new Map();
  body.forEach(r => {
    const d = String(r.detail || "").trim();
    if (!byDetail.has(d)) byDetail.set(d, []);
    byDetail.get(d).push(r.name);
  });
  const forms = [...byDetail.entries()].map(([detail, names]) => ({ detail, names: intlPickNames(intlUniqueNames(names), votes) }));
  const extra = real.length ? intlUniqueNames(alias.map(r => r.name)) : [];
  const first = forms[0] || { detail: "", names: [] };
  const base = items[0];
  const out = { ...base, detail: first.detail };
  delete out.aka;
  delete out.forms;
  const q = intlMinQuantity(items);
  if (q) out.quantity = q; else delete out.quantity;
  if (forms.length <= 1) {
    const names = intlPickNames(intlUniqueNames([...first.names, ...extra]), votes);
    out.name = names[0] || "";
    if (names.length > 1) out.aka = names.slice(1);
    return out;
  }
  out.name = first.names[0] || "";
  out.forms = forms.map(f => ({ name: f.names[0] || "", detail: f.detail, ...(f.names.length > 1 ? { aka: f.names.slice(1) } : {}) }));
  const known = new Set(forms.flatMap(f => f.names.map(intlNameKey)));
  const more = extra.filter(n => !known.has(intlNameKey(n)));
  if (more.length) out.aka = more;
  return out;
}

function intlDedupe(jurisdictions) {
  const all = Object.values(jurisdictions || {}).flat();
  const votes = new Map();
  all.flatMap(intlRowsOf).forEach(r => {
    const k = intlNameKey(r.name);
    if (k) votes.set(k, (votes.get(k) || 0) + 1);
  });
  const out = {};
  Object.entries(jurisdictions || {}).forEach(([code, items]) => {
    const groups = new Map();
    (items || []).forEach(x => {
      if (!groups.has(x.regulation)) groups.set(x.regulation, []);
      groups.get(x.regulation).push(x);
    });
    out[code] = [...groups.values()].map(g => intlMergeGroup(g, votes));
  });
  return out;
}

// 상대국 법령 목록 등재(facts.intl_lists 또는 서버 named_lists) + 목록 머리(규칙집 intl_lists) → { 관할: [항목] }.
// 이름이 같은 CAS 줄은 하나로(첫 줄 기준 글), 물질군(family) 등재는 넣지 않는다(이 물질 이름으로 오른 것만).
function intlNamedItems(lists, metaById) {
  const out = {};
  (lists || []).forEach(m => {
    const meta = (metaById && metaById[m.list_id]) || m;
    const code = meta.jurisdiction || m.jurisdiction;
    const entries = m.entries || [];
    if (!code || !entries.length) return;
    const names = intlUniqueNames(entries.map(e => e.name));
    const item = {
      regulation: m.list_id, list: meta.title || m.title || m.list_id, detail: String(entries[0].detail || ""),
      source: meta.law || m.law || "", name: names[0] || "", named_list: true,
    };
    if (names.length > 1) item.aka = names.slice(1);
    const facts = intlEntryFacts(entries[0]);
    if (Object.keys(facts).length) item.facts = facts;
    (out[code] = out[code] || []).push(item);
  });
  return out;
}

function intlWithAdded(pageLists, added) {
  const base = Array.isArray(pageLists) ? pageLists : [];
  const have = new Set(base.map(m => m.list_id));
  return [...base, ...(Array.isArray(added) ? added : []).filter(m => m && m.list_id && !have.has(m.list_id))];
}

function intlCombine(intl, named) {
  if (!intl && !named) return null;
  const base = intlDedupe((intl && intl.jurisdictions) || {});
  const extra = named || {};
  const jurisdictions = {};
  [...new Set([...Object.keys(base), ...Object.keys(extra)])].forEach(code => {
    const have = new Set((base[code] || []).map(x => x.regulation));
    jurisdictions[code] = [...(base[code] || []), ...(extra[code] || []).filter(x => !have.has(x.regulation))];
  });
  const count = Object.values(jurisdictions).reduce((s, xs) => s + xs.length, 0);
  const namedCount = Object.values(jurisdictions).flat().filter(x => x.named_list).length;
  return { ...(intl || {}), cas_no: (intl && intl.cas_no) || "", count, named: namedCount, jurisdictions, thresholds: (intl && intl.thresholds) || [] };
}

Object.assign(window, { INTL_ALIAS_RE, INTL_ENTRY_FACT_FIELDS, intlEntryFacts, intlNameKey, intlRowsOf, intlMergeGroup, intlDedupe, intlNamedItems, intlWithAdded, intlCombine });

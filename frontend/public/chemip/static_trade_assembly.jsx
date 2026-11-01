// 정적 자료 · 규제·인허가 / 수출입 조립 — 순수 함수(fetch·React 없음).
// 물질 파일(p/<cas>.json 의 ncis·controlled·kr_law·intl_lists·hs·hsk10_candidates·intl) + 공용 규칙집(g/rulebook.json)
// + 공용 자료 상태(g/trade_common.json)로 GET /api/regulations/trade-controls/{cas}?direction=&country= 와 같은 응답을 만든다.
// 원본: backend/core/trade_controls/{assemble,lists,permits,rules,substance}.py, scripts/static_export/trade_assembly_ref.py
// (CONTRACT.md "Assembling a country view").
// KOTRA 수입규제는 외부 API 라 정적 자료에 없다: destination.kotra 는 null, destination.kotra_unavailable = "offline".

const STA_HOME = "KR";
const STA_INTL = "INTL";
const STA_DIRECTIONS = ["import", "export"];
const STA_COUNTERPART = { export: "import", import: "export" }; // 한국이 수출하면 상대국은 수입
const STA_CAS_RE = /^\d{2,7}-\d{2}-\d$/;
const STA_SUBCATEGORY_SUFFIX = " 세분류";
const STA_INTL_META_FIELDS = [
  "list_id", "jurisdiction", "law", "title", "directions", "obligation_for_kr_exporter", "legal_basis",
  "source_url", "source_version", "retrieved", "license",
];
const STA_KR_LAW_META_FIELDS = [
  "list_id", "law", "title", "jurisdiction", "legal_basis", "source_url", "amended_on", "retrieved", "obligations",
];

// ── 파이썬 값 규칙 ──
function staTruthy(v) {
  if (Array.isArray(v)) return v.length > 0;
  if (v && typeof v === "object") return Object.keys(v).length > 0;
  return Boolean(v);
}
function staStr(v) {
  if (v === true) return "True";
  if (v === false) return "False";
  if (v === null || v === undefined) return "None";
  return String(v);
}
function staIsDict(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}
function staGet(obj, key, dflt = null) {
  return staIsDict(obj) && Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : dflt;
}
function staPick(obj, fields) {
  const out = {};
  fields.forEach(f => { out[f] = staGet(obj, f); });
  return out;
}
function staSorted(values) {
  return [...values].sort(saCompare);
}
function staAsSet(value) {
  const values = Array.isArray(value) ? value : [value];
  const out = new Set();
  values.forEach(v => {
    if (!staTruthy(v)) return;
    const s = saStrip(staStr(v));
    if (s) out.add(s);
  });
  return out;
}
function staIntersect(a, b) {
  return [...a].filter(x => b.has(x));
}

function staBaseCategory(name) {
  const n = saStrip(name || "");
  return n.endsWith(STA_SUBCATEGORY_SUFFIX) ? saStrip(n.slice(0, -STA_SUBCATEGORY_SUFFIX.length)) : n;
}

function staDirectionOk(listDirections, direction) {
  const ds = new Set((staTruthy(listDirections) ? listDirections : []).map(d => saStrip(staStr(d)).toLowerCase()));
  return ds.size === 0 || ds.has(direction) || ds.has("both");
}

function staJurisdictions(country, parentBlocs) {
  return country ? [country, ...(staGet(parentBlocs, country) || [])] : [];
}

// ── substance.py ──
function staRegulationCodes(intl) {
  const out = new Set();
  Object.values(staGet(intl, "jurisdictions") || {}).forEach(items => (items || []).forEach(it => out.add(staGet(it, "regulation", ""))));
  out.delete("");
  return out;
}

// ── lists.py ──
function staGroupByLaw(memberships) {
  const groups = [];
  const at = new Map();
  memberships.forEach(m => {
    const law = saStrip(staStr(staTruthy(m.law) ? m.law : staTruthy(m.title) ? m.title : staTruthy(m.list_id) ? m.list_id : ""));
    if (!at.has(law)) { at.set(law, groups.length); groups.push({ law, lists: [] }); }
    groups[at.get(law)].lists.push(m);
  });
  return groups;
}

// ── permits.py ──
function staMatchTrigger(trigger, lists, categories) {
  if (!staIsDict(trigger)) return null;
  const listIds = new Set([...staAsSet(staGet(trigger, "list_id")), ...staAsSet(staGet(trigger, "list_ids"))]);
  const hitLists = staSorted(staIntersect(listIds, lists));
  const cats = new Set([...staAsSet(staGet(trigger, "ncis_category"))].map(staBaseCategory));
  const hitCats = staSorted(staIntersect(cats, categories));
  if (!hitLists.length && !hitCats.length) return null;
  const matched = {};
  if (hitLists.length) matched.list_id = hitLists;
  if (hitCats.length) matched.ncis_category = hitCats;
  if (staTruthy(staGet(trigger, "condition"))) matched.condition = trigger.condition;
  return matched;
}

function staEvaluatePermits(items, lists, categories) {
  const out = [];
  (items || []).forEach(item => {
    const t = staGet(item, "trigger");
    const triggers = Array.isArray(t) ? t : [t];
    const matched = triggers.map(x => staMatchTrigger(x, lists, categories)).filter(staTruthy);
    if (!matched.length) return;
    const rest = {};
    Object.keys(item).forEach(k => { if (k !== "_file") rest[k] = item[k]; });
    out.push({
      ...rest,
      file: staGet(item, "_file", ""),
      matched_by: matched,
      citation: {
        legal_basis: staGet(item, "legal_basis", ""),
        source_url: staGet(item, "source_url", ""),
        verified_text: staGet(item, "verified_text", ""),
      },
    });
  });
  return out;
}

// ── rules.py ──
function staDirectionApplies(ruleDirection, direction) {
  const d = saStrip(staStr(staTruthy(ruleDirection) ? ruleDirection : "both")).toLowerCase();
  return d === "both" || d === direction;
}

function staMatchCondition(when, categories, lists) {
  if (!staIsDict(when) || !staTruthy(when)) return null;
  const matched = {};
  for (const [key, value] of Object.entries(when)) {
    if (key === "any_substance") {
      if (value !== true) return null;
      matched[key] = ["*"];
      continue;
    }
    if (key === "any_of") {
      const subs = Array.isArray(value) ? value.map(w => staMatchCondition(w, categories, lists)) : [];
      const hits = subs.filter(staTruthy);
      if (!hits.length) return null;
      hits.forEach(m => Object.entries(m).forEach(([k, v]) => {
        if (!matched[k]) matched[k] = [];
        const cur = matched[k];
        cur.push(...v.filter(x => !cur.includes(x)));
      }));
      continue;
    }
    let hit;
    if (key === "ncis_category") {
      hit = staSorted(staIntersect(new Set([...staAsSet(value)].map(staBaseCategory)), categories));
    } else if (key === "list") {
      hit = staSorted(staIntersect(staAsSet(value), lists));
    } else {
      return null;
    }
    if (!hit.length) return null;
    matched[key] = hit;
  }
  return matched;
}

function staEvaluateRules(rules, categories, lists, direction) {
  const out = [];
  (rules || []).forEach(rule => {
    if (!staIsDict(rule) || rule.active === false || !staDirectionApplies(staGet(rule, "direction"), direction)) return;
    const when = staGet(rule, "when");
    const matched = staMatchCondition(staTruthy(when) ? when : {}, categories, lists);
    if (matched === null) return;
    const supporting = staGet(rule, "supporting_citations");
    out.push({
      ...rule,
      matched_by: matched,
      customs_confirmation: staTruthy(staGet(rule, "customs_confirmation")),
      citation: {
        legal_basis: staGet(rule, "legal_basis", ""),
        source_url: staGet(rule, "source_url", ""),
        verified_text: staGet(rule, "verified_text", ""),
        supporting: (staTruthy(supporting) ? supporting : []).filter(staIsDict),
      },
    });
  });
  return out;
}

// ── assemble.py ──
function staDestinationListings(intl, country, parentBlocs) {
  const jur = staGet(intl, "jurisdictions") || {};
  const out = [];
  [country, ...(staGet(parentBlocs, country) || []), STA_INTL].forEach(code => {
    (staGet(jur, code) || []).forEach(item => out.push({ ...item, country: code }));
  });
  return out;
}

function staFullMembership(m, meta, fields, listField) {
  const md = meta || {}; // 규칙집에 없는 목록이면 머리 정보 없이 등재 항목만 보인다
  const item = staPick(md, fields);
  item[listField] = staTruthy(item[listField]) ? item[listField] : [];
  return { ...item, entries: m.entries, family_entries: m.family_entries, file: staGet(md, "file", "") };
}

// 상대국 법령 목록(intl_lists/). country 가 없으면 모든 나라, 고르면 absence_note 목록의 미등재도 알린다.
function staIntlView(facts, rulebook, direction, country) {
  const wanted = staJurisdictions(country, rulebook.parent_blocs);
  const side = STA_COUNTERPART[direction];
  const metaById = new Map((rulebook.intl_lists || []).map(m => [m.list_id, m]));
  const scoped = (rulebook.intl_lists || []).filter(m =>
    (!wanted.length || wanted.includes(staGet(m, "jurisdiction"))) && staDirectionOk(staGet(m, "directions"), side));
  const ids = scoped.map(m => m.list_id);
  const found = (facts.intl_lists || []).filter(m => ids.includes(m.list_id))
    .map(m => staFullMembership(m, metaById.get(m.list_id), STA_INTL_META_FIELDS, "directions"))
    .sort((a, b) => ids.indexOf(a.list_id) - ids.indexOf(b.list_id));
  if (!country) return found;
  const got = new Set(found.map(m => m.list_id));
  const absent = scoped
    .filter(md => staTruthy(staGet(md, "absence_note")) && !got.has(md.list_id))
    .map(md => {
      const item = staPick(md, STA_INTL_META_FIELDS);
      return Object.assign(item, {
        directions: staTruthy(item.directions) ? item.directions : [], absent: true, absence_note: md.absence_note,
        entries: [], family_entries: [], file: md.file,
      });
    });
  return found.concat(absent);
}

function staNormalizeCas(value) {
  return saStrip(staStr(value == null ? "" : value).replace(/\s+/g, ""));
}

// facts: p/<cas>.json 객체, rulebook: g/rulebook.json, common: g/trade_common.json
function assembleTradeControls(facts, rulebook, common, cas, direction = "import", country = "") {
  cas = staNormalizeCas(cas);
  direction = saStrip(direction || "import").toLowerCase();
  country = saStrip(country || "").toUpperCase();
  const base = { cas, direction, country };
  if (!STA_CAS_RE.test(cas)) return { ...base, error: "invalid_cas" };
  if (!STA_DIRECTIONS.includes(direction)) return { ...base, error: "invalid_direction" };

  const ncis = facts.ncis || {};
  const intl = facts.intl || {};
  const metaKr = new Map((rulebook.kr_lists || []).map(m => [m.list_id, m]));
  const controlled = facts.controlled || [];
  const krLaw = (facts.kr_law || []).map(m => staFullMembership(m, metaKr.get(m.list_id), STA_KR_LAW_META_FIELDS, "obligations"));
  const categories = new Set((ncis.classifications || []).map(c => staGet(c, "category")).filter(staTruthy));
  const memberships = new Set([
    ...staRegulationCodes(intl),
    ...controlled.map(m => staGet(m, "list_id")).filter(staTruthy),
    ...krLaw.map(m => m.list_id).filter(staTruthy),
  ]);
  const krRules = rulebook.kr_rules || {};
  const hs = facts.hs || [];

  let destination = null;
  if (country && country !== STA_HOME) {
    destination = {
      country,
      role: direction === "export" ? "destination_import" : "origin",
      listings: staDestinationListings(intl, country, rulebook.parent_blocs),
      kotra: null,
      intl_lists: staIntlView(facts, rulebook, direction, country),
    };
    if (direction === "export") destination.kotra_unavailable = "offline";
  }

  return {
    ...base,
    substance: {
      name_ko: staGet(ncis, "name_ko", ""),
      name_en: staGet(ncis, "name_en", ""),
      ncis_categories: staSorted(categories),
      list_codes: staSorted(memberships),
    },
    kr_law_lists: staGroupByLaw(krLaw),
    kr_permits: staEvaluatePermits(rulebook.permits, memberships, categories),
    hs,
    hs_meta: hs.length ? rulebook.hs_meta : {},
    hsk10_candidates: facts.hsk10_candidates || [],
    kr_obligations: staEvaluateRules(staTruthy(krRules.rules) ? krRules.rules : [], categories, memberships, direction),
    kr_unverified: staEvaluateRules(staTruthy(krRules.unverified) ? krRules.unverified : [], categories, memberships, direction),
    controlled_lists: controlled.filter(m => staDirectionOk(staGet(m, "directions"), direction)),
    controlled_lists_any: controlled.map(m => ({
      list_id: staGet(m, "list_id"), title: staGet(m, "title"), directions: staTruthy(m.directions) ? m.directions : [],
    })),
    destination,
    intl_lists: destination ? [] : staIntlView(facts, rulebook, direction, ""),
    sources_status: common.sources_status,
  };
}

Object.assign(window, { assembleTradeControls });

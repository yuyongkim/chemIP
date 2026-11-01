// 국가별 규제 순수 함수 — 응답(jurisdictions) → 지도 색칠 색인, 목록별 묶음, 지도 칸 색.

// Country-level codes win over the EU block, so a Dutch listing colours the Netherlands itself.
function isoIndex(codes) {
  const idx = {};
  codes.filter(c => (INTL_JURISDICTIONS[c]?.iso || []).length > 1)
    .forEach(c => INTL_JURISDICTIONS[c].iso.forEach(id => { idx[id] = c; }));
  codes.filter(c => (INTL_JURISDICTIONS[c]?.iso || []).length === 1)
    .forEach(c => { idx[INTL_JURISDICTIONS[c].iso[0]] = c; });
  return idx;
}

// Old bulk imports store bare markers ("X", or "313" for EPCRA_313) — they say "listed", not a value.
function meaningfulDetail(x) {
  const d = String(x.detail || "").trim();
  if (!d || /^x$/i.test(d) || (/^\d{1,4}$/.test(d) && String(x.regulation).includes(d))) return "";
  return d;
}

// List name in the screen language: PRODUCT_LABELS.intl.listNames[regulation] (English file only), else the response's list.
// Lists from intl_lists/ (named_list) take their English name from REG_LIST_ENGLISH_NAMES (reg_list_names_en.jsx).
function intlListName(x) {
  const en = x.named_list && typeof REG_LIST_ENGLISH_NAMES !== "undefined" ? REG_LIST_ENGLISH_NAMES[x.regulation] : "";
  return PRODUCT_LABELS.intl.listNames?.[x.regulation] || (en ? tr(x.list, en) : x.list);
}

// Listing detail with our own Korean annotations swapped by PRODUCT_LABELS.intl.detailPhrases (empty in Korean).
function intlDetailText(detail) {
  return (PRODUCT_LABELS.intl.detailPhrases || []).reduce((s, [from, to]) => s.split(from).join(to), String(detail || ""));
}

// One block per regulation. Name variants are already merged (intl_merge.jsx): a merged item gives one entry,
// or one entry per form (anhydrous / solution …) when the list sets a different value for each; aka = other names.
function intlEntriesOf(x) {
  const forms = Array.isArray(x.forms) && x.forms.length ? x.forms : [{ name: x.name, detail: x.detail, aka: x.aka }];
  // facts·reachState·checked: 구조 칸이 있는 목록(EU REACH 등록, intl_reach.jsx)의 칸 — ReachEntry 가 그린다
  const more = { facts: x.facts, reachState: x.reach_state, checked: x.checked, echaUrl: x.echa_url, onDemand: x.on_demand, statusOnly: x.status_only };
  return forms.map(f => ({ name: f.name, aka: f.aka || [], detail: intlDetailText(meaningfulDetail({ ...x, detail: f.detail })), ...more }));
}

function groupByRegulation(listings) {
  const groups = [];
  const at = {};
  listings.forEach(x => {
    if (!(x.regulation in at)) {
      at[x.regulation] = groups.length;
      groups.push({ regulation: x.regulation, list: intlListName(x), source: x.source, entries: [] });
    }
    groups[at[x.regulation]].entries.push(...intlEntriesOf(x));
  });
  return groups;
}

// 지도 한 나라의 채움·테두리(색은 tokens.css 변수). code: 등재 관할 키(없으면 회색), n/max: 등재 건수 비율.
function mapCellPaint(code, active, n, max) {
  const fill = !code ? "var(--bg-sunken)"
    : code === active ? "var(--accent)"
    : `color-mix(in srgb, var(--accent) ${Math.round(30 + 45 * (n / max))}%, var(--bg-sunken))`;
  const on = code === active;
  return { fill, stroke: on ? "var(--accent-ink)" : "var(--border)", strokeWidth: on ? 1.2 : 0.5 };
}

// 임계량 비교: 로그 축 위치(%)
function logPos(v, lo, hi) {
  const a = Math.log10(lo), b = Math.log10(hi);
  return b > a ? Math.max(2, Math.min(100, ((Math.log10(v) - a) / (b - a)) * 100)) : 100;
}

// 같은 종류의 임계량 묶음 → 표시 범위(lo~hi), 가장 엄격한 값, 최대/최소 배수
function thresholdScale(rows) {
  const vals = rows.flatMap(r => [r.kg, r.kg_upper].filter(Boolean));
  const strictest = Math.min(...rows.map(r => r.kg));
  return { lo: Math.min(...vals) / 3, hi: Math.max(...vals) * 1.5, strictest, ratio: Math.max(...rows.map(r => r.kg)) / strictest };
}

Object.assign(window, { isoIndex, meaningfulDetail, intlListName, intlDetailText, intlEntriesOf, groupByRegulation, mapCellPaint, logPos, thresholdScale });

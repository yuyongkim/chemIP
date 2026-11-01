// Pure helpers for the 규제·인허가 / 수출입 tab — response → display shapes. No React, no fetch.
// 입력은 /api/regulations/trade-controls/{cas} 응답(backend/core/trade_controls/assemble.py).

// 섹션의 자료 파일 중 하나라도 있으면 true (없으면 "자료 준비 중").
function tcSourceReady(status, group) {
  return (TRADE_SOURCE_GROUPS[group] || []).some(f => status?.[f] === "present");
}

// 상대국 선택지: 한국(자국)과 국제협약(INTL)은 상대국이 아니라 뺀다.
function tcCountryOptions(jurisdictions) {
  return Object.keys(jurisdictions || {}).filter(c => c !== "KR" && c !== "INTL");
}

// 화면 언어로 고른 값: 영어 화면은 영어 값이 있으면 영어, 한국어 화면은 한국어 값이 있으면 한국어.
function tcLocalized(ko, en) {
  return CHEMIP_LANG === "en" ? (en || ko || "") : (ko || en || "");
}

function tcCountryName(code) {
  const j = code ? INTL_JURISDICTIONS[code] : null;
  return code ? (j ? tcLocalized(j.ko, j.en) : code) : "";
}

// 상대국 선택지·섹션 제목용 나라 이름. 한국어 화면은 "미국 · United States", 영어 화면은 영어 이름만.
function tcCountryLabel(code) {
  return CHEMIP_LANG === "en" ? tcCountryName(code) : jurisdictionLabel(code);
}

// 물질 이름(탭 문장·체크리스트 머리). 영어 화면은 영문명을 먼저 쓴다.
function tcSubstanceName(selected, data) {
  const ko = selected?.name || data?.substance?.name_ko;
  const en = selected?.name_en || data?.substance?.name_en;
  return tcLocalized(ko, en) || data?.cas || "";
}

// 규칙·인허가 한 건에서 보여 줄 [라벨, 값] 쌍. 값이 빈 칸은 뺀다.
function tcFieldRows(item, keys) {
  return keys
    .map(k => [k, Array.isArray(item[k]) ? item[k].join(" · ") : item[k]])
    .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== "");
}

// matched_by → 표시용 태그 [{key, text}]. 규칙은 {key:[...]} 하나, 인허가는 그 목록.
function tcMatchTags(matchedBy) {
  const blocks = Array.isArray(matchedBy) ? matchedBy : [matchedBy || {}];
  const tags = [];
  blocks.forEach(m => Object.entries(m || {}).forEach(([k, vals]) => {
    if (k === "condition") return;
    (Array.isArray(vals) ? vals : [vals]).forEach(v => tags.push({ key: `${k}-${v}`, label: TRADE_LABELS.matchedBy[k] || k, value: v === "*" ? "" : v }));
  }));
  return tags;
}

// 인허가 trigger 조건 문구들(평가하지 않고 그대로 보인다).
function tcConditions(matchedBy) {
  return (Array.isArray(matchedBy) ? matchedBy : [matchedBy || {}]).map(m => m?.condition).filter(Boolean);
}

// 목록 이름·등재 내용을 화면 언어로. 영어 이름표는 한 곳(product_intl_helpers.jsx 의 intlListName·intlDetailText,
// PRODUCT_LABELS.intl)에 있고, 그 파일이 없으면 응답 값을 그대로 쓴다.
function tcListingListName(x) {
  return typeof intlListName === "function" ? intlListName(x) : x.list;
}

function tcListingDetail(detail) {
  return typeof intlDetailText === "function" ? intlDetailText(detail) : detail;
}

// 상대국 등재 내역을 나라+목록 단위로 묶는다.
// product_intl_helpers.jsx 의 groupByRegulation 과 비슷하지만 나라 키가 함께 들어간다.
function tcGroupListings(listings) {
  const groups = [];
  const at = {};
  (listings || []).forEach(x => {
    const key = `${x.country}|${x.regulation}`;
    if (!(key in at)) { at[key] = groups.length; groups.push({ key, country: x.country, list: tcListingListName(x), source: x.source, details: [] }); }
    const detail = x.detail ? tcListingDetail(x.detail) : "";
    if (detail && !groups[at[key]].details.includes(detail)) groups[at[key]].details.push(detail);
  });
  return groups;
}

// 목록 등재 항목(통제 목록·국내 법령)의 표시 이름.
function tcEntryName(e) {
  if (CHEMIP_LANG === "en") return e?.name_en || e?.name || e?.family || e?.name_ko || "";
  return e?.name_ko || e?.name || e?.family || e?.name_en || "";
}

// 규제 화면에서 노랗게 표시할 낱말: 이 물질의 한글명·영문명·CAS. 목록 항목·조문 발췌·KOTRA 품목명에 같이 쓴다.
function tcHighlightTerms(data) {
  const s = data?.substance || {};
  return [s.name_ko, s.name_en, data?.cas].filter(Boolean);
}

// 목록 항목 한 줄의 표시 낱말: 물질 공통 낱말 + 그 목록에 실린 이름(예: 스위스 목록의 "Benzol").
function tcEntryTerms(entry, terms) {
  const own = entry?.cas && terms.includes(entry.cas) ? tcEntryName(entry) : null;
  return own ? [...terms, own] : terms;
}

function tcCustomsCount(rules) {
  return (rules || []).filter(r => r.customs_confirmation).length;
}

// citation.verified_text → 표시할 문장 목록. 문자열 하나 · 문자열 배열 · {instrument, article, text} 배열 모두 받는다.
function tcQuoteLines(verified) {
  const items = Array.isArray(verified) ? verified : verified ? [verified] : [];
  return items
    .map(v => (typeof v === "string" ? v : v && v.text ? `${[v.instrument, v.article].filter(Boolean).join(" ")}${v.instrument || v.article ? " " : ""}${v.text}` : ""))
    .filter(Boolean);
}

// 인허가 종류(kind) 표시 글자. 한국어 화면: 영문 코드(permit·approval …)는 한국어로, 이미 한국어면 그대로.
// 영어 화면: 영문 코드·한국어 종류 모두 영어로(trade_controls_labels_en.jsx kinds).
function tcKindLabel(kind) {
  const k = String(kind || "").trim();
  return TRADE_LABELS.kinds[k] || k;
}

// 종류 글자 → Badge tone ("hazard" | "accent" | ""). 대소문자는 가리지 않는다(영어 화면).
function tcKindTone(kind) {
  const label = tcKindLabel(kind).toLowerCase();
  const hit = TRADE_LABELS.kindTones.find(([word]) => label.includes(word.toLowerCase()));
  return hit ? hit[1] : "";
}

// 인허가 항목을 법령별로 묶는다(등장 순서 유지). law 가 없으면 "기타".
function tcGroupByLaw(items, fallback = "—") {
  const groups = [];
  const at = {};
  (items || []).forEach(it => {
    const law = String(it.law || "").trim() || fallback;
    if (!(law in at)) { at[law] = groups.length; groups.push({ law, items: [] }); }
    groups[at[law]].items.push(it);
  });
  return groups;
}

// 종류별 건수 [[표시 글자, 건수]] — 많은 순.
function tcKindCounts(items) {
  const counts = {};
  (items || []).forEach(it => { const k = tcKindLabel(it.kind); if (k) counts[k] = (counts[k] || 0) + 1; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

// 통제 목록 등재(방향 무관) → [{ name, directions }]. 응답에 controlled_lists_any 가 없으면 지금 방향 목록으로 대신한다.
function tcControlSummary(data) {
  const lists = data?.controlled_lists_any || data?.controlled_lists || [];
  return lists.map(l => ({ name: TRADE_LABELS.listShort[l.list_id] || l.title || l.list_id, directions: l.directions || [] }));
}

// 탭 맨 위 요약에 쓸 숫자. 자료가 없으면 ready=false 로 "자료 준비 중".
function tcSummary(data) {
  const status = data?.sources_status;
  const laws = data?.kr_law_lists || [];
  const rules = data?.kr_obligations || [];
  return {
    laws: { ready: tcSourceReady(status, "krLaw"), n: laws.length, lists: laws.reduce((a, g) => a + (g.lists || []).length, 0) },
    permits: { ready: tcSourceReady(status, "permits"), n: (data?.kr_permits || []).length, kinds: tcKindCounts(data?.kr_permits) },
    obligations: { ready: tcSourceReady(status, "obligations"), n: rules.length, customs: tcCustomsCount(rules) },
    controls: { ready: tcSourceReady(status, "lists"), lists: tcControlSummary(data) },
    hs: (data?.hs || []).map(h => h.hs6).filter(Boolean),
  };
}

// 인허가 한 건의 표시 이름. 새 형식은 name, 옛 형식(kr_permits_safety 이전 판)은 name_ko·permit·obligation.
function tcPermitName(p) {
  return p?.name || p?.name_ko || p?.permit || p?.obligation || p?.permit_id || "";
}

// HS6 "290220" → "2902.20" (관세청 표기).
function tcHsDots(hs6) {
  const s = String(hs6 || "");
  return /^\d{6}$/.test(s) ? `${s.slice(0, 4)}.${s.slice(4)}` : s;
}

Object.assign(window, {
  tcKindLabel, tcKindTone, tcGroupByLaw, tcKindCounts, tcSummary, tcHsDots, tcPermitName, tcControlSummary,
});

Object.assign(window, {
  tcSourceReady, tcCountryOptions, tcCountryName, tcFieldRows, tcMatchTags, tcConditions,
  tcGroupListings, tcEntryName, tcCustomsCount, tcQuoteLines, tcLocalized, tcCountryLabel, tcSubstanceName,
});

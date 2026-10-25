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

function tcCountryName(code) {
  return code ? (INTL_JURISDICTIONS[code]?.ko || code) : "";
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

// 상대국 등재 내역을 나라+목록 단위로 묶는다.
// product_intl.jsx 의 groupByRegulation 과 비슷하지만 나라 키가 함께 들어간다(그쪽은 window 에 내보내지 않음).
function tcGroupListings(listings) {
  const groups = [];
  const at = {};
  (listings || []).forEach(x => {
    const key = `${x.country}|${x.regulation}`;
    if (!(key in at)) { at[key] = groups.length; groups.push({ key, country: x.country, list: x.list, source: x.source, details: [] }); }
    if (x.detail && !groups[at[key]].details.includes(x.detail)) groups[at[key]].details.push(x.detail);
  });
  return groups;
}

// 목록 등재 항목(통제 목록·국내 법령)의 표시 이름.
function tcEntryName(e) {
  return e?.name_ko || e?.name || e?.family || e?.name_en || "";
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

// 인허가 종류(kind) 표시 글자. 영문 코드(permit·approval …)는 한국어로, 이미 한국어면 그대로.
function tcKindLabel(kind) {
  const k = String(kind || "").trim();
  return TRADE_LABELS.kinds[k] || k;
}

// 종류 글자 → Badge tone ("hazard" | "accent" | "").
function tcKindTone(kind) {
  const label = tcKindLabel(kind);
  const hit = TRADE_LABELS.kindTones.find(([word]) => label.includes(word));
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
  tcGroupListings, tcEntryName, tcCustomsCount, tcQuoteLines,
});

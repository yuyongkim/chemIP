// Pure helpers for the 중소기업 체크리스트 — trade-controls 응답 → 체크리스트 묶음/행, CSV 문자열. No React, no DOM.
// 입력은 /api/regulations/trade-controls/{cas} 응답. tcConditions·tcEntryName·tcGroupListings·tcCountryName 은 trade_controls_helpers.jsx.

function tcJoin(values, sep = " · ") {
  return (values || []).map(v => (typeof v === "string" ? v : v?.obligation || v?.title || "")).filter(Boolean).join(sep);
}

function tcRuleRow(r, title) {
  const c = r.citation || {};
  return {
    title: title || r.rule_id || "",
    who: r.who || "",
    authority: r.agency || r.authority || "",
    when: r.when_required || r.timing || "",
    condition: [r.threshold, ...tcConditions(r.matched_by)].filter(Boolean).join(" · "),
    note: r.note || "",
    basis: c.legal_basis || r.legal_basis || "",
    url: c.source_url || r.source_url || "",
    customs: !!r.customs_confirmation,
  };
}

// 묶음 [{ key, title, rows:[...] }]. 비어 있는 묶음도 남겨 "해당 항목 없음"으로 보인다.
function tcChecklistGroups(data) {
  const G = TC_CHECKLIST_LABELS.groups;
  const groups = [];
  groups.push({ key: "krLaw", title: G.krLaw, rows: (data.kr_law_lists || []).flatMap(g => (g.lists || []).map(l => ({
    title: `${g.law} · ${l.title || l.list_id}`,
    details: [...(l.entries || []), ...(l.family_entries || [])].map(e => [tcEntryName(e), e.detail].filter(Boolean).join(" ")).join(" · "),
    note: tcJoin(l.obligations),
    basis: l.legal_basis || "",
    url: l.source_url || "",
  }))) });
  groups.push({ key: "permits", title: G.permits, rows: (data.kr_permits || []).map(p => {
    const name = tcPermitName(p);
    const row = tcRuleRow(p, p.kind ? `[${tcKindLabel(p.kind)}] ${name}` : name);
    if (!row.condition && p.trigger?.condition) row.condition = p.trigger.condition;
    return row;
  }) });
  groups.push({ key: "obligations", title: G.obligations, rows: (data.kr_obligations || []).map(r => tcRuleRow(r, r.obligation)) });
  if ((data.kr_unverified || []).length) {
    groups.push({ key: "unverified", title: G.unverified, rows: data.kr_unverified.map(r => tcRuleRow(r, r.obligation)) });
  }
  groups.push({ key: "lists", title: G.lists, rows: (data.controlled_lists || []).map(l => ({
    title: l.title || l.list_id,
    authority: l.authority || "",
    details: [...(l.entries || []), ...(l.family_entries || [])].map(e => [e.category, tcEntryName(e), e.detail].filter(Boolean).join(" ")).join(" · "),
    note: [l.kr_obligation, l.source_version].filter(Boolean).join(" · "),
    basis: l.legal_basis || "",
    url: l.source_url || "",
  })) });
  groups.push({ key: "hs", title: G.hs, rows: (data.hs || []).map(h => ({
    title: [`HS ${h.hs6 || "—"}`, h.cn8 && `CN ${h.cn8}`, h.hsk10 && `HSK ${h.hsk10}`].filter(Boolean).join(" · "),
    details: [h.title_ko || h.title_en, h.description].filter(Boolean).join(" · "),
    basis: TC_CHECKLIST_LABELS.hsBasis,
    url: data.hs_meta?.ecics_info_url || "",
  })) });
  const dest = data.destination;
  if (dest) {
    groups.push({ key: "destination", title: G.destination(tcCountryName(dest.country)), rows: tcGroupListings(dest.listings).map(g => ({
      title: `${tcCountryName(g.country)} · ${g.list}`,
      details: g.details.join(" · "),
      basis: g.source || "",
    })) });
    if (dest.kotra) {
      groups.push({ key: "kotra", title: G.kotra, rows: (dest.kotra.items || []).map(k => ({
        title: [k.hsCode, k.productName].filter(Boolean).join(" "),
        note: k.regulation || "",
        when: k.startDate ? `${k.startDate}${k.endDate ? `~${k.endDate}` : ""}` : "",
      })) });
    }
  }
  return groups;
}

// 자료 수집일(retrieved) 모음 — 중복 없이 오름차순.
function tcChecklistRetrieved(data) {
  const dates = new Set();
  (data.kr_law_lists || []).forEach(g => (g.lists || []).forEach(l => l.retrieved && dates.add(l.retrieved)));
  (data.controlled_lists || []).forEach(l => l.retrieved && dates.add(l.retrieved));
  if (data.hs_meta?.retrieved) dates.add(data.hs_meta.retrieved);
  return [...dates].sort();
}

function tcTodayKst() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" }); // YYYY-MM-DD
}

// 한 행의 "누가·언제·조건" 표시 쌍 [[라벨, 값]].
function tcChecklistDetailPairs(row) {
  const F = TC_CHECKLIST_LABELS.fields;
  return ["who", "authority", "when", "condition", "details", "note"]
    .filter(k => row[k])
    .map(k => [F[k], row[k]])
    .concat(row.customs ? [[F.customs, TC_CHECKLIST_LABELS.csv.yes]] : []);
}

function tcCsvCell(v) {
  const s = String(v ?? "");
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// 머리 정보 몇 줄 + 빈 줄 + 표. 엑셀에서 한글이 깨지지 않게 BOM 을 붙인다.
function tcChecklistCsv({ heading, groups }) {
  const C = TC_CHECKLIST_LABELS.csv;
  const lines = heading.map(([k, v]) => [k, v]);
  lines.push([]);
  lines.push(C.header);
  groups.forEach(g => g.rows.forEach(r => lines.push([
    g.title, r.title, r.who, r.authority, r.when, r.condition,
    [r.details, r.note].filter(Boolean).join(" · "), r.basis, r.url, r.customs ? C.yes : "",
  ])));
  lines.push([]);
  lines.push([TC_CHECKLIST_LABELS.disclaimer]);
  return "﻿" + lines.map(cells => cells.map(tcCsvCell).join(",")).join("\r\n");
}

function tcChecklistFileName(data, ext) {
  const parts = [TC_CHECKLIST_LABELS.csv.filePrefix, data.cas, data.direction, data.country, tcTodayKst()].filter(Boolean);
  return `${parts.join("_")}.${ext}`;
}

Object.assign(window, {
  tcChecklistGroups, tcChecklistRetrieved, tcTodayKst, tcChecklistDetailPairs, tcChecklistCsv, tcChecklistFileName,
});

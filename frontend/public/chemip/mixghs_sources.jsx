// 혼합물 GHS 분류 · 성분 행 → 계산용 성분(순수 함수). 분류 출처 셋 중 하나:
//   annex  EU CLP 부속서 VI 조화 분류(g/clp_annex6.json 의 그 CAS 항목, 같은 CAS 에 항목이 여럿이면 row.annexIdx)
//   kosha  KOSHA MSDS 2항 B02(물질 상세)
//   typed  사용자가 적은 분류(ghpParseTyped)
// 출처를 고르지 않았으면 부속서 VI → KOSHA → 직접 입력 순서로 자료가 있는 첫 출처.

function mgSourceOptions({ detail, annexEntries }) {
  const out = [];
  if (annexEntries && annexEntries.length) out.push("annex");
  if (ghpKoshaClassification(ghpMsdsItems(detail, 2).B02).length) out.push("kosha");
  out.push("typed");
  return out;
}

// row: { name, c, source, annexIdx, typed, unknownAcute }, ctx: { detail, annexEntries }
// → { comp: mgClassify 가 받는 성분, source, options, unknownLines, annex: 고른 항목, annexCount, annexNames }
function mgRowComponent(row, ctx) {
  const options = mgSourceOptions(ctx);
  const source = row.source && options.includes(row.source) ? row.source : options[0];
  const c = Number(String(row.c).replace(",", "."));
  const base = { name: row.name || "", c: Number.isFinite(c) ? c : 0, unknownAcute: Boolean(row.unknownAcute) };
  const annexList = ctx.annexEntries || [];
  const meta = { annexCount: annexList.length, annexNames: annexList.map(e => e.name) };
  if (source === "annex") {
    const entries = ctx.annexEntries || [];
    const annex = entries[Math.min(Number(row.annexIdx) || 0, entries.length - 1)];
    return { source, options, annex, unknownLines: [], ...meta,
      comp: { ...base, hazards: annex.hazards, scl: annex.scl || [], ate: annex.ate || {}, m: annex.m || {}, euh: annex.euh || [] } };
  }
  if (source === "kosha") {
    return { source, options, unknownLines: [], ...meta,
      comp: { ...base, hazards: ghpKoshaClassification(ghpMsdsItems(ctx.detail, 2).B02), scl: [], ate: {}, m: {}, euh: [] } };
  }
  const t = ghpParseTyped(row.typed || "");
  return { source, options, unknownLines: t.unknown, ...meta, comp: { ...base, hazards: t.hazards, scl: t.scl, ate: t.ate, m: t.m, euh: t.euh } };
}

Object.assign(window, { mgSourceOptions, mgRowComponent });

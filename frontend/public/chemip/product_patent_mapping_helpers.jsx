// 특허 매핑 순수 함수(index.json·관할 파일 → 표시 값). 화면: product_patent_mapping.jsx, patent_mapping_*.jsx.
// 기록에서 꺼내는 값은 번호·명칭·관할·연도·링크뿐이다(초록·발췌 문장은 쓰지 않는다 — 원자료 이용조건 미확인).

const PM_TOP_JURISDICTIONS = 8;
const PM_YEAR_SPAN = 12;
const PM_PAGE_SIZE = 50;

// 나라 이름은 화면 언어로(jurisdictionName, intl_regions.jsx), 특허청·옛 나라는 PATENT_OFFICE_NAMES.
function pmJurisdictionName(code) {
  return INTL_JURISDICTIONS[code] ? jurisdictionName(code) : (PATENT_OFFICE_NAMES[code] || code);
}

// 많은 순 정렬된 [{ code, n }]. 비율 p 는 가장 많은 곳 = 1.
function pmJurisdictionCounts(index) {
  const rows = Object.entries(index?.by_jurisdiction || {})
    .map(([code, n]) => ({ code, n: Number(n) || 0 }))
    .filter(r => r.n > 0)
    .sort((a, b) => b.n - a.n || a.code.localeCompare(b.code));
  const max = rows[0]?.n || 1;
  return rows.map(r => ({ ...r, name: pmJurisdictionName(r.code), p: r.n / max }));
}

function pmTopJurisdictions(index, n = PM_TOP_JURISDICTIONS) {
  return pmJurisdictionCounts(index).slice(0, n);
}

// 최근 span 년(가장 늦은 해 기준, 빈 해는 0) 막대 + 그 이전 합계.
function pmYearBars(index, span = PM_YEAR_SPAN) {
  const entries = Object.entries(index?.by_year || {})
    .map(([y, n]) => [Number(y), Number(n) || 0])
    .filter(([y]) => Number.isFinite(y) && y > 0);
  if (entries.length === 0) return { bars: [], earlier: 0, from: null };
  const last = Math.max(...entries.map(([y]) => y));
  const from = last - span + 1;
  const byYear = new Map(entries);
  const bars = [];
  for (let y = last; y >= from; y--) bars.push({ y, n: byYear.get(y) || 0 });
  const max = Math.max(1, ...bars.map(b => b.n));
  const earlier = entries.filter(([y]) => y < from).reduce((s, [, n]) => s + n, 0);
  return { bars: bars.map(b => ({ ...b, p: b.n / max })), earlier, from };
}

// 기록 → 표 한 줄(번호·명칭·관할·연도·링크만).
function pmRecordRows(records) {
  return (Array.isArray(records) ? records : [])
    .filter(r => r && r.patent_id)
    .map(r => ({
      id: String(r.patent_id),
      title: String(r.title || ""),
      jur: String(r.jurisdiction || ""),
      year: r.year || (r.date ? String(r.date).slice(0, 4) : ""),
      link: /^https:\/\//.test(r.link || "") ? r.link : "",
    }));
}

function pmPage(rows, page, size = PM_PAGE_SIZE) {
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const p = Math.min(Math.max(1, page), pages);
  const start = (p - 1) * size;
  return { rows: rows.slice(start, start + size), page: p, pages, from: rows.length ? start + 1 : 0, to: Math.min(rows.length, start + size) };
}

// 관할 고르기 목록: 파일이 있는 관할만, 많은 순.
function pmJurisdictionOptions(index) {
  const files = index?.files || {};
  return pmJurisdictionCounts(index).filter(r => files[r.code]);
}

function pmFileInfo(index, jur) {
  const f = index?.files?.[jur];
  return f ? { records: Number(f.records) || 0, truncated: Boolean(f.truncated), total: Number(index?.by_jurisdiction?.[jur]) || 0 } : null;
}

Object.assign(window, {
  PM_PAGE_SIZE, pmJurisdictionName, pmTopJurisdictions, pmYearBars, pmRecordRows, pmPage, pmJurisdictionOptions, pmFileInfo,
});

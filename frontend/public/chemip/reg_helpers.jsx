// 규제 목록 화면 순수 함수(reg*) — 자료(v1/reg/*.json, 형식 scripts/static_export/CONTRACT.md "reg/") → 표시 값.
// React·fetch 없음. 시험: frontend/scripts/tests/test_reg_lists.cjs.

const REG_VIEW = "reg";
const REG_PAGE_SIZE = 50;
const REG_IR_PREFIX = "IR_"; // 국가별 규제 DB 목록 id = IR_<regulation code>

// 화면 언어 이름. 영어: REG_LIST_ENGLISH_NAMES → (IR_) PRODUCT_LABELS_EN.intl.listNames → 자료 이름.
function regListTitle(meta, lang = CHEMIP_LANG, namesEn = window.REG_LIST_ENGLISH_NAMES, irNames = window.PRODUCT_LABELS_EN?.intl?.listNames) {
  if (!meta) return "";
  if (lang !== "en") return meta.title || meta.id;
  const ir = meta.id && meta.id.startsWith(REG_IR_PREFIX) ? (irNames || {})[meta.id.slice(REG_IR_PREFIX.length)] : null;
  return (namesEn || {})[meta.id] || ir || meta.title || meta.id;
}

function regNorm(s) {
  return String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
}

// 목록 거르기: 이름(두 언어)·법령·id·나라 코드와 이름에 검색어가 들어 있으면. jur 는 나라 코드("" = 모두).
function regFilterLists(lists, q, jur = "", titleOf = regListTitle, jurName = window.jurisdictionName || (c => c)) {
  const n = regNorm(q);
  return (lists || []).filter(m => {
    if (jur && m.j !== jur) return false;
    if (!n) return true;
    const hay = [m.title, titleOf(m, "en"), m.law, m.id, m.j, jurName(m.j)].map(regNorm).join(" | ");
    return n.split(" ").every(t => hay.includes(t));
  });
}

// [{ g, lists }] — groups 순서, 빈 묶음은 뺀다.
function regGroupLists(lists, groups) {
  const order = groups && groups.length ? groups : [...new Set((lists || []).map(m => m.g))];
  return order.map(g => ({ g, lists: (lists || []).filter(m => m.g === g) })).filter(x => x.lists.length);
}

// 나라 고르기 칸: 목록 수가 많은 순.
function regJurisdictions(lists) {
  const n = {};
  for (const m of lists || []) if (m.j) n[m.j] = (n[m.j] || 0) + 1;
  return Object.entries(n).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([j, c]) => ({ j, n: c }));
}

// 행 [cas, name, name_en, detail] 의 화면 언어 이름.
function regRowName(row, lang = CHEMIP_LANG) {
  const [, ko, en] = row || [];
  return lang === "en" ? (en || ko || "") : (ko || en || "");
}

function regFilterRows(rows, q) {
  const n = regNorm(q);
  if (!n) return rows || [];
  return (rows || []).filter(r => (r[0] && r[0].includes(n)) || regNorm(r[1]).includes(n) || regNorm(r[2]).includes(n));
}

// 쪽 page(1부터)의 범위. 넘치면 마지막 쪽.
function regPageSlice(total, page, size = REG_PAGE_SIZE) {
  const pages = Math.max(1, Math.ceil(total / size));
  const p = Math.min(Math.max(1, page | 0), pages);
  const from = total ? (p - 1) * size + 1 : 0;
  return { page: p, pages, from, to: Math.min(total, p * size) };
}

// 그 쪽을 그리는 데 필요한 파일 조각 번호(조각 하나 = partRows 행).
function regPartsFor(page, size, partRows, parts) {
  const first = Math.floor(((page - 1) * size) / partRows);
  const last = Math.floor((page * size - 1) / partRows);
  const out = [];
  for (let k = first; k <= Math.min(last, parts - 1); k++) out.push(k);
  return out;
}

// 받은 조각들({k: rows}) → 이어 붙인 행(앞 조각이 빠지면 거기까지만).
function regJoinParts(partsMap, parts) {
  const out = [];
  for (let k = 0; k < parts; k++) {
    if (!partsMap[k]) break;
    out.push(...partsMap[k]);
  }
  return out;
}

// 변경 한 건 → { kind, list, what, date, url, src, cas, href }. titleOf 는 lists.json 의 목록(있으면 화면 언어 이름).
function regChangeView(item, labels, listById = {}) {
  const meta = listById[item.list];
  const list = meta ? regListTitle(meta) : (item.title || "");
  // 출처가 정한 문장이 있는 것(목록 원문 개정일)은 화면 언어 문장으로, 나머지는 자료의 글(물질 이름·공식 제목) 그대로.
  const what = item.n > 1 ? labels.many(item.n) : ((labels.srcWhat || {})[item.src] || item.detail || item.cas || "");
  return {
    kind: labels.kinds[item.ch] || item.ch,
    tone: item.ch === "added" ? "accent" : item.ch === "removed" ? "hazard" : "",
    list, what, date: item.d, cas: item.cas || "", src: labels.sources[item.src] || item.src,
    url: item.url || "", href: item.list && meta ? regHref(item.list) : "",
  };
}

function regHref(id) {
  const p = new URLSearchParams({ view: REG_VIEW });
  if (id) p.set("list", id);
  return `?${p.toString()}`;
}

function regReadListParam(search) {
  return (new URLSearchParams(search || "").get("list") || "").trim();
}

// 지금 주소의 list 칸을 바꾼 주소(다른 칸 — lang 등 — 은 그대로). id 가 null 이면 view·list 를 지운다.
function regUrlWith(href, id) {
  const url = new URL(href);
  if (id == null) {
    if (url.searchParams.get("view") === REG_VIEW) url.searchParams.delete("view");
    url.searchParams.delete("list");
  } else {
    url.searchParams.set("view", REG_VIEW);
    if (id) url.searchParams.set("list", id); else url.searchParams.delete("list");
  }
  return url.toString();
}

function regSubstanceHref(cas) {
  return `?view=product&pv=chemical&chem=${encodeURIComponent(cas)}`;
}

Object.assign(window, {
  REG_VIEW, REG_PAGE_SIZE, regListTitle, regNorm, regFilterLists, regGroupLists, regJurisdictions, regRowName, regFilterRows,
  regPageSlice, regPartsFor, regJoinParts, regChangeView, regHref, regReadListParam, regUrlWith, regSubstanceHref,
});

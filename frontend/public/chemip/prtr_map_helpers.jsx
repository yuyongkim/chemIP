// PRTR 취급 사업장 지도 — 순수 함수(React·요청 없음). 파일 모양 → 화면 값, 지도 칸 색, 범례, 거르기, 주소.
// 자료 형식: scripts/static_export/CONTRACT.md "prtr/". 색은 tokens.css 변수만(color-mix).

// 지도 칸을 칠하는 값(키 = 파일의 지역 칸 이름). 이름은 PRTR_MAP_LABELS.metrics[k].
const PRTR_METRICS = ["facilities", "release_kg", "transfer_kg"];
const PRTR_BINS = 5;                        // 범례 칸 수
const PRTR_BIN_MIX = [22, 38, 54, 70, 86];   // 칸마다 --accent 섞는 비율(%)

// [[...], ...] + 열 이름 → [{...}]
function prtrRows(cols, rows) {
  return (rows || []).map(r => Object.fromEntries((cols || []).map((c, i) => [c, r[i]])));
}

function prtrSubstances(index) {
  return index ? prtrRows(index.cols, index.substances) : [];
}

function prtrFacilities(body) {
  return body ? prtrRows(body.facility_cols, body.facilities) : [];
}

// 물질 이름: 영어 화면은 영어 이름(없으면 한국어). 원문 이름은 바꾸지 않는다.
function prtrSubstanceName(s, lang) {
  if (!s) return "";
  return lang === "en" && s.name_en ? s.name_en : (s.name_ko || s.name_en || s.cas || "");
}

function prtrNorm(s) {
  return String(s || "").toLowerCase().replace(/[\s\-_(),.·]/g, "");
}

// 이름(한·영)·CAS 로 거르기. 딱 맞음 > 앞부분 > 포함, 같으면 원래 순서(사업장 많은 순).
function prtrFilterSubstances(list, q) {
  const n = prtrNorm(q);
  if (!n) return list || [];
  const score = s => {
    const fields = [s.name_ko, s.name_en, s.cas].map(prtrNorm);
    if (fields.some(f => f === n)) return 3;
    if (fields.some(f => f.startsWith(n))) return 2;
    return fields.some(f => f.includes(n)) ? 1 : 0;
  };
  return (list || []).map((s, i) => ({ s, i, k: score(s) })).filter(x => x.k > 0)
    .sort((a, b) => b.k - a.k || a.i - b.i).map(x => x.s);
}

// 지역 이름표 { iso: { ko, en } } (index.json regions — 한 곳)
function prtrRegionNames(index) {
  return Object.fromEntries(((index && index.regions) || []).map(r => [r.iso, { ko: r.ko, en: r.en }]));
}

function prtrRegionName(names, iso, lang) {
  const r = (names || {})[iso];
  if (!r) return iso || "";
  return lang === "en" ? (r.en || r.ko) : r.ko;
}

// { iso: 값 } — 고른 지표
function prtrRegionValues(body, metric) {
  const out = {};
  ((body && body.regions) || []).forEach(r => { out[r.iso] = Number(r[metric] || 0); });
  return out;
}

// 값 → 범례 칸(1..PRTR_BINS), 0 이면 0. 신고량은 몇 곳이 크게 치우치므로 제곱근 눈금.
function prtrBin(value, max) {
  const v = Number(value || 0);
  if (!(v > 0) || !(max > 0)) return 0;
  return Math.min(PRTR_BINS, Math.max(1, Math.ceil(Math.sqrt(v / max) * PRTR_BINS)));
}

function prtrBinFill(bin) {
  return bin > 0 ? `color-mix(in srgb, var(--accent) ${PRTR_BIN_MIX[bin - 1]}%, var(--bg-sunken))` : "var(--bg-sunken)";
}

// 지도 한 칸의 채움·테두리
function prtrCellPaint(value, max, active) {
  return {
    fill: prtrBinFill(prtrBin(value, max)),
    stroke: active ? "var(--accent-ink)" : "var(--border-strong)",
    strokeWidth: active ? 1.6 : 0.6,
  };
}

// 범례: 실제 지역 값이 든 칸만, 칸마다 그 칸 지역 값의 [lo, hi] (경계를 반올림해 보일 때 생기는 어긋남이 없다)
function prtrLegend(values) {
  const vals = (values || []).map(Number).filter(v => v > 0);
  const max = Math.max(0, ...vals);
  const bins = {};
  vals.forEach(v => {
    const b = prtrBin(v, max);
    const cur = bins[b] || { bin: b, lo: v, hi: v, fill: prtrBinFill(b) };
    bins[b] = { ...cur, lo: Math.min(cur.lo, v), hi: Math.max(cur.hi, v) };
  });
  return Object.values(bins).sort((a, b) => a.bin - b.bin);
}

// 고른 지역의 사업장(iso 가 비면 전부) — 파일 순서(신고 합계 큰 순) 그대로
function prtrFacilitiesIn(body, iso) {
  const all = prtrFacilities(body);
  return iso ? all.filter(f => f.iso === iso) : all;
}

function prtrSigunguIn(body, iso) {
  const all = (body && body.sigungu) || [];
  return iso ? all.filter(s => s.iso === iso) : all;
}

// 지표 값 표기: 사업장 수는 정수, 나머지는 fmtKg(product_format.jsx)
function prtrMetricText(metric, value, fmtMassFn, locale) {
  return metric === "facilities" ? Number(value || 0).toLocaleString(locale || "ko-KR") : fmtMassFn(value);
}

// 주소: 지도 화면(?view=prtr&cas=) / 물질 화면의 취급 사업장 패널
function prtrMapHref(cas) {
  return cas ? `?view=prtr&cas=${encodeURIComponent(cas)}` : "?view=prtr";
}

// 지금 주소(href)에 view=prtr·cas 를 맞춘 주소(다른 칸 — lang 등 — 은 그대로). 고른 물질을 주소에 남길 때.
function prtrViewUrl(href, cas) {
  const url = new URL(href);
  url.searchParams.set("view", "prtr");
  if (cas) url.searchParams.set("cas", cas); else url.searchParams.delete("cas");
  return url.toString();
}

function prtrSubstanceHref(cas) {
  return `?view=product&pv=chemical&chem=${encodeURIComponent(cas)}&anchor=handlers`;
}

Object.assign(window, {
  PRTR_METRICS, PRTR_BINS, prtrRows, prtrSubstances, prtrFacilities, prtrSubstanceName, prtrNorm, prtrFilterSubstances,
  prtrRegionNames, prtrRegionName, prtrRegionValues, prtrBin, prtrBinFill, prtrCellPaint, prtrLegend, prtrFacilitiesIn,
  prtrSigunguIn, prtrMetricText, prtrMapHref, prtrViewUrl, prtrSubstanceHref,
});

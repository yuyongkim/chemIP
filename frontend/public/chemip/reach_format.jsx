// EU REACH 등록 항목 정리 — 순수 함수(React·fetch 없음). 문구는 인자 L(= REACH_LABELS)로 받는다.
//   reachFacts(f)              항목 구조 칸(EU_REACH_REGISTERED.json entry, /api/reach 의 entry) → 화면용 값
//   reachTonnage(band, L, lang) ECHA 톤수 구간 글 → "연 1천만~1억 t" / "10,000,000–100,000,000 t per year" (모르는 글은 그대로)
//   reachRows(facts, L, lang)  표시 줄 [{ key, label, value, sub? }] — EC·활성 등록(정식·중간체)·NONS·톤수·최초 등록·최근 갱신
//                              (영어 화면 톤수는 ECHA 글 그대로, 한국어는 줄인 숫자 + 원문)
// 값은 ECHA 가 보인 그대로 쓰고(톤수 원문은 sub 로 함께 보임) 추정하지 않는다. 시험: frontend/scripts/tests/test_reach_format.cjs

const REACH_TYPE_KEYS = [ // registration_types 의 이름(parse_echa_reach.py SUBTYPE_LABELS) → 묶음
  [/\(Art\. 10\)/, "full"],
  [/\(Art\. 17\)/, "onsite"],
  [/\(Art\. 18\)/, "transported"],
];

function reachNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function reachFacts(f) {
  const x = f || {};
  const counts = { full: 0, onsite: 0, transported: 0, other: 0 };
  Object.entries(x.registration_types || {}).forEach(([name, n]) => {
    const hit = REACH_TYPE_KEYS.find(([re]) => re.test(name));
    counts[hit ? hit[1] : "other"] += reachNum(n);
  });
  return {
    ec: x.ec || "", active: reachNum(x.active_registrations), ...counts, intermediate: counts.onsite + counts.transported,
    nons: reachNum(x.nons), band: String(x.tonnage_band || "").trim(), first: x.first_registered || "", last: x.last_updated || "",
    url: x.url || "", echaId: x.echa_id || "",
  };
}

// 10,000,000 → "1천만", 100,000,000 → "1억", 1,000,000 → "100만", 10,000 → "1만", 1,000 → "1천" (단위 글자: L.koUnits)
function reachKoAmount(n, U) {
  if (n >= 1e8 && n % 1e8 === 0) return `${(n / 1e8).toLocaleString("ko-KR")}${U.e8}`;
  if (n >= 1e7 && n % 1e7 === 0) return `${n / 1e7}${U.e7}`;
  if (n >= 1e4 && n % 1e4 === 0) return `${(n / 1e4).toLocaleString("ko-KR")}${U.e4}`;
  if (n >= 1e3 && n % 1e3 === 0) return `${n / 1e3}${U.e3}`;
  return n.toLocaleString("ko-KR");
}

function reachAmount(n, lang, L) {
  return lang === "en" || !L.koUnits ? n.toLocaleString("en-US") : reachKoAmount(n, L.koUnits);
}

const REACH_BAND_RANGE = /^([\d,.]+)\s*-\s*([\d,.]+)\s*tonnes?(?:\s+per\s+annum)?$/i;
const REACH_BAND_OVER = /^(?:>\s*|over\s+)?([\d,.]+)\s*(?:\+|tonnes?\s*\+|\+\s*tonnes?|tonnes?\s+(?:and\s+)?(?:above|over))(?:\s+per\s+annum)?$/i;

function reachTonnage(band, L, lang) {
  const raw = String(band || "").trim();
  if (!raw) return "";
  const n = s => Number(String(s).replace(/,/g, ""));
  let m = REACH_BAND_RANGE.exec(raw);
  if (m && Number.isFinite(n(m[1])) && Number.isFinite(n(m[2]))) return L.tonnageRange(reachAmount(n(m[1]), lang, L), reachAmount(n(m[2]), lang, L));
  m = REACH_BAND_OVER.exec(raw);
  if (m && Number.isFinite(n(m[1]))) return L.tonnageOver(reachAmount(n(m[1]), lang, L));
  return (L.tonnageText || {})[raw.toLowerCase()] || raw;
}

function reachRows(facts, L, lang) {
  const rows = [];
  if (facts.ec) rows.push({ key: "ec", label: L.ec, value: facts.ec, mono: true });
  const parts = [];
  if (facts.full) parts.push(`${L.types.full} ${facts.full}`);
  if (facts.intermediate) parts.push(`${L.types.intermediate} ${facts.intermediate}`);
  if (facts.other) parts.push(`${L.types.other} ${facts.other}`);
  rows.push({
    key: "active", label: L.active, value: `${L.activeValue(facts.active)}${parts.length ? ` (${parts.join(" · ")})` : ""}`,
    sub: facts.intermediate ? L.intermediateDetail(facts.onsite, facts.transported) : "",
  });
  if (facts.nons) rows.push({ key: "nons", label: L.nons, value: String(facts.nons) });
  if (facts.band) {
    // English: ECHA's band as printed (only the non-numeric ones get a label). Korean: shortened numbers + the original as sub.
    const text = lang === "en" ? ((L.tonnageText || {})[facts.band.toLowerCase()] || facts.band) : reachTonnage(facts.band, L, lang);
    rows.push({ key: "tonnage", label: L.tonnage, value: text, sub: text !== facts.band ? L.original(facts.band) : "" });
  }
  if (facts.first) rows.push({ key: "first", label: L.first, value: facts.first, mono: true });
  if (facts.last) rows.push({ key: "last", label: L.last, value: facts.last, mono: true });
  return rows;
}

Object.assign(window, { reachFacts, reachKoAmount, reachTonnage, reachRows });

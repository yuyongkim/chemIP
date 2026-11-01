// GHS 순수 함수 — MSDS 2항 글(예: "GHS02.gif|GHS07.gif", "H302 : 삼키면 유해함|H315 : …")을 코드·문장으로 읽는다.
// 그림문자 그림 경로는 여기 한 곳(ghsPictogramSrc). React·문구 없음 — 화면 언어 이름은 GHS_LABELS 에서 읽는다.

const GHS_PICTOGRAM_CODES = ["GHS01", "GHS02", "GHS03", "GHS04", "GHS05", "GHS06", "GHS07", "GHS08", "GHS09"];
const GHS_ASSET_DIR = "assets/ghs";

// KOSHA MSDS 2항 항목 코드(msdsItemCode) → 뜻
const GHS_MSDS_ITEMS = {
  classification: "B02",
  pictograms: "B0402",
  signal: "B0404",
  hazards: "B0406",
  prevention: "B040802",
  response: "B040804",
  storage: "B040806",
  disposal: "B040808",
};
const GHS_P_GROUPS = ["prevention", "response", "storage", "disposal"];
// P 코드 첫 숫자 → 묶음(P1xx 일반, P2xx 예방, P3xx 대응, P4xx 저장, P5xx 폐기)
const GHS_P_GROUP_BY_DIGIT = { 1: "general", 2: "prevention", 3: "response", 4: "storage", 5: "disposal" };

const GHS_PICT_RE = /GHS\s*0?(\d{1,2})(?!\d)/gi;
const GHS_CODE_PART = "[HP] ?\\d{3}[A-Za-z]{0,2}"; // "P 210" 처럼 띄어 쓴 코드도(공백은 ghsNormCode 가 뺀다)
const GHS_CODE_RE = new RegExp(`${GHS_CODE_PART}(?:\\s*\\+\\s*${GHS_CODE_PART})*`, "g");
const GHS_LEADING_CODE_RE = new RegExp(`^\\s*(${GHS_CODE_PART}(?:\\s*\\+\\s*${GHS_CODE_PART})*)\\s*(?:[:：.\\-–]\\s*)?(.*)$`);
// KOSHA 원문의 빈 값 표시(화면에 내지 않는다)
const GHS_EMPTY_VALUES = ["자료없음", "해당없음", "-"];

function ghsIsEmpty(v) {
  const s = String(v == null ? "" : v).trim();
  return !s || GHS_EMPTY_VALUES.includes(s);
}

function ghsPictogramSrc(code) {
  return `${GHS_ASSET_DIR}/${code}.svg`;
}

// "GHS02.gif|GHS07.gif" · "GHS2, ghs07" · "GHS11.gif" → { codes: ["GHS02","GHS07"], unknown: ["GHS11"] }(겹침 없이, 나온 순서)
function ghsParsePictograms(text) {
  const codes = [];
  const unknown = [];
  if (ghsIsEmpty(text)) return { codes, unknown };
  for (const m of String(text).matchAll(GHS_PICT_RE)) {
    const n = Number(m[1]);
    const code = `GHS${String(n).padStart(2, "0")}`;
    const list = n >= 1 && n <= 9 ? codes : unknown;
    if (!list.includes(code)) list.push(code);
  }
  return { codes, unknown };
}

// "위험" / "Danger" → "danger", "경고" / "Warning" → "warning", 나머지 → ""
function ghsParseSignal(text) {
  const s = String(text || "");
  if (/위험|danger/i.test(s)) return "danger";
  if (/경고|warning/i.test(s)) return "warning";
  return "";
}

// 공백만 뺀다. 뒤 글자의 대소문자는 뜻이 다르다(H360FD ≠ H360Fd).
function ghsNormCode(code) {
  return String(code || "").replace(/\s+/g, "");
}

// H/P 글 → [{ code, text }]. 줄 나눔은 "|" 또는 줄바꿈. "P203, P210, and P501" 처럼 코드만 늘어놓은 줄은 코드마다 한 건.
// 코드 없는 줄은 { code: "", text }. 같은 코드는 처음 것만.
function ghsParseStatements(text) {
  const out = [];
  const seen = new Set();
  const push = (code, t) => {
    const c = code ? ghsNormCode(code) : "";
    if (c && seen.has(c)) return;
    if (c) seen.add(c);
    out.push({ code: c, text: String(t || "").trim() });
  };
  if (ghsIsEmpty(text)) return out;
  for (const raw of String(text).split(/\||\r?\n/)) {
    const part = raw.trim();
    if (ghsIsEmpty(part)) continue;
    const rest = part.replace(GHS_CODE_RE, "").replace(/\band\b|[,;\s]/gi, "");
    const codes = part.match(GHS_CODE_RE) || [];
    if (codes.length > 1 && !rest) { codes.forEach(c => push(c, "")); continue; }
    const m = part.match(GHS_LEADING_CODE_RE);
    if (m) push(m[1], m[2]);
    else push("", part);
  }
  return out;
}

// P 코드 → 묶음 키(코드 없거나 P 가 아니면 "")
function ghsPGroupOf(code) {
  const m = /^P(\d)/.exec(String(code || ""));
  return (m && GHS_P_GROUP_BY_DIGIT[m[1]]) || "";
}

// 물질 상세 응답의 sections → 2항 항목 코드별 원문
function ghsSection2Items(sections) {
  const sec = (sections || []).find(s => Number(s.section_seq) === 2);
  const items = {};
  (sec?.content || []).forEach(it => {
    if (it.msdsItemCode && !ghsIsEmpty(it.itemDetail)) items[it.msdsItemCode] = String(it.itemDetail);
  });
  return items;
}

// sections → { has, pictograms, unknownPictograms, signal, hazards, precautions{prevention…}, classification }
function ghsSection2(sections) {
  const items = ghsSection2Items(sections);
  const I = GHS_MSDS_ITEMS;
  const pict = ghsParsePictograms(items[I.pictograms]);
  const precautions = {};
  GHS_P_GROUPS.forEach(g => { precautions[g] = ghsParseStatements(items[I[g]]); });
  return {
    has: Object.keys(items).length > 0,
    pictograms: pict.codes,
    unknownPictograms: pict.unknown,
    signal: ghsParseSignal(items[I.signal]),
    hazards: ghsParseStatements(items[I.hazards]),
    precautions,
    classification: items[I.classification] || "",
  };
}

Object.assign(window, {
  GHS_PICTOGRAM_CODES, GHS_MSDS_ITEMS, GHS_P_GROUPS, ghsIsEmpty, ghsPictogramSrc, ghsParsePictograms, ghsParseSignal,
  ghsNormCode, ghsParseStatements, ghsPGroupOf, ghsSection2Items, ghsSection2,
});

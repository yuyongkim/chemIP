// 용어사전 · 순수 함수(React·fetch 없음) — 등록 목록(glossary_registry.jsx)과 두 기존 자료를 한 항목 목록으로 묶고,
// 첫 글자 색인(ㄱ–ㅎ·A–Z)·분류·시험으로 거른다. 화면은 glossary_view.jsx, 통합 검색은 usearch_provider_terms.jsx.
// 시험: frontend/scripts/tests/test_glossary.cjs
//
// 항목(entry) 모양:
//   { key, cat, src, ko: { term, def, alias?, law?, unit?, ref? }, en: { 같은 칸 }, shown: 화면 언어 쪽,
//     exams: [], calc?: 계산기 key, view?: 화면 key, see: [용어 key], lawUrl? }
//   계산기 용어: src "calc", calc = 그 용어를 쓰는 첫 계산기. 약어: key = 소문자(예 "k_reach"), src "abbr", view "sources".

// 한글 자모(호환 자모 U+3131…)를 코드로 둔다(글자 목록은 문구가 아니라 계산 규칙이다).
const GL_JAMO = (...codes) => codes.map(c => String.fromCharCode(c));
const GL_CHOSEONG = GL_JAMO(0x3131, 0x3132, 0x3134, 0x3137, 0x3138, 0x3139, 0x3141, 0x3142, 0x3143, 0x3145, 0x3146, 0x3147, 0x3148, 0x3149,
  0x314a, 0x314b, 0x314c, 0x314d, 0x314e);
// 된소리 → 예사소리(ㄲ→ㄱ, ㄸ→ㄷ, ㅃ→ㅂ, ㅆ→ㅅ, ㅉ→ㅈ)
const GL_FOLD = Object.fromEntries([[1, 0], [4, 3], [8, 7], [10, 9], [13, 12]].map(([a, b]) => [GL_CHOSEONG[a], GL_CHOSEONG[b]]));
const GL_KO_LETTERS = GL_CHOSEONG.filter(c => !GL_FOLD[c]);
const GL_LATIN_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const GL_OTHER = "#";

function glAbbrKey(k) {
  return String(k || "").toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

// 계산기 정의 하나가 쓰는 용어 key — usearch_provider_calculators.jsx usCalcTermKeys 와 같은 규칙(두 번째 사본, 아래 층에서 위 층을 읽지 않으려고).
function glCalcTermKeys(def) {
  const keys = [];
  for (const f of (def && def.inputs) || []) {
    keys.push(f.term);
    for (const c of f.columns || []) keys.push(c.term);
  }
  for (const o of (def && def.outputs) || []) keys.push(o.term);
  return [...new Set(keys.filter(Boolean))];
}

function glFirstCalc(registry) {
  const map = {};
  for (const def of registry || []) for (const k of glCalcTermKeys(def)) if (!map[k]) map[k] = def;
  return map;
}

function glPick(ko, en, lang) {
  return lang === "en" ? langMerge(ko || {}, en || {}) : (ko || {});
}

function glFromCats(cats, lang) {
  const out = [];
  for (const c of cats || []) {
    for (const key of Object.keys(c.ko || {})) {
      const ko = c.ko[key] || {};
      const en = (c.en || {})[key] || {};
      out.push({
        key, cat: c.k, src: ko.src || "own", ko, en, shown: glPick(ko, en, lang),
        exams: ko.exams || [], calc: ko.calc || "", view: ko.view || "", see: ko.see || [], lawUrl: ko.lawUrl || "", gold: ko.gold || "",
      });
    }
  }
  return out;
}

// key 앞머리로 화면 찾기({ apl_: "applicability" })
function glTermView(key, prefixes) {
  const hit = Object.keys(prefixes || {}).find(p => key.startsWith(p));
  return hit ? prefixes[hit] : "";
}

function glFromCalcTerms(termKo, termEn, registry, groupCat, termCat, lang, termView = {}) {
  const first = glFirstCalc(registry);
  return Object.keys(termKo || {}).map(key => {
    const calc = first[key];
    const ko = termKo[key] || {};
    const en = (termEn || {})[key] || {};
    return {
      key, cat: termCat[key] || groupCat[calc && calc.group] || "thermo", src: "calc", ko, en, shown: glPick(ko, en, lang),
      exams: [], calc: calc ? calc.key : "", view: calc ? "" : glTermView(key, termView), see: [], lawUrl: "", gold: "",
    };
  });
}

function glFromAbbr(abbrKo, abbrEn, cat, lang) {
  return Object.keys(abbrKo || {}).map(k => {
    const a = abbrKo[k] || {};
    const b = (abbrEn || {})[k] || {};
    const ko = { term: k, def: a.desc || "", alias: [a.name, a.kr].filter(Boolean) };
    const en = { term: k, def: b.desc || a.desc || "", alias: [a.name].filter(Boolean) };
    return { key: glAbbrKey(k), abbr: k, cat, src: "abbr", ko, en, shown: glPick(ko, en, lang),
      exams: [], calc: "", view: "sources", see: [], lawUrl: "", gold: "" };
  });
}

// 모든 항목(약어 → 분류 자료 → 계산기 용어 순). 계산기 용어(짧은 "?" 설명)와 같은 key 의 분류 자료(긴 정의)는 한 항목으로 합친다:
// 글은 분류 자료, 비어 있는 계산기·화면 연결만 계산기 용어에서 받는다. 그 밖의 겹침은 앞의 것만(시험이 잡는다).
function glBuildEntries({ cats, termKo, termEn, calcRegistry, groupCat = {}, termCat = {}, termView = {}, abbrKo, abbrEn, abbrCat = "abbr", lang = "ko" }) {
  const fromCats = glFromCats(cats, lang);
  const byKey = new Map(fromCats.map(e => [e.key, e]));
  const fromTerms = glFromCalcTerms(termKo, termEn, calcRegistry, groupCat, termCat, lang, termView).filter(t => {
    const c = byKey.get(t.key);
    if (!c) return true;
    if (!c.calc) c.calc = t.calc;
    if (!c.view) c.view = t.view;
    return false;
  });
  const all = [...glFromAbbr(abbrKo, abbrEn, abbrCat, lang), ...fromCats, ...fromTerms];
  const seen = new Set();
  return all.filter(e => (seen.has(e.key) ? false : (seen.add(e.key), true)));
}

// 첫 글자 색인: 한글은 초성(된소리는 예사소리로), 라틴은 대문자, 나머지는 "#". 괄호·따옴표 같은 앞 기호는 건너뛴다.
function glInitial(term) {
  const s = String(term || "").normalize("NFC").replace(/^[^\p{L}\p{N}]+/u, "");
  const ch = s.charAt(0);
  if (!ch) return GL_OTHER;
  const code = ch.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) {
    const cho = GL_CHOSEONG[Math.floor((code - 0xac00) / 588)];
    return GL_FOLD[cho] || cho;
  }
  if (GL_KO_LETTERS.includes(ch)) return ch;
  const up = ch.normalize("NFKD").charAt(0).toUpperCase();
  return GL_LATIN_LETTERS.includes(up) ? up : GL_OTHER;
}

// 색인 줄에 보일 글자: 화면 언어가 한국어면 ㄱ–ㅎ 다음 A–Z, 영어면 A–Z. 끝에 "#".
function glLetters(lang) {
  return [...(lang === "en" ? [] : GL_KO_LETTERS), ...GL_LATIN_LETTERS, GL_OTHER];
}

function glSort(entries, lang) {
  const loc = lang === "en" ? "en" : "ko";
  return [...(entries || [])].sort((a, b) => String(a.shown.term).localeCompare(String(b.shown.term), loc) || a.key.localeCompare(b.key));
}

// 거르기: cat·exam·letter 가 비면 전체. 검색어는 화면(glossary_view.jsx)이 usRankDocs 로 따로 맞춘다.
function glFilter(entries, { cat = "", exam = "", letter = "" } = {}) {
  return (entries || []).filter(e => (!cat || e.cat === cat)
    && (!exam || (e.exams || []).includes(exam))
    && (!letter || glInitial(e.shown.term) === letter));
}

// 글자마다 항목 수(색인 단추를 흐리게 할지).
function glLetterCounts(entries) {
  const out = {};
  for (const e of entries || []) {
    const l = glInitial(e.shown.term);
    out[l] = (out[l] || 0) + 1;
  }
  return out;
}

// 검색용 문서(usearch_core.jsx 의 문서 모양): 한·영 이름·다른 이름·key 는 무겁게, 정의는 가볍게.
function glSearchDocs(entries, toItem) {
  return (entries || []).map(e => ({
    id: e.key,
    fields: [
      { t: e.ko.term, w: 1 }, { t: e.en.term, w: 1 }, { t: e.abbr || "", w: 1 },
      ...[...(e.ko.alias || []), ...(e.en.alias || [])].map(t => ({ t, w: 0.9 })),
      { t: e.key, w: 0.8 }, { t: String(e.key).replace(/_/g, " "), w: 0.8 },
      { t: e.shown.def, w: 0.4 },
    ],
    item: toItem ? toItem(e) : e,
  }));
}

function glFind(entries, key) {
  return (entries || []).find(e => e.key === key) || null;
}

// 분류별 항목 수(분류 단추)
function glCatCounts(entries) {
  const out = {};
  for (const e of entries || []) out[e.cat] = (out[e.cat] || 0) + 1;
  return out;
}

Object.assign(window, {
  GL_KO_LETTERS, GL_LATIN_LETTERS, GL_OTHER, glAbbrKey, glCalcTermKeys, glBuildEntries, glInitial, glLetters, glSort, glFilter,
  glLetterCounts, glSearchDocs, glFind, glCatCounts,
});

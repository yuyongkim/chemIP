// 용어사전(glossary_*.jsx) 시험 — 화면 없이 자료·순수 함수·주소를 본다. ko·en 두 벌로 올린다.
//   (1) 자료: 분류별 KO·EN key 같음, 이름·정의 있음, EN 에 한글 없음, key 형식·겹침(분류 자료·계산기 용어·약어 사이),
//       관련 용어(see)·계산기(calc)·화면(view)·시험(exams)·출처(src)·법령 주소(lawUrl) 값이 맞는지, 전체 300개 이상
//   (2) 순수 함수: 첫 글자 색인·거르기·글자별 수·검색 문서·정렬   (3) 주소 ?view=glossary&term=&cat=
//
//   node frontend/scripts/tests/test_glossary.cjs
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const CHEMIP = path.join(__dirname, "..", "..", "public", "chemip");
const BABEL_OPTIONS = {
  presets: ["react", "env"],
  plugins: ["transform-class-properties", "transform-object-rest-spread", "transform-flow-strip-types"],
  targets: { browsers: undefined },
  compact: false,
  comments: false,
};
const babel = require(path.join(CHEMIP, "vendor", "babel.min.js"));
const CALC_PURE = /^calc_(?!view|nav|form|field|table_field|results|notes|unit_select|substance_link)[a-z0-9_]+\.jsx$/;
const GL_PURE = /^glossary_(?!view|toolbar|index_bar|entry\.|entry_meta)[a-z_]+\.jsx$/;
const EXTRA = ["lang.jsx", "data.jsx", "data_en.jsx", "app_labels.jsx", "app_labels_en.jsx", "term_glossary.jsx", "term_glossary_en.jsx",
  "usearch_core.jsx"];
const HANGUL = /[ㄱ-ㆎ가-힣]/;
const KEY_RE = /^[a-z0-9_]+$/;

function load(lang) {
  const html = fs.readFileSync(path.join(CHEMIP, "index.html"), "utf8");
  const files = [...html.matchAll(/<script type="text\/babel" src="([^"?]+)/g)].map(m => m[1])
    .filter(f => CALC_PURE.test(f) || GL_PURE.test(f) || EXTRA.includes(f));
  const sandbox = { console, URLSearchParams, URL, location: { search: `?lang=${lang}`, href: `http://t/chemip?lang=${lang}` } };
  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);
  for (const rel of files) {
    const code = babel.transform(fs.readFileSync(path.join(CHEMIP, rel), "utf8"), { ...BABEL_OPTIONS, filename: rel }).code;
    vm.runInContext(code, ctx, { filename: rel });
  }
  return { W: sandbox, files };
}

const results = [];
function check(name, ok, note = "") {
  results.push(Boolean(ok));
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${note ? ` — ${note}` : ""}`);
}
const short = (list) => `${list.length}${list.length ? `: ${list.slice(0, 6).join(", ")}` : ""}`;

function main() {
  const { W, files } = load("ko");
  const { W: WE } = load("en");
  check("모듈 읽기(분류 자료 10쌍 + 등록·규칙·목록)", files.filter(f => /^glossary_[a-z]+_en\.jsx$/.test(f)).length >= 11
    && files.includes("glossary_entries.jsx"), `${files.filter(f => f.startsWith("glossary_")).length}개`);

  /* ── (1) 자료 ── */
  const cats = W.GLOSSARY_CATS;
  const catKeys = cats.flatMap(c => Object.keys(c.ko));
  const termKeys = Object.keys(W.TERM_GLOSSARY_KO);
  const abbrKeys = Object.keys(W.GLOSSARY_KO).map(W.glAbbrKey);
  const raw = [...abbrKeys, ...termKeys, ...catKeys];
  // 계산기 용어와 분류 자료가 같은 key 면 한 항목으로 합친다(glBuildEntries) — 그 밖의 겹침만 센다
  const merged = [...abbrKeys, ...new Set([...termKeys, ...catKeys])].concat(catKeys.filter((k, i) => catKeys.indexOf(k) !== i));
  const dup = merged.filter((k, i) => merged.indexOf(k) !== i);
  check("key 겹침 없음(분류 자료 사이·약어와; 계산기 용어 = 분류 자료는 합침)", dup.length === 0, short(dup));
  const both = termKeys.filter(k => catKeys.includes(k));
  check("합친 항목은 분류 자료 글 + 계산기 연결", both.every(k => { const e = W.GLOSSARY_ENTRIES.find(x => x.key === k); return e && e.src !== "calc" && (e.calc || e.view); }), short(both.filter(k => { const e = W.GLOSSARY_ENTRIES.find(x => x.key === k); return !e || !(e.calc || e.view); })));
  check("key 형식 [a-z0-9_]", raw.every(k => KEY_RE.test(k)), short(raw.filter(k => !KEY_RE.test(k))));

  const pairBad = [];
  const fieldBad = [];
  const enHangul = [];
  for (const c of cats) {
    const ko = Object.keys(c.ko).sort().join(",");
    const en = Object.keys(c.en || {}).sort().join(",");
    if (ko !== en) pairBad.push(c.k);
    for (const [k, v] of Object.entries(c.ko)) {
      const e = c.en[k] || {};
      if (!v.term || !v.def || !e.term || !e.def) fieldBad.push(`${c.k}.${k}`);
      for (const f of ["term", "def", "law", "ref", "unit"]) if (e[f] && HANGUL.test(e[f])) enHangul.push(`${c.k}.${k}.${f}`);
      for (const a of e.alias || []) if (HANGUL.test(a)) enHangul.push(`${c.k}.${k}.alias`);
      for (const f of ["law", "ref", "unit"]) if (v[f] && HANGUL.test(v[f]) && !e[f]) fieldBad.push(`${c.k}.${k}.${f}(EN 없음)`);
    }
  }
  check("분류마다 KO·EN key 같음", pairBad.length === 0, short(pairBad));
  check("이름·정의 모두 있음, 한글 든 칸은 EN 에도", fieldBad.length === 0, short(fieldBad));
  check("EN 자료에 한글 없음", enHangul.length === 0, short(enHangul));

  const E = W.GLOSSARY_ENTRIES;
  const keySet = new Set(E.map(e => e.key));
  const calcKeys = new Set(W.CALC_REGISTRY.map(d => d.key));
  const bad = { see: [], calc: [], view: [], exams: [], src: [], lawUrl: [], gold: [], cat: [] };
  for (const e of E) {
    for (const s of e.see) if (!keySet.has(s) || s === e.key) bad.see.push(`${e.key}→${s}`);
    if (e.calc && !calcKeys.has(e.calc)) bad.calc.push(`${e.key}→${e.calc}`);
    if (e.view && !W.GLOSSARY_VIEWS.includes(e.view)) bad.view.push(`${e.key}→${e.view}`);
    for (const x of e.exams) if (!W.GLOSSARY_EXAMS.includes(x)) bad.exams.push(`${e.key}→${x}`);
    if (!["own", "law", "std", "calc", "abbr"].includes(e.src)) bad.src.push(`${e.key}→${e.src}`);
    if (e.lawUrl && !/^https:\/\/(www\.)?law\.go\.kr\/[\x21-\x7e]*$/.test(e.lawUrl)) bad.lawUrl.push(e.key);
    if (e.gold && !/^[A-Z]\d{5}$/.test(e.gold)) bad.gold.push(e.key);
    if (!W.GLOSSARY_CAT_ORDER.includes(e.cat)) bad.cat.push(`${e.key}→${e.cat}`);
  }
  for (const [k, v] of Object.entries(bad)) check(`항목 값: ${k}`, v.length === 0, short(v));
  check("모든 계산기 용어에 계산기(또는 화면) 연결", E.filter(e => e.src === "calc").every(e => e.calc || e.view), short(E.filter(e => e.src === "calc" && !e.calc && !e.view).map(e => e.key)));
  check("법령 정의(src law)는 근거 조문이 있음", E.filter(e => e.src === "law").every(e => e.ko.law), short(E.filter(e => e.src === "law" && !e.ko.law).map(e => e.key)));

  const L = W.GLOSSARY_LABELS;
  const LE = WE.GLOSSARY_LABELS;
  check("분류·시험 이름(ko·en)", W.GLOSSARY_CAT_ORDER.every(k => L.cats[k] && LE.cats[k] && !HANGUL.test(LE.cats[k]))
    && W.GLOSSARY_EXAMS.every(x => L.exams[x] && LE.exams[x]));
  const byCat = W.glCatCounts(E);
  console.log(`  분류별: ${W.GLOSSARY_CAT_ORDER.map(k => `${k} ${byCat[k] || 0}`).join(" · ")}`);
  check("전체 300개 이상", E.length >= 300, `${E.length}개 (분류 자료 ${catKeys.length} · 계산기 용어 ${termKeys.length} · 약어 ${abbrKeys.length})`);
  check("모든 분류에 항목", W.GLOSSARY_CAT_ORDER.every(k => byCat[k] > 0));
  check("법령 조문이 붙은 항목", E.filter(e => e.ko.law).length >= 50, `${E.filter(e => e.ko.law).length}개`);
  const ex = Object.fromEntries(W.GLOSSARY_EXAMS.map(x => [x, E.filter(e => e.exams.includes(x)).length]));
  check("시험마다 항목", W.GLOSSARY_EXAMS.every(x => ex[x] >= 20), JSON.stringify(ex));
  check("EN 화면: 보이는 이름·정의 영어", WE.GLOSSARY_ENTRIES.every(e => !HANGUL.test(e.shown.term) && !HANGUL.test(e.shown.def)),
    short(WE.GLOSSARY_ENTRIES.filter(e => HANGUL.test(e.shown.term) || HANGUL.test(e.shown.def)).map(e => e.key)));
  check("KO 화면: 분류 자료는 한국어 이름", E.filter(e => e.src !== "abbr").every(e => e.shown.term === e.ko.term));

  /* ── (2) 순수 함수 ── */
  const K = W.GL_KO_LETTERS;
  check("한글 자모 14자", K.length === 14 && K[0] === "ㄱ" && K[13] === "ㅎ");
  check("첫 글자: 한글 초성·된소리는 예사소리", W.glInitial("인화점") === "ㅇ" && W.glInitial("까다로움") === "ㄱ" && W.glInitial("쌍") === "ㅅ");
  check("첫 글자: 라틴·기호·숫자", W.glInitial("HAZOP") === "H" && W.glInitial("ppm (부피)") === "P" && W.glInitial("(주) x") === "ㅈ"
    && W.glInitial("1,3-부타디엔") === "#" && W.glInitial("Ångström") === "A" && W.glInitial("") === "#");
  check("색인 글자: ko = ㄱ–ㅎ + A–Z + #, en = A–Z + #", W.glLetters("ko").length === 41 && WE.glLetters("en").length === 27);
  const counts = W.glLetterCounts(E);
  check("글자별 수 합 = 전체", Object.values(counts).reduce((a, b) => a + b, 0) === E.length);
  check("거르기: 분류·시험·글자", W.glFilter(E, { cat: "hazmat" }).every(e => e.cat === "hazmat")
    && W.glFilter(E, { exam: "hm" }).every(e => e.exams.includes("hm"))
    && W.glFilter(E, { letter: "ㅇ" }).length === counts["ㅇ"] && W.glFilter(E, {}).length === E.length);
  const hits = W.usRankDocs("인화점", W.glSearchDocs(E));
  check("찾기: 인화점 → flash_point 첫 결과", hits[0] && hits[0].key === "flash_point", hits.slice(0, 3).map(h => h.key).join(","));
  const hitsEn = WE.usRankDocs("designated quantity", WE.glSearchDocs(WE.GLOSSARY_ENTRIES));
  check("찾기(en): designated quantity → designated_quantity", hitsEn[0] && hitsEn[0].key === "designated_quantity", hitsEn.slice(0, 3).map(h => h.key).join(","));
  const hz = W.usRankDocs("HAZOP", W.glSearchDocs(E));
  check("찾기: 약어 HAZOP(다른 이름)", hz[0] && hz[0].key === "hazop", hz.slice(0, 3).map(h => h.key).join(","));
  const ab = W.glFind(E, "k_reach");
  check("약어 항목: key 소문자, 자료 출처 화면", ab && ab.abbr === "K-REACH" && ab.view === "sources" && ab.cat === "abbr");
  const sorted = W.glSort([{ key: "b", shown: { term: "나" } }, { key: "a", shown: { term: "가" } }], "ko");
  check("정렬: 화면 언어 순서", sorted[0].key === "a");

  /* ── (3) 주소 ── */
  check("주소 만들기", W.glossaryHref("flash_point") === "?view=glossary&term=flash_point" && W.glossaryHref("", "ih") === "?view=glossary&cat=ih");
  const rl = W.glossaryReadLink("?view=glossary&term=Flash_Point<x>&cat=ih");
  check("주소 읽기: 소문자·허용 글자만", rl.term === "flash_pointx" && rl.cat === "ih", JSON.stringify(rl));
  const u1 = W.glossaryUrlWith("http://t/chemip?lang=en&view=glossary&term=a", { term: "lfl", cat: "" });
  check("주소 맞추기: lang 그대로, term 바꿈, 빈 cat 지움", new URL(u1).searchParams.get("lang") === "en" && new URL(u1).searchParams.get("term") === "lfl"
    && !new URL(u1).searchParams.has("cat"), u1);
  const u2 = W.glossaryUrlWith("http://t/chemip?view=glossary&term=a&cat=ih&lang=ko", null);
  check("주소: 떠날 때 view·term·cat 지움", u2 === "http://t/chemip?lang=ko", u2);
  check("모든 항목 딥링크가 다시 그 항목으로", E.every(e => W.glFind(E, W.glossaryReadLink(W.glossaryHref(e.key)).term) === e));

  const failed = results.filter(x => !x).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
}

main();

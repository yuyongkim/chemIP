// 둘러보기(처음 화면 자주 찾는 물질·오늘의 물질·사고 소식 자리·도구, 물질 상세 관련 물질, 대표 주소·hreflang) 순수 함수 시험.
// 화면 없이 index.html 순서대로 문구·자료·순수 모듈만 vm 에 올린다(빌드와 같은 vendored Babel·설정). 화면 언어 ko·en 두 벌.
// 관련 물질 파일이 내보내기 결과(E:\dev-cache\chemip-static\out\v1\rel)에 있으면 실제 파일로도 확인한다.
//
//   node frontend/scripts/tests/test_discovery.cjs
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const zlib = require("zlib");

const CHEMIP = path.join(__dirname, "..", "..", "public", "chemip");
const REL_OUT = "E:/dev-cache/chemip-static/out/v1/rel";
const BABEL_OPTIONS = {
  presets: ["react", "env"],
  plugins: ["transform-class-properties", "transform-object-rest-spread", "transform-flow-strip-types"],
  targets: { browsers: undefined },
  compact: false,
  comments: false,
};
const babel = require(path.join(CHEMIP, "vendor", "babel.min.js"));
const MODULES = [
  "lang.jsx", "reg_list_names_en.jsx",
  "landing_discover_data.jsx", "landing_discover_labels.jsx", "landing_discover_labels_en.jsx", "landing_discover_helpers.jsx",
  "product_related_labels.jsx", "product_related_labels_en.jsx", "product_related_helpers.jsx", "app_meta.jsx",
];

function load(lang) {
  const html = fs.readFileSync(path.join(CHEMIP, "index.html"), "utf8");
  const listed = [...html.matchAll(/<script type="text\/babel" src="([^"?]+)/g)].map(m => m[1]);
  const files = listed.filter(f => MODULES.includes(f));
  const store = {};
  const sandbox = {
    console, URLSearchParams, URL, Date,
    location: { search: `?lang=${lang}`, href: `http://t/chemip?lang=${lang}` },
    localStorage: { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = String(v); } },
  };
  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);
  for (const rel of files) {
    const code = babel.transform(fs.readFileSync(path.join(CHEMIP, rel), "utf8"), { ...BABEL_OPTIONS, filename: rel }).code;
    vm.runInContext(code, ctx, { filename: rel });
  }
  return { W: sandbox, files, listed };
}

const results = [];
function check(name, ok, note = "") {
  results.push(Boolean(ok));
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${note ? ` — ${note}` : ""}`);
}

const CAS_RE = /^\d{2,7}-\d{2}-\d$/;

function main() {
  const { W, files, listed } = load("ko");
  const { W: WE } = load("en");
  check("모듈이 index.html 에 모두 있음", MODULES.every(m => listed.includes(m)), MODULES.filter(m => !listed.includes(m)).join(", "));
  check("모듈 읽기", files.length === MODULES.length, `${files.length}개`);
  const comps = ["landing_popular.jsx", "landing_today.jsx", "landing_discover.jsx", "landing_feed_slot.jsx", "landing_tools.jsx",
    "api_discovery.jsx", "product_related.jsx"];
  check("화면·API 파일이 index.html 에 있음", comps.every(m => listed.includes(m)), comps.filter(m => !listed.includes(m)).join(", "));
  check("landing.jsx 보다 둘러보기 절이 먼저 읽힘",
    ["landing_discover.jsx", "landing_feed_slot.jsx", "landing_tools.jsx"].every(f => listed.indexOf(f) < listed.indexOf("landing.jsx")));

  /* ── 자료·문구 ── */
  const all = [...W.LANDING_POPULAR_CAS, ...W.LANDING_TODAY_CAS];
  check("목록: CAS 모양·중복 없음", all.every(c => CAS_RE.test(c)) && new Set(W.LANDING_POPULAR_CAS).size === W.LANDING_POPULAR_CAS.length
    && new Set(W.LANDING_TODAY_CAS).size === W.LANDING_TODAY_CAS.length);
  check("자주 찾는 물질 12개", W.LANDING_POPULAR_CAS.length === 12);
  check("오늘의 물질 28개 이상", W.LANDING_TODAY_CAS.length >= 28, String(W.LANDING_TODAY_CAS.length));
  const missing = (L, key) => all.filter(c => !L[key][c]);
  check("이름: ko·en 모두", !missing(W.LANDING_DISCOVER_KO, "names").length && !missing(WE.LANDING_DISCOVER_EN, "names").length,
    [...missing(W.LANDING_DISCOVER_KO, "names"), ...missing(WE.LANDING_DISCOVER_EN, "names")].join(","));
  const noHook = (L) => W.LANDING_TODAY_CAS.filter(c => !L.hooks[c]);
  check("한 줄 설명: 오늘의 물질마다 ko·en", !noHook(W.LANDING_DISCOVER_KO).length && !noHook(WE.LANDING_DISCOVER_EN).length);
  check("한 줄 설명: 영어에 한글 없음", Object.values(WE.LANDING_DISCOVER_EN.hooks).every(t => !/[가-힣]/.test(t)));
  check("화면 언어: ko 는 한국어 이름, en 은 영어 이름", W.LANDING_DISCOVER.names["71-43-2"] === "벤젠" && WE.LANDING_DISCOVER.names["71-43-2"] === "Benzene");
  check("도구: 항목마다 ko·en 문구", W.LANDING_TOOLS.every(t => W.LANDING_DISCOVER_KO.tools.items[t.k] && WE.LANDING_DISCOVER_EN.tools.items[t.k]));

  /* ── 오늘의 물질: 날짜로 돈다 ── */
  const L = ["a", "b", "c"];
  check("날짜 번호: 1970-01-01 = 0", W.landingDayNumber(new Date(1970, 0, 1, 23, 59)) === 0);
  check("같은 날은 시각과 무관하게 같은 물질",
    W.landingTodayCas(L, new Date(2026, 9, 31, 0, 1)) === W.landingTodayCas(L, new Date(2026, 9, 31, 23, 59)));
  const seq = [0, 1, 2, 3].map(d => W.landingTodayCas(L, new Date(2026, 9, 31 + d)));
  check("다음 날은 다음 물질, 끝에서 처음으로", seq[0] !== seq[1] && seq[1] !== seq[2] && seq[3] === seq[0], seq.join(","));
  const month = new Set(Array.from({ length: W.LANDING_TODAY_CAS.length }, (_, d) => W.landingTodayCas(W.LANDING_TODAY_CAS, new Date(2026, 10, 1 + d))));
  check("목록 길이만큼의 날 동안 모두 한 번씩", month.size === W.LANDING_TODAY_CAS.length);
  check("빈 목록 → 빈 값", W.landingTodayCas([], new Date()) === "");
  check("1970 이전 날짜도 목록 안", L.includes(W.landingTodayCas(L, new Date(1960, 0, 1))));

  /* ── 주소 ── */
  check("물질 화면 주소", W.landingSubstanceHref("71-43-2") === "?view=product&pv=chemical&chem=71-43-2");
  check("화면 주소", W.landingViewHref("calc") === "?view=calc");

  /* ── 도구: 등록된 화면만 ── */
  const tools = W.landingAvailableTools(W.LANDING_TOOLS, ["landing", "calc", "glossary"], { CALC_REGISTRY: [1, 2, 3] });
  check("도구: 등록된 화면만, 목록 순서", tools.map(t => t.k).join(",") === "calc,glossary", tools.map(t => t.k).join(","));
  check("도구: 계산기 개수", tools[0].count === 3 && tools[1].count === null);
  check("도구: 화면이 없으면 빈 목록", W.landingAvailableTools(W.LANDING_TOOLS, [], {}).length === 0);
  check("도구: GHS 표지(ghslabel)·혼촉(compat)·혼합물(mixghs) key",
    W.landingAvailableTools(W.LANDING_TOOLS, ["ghslabel", "compat", "mixghs"], {}).map(t => t.view).join(",") === "ghslabel,compat,mixghs");

  /* ── 사고 소식 ── */
  const feed = { sources: { csb: { name: "US CSB" } }, items: [
    { id: 1, date: "2026-10-01", title: "Old", url: "https://x/1", source: "csb" },
    { id: 2, date: "2026-10-20", title: "New", url: "javascript:alert(1)", source: "nics" },
    { id: 3, date: "", title: "" },
    { id: 4, date: "2026-10-10", title: "Mid", url: "https://x/4", source: "csb" },
  ] };
  const fi = W.landingFeedItems(feed, 2);
  check("소식: 최신순 n 건, 제목 없는 항목 뺌", fi.map(x => x.title).join(",") === "New,Mid");
  check("소식: http(s) 주소만 링크, 출처 이름", fi[0].url === "" && fi[1].url === "https://x/4" && fi[1].source === "US CSB" && fi[0].source === "nics");
  check("소식: 자료 없음·모양 다름 → []", W.landingFeedItems(null, 4).length === 0 && W.landingFeedItems({ items: "x" }, 4).length === 0);

  /* ── 관련 물질 ── */
  const RL = W.RELATED_LABELS, RE = WE.RELATED_LABELS;
  const item = { cas: "108-88-3", ko: "톨루엔", en: "Toluene", nl: 5, ng: 1,
    why: [{ t: "fam", k: "btex" }, { t: "law", k: "KR_CHEM_PRTR", ko: "화학물질 배출량조사 대상 화학물질" }, { t: "ghs", k: "repr_2" }] };
  const rk = W.relatedReasons(item, RL, "ko", null);
  check("이유(ko): 계열·목록·유해성·남은 개수", rk.map(r => r.text).join("|") === "BTEX 방향족 용제|화학물질 배출량조사 대상 화학물질|생식독성 2|규제 목록 5개 공유",
    rk.map(r => r.text).join("|"));
  const re = WE.relatedReasons(item, RE, "en", WE.REG_LIST_ENGLISH_NAMES);
  check("이유(en): 목록 영어 이름(REG_LIST_ENGLISH_NAMES)", re[1].text === WE.REG_LIST_ENGLISH_NAMES.KR_CHEM_PRTR && re[0].text === "BTEX aromatic solvents"
    && re[3].text === "5 shared lists", re.map(r => r.text).join("|"));
  const unknownLaw = WE.relatedReasons({ why: [{ t: "law", k: "KR_NEW", ko: "새 목록" }, { t: "ghs", k: "zz" }], nl: 1, ng: 1 }, RE, "en", WE.REG_LIST_ENGLISH_NAMES);
  check("이유: 모르는 key 는 자료 이름·key 그대로, 다 보였으면 개수 줄 없음", unknownLaw.map(r => r.text).join("|") === "새 목록|zz");
  const nk = W.relatedNames(item, "ko"), ne = WE.relatedNames(item, "en");
  check("이름: 화면 언어가 주, 다른 언어가 보조", nk.main === "톨루엔" && nk.sub === "Toluene" && ne.main === "Toluene" && ne.sub === "톨루엔");
  check("이름: 영어가 없으면 한국어, 둘 다 없으면 CAS", WE.relatedNames({ cas: "1-1-1", ko: "가" }, "en").main === "가"
    && W.relatedNames({ cas: "1-1-1" }, "ko").main === "1-1-1" && WE.relatedNames({ cas: "x", ko: "가" }, "en").sub === "");

  /* ── 대표 주소·hreflang ── */
  check("canonical: 한국어 처음 화면은 그대로", W.appCanonicalSearch("") === "" && W.appCanonicalSearch("?view=product&chem=001008") === "");
  check("canonical: 영어는 ?lang=en", W.appCanonicalSearch("?lang=en&view=calc") === "?lang=en");
  check("canonical: 용어사전 용어는 view·term 유지", W.appCanonicalSearch("?view=glossary&term=psm&cat=psm&lang=en") === "?view=glossary&term=psm&lang=en");
  check("hreflang 짝: ko·en", W.appAlternateSearch("?view=glossary&term=psm&lang=en", "ko") === "?view=glossary&term=psm"
    && W.appAlternateSearch("?view=glossary&term=psm", "en") === "?view=glossary&term=psm&lang=en"
    && W.appAlternateSearch("?q=x", "en") === "?lang=en");

  /* ── 실제 관련 물질 파일(내보내기 결과가 있으면) ── */
  const benz = path.join(REL_OUT, "71-43-2.json");
  if (fs.existsSync(benz)) {
    const body = JSON.parse(zlib.gunzipSync(fs.readFileSync(benz)).toString("utf8"));
    check("rel/71-43-2.json: 8개, 자기 자신 없음", body.v === 1 && body.cas === "71-43-2" && body.items.length === 8 && body.items.every(it => it.cas !== "71-43-2"));
    check("rel/71-43-2.json: 톨루엔이 BTEX 계열 이유로", body.items.some(it => it.cas === "108-88-3" && it.why.some(w => w.t === "fam" && w.k === "btex")));
    const unknown = [];
    for (const it of body.items) for (const w of it.why) {
      if (w.t === "fam" && !RL.families[w.k]) unknown.push(w.k);
      if (w.t === "ghs" && !RL.ghs[w.k]) unknown.push(w.k);
      if (w.t === "law" && !WE.REG_LIST_ENGLISH_NAMES[w.k]) unknown.push(w.k);
    }
    check("rel/71-43-2.json: 이유 key 가 모두 문구에 있음", unknown.length === 0, unknown.join(","));
  } else {
    console.log("SKIP 실제 관련 물질 파일 — 내보내기 결과 없음");
  }

  const failed = results.filter(r => !r).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
}

main();

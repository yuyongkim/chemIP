// 통합 검색(public/chemip/usearch_*.jsx) 시험 — 화면 없이 순수 함수(점수·순위·묶음 모양·묶음 순서·강조·주소)와
// 실제 자료(계산기 등록 목록·용어집·MSDS 항목·화면 목록)로 돌린 묶음 결과를 본다. 물질 검색·기술지침 요청은 가짜 함수로 바꾼다.
// 번역은 빌드와 같은 vendored Babel·설정(static_vm_loader.cjs 와 같음). 화면 언어 ko·en 두 벌로 올린다.
//
//   node frontend/scripts/tests/test_unified_search.cjs
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

// index.html 순서대로, React 화면이 아닌 모듈만(계산기 정의·용어집·문구·통합 검색 순수 모듈).
const CALC_PURE = /^calc_(?!view|nav|form|field|table_field|table_out|results|notes|unit_select|substance_link)[a-z0-9_]+\.jsx$/;
const US_PURE = /^usearch_(labels|labels_en|core|link|provider_[a-z]+|providers)\.jsx$/;
// 용어사전 자료·순수 모듈(화면 컴포넌트 glossary_view·toolbar·index_bar·entry·entry_meta 는 뺀다) — 용어 묶음이 GLOSSARY_ENTRIES 를 읽는다.
const GL_PURE = /^glossary_(?!view|toolbar|index_bar|entry\.|entry_meta)[a-z_]+\.jsx$/;
const EXTRA = [
  "lang.jsx", "data.jsx", "data_en.jsx", "app_labels.jsx", "app_labels_en.jsx", "product_labels.jsx", "product_labels_en.jsx",
  "chem_name_core.jsx", "product_msds_helpers.jsx", "term_glossary.jsx", "term_glossary_en.jsx",
  "intl_regions.jsx", "reg_list_names_en.jsx", "reg_labels.jsx", "reg_labels_en.jsx", "reg_helpers.jsx", // 규제 목록 묶음(2026-10-31)
  "prtr_map_labels.jsx", "prtr_map_labels_en.jsx", "prtr_map_helpers.jsx", // 취급 사업장 지도 묶음(2026-10-31, 물질 목록 없으면 화면 줄만)
  "facts_labels.jsx", "facts_labels_en.jsx", "facts_core.jsx", // 식별자·UN 번호 묶음(2026-10-31, 번호 모양이 아니면 요청 없음)
  "feed_labels.jsx", "feed_labels_en.jsx", "feed_helpers.jsx", "feed_link.jsx", // 화학사고 소식 묶음(2026-10-31, 자료 없으면 화면 줄만; 시험 test_incident_feed.cjs)
  "ghs_labels.jsx", "ghs_labels_en.jsx", "ghs_helpers.jsx", "ghs_label_build.jsx", "ghs_label_url.jsx", // 경고표지(GHS 라벨) 묶음(2026-10-31, 화면 안 자료만)
  "oel_labels.jsx", "oel_labels_en.jsx", "oel_helpers.jsx", // 노출기준 묶음(2026-10-31, 질문 낱말이 없으면 요청 없음; 시험 test_oel.cjs)
];

const FAKE_SUBSTANCES = {
  "벤젠": { total: 31, items: [
    { id: 1, name: "벤젠", cas_no: "71-43-2", chem_id: "001008", name_en: "Benzene", source: "KOSHA", has_msds: true },
    { id: 2, name: "에틸벤젠", cas_no: "100-41-4", chem_id: "000924", name_en: "Ethylbenzene", source: "KOSHA", has_msds: true },
    { id: 3, name: "클로로벤젠", cas_no: "108-90-7", chem_id: "100-41-x", name_en: "Chlorobenzene", source: "NCIS", has_msds: false },
  ] },
  "71-43-2": { total: 2, items: [
    { id: 1, name: "벤젠", cas_no: "71-43-2", chem_id: "001008", name_en: "Benzene", source: "KOSHA", has_msds: true },
    { id: 9, name: "Benzene", cas_no: "71-43-2", chem_id: "71-43-2", name_en: "Benzene", source: "NCIS", has_msds: false },
  ] },
};
const FAKE_REG_LISTS = { groups: ["kr_law", "intl"], lists: [
  { id: "KR_CHEM_PRTR", g: "kr_law", j: "KR", law: "화학물질관리법", title: "화학물질 배출량조사 대상 화학물질", n: 1224, cas: 1200 },
  { id: "EU_REACH_SVHC_CANDIDATE", g: "intl", j: "EU", law: "REACH Regulation (EC) No 1907/2006", title: "EU REACH 고우려물질(SVHC) 후보물질 목록", n: 506, cas: 441 },
] };
const FAKE_GUIDE_ROWS = [
  ["A-29-2018", "오르토-디클로로벤젠에 대한 작업환경측정,분석 기술지침", "2018-11-27", "https://portal.kosha.or.kr/x/1"],
  ["A-30-2018", "클로로벤젠에 대한 작업환경측정,분석 기술지침", "2018-11-27", "https://portal.kosha.or.kr/x/2"],
  ["P-1-2020", "공정위험성 평가 기법에 관한 기술지침", "2020-01-01", "https://portal.kosha.or.kr/x/3"],
  ["H-120-2020", "벤젠 취급 근로자 건강관리 지침", "", ""],
];

function load(lang) {
  const html = fs.readFileSync(path.join(CHEMIP, "index.html"), "utf8");
  const files = [...html.matchAll(/<script type="text\/babel" src="([^"?]+)/g)].map(m => m[1])
    .filter(f => CALC_PURE.test(f) || US_PURE.test(f) || GL_PURE.test(f) || EXTRA.includes(f));
  const calls = { substances: 0, guidesLive: 0 };
  const sandbox = {
    console, URLSearchParams, URL, location: { search: `?lang=${lang}`, href: `http://t/chemip?lang=${lang}` },
    fetchChemicalSearch: async (q) => { calls.substances += 1; return FAKE_SUBSTANCES[q] || { items: [], total: 0 }; },
    fetchGuideFullText: async () => null, // 본문 색인 없음(기본) — 본문 검색은 아래 "기술지침 본문" 절과 test_guide_text.cjs
    fetchGuideIndexRows: async () => FAKE_GUIDE_ROWS,
    fetchRegLists: async () => FAKE_REG_LISTS,
    fetchGuideSearchLive: async () => { calls.guidesLive += 1; return { items: [], total: 0 }; },
  };
  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);
  for (const rel of files) {
    const code = babel.transform(fs.readFileSync(path.join(CHEMIP, rel), "utf8"), { ...BABEL_OPTIONS, filename: rel }).code;
    vm.runInContext(code, ctx, { filename: rel });
  }
  return { W: sandbox, files, calls };
}

const results = [];
function check(name, ok, note = "") {
  results.push(Boolean(ok));
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${note ? ` — ${note}` : ""}`);
}

async function runAll(W, q) {
  const states = {};
  for (const p of W.USEARCH_PROVIDERS) {
    try {
      const r = await p.search(W.usCleanQuery(q));
      states[p.k] = { status: "done", items: r.items || [], total: r.total || 0, moreHref: r.moreHref || "" };
    } catch (e) {
      states[p.k] = { status: "error", items: [], total: 0, error: String(e.message || e) };
    }
  }
  return { states, built: W.usBuildResults(W.USEARCH_PROVIDERS, states) };
}

function ids(state) { return (state.items || []).map(it => it.id); }

async function main() {
  const { W, files } = load("ko");
  const { W: WE } = load("en");
  check("모듈 읽기", files.some(f => f === "usearch_core.jsx") && files.some(f => f === "usearch_providers.jsx"), `${files.length}개`);

  /* ── 순수 함수: 정규화·점수 ── */
  check("usNorm: 공백·하이픈·대소문자", W.usNorm("Flash Point") === "flashpoint" && W.usNorm("71-43-2") === "71432");
  check("usCleanQuery: 앞뒤 공백·연속 공백", W.usCleanQuery("  a   b ") === "a b" && W.usCleanQuery(null) === "");
  const S = W.USEARCH_SCORE;
  check("점수: 같음", W.usFieldScore("lmtd", "LMTD") === S.exact);
  check("점수: 앞부분", W.usFieldScore("ppm", "ppm ↔ mg/m³ 환산") === S.prefix);
  check("점수: 낱말 앞부분", W.usFieldScore("point", "flash point") === S.wordPrefix);
  check("점수: 가운데 포함", W.usFieldScore("벤젠", "클로로벤젠") === S.contains);
  check("점수: 한 글자는 가운데 포함 안 함", W.usFieldScore("젠", "클로로벤젠") === 0);
  check("점수: 낱말이 모두 포함", W.usFieldScore("point flash", "flash point") === S.allTokens);
  check("점수: 안 맞음·빈 값", W.usFieldScore("xyz", "flash point") === 0 && W.usFieldScore("", "a") === 0 && W.usFieldScore("a", null) === 0);
  check("문서 점수 = 칸 점수 × 무게 의 최댓값", W.usDocScore("lmtd", { fields: [{ t: "LMTD 계산", w: 1 }, { t: "lmtd", w: 0.5 }] }) === S.prefix);

  const docs = [
    { fields: [{ t: "클로로벤젠" }], item: { id: "a", title: "A" } },
    { fields: [{ t: "벤젠" }], item: { id: "b", title: "B" } },
    { fields: [{ t: "톨루엔" }], item: { id: "c", title: "C" } },
    { fields: [{ t: "디클로로벤젠" }], item: { id: "d", title: "D" } },
  ];
  const ranked = W.usRankDocs("벤젠", docs);
  check("순위: 점수 높은 순, 같으면 원래 순서, 안 맞으면 뺌", ranked.map(x => x.id).join(",") === "b,a,d", ranked.map(x => `${x.id}:${x.score}`).join(" "));
  check("순위: 원본 item 을 바꾸지 않음", docs[1].item.score === undefined && ranked[0].score === S.exact);
  check("순위: 빈 검색어 → 빈 결과", W.usRankDocs("  ", docs).length === 0);

  /* ── 강조 ── */
  const hl = W.usHighlight("Flash point (FP)", "flash");
  check("강조: 대소문자 무시", hl.length === 2 && hl[0].hit && hl[0].t === "Flash" && !hl[1].hit, JSON.stringify(hl));
  const hl2 = W.usHighlight("boiling point and flash point", "flash point");
  check("강조: 낱말마다·여러 번", hl2.filter(p => p.hit).map(p => p.t).join("|") === "point|flash point", JSON.stringify(hl2));
  check("강조: 빈 검색어 → 통째로", W.usHighlight("abc", "").length === 1 && !W.usHighlight("abc", "")[0].hit);

  /* ── 묶음 모양·순서 ── */
  const P = [{ k: "p1", limit: 2, max: 4 }, { k: "p2", limit: 3 }, { k: "p3", limit: 3 }, { k: "p4", limit: 3 }];
  const mk = (n, score) => Array.from({ length: n }, (_, i) => ({ id: `x${i}`, title: `t${i}`, score }));
  const gv = W.usGroupView(P[0], { status: "done", items: mk(6, 50), total: 40, moreHref: "?more" });
  check("묶음 모양: 위 limit 건, 펼칠 몫은 max 까지, 숨은 건수 = 전체 − 보인 것",
    gv.items.length === 2 && gv.extra.length === 2 && gv.hidden === 38 && gv.moreHref === "?more" && gv.best === 50);
  check("묶음 모양: 상태 없음 → 찾는 중", W.usGroupView(P[1], undefined).status === "loading");
  const built = W.usBuildResults(P, {
    p1: { status: "done", items: mk(3, 55), total: 3 },
    p2: { status: "done", items: [], total: 0 },
    p3: { status: "done", items: mk(1, 100), total: 1 },
    p4: { status: "error", items: [], total: 0, error: "x" },
  });
  check("묶음 순서: 딱 맞는 묶음이 맨 위, 결과 없음·실패는 따로", built.shown.map(g => g.k).join(",") === "p3,p1"
    && built.empty.map(g => g.k).join(",") === "p2" && built.failed.map(g => g.k).join(",") === "p4" && built.total === 4 && !built.loading);
  const loadingBuilt = W.usBuildResults(P, { p1: { status: "loading", items: [], total: 0 }, p2: { status: "done", items: mk(1, 90), total: 1 } });
  check("묶음 순서: 찾는 중인 묶음은 제자리, 상태 없는 묶음도 찾는 중", loadingBuilt.loading
    && loadingBuilt.shown.map(g => g.k).join(",") === "p2,p1,p3,p4");

  /* ── 등록 목록 ── */
  for (const [lang, X] of [["ko", W], ["en", WE]]) {
    const keys = X.USEARCH_PROVIDERS.map(p => p.k);
    check(`[${lang}] 등록: key 겹침 없음·search 함수·묶음 이름`, new Set(keys).size === keys.length
      && X.USEARCH_PROVIDERS.every(p => typeof p.search === "function" && X.USEARCH_LABELS.groups[p.k]), keys.join(","));
  }

  /* ── 실제 자료로: 예시 검색어 ── */
  for (const [lang, X] of [["ko", W], ["en", WE]]) {
    const HANGUL = /[가-힣]/;
    let r = await runAll(X, "LMTD");
    check(`[${lang}] LMTD → 계산기 묶음 맨 위, 첫 결과 lmtd`, r.built.shown[0]?.k === "calculators" && ids(r.states.calculators)[0] === "c:lmtd",
      r.built.shown.map(g => g.k).join(","));
    check(`[${lang}] LMTD → 용어 lmtd, 계산기 딥링크`, ids(r.states.terms).includes("t:lmtd")
      && r.states.calculators.items[0].href === "?view=calc&calc=lmtd");
    check(`[${lang}] LMTD → 물질 없음은 '결과 없음' 줄`, r.built.empty.some(g => g.k === "substances"));

    r = await runAll(X, "레이놀즈");
    check(`[${lang}] 레이놀즈 → 계산기 reynolds`, ids(r.states.calculators).includes("c:reynolds"), ids(r.states.calculators).join(","));
    r = await runAll(X, "Reynolds");
    check(`[${lang}] Reynolds → 계산기 reynolds`, ids(r.states.calculators).includes("c:reynolds"));

    // 설비 사이징 묶음 → 계산기(제목·key·용어 이름, 한·영 두 벌)
    for (const [q, key] of [["Cv", "control_valve"], ["조절밸브", "control_valve"], ["Souders", "separator"], ["기액분리기", "separator"], ["NTU", "hx_ntu"],
      ["유효도", "hx_ntu"], ["상사법칙", "pump_system"], ["system curve", "pump_system"], ["3-K", "fittings_dp"], ["Moody", "fittings_dp"],
      ["폴리트로픽", "compressor"], ["intercooling", "compressor"]]) {
      r = await runAll(X, q);
      check(`[${lang}] ${q} → 계산기 ${key}`, ids(r.states.calculators).includes(`c:${key}`), ids(r.states.calculators).slice(0, 4).join(","));
    }

    // 열역학 묶음(실유체 물성 CoolProp·2성분 VLE) → 계산기(제목·요약·용어 이름, 한·영 두 벌)
    for (const [q, key] of [["냉매", "fluid_props"], ["R134a", "fluid_props"], ["p-h", "fluid_props"], ["몰리에", "fluid_props"], ["refrigerant", "fluid_props"],
      ["CoolProp", "fluid_props"], ["기액평형", "vle_binary"], ["공비", "vle_binary"], ["UNIFAC", "vle_binary"], ["azeotrope", "vle_binary"], ["Txy", "vle_binary"]]) {
      r = await runAll(X, q);
      check(`[${lang}] ${q} → 계산기 ${key}`, ids(r.states.calculators).includes(`c:${key}`), ids(r.states.calculators).slice(0, 4).join(","));
    }

    for (const q of ["단위 변환", "unit converter", "Nm3/h", "barg"]) {
      r = await runAll(X, q);
      check(`[${lang}] ${q} → 계산기 첫 결과 units(공학 단위 변환기)`, ids(r.states.calculators)[0] === "c:units", ids(r.states.calculators).slice(0, 3).join(","));
    }

    // 증기표·몰리에·습공기 선도 → 계산기(제목·용어·USEARCH_LABELS calcKeywords, 한·영 두 벌)
    for (const [q, want] of [["증기표", "c:steam"], ["steam table", "c:steam_table"], ["steam tables", "c:steam"], ["몰리에", "c:steam"], ["Mollier", "c:steam"],
      ["습공기선도", "c:psychro"], ["습공기 선도", "c:psychro"], ["psychrometric chart", "c:psychro"]]) {
      r = await runAll(X, q);
      check(`[${lang}] ${q} → 계산기 첫 결과 ${want}`, ids(r.states.calculators)[0] === want, ids(r.states.calculators).slice(0, 3).join(","));
    }
    // 장외 영향 사전 검토·누출량 → 계산기(제목·용어·calcKeywords, 한·영 두 벌)
    for (const [q, want] of [["장외영향평가", "c:offsite"], ["피해범위", "c:offsite"], ["누출량", "c:release"], ["off-site consequence", "c:offsite"], ["source term", "c:release"]]) {
      r = await runAll(X, q);
      check(`[${lang}] ${q} → 계산기 첫 결과 ${want}`, ids(r.states.calculators)[0] === want, ids(r.states.calculators).slice(0, 3).join(","));
    }
    for (const q of ["RMP", "끝점", "KORA"]) {
      r = await runAll(X, q);
      check(`[${lang}] ${q} → 계산기 위 3건에 offsite`, ids(r.states.calculators).slice(0, 3).includes("c:offsite"), ids(r.states.calculators).slice(0, 3).join(","));
    }

    r = await runAll(X, "증기표");
    check(`[${lang}] 증기표 → 포화 증기표(steam_table)도`, ids(r.states.calculators).includes("c:steam_table"));

    r = await runAll(X, "ppm");
    check(`[${lang}] ppm → 용어 첫 결과 ppm, 계산기에 ppm_mgm3`, ids(r.states.terms)[0] === "t:ppm" && ids(r.states.calculators).includes("c:ppm_mgm3"),
      `${ids(r.states.terms).slice(0, 3)} / ${ids(r.states.calculators).slice(0, 3)}`);
    check(`[${lang}] ppm → 용어 결과에 정의 글자`, (r.states.terms.items[0].desc || "").length > 10);

    for (const q of ["flash point", "인화점"]) {
      r = await runAll(X, q);
      // 2026-10-31: 용어사전에 '인화점' 정의가 생겨 용어 묶음(정의 카드)이 맨 위, MSDS 9항 묶음이 바로 다음.
      check(`[${lang}] ${q} → 용어 정의(flash_point) 맨 위, 다음 MSDS 9항`, ids(r.states.terms)[0] === "t:flash_point" && r.built.shown[0]?.k === "terms"
        && ids(r.states.msds)[0] === "m:9" && r.built.shown[1]?.k === "msds", r.built.shown.map(g => g.k).join(","));
    }

    r = await runAll(X, "벤젠");
    check(`[${lang}] 벤젠 → 물질 묶음 맨 위, 상세 링크, 전체 결과 링크`, r.built.shown[0]?.k === "substances"
      && r.states.substances.items[0].href === "?view=product&pv=chemical&chem=001008"
      && r.states.substances.moreHref === "?view=product&pv=search&q=%EB%B2%A4%EC%A0%A0");
    const sg = r.built.shown.find(g => g.k === "substances");
    check(`[${lang}] 벤젠 → 물질 5건 이하 보이고 숨은 건수 = 전체 − 보인 것`, sg.items.length === 3 && sg.hidden === 28);
    check(`[${lang}] 벤젠 → 기술지침 제목 포함 맞춤, 외부 링크`, ids(r.states.guides).includes("g:H-120-2020")
      && r.states.guides.items.every(it => it.external), ids(r.states.guides).join(","));
    check(`[${lang}] 벤젠 → 물질 이름은 화면 언어`, lang === "ko" ? r.states.substances.items[0].title === "벤젠" : r.states.substances.items[0].title === "Benzene");

    r = await runAll(X, "71-43-2");
    check(`[${lang}] 71-43-2 → 물질만, 첫 결과 CAS 일치`, r.built.shown.length === 1 && r.built.shown[0].k === "substances"
      && r.built.shown[0].best === 100, r.built.shown.map(g => `${g.k}:${g.best}`).join(","));

    r = await runAll(X, "계산기");
    check(`[${lang}] 계산기 → 화면 바로가기 calc`, ids(r.states.screens).includes("v:calc"));
    r = await runAll(X, "calculator");
    check(`[${lang}] calculator → 화면 바로가기 calc(다른 언어 낱말도)`, ids(r.states.screens).includes("v:calc"));
    for (const q of ["지정수량", "규정량", "PSM", "화관법", "위험물", "적용 법규", "1군", "2군", "designated quantity"]) {   // 적용 법규 판정기(apl_view.jsx)
      r = await runAll(X, q);
      check(`[${lang}] ${q} → 화면 바로가기 applicability`, ids(r.states.screens).includes("v:applicability"), ids(r.states.screens).join(","));
    }
    r = await runAll(X, "ECHA");
    check(`[${lang}] ECHA → 약어, 용어사전 딥링크`, ids(r.states.terms)[0] === "a:ECHA" && r.states.terms.items[0].href === "?view=glossary&term=echa",
      `${ids(r.states.terms).slice(0, 3)} ${r.states.terms.items[0]?.href}`);

    r = await runAll(X, "SVHC");
    check(`[${lang}] SVHC → 규제 목록 묶음, 목록 주소`, ids(r.states.regLists)[0] === "r:EU_REACH_SVHC_CANDIDATE"
      && r.states.regLists.items[0].href === "?view=reg&list=EU_REACH_SVHC_CANDIDATE");
    r = await runAll(X, lang === "en" ? "PRTR reporting" : "배출량조사");
    check(`[${lang}] 목록 이름(화면 언어) → KR_CHEM_PRTR`, ids(r.states.regLists)[0] === "r:KR_CHEM_PRTR"
      && (lang === "en" ? !/[가-힣]/.test(r.states.regLists.items[0].title) : r.states.regLists.items[0].title.includes("배출량")));

    r = await runAll(X, "zzqqxx");
    check(`[${lang}] 맞는 것 없음 → 보일 묶음 없음`, r.built.shown.length === 0 && r.built.empty.length === X.USEARCH_PROVIDERS.length);

    // 모든 결과의 모양: id 겹침 없음, 제목 있음, 주소는 글자. en 화면이면 보이는 글자에 한글 없음(물질·지침 원문 제외).
    const all = [];
    for (const q of ["LMTD", "ppm", "flash point", "계산기", "MSDS", "pH", "TWA", "LFL", "압력"]) {
      const rr = await runAll(X, q);
      for (const [k, st] of Object.entries(rr.states)) {
        const seen = new Set();
        for (const it of st.items) {
          all.push({ k, q, it, dup: seen.has(it.id) });
          seen.add(it.id);
        }
      }
    }
    check(`[${lang}] 결과 모양: id 겹침 없음·제목·주소 글자`, all.every(x => !x.dup && x.it.title && typeof (x.it.href ?? "") === "string"), `${all.length}건`);
    if (lang === "en") {
      const bad = all.filter(x => !["substances", "guides"].includes(x.k) && [x.it.title, x.it.sub, x.it.desc, x.it.badge].some(t => t && HANGUL.test(t)));
      check("[en] 보이는 글자에 한글 없음(물질·지침 원문 제외)", bad.length === 0, bad.slice(0, 3).map(x => `${x.k}:${x.it.id}`).join(", "));
    }
  }

  /* ── 기술지침: 정적 목록이 없으면 집 PC 검색 ── */
  {
    const { W: W2, calls } = load("ko");
    W2.fetchGuideIndexRows = async () => null;
    W2.fetchGuideSearchLive = async () => { calls.guidesLive += 1; return { total: 7, items: [{ guide_no: "A-1", title: "벤젠 지침", ofanc_ymd: "2020-01-01", file_download_url: "u", source_file: "C:/x" }] }; };
    const r = await W2.USP_GUIDES.search("벤젠");
    check("기술지침: 정적 목록 없음 → 집 PC 검색, 행 모양으로(파일 경로 버림)", calls.guidesLive === 1 && r.total === 7
      && r.items[0].id === "g:A-1" && r.items[0].href === "u" && !JSON.stringify(r).includes("C:/x"));
  }

  /* ── 기술지침 본문(정적 gs/) — 제목 맞춤 + 본문 맞춤, 집 PC 발췌 ── */
  {
    const { W: W3, calls } = load("ko");
    W3.fetchGuideFullText = async () => ({ rows: FAKE_GUIDE_ROWS, unchecked: 2, hits: [
      { doc: 2, count: 3, page: 4, snippet: "… 벤젠 저장 탱크의 위험성 평가 …" },
      { doc: 3, count: 1, page: 1, snippet: "벤젠 취급 근로자" },
    ] });
    const r = await W3.USP_GUIDES.search("벤젠");
    const byId = Object.fromEntries(r.items.map(it => [it.id, it]));
    check("기술지침 본문: 제목 맞춤이 먼저, 본문만 맞은 지침은 뒤(발췌·쪽)", r.items[r.items.length - 1].id === "g:P-1-2020"
      && byId["g:P-1-2020"].desc.includes("저장 탱크") && byId["g:P-1-2020"].sub.includes("4쪽") && r.total === r.items.length + 2,
      r.items.map(it => `${it.id}:${it.score}`).join(" "));
    check("기술지침 본문: 제목·본문 둘 다 맞으면 제목 점수에 발췌만 붙임", byId["g:H-120-2020"].desc === "벤젠 취급 근로자"
      && byId["g:H-120-2020"].score >= 55 && calls.guidesLive === 0);
    const W4 = load("ko").W;
    W4.fetchGuideFullText = async () => null;
    W4.fetchGuideIndexRows = async () => null;
    W4.fetchGuideSearchLive = async () => ({ total: 1, items: [{ guide_no: "A-9", title: "지침", snippet: "본문 벤젠 발췌" }] });
    const r4 = await W4.USP_GUIDES.search("벤젠");
    check("기술지침: 집 PC 검색의 본문 발췌를 설명 줄로", r4.items[0].desc === "본문 벤젠 발췌");
  }

  /* ── 주소 ── */
  check("주소: ?view=search&q=", W.usearchHref("LMTD") === "?view=search&q=LMTD" && W.usearchHref("") === "?view=search");
  const u1 = W.usearchUrlWith("http://t/chemip?lang=en", "벤젠 1");
  check("주소: 다른 칸(lang) 그대로, view·q 넣기", new URL(u1).searchParams.get("lang") === "en" && new URL(u1).searchParams.get("view") === "search"
    && new URL(u1).searchParams.get("q") === "벤젠 1", u1);
  const u2 = W.usearchUrlWith("http://t/chemip?view=search&q=a&lang=ko", null);
  check("주소: 떠날 때 view·q 지우기", u2 === "http://t/chemip?lang=ko", u2);
  const u3 = W.usearchUrlWith("http://t/chemip?view=calc&q=a", null);
  check("주소: 다른 화면의 view 는 지우지 않음", new URL(u3).searchParams.get("view") === "calc", u3);
  check("주소: 처음 검색어 — ?view=search 일 때만 q", W.usearchInitialQuery({ view: "search", query: " LMTD " }) === "LMTD"
    && W.usearchInitialQuery({ view: "product", query: "벤젠" }) === "");

  const failed = results.filter(x => !x).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });

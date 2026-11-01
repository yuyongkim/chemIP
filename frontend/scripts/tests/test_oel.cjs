// 노출기준 비교(public/chemip/oel_*.jsx · api_oel.jsx · usearch_provider_oel.jsx) 시험 — 화면 없이 순수 함수와 통합 검색 묶음.
// 표 모양(oelGroups)·단위 바꾸기(oelCellValues: 계산기 calcPpmToMgm3 와 같은 값)·검색어 읽기(oelParseQuery)·답 카드(usOelItem),
// 정적 파일 받기(fetchOelForSearch: 목록에 없으면 요청 안 함, 파일 404 → null). 물질 검색·파일 받기는 가짜 함수. ko·en 두 벌.
//
//   node frontend/scripts/tests/test_oel.cjs
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

const FILES = [
  "lang.jsx", "calc_units.jsx", "calc_physics.jsx", "calc_link.jsx", "intl_regions.jsx", "product_labels.jsx", "product_labels_en.jsx",
  "chem_name_core.jsx", "product_msds_helpers.jsx", "usearch_labels.jsx", "usearch_labels_en.jsx", "usearch_core.jsx",
  "usearch_provider_substances.jsx", "static_config.jsx",
  "oel_labels.jsx", "oel_labels_en.jsx", "oel_helpers.jsx", "api_oel.jsx", "usearch_provider_oel.jsx",
];

// oel/71-43-2.json 모양(CONTRACT.md "oel/<CAS>.json")의 작은 표본
const BENZENE = {
  v: 1, cas: "71-43-2", exported_at: "2026-10-31", mw: 78.1134,
  rows: [
    { j: "KR", src: "kr_moel_notice", kind: "TWA", value: 0.5, unit: "ppm", note: "발암성 1A, Skin", as_of: "2020-01-16" },
    { j: "KR", src: "kr_moel_notice", kind: "STEL", value: 2.5, unit: "ppm", note: "발암성 1A, Skin", as_of: "2020-01-16" },
    { j: "US", src: "us_osha_specific", kind: "TWA", value: 1, unit: "ppm", note: "29 CFR 1910.1028", as_of: "2026-10-27" },
    { j: "US", src: "us_niosh_npg", kind: "TWA", value: 0.1, unit: "ppm", note: "Ca", as_of: "2026-10-31" },
    { j: "US", src: "us_niosh_npg", kind: "IDLH", value: 500, unit: "ppm", note: "Ca", as_of: "2026-10-31" },
    { j: "EU", src: "eu_boelv", kind: "TWA", value: 0.66, unit: "mg/m3", note: "Skin", as_of: "2024-04-08" },
    { j: "EU", src: "eu_boelv", kind: "TWA", value: 0.2, unit: "ppm", note: "Skin", as_of: "2024-04-08" },
  ],
  sources: { kr_moel_notice: { name: "고시", url: "https://law.go.kr", license: "pd" } },
  links: [{ src: "acgih_tlv", name: "ACGIH TLV", url: "https://www.acgih.org/", license: "link only" }],
};
const NICKEL = {
  v: 1, cas: "7440-02-0", mw: null,
  rows: [
    { j: "KR", src: "kr_moel_notice", kind: "TWA", value: 0.1, unit: "mg/m3", note: "[Nickel soluble] 발암성 1A", as_of: "2020-01-16" },
    { j: "KR", src: "kr_moel_notice", kind: "TWA", value: 1, unit: "mg/m3", note: "[Nickel metal] 발암성 2", as_of: "2020-01-16" },
  ],
  sources: {}, links: [],
};

function load(lang, files = {}) {
  const calls = { search: [], fetched: [] };
  const sandbox = {
    console, URLSearchParams, URL, location: { search: `?lang=${lang}`, href: `http://t/chemip?lang=${lang}` },
    CHEMIP_STATIC: { base: "http://static.test", version: "v1" },
    fetchChemicalSearch: async (q) => {
      calls.search.push(q);
      return q === "벤젠" || q.toLowerCase() === "benzene"
        ? { total: 2, items: [{ id: 1, name: "벤젠", cas_no: "71-43-2", chem_id: "001008", name_en: "Benzene", source: "KOSHA", has_msds: true },
          { id: 2, name: "에틸벤젠", cas_no: "100-41-4", chem_id: "000924", name_en: "Ethylbenzene", source: "KOSHA", has_msds: true }] }
        : { total: 0, items: [] };
    },
    staticGetJson: async (url) => { calls.fetched.push(url); return Object.prototype.hasOwnProperty.call(files, url) ? files[url] : null; },
  };
  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);
  for (const rel of FILES) {
    const code = babel.transform(fs.readFileSync(path.join(CHEMIP, rel), "utf8"), { ...BABEL_OPTIONS, filename: rel }).code;
    vm.runInContext(code, ctx, { filename: rel });
  }
  return { W: sandbox, calls };
}

const results = [];
function check(name, ok, note = "") {
  results.push(Boolean(ok));
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${note ? ` — ${note}` : ""}`);
}
const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));

async function main() {
  const { W } = load("ko");

  /* ── 표 모양 ── */
  const g = W.oelGroups(BENZENE);
  check("묶음: 관할+출처 하나에 한 줄, 파일 순서", g.map(x => x.key).join(",") === "KR|kr_moel_notice,US|us_osha_specific,US|us_niosh_npg,EU|eu_boelv");
  check("묶음: 공통 표시는 notes 로, 값에는 비움", g[0].notes[0] === "발암성 1A, Skin" && g[0].cells.TWA[0].note === "");
  check("묶음: 칸 TWA·STEL·C·IDLH", g[2].cells.IDLH[0].value === 500 && g[2].cells.C.length === 0);
  check("묶음: 기준일 = 가장 늦은 as_of", g[0].asOf === "2020-01-16" && g[3].asOf === "2024-04-08");
  const gn = W.oelGroups(NICKEL);
  check("묶음: 값마다 다른 표시(형태)는 값에 남김", gn[0].notes.length === 0 && gn[0].cells.TWA.map(v => v.note).join("|") === "[Nickel soluble] 발암성 1A|[Nickel metal] 발암성 2");
  check("묶음: 빈 파일·null", W.oelGroups(null).length === 0 && W.oelGroups({ rows: [] }).length === 0);
  check("묶음: 모르는 kind 는 뺌", W.oelGroups({ rows: [{ j: "KR", src: "x", kind: "PEAK", value: 1, unit: "ppm" }] }).length === 0);

  /* ── 단위 바꾸기 (계산기와 같은 식) ── */
  const vm25 = W.CALC_CONST.vm25;
  const toMg = W.oelCellValues(g[0].cells.TWA, "mg", 78.1134, true);
  check("ppm → mg/m³: 계산기 calcPpmToMgm3 와 같은 값", toMg.length === 1 && toMg[0].derived && near(toMg[0].value, W.calcPpmToMgm3(0.5, 78.1134, vm25)) && toMg[0].unit === "mg/m3",
    JSON.stringify(toMg));
  check("ppm → mg/m³: 벤젠 0.5 ppm ≈ 1.60 mg/m³", W.oelFmt(toMg[0].value, true) === "1.6");
  const eu = W.oelCellValues(g[3].cells.TWA, "ppm", 78.1134, true);
  check("원문에 그 단위가 있으면 원문 값(계산 안 함)", eu.length === 1 && eu[0].value === 0.2 && !eu[0].derived);
  const src = W.oelCellValues(g[3].cells.TWA, "source", 78.1134, true);
  check("원문 단위: 그대로 두 값", src.length === 2 && src.every(v => !v.derived));
  const ni = W.oelCellValues(gn[0].cells.TWA, "ppm", 58.69, false);
  check("분진(ppm 값이 없는 물질)은 mg/m³ → ppm 으로 바꾸지 않음", ni.length === 2 && ni.every(v => v.unit === "mg/m3" && !v.derived));
  const nomw = W.oelCellValues(g[0].cells.TWA, "mg", null, true);
  check("분자량 없으면 원문 값", nomw.length === 1 && nomw[0].unit === "ppm" && !nomw[0].derived);
  check("mg/m³ → ppm 역변환", near(W.oelCellValues([{ value: 1.6, unit: "mg/m3", note: "" }], "ppm", 78.1134, true)[0].value, W.calcMgm3ToPpm(1.6, 78.1134, vm25)));
  check("기체·증기 판단: ppm 행이 있으면", W.oelIsVapour(BENZENE) && !W.oelIsVapour(NICKEL));
  check("분자량: 파일 mw 먼저, 없으면 MSDS 9항",
    W.oelMolarMass(BENZENE, []) === 78.1134 && W.oelMolarMass(NICKEL, [{ section_seq: 9, content: [{ msdsItemCode: "I38", itemDetail: "58.69" }] }]) === 58.69,
    String(W.oelMolarMass(NICKEL, [{ section_seq: 9, content: [{ msdsItemCode: "I38", itemDetail: "58.69" }] }])));
  check("숫자 표기: 원문 그대로, 계산값 3자리", W.oelFmt(0.0002) === "0.0002" && W.oelFmt(1210) === "1,210" && W.oelFmt(1.59789, true) === "1.6" && W.oelFmt(null) === "");
  check("단위 이름", W.oelUnitName("mg/m3") === "mg/m³" && W.oelUnitName("f/cc") === "f/cm³" && W.oelUnitName("ppm") === "ppm");

  /* ── 검색어 읽기 ── */
  const words = W.usOelWords();
  const P = (q) => W.oelParseQuery(q, words);
  check("검색어: '벤젠 노출기준'", P("벤젠 노출기준")?.name === "벤젠");
  check("검색어: 띄어쓰기 없이 '톨루엔노출기준'", P("톨루엔노출기준")?.name === "톨루엔");
  check("검색어: '벤젠의 노출 기준'", P("벤젠의 노출 기준")?.name === "벤젠");
  check("검색어: 'benzene exposure limit' · 'Toluene occupational exposure limits'",
    P("benzene exposure limit")?.name === "benzene" && P("Toluene occupational exposure limits")?.name === "Toluene");
  check("검색어: 앞에 'TWA 톨루엔' · 'exposure limits of ammonia'", P("TWA 톨루엔")?.name === "톨루엔" && P("exposure limits of ammonia")?.name === "ammonia");
  check("검색어: 낱말만·없음·낱말 일부(relief, twa8h)는 아님",
    P("노출기준") === null && P("벤젠") === null && P("relief valve") === null && P("twa8h") === null && P("") === null);
  check("검색어: CAS + 낱말", P("71-43-2 PEL")?.name === "71-43-2");

  /* ── 정적 파일 받기 ── */
  const url = "http://static.test/v1/oel/71-43-2.json";
  const sumUrl = "http://static.test/v1/g/oel_summary.json";
  const { W: W2, calls: c2 } = load("ko", { [url]: BENZENE, [sumUrl]: { cas: ["71-43-2"], links: BENZENE.links } });
  check("파일 주소(STATIC_LAYOUT.pages.oel)", (await W2.fetchOelLimits("71-43-2")) === BENZENE && c2.fetched.includes(url));
  check("CAS 모양이 아니면 요청 안 함", (await W2.fetchOelLimits("benzene")) === null && !c2.fetched.some(u => u.includes("benzene")));
  c2.fetched.length = 0;
  check("검색용: 목록에 없는 CAS 는 파일을 받지 않음", (await W2.fetchOelForSearch("100-41-4")) === null && !c2.fetched.some(u => u.includes("100-41-4")));
  const empty = await W2.fetchOelPanel("100-41-4");
  check("패널: 파일 없으면 빈 행 + 목록 파일의 링크", empty.rows.length === 0 && empty.links.length === 1);
  const { W: W3 } = load("ko", {});
  W3.CHEMIP_STATIC = { base: "", version: "v1" };
  const fetched3 = [];
  W3.staticGetJson = async (u) => { fetched3.push(u); return null; };
  await W3.fetchOelLimits("71-43-2");
  check("정적 자료가 꺼져 있으면 같은 주소 /data/v1(PC 사이트 → 백엔드)", fetched3[0] === "/data/v1/oel/71-43-2.json", fetched3[0]);

  /* ── 통합 검색 묶음 ── */
  const r = await W2.USP_OEL.search("벤젠 노출기준");
  check("묶음: 답 카드 한 장(벤젠), 물질 상세 노출기준 표로", r.items.length === 1 && r.items[0].href.includes("chem=001008") && r.items[0].href.endsWith("&anchor=oel"),
    JSON.stringify(r.items[0] && r.items[0].href));
  check("묶음: 제목·보조 줄·대표값 줄", r.items[0].title === "벤젠 노출기준" && r.items[0].sub.includes("71-43-2") && r.items[0].sub.includes("4개 출처")
    && r.items[0].desc.includes("고용노동부 고시 TWA 0.5 ppm") && r.items[0].desc.includes("EU 구속적 기준(BOELV) TWA 0.66 mg/m³"), r.items[0].desc);
  check("묶음: 딱 맞음(묶음 맨 위)", r.items[0].score >= W2.USEARCH_EXACT);
  check("묶음: 질문 낱말이 없으면 물질 검색도 안 함", (await W2.USP_OEL.search("벤젠")).items.length === 0 && !c2.search.includes("벤젠 "));
  const cand = W2.usOelCandidates("benzene", [
    { name: "벤젠 혼합물", name_en: "Benzene, mixture", cas_no: "68512-02-7" }, { name: "x", name_en: "no cas" },
    { name: "벤젠", name_en: "Benzene", cas_no: "71-43-2" }]);
  check("후보: 이름이 딱 맞는 물질이 먼저, CAS 없는 것은 뺌", cand.map(x => x.cas_no).join(",") === "71-43-2,68512-02-7");
  check("묶음: 물질을 못 찾으면 빈 결과", (await W2.USP_OEL.search("없는물질 노출기준")).items.length === 0);
  check("문구: 판정 낱말(적합·초과·위반) 없음", !/적합합니다|초과|위반/.test(JSON.stringify({ d: W2.OEL_LABELS.disclaimer, s: W2.OEL_LABELS.search })));

  const { W: WE } = load("en", { [url]: BENZENE, [sumUrl]: { cas: ["71-43-2"] } });
  const re = await WE.USP_OEL.search("benzene exposure limit");
  check("en: 답 카드 영어 문구", re.items.length === 1 && re.items[0].title === "Benzene exposure limits" && re.items[0].desc.includes("MOEL notice TWA 0.5 ppm"),
    JSON.stringify(re.items[0]));
  check("en: 판정 낱말(compliant·exceeds·violation) 없음", !/compliant\b(?! judgement)|exceeds|violation/i.test(WE.OEL_LABELS.search.desc));
  check("en: 묶음 이름", WE.USEARCH_LABELS.groups.oel === "Exposure limits" && W.USEARCH_LABELS.groups.oel === "노출기준 비교");

  const passed = results.filter(Boolean).length;
  console.log(`\n${passed}/${results.length} passed`);
  process.exit(passed === results.length ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });

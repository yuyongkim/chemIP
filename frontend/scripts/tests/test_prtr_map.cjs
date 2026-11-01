// 취급 사업장 지도(public/chemip/prtr_*.jsx, api_prtr.jsx, usearch_provider_prtr.jsx) 시험 — 화면 없이 순수 함수·자료 읽기·지도 경계.
// 번역은 빌드와 같은 vendored Babel·설정. 내보낸 파일(E:\dev-cache\chemip-static\out\v1\prtr)이 있으면 실제 자료로도 확인한다.
//
//   node frontend/scripts/tests/test_prtr_map.cjs [--data E:\dev-cache\chemip-static\out\v1\prtr]
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const zlib = require("zlib");

const CHEMIP = path.join(__dirname, "..", "..", "public", "chemip");
const BABEL_OPTIONS = {
  presets: ["react", "env"],
  plugins: ["transform-class-properties", "transform-object-rest-spread", "transform-flow-strip-types"],
  targets: { browsers: undefined },
  compact: false,
  comments: false,
};
const babel = require(path.join(CHEMIP, "vendor", "babel.min.js"));
const argData = process.argv.indexOf("--data");
const DATA_DIR = argData > 0 ? process.argv[argData + 1] : "E:\\dev-cache\\chemip-static\\out\\v1\\prtr";

const MODULES = [
  "vendor/d3-array.min.js", "vendor/d3-geo.min.js", "vendor/topojson-client.min.js",
  "lang.jsx", "product_format.jsx", "prtr_map_geo.jsx", "prtr_geo.jsx", "prtr_map_labels.jsx", "prtr_map_labels_en.jsx",
  "prtr_map_helpers.jsx", "api_prtr.jsx", "usearch_core.jsx", "usearch_provider_prtr.jsx",
];

function load(lang, fakes) {
  const sandbox = {
    console, URLSearchParams, URL, location: { search: `?lang=${lang}`, href: `http://t/chemip?lang=${lang}` },
    localStorage: { getItem: () => null, setItem: () => {} },
    useApi: (fn) => fn, ...fakes,
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  const ctx = vm.createContext(sandbox);
  for (const rel of MODULES) {
    let code = fs.readFileSync(path.join(CHEMIP, rel), "utf8");
    if (rel.endsWith(".jsx")) code = babel.transform(code, { ...BABEL_OPTIONS, filename: rel }).code;
    vm.runInContext(code, ctx, { filename: rel });
  }
  return sandbox;
}

const results = [];
function check(name, ok, note = "") {
  results.push(Boolean(ok));
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${note ? ` — ${note}` : ""}`);
}

const INDEX = {
  v: 1, year: 2024, regions: [{ iso: "KR-11", ko: "서울특별시", en: "Seoul" }, { iso: "KR-41", ko: "경기도", en: "Gyeonggi" }],
  cols: ["cas", "name_ko", "name_en", "facilities", "reported_total_kg"],
  substances: [["1310-73-2", "수산화 나트륨", "Sodium hydroxide", 1327, 2.9e7], ["108-88-3", "톨루엔", "Toluene", 623, 3.0e7],
    ["71-43-2", "벤젠", "Benzene", 40, 1.1e6]],
};
const BODY = {
  v: 1, cas: "108-88-3", name_ko: "톨루엔", name_en: "Toluene", year: 2024, reported_facilities: 4,
  totals: { facilities: 3, release_kg: 30, transfer_kg: 60, reported_total_kg: 95 },
  regions: [{ iso: "KR-11", facilities: 1, release_kg: 10, transfer_kg: 0, reported_total_kg: 10 },
    { iso: "KR-41", facilities: 2, release_kg: 20, transfer_kg: 60, reported_total_kg: 85 }],
  sigungu: [{ iso: "KR-41", name: "화성시", facilities: 2, release_kg: 20, transfer_kg: 60, reported_total_kg: 85 },
    { iso: "KR-11", name: "강서구", facilities: 1, release_kg: 10, transfer_kg: 0, reported_total_kg: 10 }],
  unparsed: 0,
  facility_cols: ["name", "iso", "sigungu", "address", "release_kg", "transfer_kg", "reported_total_kg"],
  facilities: [["가", "KR-41", "화성시", "경기도 화성시 1", 10, 60, 75], ["나", "KR-11", "강서구", "서울특별시 강서구 2", 10, 0, 10],
    ["다", "KR-41", "화성시", "경기도 화성시 3", 10, 0, 10]],
};

async function main() {
  const W = load("ko", {});
  const WE = load("en", {});

  /* ── 순수 함수 ── */
  const subs = W.prtrSubstances(INDEX);
  check("prtrSubstances: 열 이름으로 객체", subs.length === 3 && subs[1].cas === "108-88-3" && subs[1].facilities === 623);
  check("prtrSubstanceName: ko/en, 영어 이름 없으면 한국어", W.prtrSubstanceName(subs[1], "ko") === "톨루엔"
    && W.prtrSubstanceName(subs[1], "en") === "Toluene" && W.prtrSubstanceName({ name_ko: "가", name_en: "" }, "en") === "가");
  const f1 = W.prtrFilterSubstances(subs, "톨루");
  check("거르기: 한국어 앞부분", f1.length === 1 && f1[0].cas === "108-88-3");
  check("거르기: CAS 하이픈 없이·영어 대소문자", W.prtrFilterSubstances(subs, "10888")[0]?.cas === "108-88-3"
    && W.prtrFilterSubstances(subs, "BENZENE")[0]?.cas === "71-43-2");
  check("거르기: 딱 맞음이 앞", W.prtrFilterSubstances(subs, "sodium hydroxide")[0]?.cas === "1310-73-2");
  check("거르기: 빈 검색어 → 전부, 안 맞음 → 없음", W.prtrFilterSubstances(subs, " ").length === 3 && W.prtrFilterSubstances(subs, "zzz").length === 0);
  const names = W.prtrRegionNames(INDEX);
  check("지역 이름 ko/en, 모르는 코드는 코드 그대로", W.prtrRegionName(names, "KR-41", "ko") === "경기도"
    && W.prtrRegionName(names, "KR-41", "en") === "Gyeonggi" && W.prtrRegionName(names, "KR-99", "ko") === "KR-99");
  const vals = W.prtrRegionValues(BODY, "release_kg");
  check("지역 값: 고른 지표", vals["KR-11"] === 10 && vals["KR-41"] === 20);
  check("칸: 0 → 0, 최대 → 마지막 칸, 제곱근 눈금", W.prtrBin(0, 10) === 0 && W.prtrBin(10, 10) === W.PRTR_BINS
    && W.prtrBin(0.4, 10) === 1 && W.prtrBin(2.5, 10) === 3);
  check("칸 색: tokens 변수만", W.prtrBinFill(0) === "var(--bg-sunken)" && /var\(--accent\)/.test(W.prtrBinFill(3)));
  const lg = W.prtrLegend([1, 1, 2, 3, 100, 0]);
  check("범례: 값 든 칸만, 칸마다 실제 값 범위", lg.length >= 2 && lg[lg.length - 1].hi === 100
    && lg.every(b => [1, 2, 3, 100].filter(v => W.prtrBin(v, 100) === b.bin).every(v => v >= b.lo && v <= b.hi)));
  check("범례: 빈 값 → 없음", W.prtrLegend([0, 0]).length === 0);
  check("지역 사업장: 고른 지역만·순서 그대로", W.prtrFacilitiesIn(BODY, "KR-41").map(f => f.name).join() === "가,다"
    && W.prtrFacilitiesIn(BODY, "").length === 3);
  check("시군구: 고른 지역만", W.prtrSigunguIn(BODY, "KR-11").length === 1 && W.prtrSigunguIn(BODY, "").length === 2);
  check("지표 표기: 사업장 수 정수, 양은 fmtKg", W.prtrMetricText("facilities", 1327, W.fmtKg) === "1,327"
    && W.prtrMetricText("release_kg", 1500, W.fmtKg) === "1.5t");
  check("주소: 지도·물질 패널", W.prtrMapHref("108-88-3") === "?view=prtr&cas=108-88-3" && W.prtrMapHref("") === "?view=prtr"
    && W.prtrSubstanceHref("108-88-3") === "?view=product&pv=chemical&chem=108-88-3&anchor=handlers");
  check("주소 맞추기: lang 유지, cas 바꿈", W.prtrViewUrl("http://t/chemip?lang=en&view=product&cas=1", "108-88-3")
    === "http://t/chemip?lang=en&view=prtr&cas=108-88-3");

  /* ── 지도 경계 ── */
  const T = W.PRTR_GEO_TOPO;
  const fc = W.topojson.feature(T, T.objects.sido);
  check("경계: 17개 시도, ISO 코드", fc.features.length === 17 && fc.features.every(f => /^KR-\d\d$/.test(f.id)));
  check("경계: 링 방향(d3 기준 면적이 작음 = 바깥 링 시계 방향)", fc.features.every(f => W.d3.geoArea(f) < 0.001),
    fc.features.map(f => `${f.id}:${W.d3.geoArea(f).toExponential(1)}`).slice(0, 3).join(" "));
  const paths = W.prtrGeoPaths();
  check("경로: 17개, 모두 그려짐", paths.length === 17 && paths.every(p => typeof p.d === "string" && p.d.length > 20));
  check("경계 출처·라이선스", W.PRTR_GEO_SOURCE.license === "Public Domain" && /geoboundaries/i.test(W.PRTR_GEO_SOURCE.data_url));
  check("경계 파일 크기 < 40 KB", fs.statSync(path.join(CHEMIP, "prtr_map_geo.jsx")).size < 40000);

  /* ── 자료 읽기(api_prtr.jsx) ── */
  const calls = { static: [], origin: [] };
  const mk = (enabled) => load("ko", {
    staticEnabled: () => enabled,
    STATIC_LAYOUT: { pages: { prtrIndex: "prtr/index.json", prtr: c => `prtr/${c}.json` } },
    staticPagesFile: async (rel) => { calls.static.push(rel); return rel === "prtr/index.json" ? INDEX : rel === "prtr/108-88-3.json" ? BODY : null; },
    originGet: async (p) => {
      calls.origin.push(p);
      if (p === "/prtr/index") return INDEX;
      if (p === "/prtr/108-88-3") return BODY;
      throw new Error("404 Not Found");
    },
  });
  const S = mk(true);
  const a1 = await S.fetchPrtrIndex(), a2 = await S.fetchPrtrSubstance("108-88-3"), a3 = await S.fetchPrtrSubstance("50-00-0");
  check("정적 켜짐: 정적 파일만, 없으면 null(집 PC 요청 0)", a1 === INDEX && a2 === BODY && a3 === null && calls.origin.length === 0,
    calls.static.join(","));
  const P = mk(false);
  const b1 = await P.fetchPrtrIndex(), b2 = await P.fetchPrtrSubstance("108-88-3"), b3 = await P.fetchPrtrSubstance("50-00-0");
  check("정적 꺼짐(PC 사이트): /api/prtr, 404 → null", b1 === INDEX && b2 === BODY && b3 === null
    && calls.origin.join(",") === "/prtr/index,/prtr/108-88-3,/prtr/50-00-0");
  check("CAS 아님 → 요청 없이 null", (await P.fetchPrtrSubstance("abc")) === null && calls.origin.length === 3);

  /* ── 통합 검색 묶음 ── */
  // api_prtr.jsx 가 실제 fetchPrtrIndex 를 내보내므로, 읽은 뒤 가짜로 바꾼다.
  const withIndex = (W0, fn) => { W0.fetchPrtrIndex = fn; return W0; };
  const U = withIndex(load("ko", {}), async () => INDEX);
  const UE = withIndex(load("en", {}), async () => INDEX);
  let r = await U.USP_PRTR.search("톨루엔");
  check("[ko] 톨루엔 → 지도 링크", r.items[0]?.href === "?view=prtr&cas=108-88-3" && /톨루엔/.test(r.items[0].title), r.items.map(i => i.id).join());
  r = await UE.USP_PRTR.search("toluene");
  check("[en] toluene → 영어 제목", r.items[0]?.id === "prtr:108-88-3" && /Toluene/.test(r.items[0].title) && !/[가-힣]/.test(r.items[0].title));
  r = await U.USP_PRTR.search("108-88-3");
  check("CAS → 지도 링크", r.items[0]?.id === "prtr:108-88-3");
  r = await UE.USP_PRTR.search("배출량");
  check("[en] 한국어 낱말(배출량)도 화면 줄", r.items.some(i => i.id === "prtr:screen" && i.href === "?view=prtr"));
  r = await U.USP_PRTR.search("facility map");
  check("[ko] 영어 낱말(facility map)도 화면 줄", r.items.some(i => i.id === "prtr:screen"));
  r = await U.USP_PRTR.search("LMTD");
  check("안 맞으면 없음", r.items.length === 0 && r.total === 0);
  const N = withIndex(load("ko", {}), undefined);
  r = await N.USP_PRTR.search("PRTR");
  check("물질 목록 없어도(함수 없음) 화면 줄은 나옴", r.items.length === 1 && r.items[0].id === "prtr:screen");
  const X = withIndex(load("ko", {}), async () => { throw new Error("offline"); });
  r = await X.USP_PRTR.search("톨루엔");
  check("목록 받기 실패 → 오류 없이 빈 결과", Array.isArray(r.items) && r.items.length === 0);

  /* ── 실제 내보낸 자료 ── */
  if (fs.existsSync(path.join(DATA_DIR, "index.json"))) {
    const read = f => JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(DATA_DIR, f))).toString("utf8"));
    const idx = read("index.json");
    const realSubs = W.prtrSubstances(idx);
    const geoIds = new Set(fc.features.map(f => f.id));
    check("실제 index: 물질·지역 17", realSubs.length > 100 && idx.regions.length === 17 && idx.regions.every(r => geoIds.has(r.iso)),
      `${realSubs.length}종`);
    let ok = true, bad = "";
    let files = 0;
    for (const s of realSubs) {
      const b = read(`${s.cas}.json`);
      files += 1;
      const fac = W.prtrFacilities(b);
      const sumRegion = b.regions.reduce((n, r) => n + r.facilities, 0);
      const sumKg = b.regions.reduce((n, r) => n + r.reported_total_kg, 0);
      const good = fac.length === b.totals.facilities && sumRegion + b.unparsed === b.totals.facilities
        && Math.abs(sumKg - b.totals.reported_total_kg) < 1 + 1e-6 * b.totals.reported_total_kg
        && b.regions.every(r => geoIds.has(r.iso)) && s.facilities === b.totals.facilities
        && fac.every((f, i) => i === 0 || fac[i - 1].reported_total_kg >= f.reported_total_kg);
      if (!good) { ok = false; bad = s.cas; break; }
    }
    check("실제 물질 파일: 지역 합 = 전체, 지도 코드 있음, 합계 큰 순", ok, bad || `${files}개 파일`);
  } else {
    console.log(`SKIP 실제 자료 없음: ${DATA_DIR}`);
  }

  const failed = results.filter(x => !x).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });

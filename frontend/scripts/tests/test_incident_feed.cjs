// 화학사고 소식(feed_*.jsx, api_feed.jsx, usearch_provider_feed.jsx) — 순수 함수·주소·자료 읽기·통합 검색 묶음, ko·en 두 벌.
// 실제 내보내기 결과(E:\dev-cache\chemip-static\out\v1\feed)가 있으면 그 파일로도 읽기·형식을 확인한다. 화면·서버 없이 1초.
//   node frontend/scripts/tests/test_incident_feed.cjs
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const zlib = require("zlib");
const { loadStaticModules, STATIC_ORIGIN, CHEMIP } = require("./static_vm_loader.cjs");

const babel = require(path.join(CHEMIP, "vendor", "babel.min.js"));
const BABEL_OPTIONS = {
  presets: ["react", "env"],
  plugins: ["transform-class-properties", "transform-object-rest-spread", "transform-flow-strip-types"],
  targets: { browsers: undefined }, compact: false, comments: false,
};
const OUT = "E:\\dev-cache\\chemip-static\\out";
const PURE = [
  "lang.jsx", "intl_regions.jsx", "static_config.jsx", "usearch_labels.jsx", "usearch_labels_en.jsx", "usearch_core.jsx",
  "feed_labels.jsx", "feed_labels_en.jsx", "feed_helpers.jsx", "feed_link.jsx", "api_feed.jsx", "usearch_provider_feed.jsx",
];

const SOURCES = {
  chemeng_csb: { name: "CSB investigations", url: "https://www.csb.gov/investigations/", license: "Public domain", n: 2 },
  csb_rss: { name: "CSB news RSS", url: "https://www.csb.gov/media-room/rss-feeds/", license: "Public domain", n: 1 },
  press_gnews: { name: "Google News RSS", url: "https://news.google.com/", license: "Headlines and links only", n: 1 },
};
const ITEMS = [
  { id: "press_gnews:a", date: "2026-10-30", title: "여수 공장 암모니아 누출", url: "https://news.google.com/a", source: "press_gnews",
    cas: ["7664-41-7"], names: ["암모니아"], equipment: [], disciplines: [], country: "", summary: "" },
  { id: "csb_rss:b", date: "2026-10-19", title: "CSB Releases Final Report", url: "https://www.csb.gov/b/", source: "csb_rss",
    cas: [], names: [], equipment: [], disciplines: [], country: "US", summary: "Final report" },
  { id: "chemeng_csb:c", date: "2025-06-04", title: "Shell Polymers Furnace Explosion", url: "https://www.csb.gov/c/", source: "chemeng_csb",
    cas: ["74-85-1", "71-43-2"], names: ["Ethylene", "Benzene"], equipment: ["pump", "valve"], disciplines: ["rotating", "piping"], country: "US", summary: "s" },
  { id: "chemeng_csb:d", date: "", title: "Plant fire in Ludwigshafen", url: "", source: "chemeng_csb",
    cas: [], names: [], equipment: [], disciplines: [], country: "DE", summary: "" },
];
const LATEST = { v: 1, exported_at: "2026-10-31", updated_at: "2026-10-31", total: 10, count: ITEMS.length, sources: SOURCES,
  disciplines: { piping: "배관", rotating: "회전기계" }, countries: { US: 2, DE: 1 },
  substances: [["7664-41-7", "Ammonia", 3220], ["71-43-2", "Benzene", 37]], items: ITEMS };
const BY_CAS = { "71-43-2": { v: 1, cas: "71-43-2", name: "Benzene", total: 37, by_source: { chemeng_csb: 1 },
  items: [{ ...ITEMS[2] }, { id: "chemeng_nics:z", date: "2020-01-01", title: "경북 김천시 벤젠 복합 사고", url: "https://x/z", source: "chemeng_nics",
    cas: ["71-43-2"], names: ["벤젠"], equipment: [], disciplines: [], country: "KR", summary: "" }] } };

function load(lang, { base = "" } = {}) {
  const requests = [];
  const sandbox = {
    console, URL, URLSearchParams, location: { search: `?lang=${lang}`, href: `http://t/chemip?lang=${lang}&view=feed` },
    localStorage: { getItem: () => null, setItem: () => {} },
    // api_static.jsx 대신: 주소를 기록하고 가짜 자료를 돌려준다(없는 파일은 null = 404)
    staticGetJson: async (url) => {
      requests.push(url);
      const rel = url.replace(/^.*?\/v1\//, "");
      if (rel === "feed/latest.json") return JSON.parse(JSON.stringify(LATEST));
      const m = /^feed\/by-cas\/(.+)\.json$/.exec(rel);
      return m && BY_CAS[decodeURIComponent(m[1])] ? JSON.parse(JSON.stringify(BY_CAS[decodeURIComponent(m[1])])) : null;
    },
    useApi: () => ({}),
  };
  sandbox.window = sandbox;
  if (base) sandbox.CHEMIP_STATIC = { base, version: "v1" };
  const ctx = vm.createContext(sandbox);
  for (const rel of PURE) {
    const code = babel.transform(fs.readFileSync(path.join(CHEMIP, rel), "utf8"), { ...BABEL_OPTIONS, filename: rel }).code;
    vm.runInContext(code, ctx, { filename: rel });
  }
  return { W: sandbox, requests };
}

const results = [];
function check(name, ok, note = "") {
  results.push(Boolean(ok));
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${note ? ` — ${note}` : ""}`);
}
const ids = (xs) => xs.map(x => x.id).join(",");

async function main() {
  const { W, requests } = load("ko");
  const { W: E } = load("en");
  const L = W.FEED_LABELS;

  /* ── 거르기 ── */
  check("거르기: 조건 없음 = 전부", W.feedFilterItems(ITEMS, {}).length === 4);
  check("거르기: 나라 US", ids(W.feedFilterItems(ITEMS, { country: "US" })) === "csb_rss:b,chemeng_csb:c");
  check("거르기: 나라 미상", ids(W.feedFilterItems(ITEMS, { country: W.FEED_UNKNOWN_COUNTRY })) === "press_gnews:a");
  check("거르기: 출처", ids(W.feedFilterItems(ITEMS, { source: "chemeng_csb" })) === "chemeng_csb:c,chemeng_csb:d");
  check("거르기: 물질 이름(대소문자 무시)", ids(W.feedFilterItems(ITEMS, { sub: "benzene" })) === "chemeng_csb:c");
  check("거르기: 한글 이름", ids(W.feedFilterItems(ITEMS, { sub: "암모니아" })) === "press_gnews:a");
  check("거르기: CAS", ids(W.feedFilterItems(ITEMS, { sub: "74-85-1" })) === "chemeng_csb:c");
  check("거르기: 제목 낱말 + 나라", ids(W.feedFilterItems(ITEMS, { sub: "ludwigshafen", country: "DE" })) === "chemeng_csb:d");
  check("거르기: 맞는 것 없음", W.feedFilterItems(ITEMS, { sub: "xylene" }).length === 0);

  /* ── 선택지 ── */
  const cc = W.feedCountryOptions(ITEMS);
  check("나라 선택지: 많은 순, 미상은 맨 뒤", JSON.stringify(cc) === JSON.stringify([["US", 2], ["DE", 1], ["_", 1]]), JSON.stringify(cc));
  const so = W.feedSourceOptions(ITEMS, SOURCES);
  check("출처 선택지: 자료 파일 순서", so.map(s => s[0]).join(",") === "chemeng_csb,csb_rss,press_gnews", JSON.stringify(so));

  /* ── 표시 값·링크 ── */
  check("물질 링크 → 사고 사례 패널", W.feedSubstanceHref("71-43-2") === "?view=product&pv=chemical&chem=71-43-2&anchor=incidents");
  const v = W.feedItemView(ITEMS[2], L, SOURCES, W.jurisdictionName);
  check("표시: 종류·출처·나라(ko)", v.kind === "incident" && v.kindLabel === "사고 기록" && v.source === "미국 CSB 조사" && v.country === "미국", `${v.source} / ${v.country}`);
  check("표시: 물질 칩 2개, 링크", v.chems.length === 2 && v.chems[1].name === "Benzene" && v.chems[1].href.includes("anchor=incidents"));
  const vd = W.feedItemView(ITEMS[3], L, SOURCES, W.jurisdictionName);
  check("표시: 날짜 미상·유럽 나라 이름(문구 파일)", vd.date === "날짜 미상" && vd.country === "독일", `${vd.date} / ${vd.country}`);
  const ve = E.feedItemView(ITEMS[3], E.FEED_LABELS, SOURCES, E.jurisdictionName);
  check("표시(en): 영어 이름", ve.date === "Date unknown" && ve.country === "Germany" && ve.source === "US CSB investigations", `${ve.source} / ${ve.country}`);
  check("종류: 보도·기관 소식", W.feedSourceKind("press_gnews") === "press" && W.feedSourceKind("csb_rss") === "news" && W.feedSourceKind("chemeng_rmp") === "incident");
  check("설계 분야 이름: 화면 → 자료 → key", W.feedDisciplineName("piping", { piping: "Piping" }, LATEST.disciplines) === "Piping"
    && W.feedDisciplineName("piping", null, LATEST.disciplines) === "배관" && W.feedDisciplineName("x", null, {}) === "x");

  /* ── 주소 ── */
  const link = W.feedReadLink("?view=feed&sub=71-43-2&country=us&src=chemeng_csb");
  check("주소 읽기", link.sub === "71-43-2" && link.country === "US" && link.source === "chemeng_csb", JSON.stringify(link));
  check("주소 읽기: cas= 도 물질로, 잘못된 글자 제거", W.feedReadLink("?cas=7664-41-7&src=<x>").sub === "7664-41-7" && W.feedReadLink("?src=<x>").source === "x");
  check("주소 만들기", W.feedHref({ sub: "벤젠", country: "KR" }) === `?view=feed&sub=${encodeURIComponent("벤젠")}&country=KR`, W.feedHref({ sub: "벤젠", country: "KR" }));
  const u1 = W.feedUrlWith("http://t/chemip?lang=en&view=feed&sub=a&cas=1", { sub: "b", country: "", source: "csb_rss" });
  check("주소 맞추기: 다른 칸 유지", u1 === "http://t/chemip?lang=en&view=feed&sub=b&src=csb_rss", u1);
  const u2 = W.feedUrlWith("http://t/chemip?lang=en&view=feed&sub=a", null);
  check("주소 맞추기: 떠날 때 지움", u2 === "http://t/chemip?lang=en", u2);

  /* ── 자료 읽기(api_feed.jsx) ── */
  check("주소: 정적 자료 꺼짐 → 같은 주소 /data/v1", W.feedUrl("feed/latest.json") === "/data/v1/feed/latest.json");
  const { W: S, requests: sreq } = load("ko", { base: "https://data.example" });
  check("주소: 정적 자료 켜짐 → R2 뿌리", S.feedUrl("feed/latest.json") === "https://data.example/v1/feed/latest.json");
  const latest = await W.fetchFeedLatest();
  check("latest 읽기", latest && latest.items.length === 4 && requests[0] === "/data/v1/feed/latest.json");
  const bz = await W.fetchFeedByCas(" 71-43-2 ");
  check("물질 파일 읽기", bz.total === 37 && requests.includes("/data/v1/feed/by-cas/71-43-2.json"));
  const none = await W.fetchFeedByCas("11-11-1");
  check("물질 파일 없음 → 빈 답", none && none.total === 0 && none.items.length === 0 && none.cas === "11-11-1");
  const n0 = requests.length;
  check("CAS 아님 → 요청 없이 null", (await W.fetchFeedByCas("benzene")) === null && requests.length === n0);
  void sreq;

  /* ── 통합 검색 묶음 ── */
  const r1 = await W.USP_FEED.search("화학사고");
  check("묶음: '화학사고' → 화면 줄 맨 위", r1.items[0] && r1.items[0].id === "feed:screen" && r1.items[0].href === "?view=feed", ids(r1.items));
  const r1e = await E.USP_FEED.search("incident");
  check("묶음(en): 'incident' → 화면 줄", r1e.items.some(i => i.id === "feed:screen" && i.title === "Incident feed"), ids(r1e.items));
  const r2 = await W.USP_FEED.search("Benzene");
  check("묶음: 물질 이름 → 물질 줄 + 소식", r2.items[0].id === "feed:cas:71-43-2" && r2.items[0].href === "?view=feed&sub=71-43-2"
    && r2.items.some(i => i.id === "feed:chemeng_csb:c" && i.external && i.href === "https://www.csb.gov/c/"), ids(r2.items));
  const r3 = await W.USP_FEED.search("71-43-2");
  check("묶음: CAS → 물질 파일의 소식까지(중복 없이)", r3.items.some(i => i.id === "feed:chemeng_nics:z") && new Set(r3.items.map(i => i.id)).size === r3.items.length, ids(r3.items));
  const r4 = await W.USP_FEED.search("zzqq");
  check("묶음: 맞는 것 없음", r4.items.length === 0 && r4.total === 0);
  check("묶음 이름(ko·en)", W.USEARCH_LABELS.groups.feed === "화학사고 소식" && E.USEARCH_LABELS.groups.feed === "Incident feed");

  /* ── 실제 내보내기 결과(있으면) ── */
  const latestFile = path.join(OUT, "v1", "feed", "latest.json");
  if (!fs.existsSync(latestFile)) {
    console.log(`skip  real export: ${latestFile} 없음`);
  } else {
    const disk = loadStaticModules({ diskRoot: OUT, layout: "contract", extraModules: ["api_core.jsx", "feed_helpers.jsx", "api_feed.jsx"] });
    const real = await disk.win.fetchFeedLatest();
    const raw = JSON.parse(zlib.gunzipSync(fs.readFileSync(latestFile)).toString("utf8"));
    check("실제: gzip 파일을 화면 경로로 읽음", real && real.items.length === raw.items.length && disk.stats.requests === 1, `${real && real.items.length}건`);
    const keys = ["id", "date", "title", "url", "source", "cas", "names", "equipment", "disciplines", "country", "summary"];
    check("실제: 모든 소식이 같은 칸", real.items.every(it => keys.every(k => k in it) && Object.keys(it).length === keys.length));
    check("실제: id 중복 없음", new Set(real.items.map(i => i.id)).size === real.items.length);
    check("실제: 모든 출처에 이름·라이선스", real.items.every(it => real.sources[it.source] && real.sources[it.source].license));
    check("실제: 보도는 요약 없음(제목·링크만)", real.items.filter(i => i.source === "press_gnews").every(i => !i.summary));
    check("실제: 최신순", real.items.every((it, i, a) => i === 0 || (a[i - 1].date || "") >= (it.date || "")));
    check("실제: 출처마다 최소 1건", Object.keys(real.sources).every(s => real.items.some(i => i.source === s)), Object.keys(real.sources).join(","));
    const [cas] = real.substances[0];
    const one = await disk.win.fetchFeedByCas(cas);
    check(`실제: 물질 파일 ${cas}`, one && one.cas === cas && one.items.length > 0 && one.items.every(i => i.cas.includes(cas)), `${one && one.total}건`);
    const absent = await disk.win.fetchFeedByCas("11-11-1");
    check("실제: 없는 물질 → 빈 답", absent.total === 0);
    void STATIC_ORIGIN;
  }

  const failed = results.filter(x => !x).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exitCode = failed ? 1 : 0;
}

main().catch(e => { console.error(e); process.exitCode = 1; });

// 규제 목록 화면(public/chemip/reg_*.jsx, api_reg.jsx) 시험 — 화면 없이 순수 함수(이름·거르기·묶음·쪽·조각·변경 표시·주소)와
// 자료 주소(정적 뿌리 / 꺼졌을 때 /data/v1). 내보낸 파일(E:\dev-cache\chemip-static\out\v1\reg)이 있으면 그 모양도 본다.
// 번역은 빌드와 같은 vendored Babel·설정. 화면 언어 ko·en 두 벌.
//
//   node frontend/scripts/tests/test_reg_lists.cjs
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const zlib = require("zlib");

const CHEMIP = path.join(__dirname, "..", "..", "public", "chemip");
const OUT = "E:\\dev-cache\\chemip-static\\out\\v1\\reg";
const BABEL_OPTIONS = {
  presets: ["react", "env"],
  plugins: ["transform-class-properties", "transform-object-rest-spread", "transform-flow-strip-types"],
  targets: { browsers: undefined },
  compact: false,
  comments: false,
};
const babel = require(path.join(CHEMIP, "vendor", "babel.min.js"));
const FILES = ["lang.jsx", "product_labels.jsx", "product_labels_en.jsx", "intl_regions.jsx", "static_config.jsx",
  "reg_list_names_en.jsx", "reg_labels.jsx", "reg_labels_en.jsx", "reg_helpers.jsx", "api_reg.jsx"];

function load(lang, staticCfg) {
  const fetched = [];
  const sandbox = {
    console, URLSearchParams, URL, location: { search: `?lang=${lang}`, href: `http://t/chemip?lang=${lang}` },
    React: { useState: () => [null, () => {}], useEffect: () => {} },
    useApi: () => ({}), staticGetJson: async (url) => { fetched.push(url); return null; },
    localStorage: { getItem: () => null, setItem: () => {} },
  };
  sandbox.window = sandbox;
  if (staticCfg) sandbox.CHEMIP_STATIC = staticCfg;
  const ctx = vm.createContext(sandbox);
  for (const rel of FILES) {
    const code = babel.transform(fs.readFileSync(path.join(CHEMIP, rel), "utf8"), { ...BABEL_OPTIONS, filename: rel }).code;
    vm.runInContext(code, ctx, { filename: rel });
  }
  return { W: sandbox, fetched };
}

const results = [];
function check(name, ok, note = "") {
  results.push(Boolean(ok));
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${note ? ` — ${note}` : ""}`);
}

const LISTS = [
  { id: "KR_CHEM_PRTR", g: "kr_law", j: "KR", law: "화학물질관리법", title: "화학물질 배출량조사 대상 화학물질", n: 1224, cas: 1200 },
  { id: "EU_REACH_SVHC_CANDIDATE", g: "intl", j: "EU", law: "REACH", title: "EU REACH 고우려물질(SVHC) 후보물질 목록", n: 506, cas: 441 },
  { id: "IR_CERCLA", g: "intl_reg", j: "US", law: "EPA", title: "CERCLA 유해물질", n: 1005, cas: 770 },
  { id: "NEW_UNKNOWN", g: "intl", j: "US", law: "x", title: "새 목록", n: 1, cas: 1 },
];

async function main() {
  const { W } = load("ko");
  const { W: E } = load("en");

  check("이름 ko = 자료 이름", W.regListTitle(LISTS[0]) === LISTS[0].title);
  check("이름 en = 영어 이름 표", E.regListTitle(LISTS[0]) === "PRTR reporting chemicals (Chemicals Control Act)");
  check("이름 en IR_ = PRODUCT_LABELS_EN.intl.listNames", E.regListTitle(LISTS[2]) === "CERCLA hazardous substances");
  check("이름 en 표에 없음 → 자료 이름", E.regListTitle(LISTS[3]) === "새 목록");

  check("거르기: 영어 이름으로(ko 화면)", W.regFilterLists(LISTS, "candidate list").map(m => m.id).join() === "EU_REACH_SVHC_CANDIDATE");
  check("거르기: 낱말 여러 개는 모두", W.regFilterLists(LISTS, "배출량 화학물질").length === 1 && W.regFilterLists(LISTS, "배출량 SVHC").length === 0);
  check("거르기: 나라", W.regFilterLists(LISTS, "", "US").length === 2);
  check("거르기: 나라 이름(한국어)", W.regFilterLists(LISTS, "미국").length === 2, W.regFilterLists(LISTS, "미국").map(m => m.id).join());
  const groups = W.regGroupLists(LISTS, ["kr_law", "ncis", "intl", "intl_reg"]);
  check("묶음: 순서·빈 묶음 뺌", groups.map(g => g.g).join() === "kr_law,intl,intl_reg" && groups[1].lists.length === 2);
  check("나라 고르기: 많은 순", W.regJurisdictions(LISTS).map(x => x.j).join() === "US,EU,KR");

  const rows = [["71-43-2", "벤젠", "Benzene", "Ⅰ그룹"], ["", "아염소산염류", "", "제1류"], ["108-88-3", "톨루엔", "", ""]];
  check("행 이름 ko/en(영어 없으면 한국어)", W.regRowName(rows[0]) === "벤젠" && E.regRowName(rows[0]) === "Benzene" && E.regRowName(rows[2]) === "톨루엔");
  check("행 찾기: CAS·이름·영어 이름", W.regFilterRows(rows, "71-43").length === 1 && W.regFilterRows(rows, "benz").length === 1
    && W.regFilterRows(rows, "염소산").length === 1 && W.regFilterRows(rows, "").length === 3);

  let sl = W.regPageSlice(120, 3, 50);
  check("쪽: 마지막 쪽", sl.page === 3 && sl.pages === 3 && sl.from === 101 && sl.to === 120);
  sl = W.regPageSlice(120, 9, 50);
  check("쪽: 넘치면 마지막", sl.page === 3);
  sl = W.regPageSlice(0, 1, 50);
  check("쪽: 0건", sl.pages === 1 && sl.from === 0 && sl.to === 0);
  check("조각: 쪽 1 → 0", W.regPartsFor(1, 50, 2500, 3).join() === "0");
  check("조각: 쪽 51 → 1", W.regPartsFor(51, 50, 2500, 3).join() === "1");
  check("조각: 걸치는 쪽 → 둘", W.regPartsFor(1, 50, 30, 3).join() === "0,1");
  check("조각 잇기: 빠진 조각에서 멈춤", W.regJoinParts({ 0: [1, 2], 2: [5] }, 3).join() === "1,2");

  const byId = Object.fromEntries(LISTS.map(m => [m.id, m]));
  let v = W.regChangeView({ d: "2026-10-31", list: "KR_CHEM_PRTR", ch: "added", cas: "71-43-2", detail: "벤젠", n: 1, src: "chemip_export_diff", url: "" }, W.REG_LABELS.changes, byId);
  check("변경: 추가 한 건", v.kind === "추가" && v.tone === "accent" && v.what === "벤젠" && v.href === "?view=reg&list=KR_CHEM_PRTR" && v.list === LISTS[0].title);
  v = E.regChangeView({ d: "2026-10-31", list: "EU_REACH_SVHC_CANDIDATE", ch: "added", cas: null, detail: "", n: 30, src: "echa_candidate_list", url: "https://x" }, E.REG_LABELS.changes, byId);
  check("변경: 묶음(en)", v.kind === "Added" && v.what === "30 substances" && v.src === "ECHA Candidate List" && v.url === "https://x");
  v = W.regChangeView({ d: "2026-10-28", list: "", title: "", ch: "modified", cas: null, detail: "[Rule] X", n: 1, src: "federal_register", url: "u" }, W.REG_LABELS.changes, byId);
  check("변경: 목록 없는 공식 소식", v.href === "" && v.what === "[Rule] X" && v.tone === "");

  v = E.regChangeView({ d: "2025-08-07", list: "KR_CHEM_PRTR", ch: "modified", cas: null, detail: "화학물질관리법 — x: 고시·법령 개정", n: 1, src: "law_go_kr_listmeta", url: "https://law" }, E.REG_LABELS.changes, byId);
  check("변경: 목록 원문 개정일은 화면 언어 문장(en 에 한글 없음)", v.what === "Source notice or statute amended" && !/[가-힣]/.test(v.what + v.list + v.src));
  check("주소: 만들기", W.regHref("A_B") === "?view=reg&list=A_B" && W.regHref("") === "?view=reg");
  check("주소: 읽기", W.regReadListParam("?view=reg&list=KR_X") === "KR_X");
  check("주소: 다른 칸 그대로", W.regUrlWith("http://t/chemip?lang=en", "KR_X") === "http://t/chemip?lang=en&view=reg&list=KR_X");
  check("주소: 떠날 때 지움", W.regUrlWith("http://t/chemip?lang=en&view=reg&list=KR_X", null) === "http://t/chemip?lang=en");
  check("주소: 다른 화면의 view 는 남김", W.regUrlWith("http://t/chemip?view=calc", null) === "http://t/chemip?view=calc");
  check("물질 주소", W.regSubstanceHref("71-43-2") === "?view=product&pv=chemical&chem=71-43-2");

  // 자료 주소: 정적 뿌리 → 그 뿌리, 꺼져 있으면 같은 주소 /data/v1
  check("자료 주소: 정적 꺼짐 → /data/v1", W.regDataUrl("reg/lists.json") === "/data/v1/reg/lists.json");
  const { W: S, fetched } = load("ko", { base: "/data", version: "v1" });
  await S.fetchRegListPart("KR_X", 2);
  await S.fetchRegListPart("../etc", 0);
  check("자료 주소: 조각 파일 이름, 이상한 id 는 요청 안 함", fetched.join() === "/data/v1/reg/list/KR_X.2.json", fetched.join());
  check("RSS 주소", S.regRssUrl() === "/data/v1/reg/changes.xml");

  // 내보낸 파일 모양(있을 때만)
  const read = (rel) => JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(OUT, rel))).toString("utf8"));
  if (fs.existsSync(path.join(OUT, "lists.json"))) {
    const L = read("lists.json");
    const missing = L.lists.filter(m => !E.regListTitle(m) || /[가-힣]/.test(E.regListTitle(m)) && !m.id.startsWith("NCIS_X_"));
    check("내보낸 목록: 영어 이름이 모두 있음", missing.length === 0, missing.map(m => m.id).join(","));
    const big = L.lists.find(m => m.parts > 1);
    const head = big && read(`list/${big.id}.json`);
    const last = big && read(`list/${big.id}.${big.parts - 1}.json`);
    check("내보낸 목록: 긴 목록 조각 수·행 수", !big || (head.rows.length === head.part_rows
      && head.part_rows * (big.parts - 1) + last.rows.length === big.n), big && `${big.id} ${big.parts}`);
    const C = read("changes.json");
    check("내보낸 변경: 모양", Array.isArray(C.items) && C.items.every(it => it.d && it.ch && it.src), `${C.count}건`);
    const xml = zlib.gunzipSync(fs.readFileSync(path.join(OUT, "changes.xml"))).toString("utf8");
    check("내보낸 RSS: rss 2.0·item", xml.startsWith("<?xml") && xml.includes('<rss version="2.0"') && xml.includes("<item>"));
  } else {
    console.log("SKIP 내보낸 파일 없음");
  }

  const passed = results.filter(Boolean).length;
  console.log(`\n${passed}/${results.length} passed`);
  process.exit(passed === results.length ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });

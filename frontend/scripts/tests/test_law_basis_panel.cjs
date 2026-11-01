// 물질 「국내 근거 조문」 패널 카드 시험 — 화면 없이 순수 함수(law_cite_format.jsx)와 자료(law_short_labels*.jsx, law_duty_labels*.jsx).
//   [calc] 연혁 꼬리표 빼기·발췌 줄 나누기·인용 역할·법령 약칭·영어 조문 표기
//   [src]  할 일 한 줄(LAW_DUTIES)의 목록 id 가 내보낸 law/lists.json 에 있고, src 조문이 law/<id>.json 현행 본문에 있다
//          (E:\dev-cache\chemip-static\out\v1\law 가 있을 때. 없으면 건너뛴다)
//
//   node frontend/scripts/tests/test_law_basis_panel.cjs
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const zlib = require("zlib");

const CHEMIP = path.join(__dirname, "..", "..", "public", "chemip");
const OUT = process.env.CHEMIP_STATIC_EXPORT_DIR || "E:\\dev-cache\\chemip-static\\out\\v1";
const BABEL_OPTIONS = { presets: ["react", "env"], plugins: ["transform-object-rest-spread"], compact: false, comments: false };
const babel = require(path.join(CHEMIP, "vendor", "babel.min.js"));
const FILES = ["lang.jsx", "law_labels.jsx", "law_labels_en.jsx", "law_short_labels.jsx", "law_short_labels_en.jsx",
  "law_duty_labels.jsx", "law_duty_labels_en.jsx", "law_core.jsx", "law_cite_format.jsx"];

function load(lang) {
  const sandbox = { console, URLSearchParams, URL, location: { search: `?lang=${lang}` } };
  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);
  for (const rel of FILES) {
    const code = babel.transform(fs.readFileSync(path.join(CHEMIP, rel), "utf8"), { ...BABEL_OPTIONS, filename: rel }).code;
    vm.runInContext(code, ctx, { filename: rel });
  }
  return sandbox;
}

function readOut(rel) {
  const p = path.join(OUT, ...rel.split("/"));
  if (!fs.existsSync(p)) return null;
  let b = fs.readFileSync(p);
  if (b[0] === 0x1f && b[1] === 0x8b) b = zlib.gunzipSync(b);
  return JSON.parse(b.toString("utf8"));
}

const results = [];
function check(name, ok, note = "") {
  results.push(Boolean(ok));
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${note ? ` — ${note}` : ""}`);
}

const K = load("ko");
const E = load("en");

/* ── 발췌 [calc] ── */
const raw = "제6조(배출량조사 대상 화학물질) 법 제11조제1항에서 \"대통령령으로 정하는 화학물질\"이란 다음 각 호의 어느 하나에 해당하는 것을 말한다. <개정 2018.1.16, 2025.10.1> 1. 유해화학물질 2. 「대기환경보전법」 제2조제1호에 따른 대기오염물질 중 화학물질";
check("연혁 꼬리표 빼기", !/개정/.test(K.lawStripAmend(raw)) && K.lawStripAmend("가 <신설 2020.1.1> 나 [본조신설 2019.1.1]") === "가 나");
const lines = K.lawExcerptLines(raw);
check("발췌: 조 머리 빼고 호마다 줄", lines.length === 3 && lines[0].text.startsWith("법 제11조") && lines[1].lvl === 1 && lines[1].text === "1. 유해화학물질"
  && lines[2].text.startsWith("2. 「대기환경보전법」 제2조제1호"), JSON.stringify(lines));
const circ = K.lawExcerptLines("제11조(배출량조사) ① 가를 한다. <개정 2025.10.1> ② 나를 한다.");
check("발췌: 항(①②)마다 줄", circ.length === 2 && circ[0].text === "① 가를 한다." && circ[1].text === "② 나를 한다.", JSON.stringify(circ));

/* ── 역할 [calc] ── */
check("역할: 별표 → 대상 목록", K.lawCiteRole({ t: "annex", title: "대기오염물질(제2조 관련)" }) === "list");
check("역할: 정의 조문 → 근거 정의", K.lawCiteRole({ t: "art", title: "정의", snippet: "1. \"가연성가스\"란 …을 말한다." }) === "def");
check("역할: 별표와 같다 → 대상 목록", K.lawCiteRole({ t: "art", title: "대기오염물질", snippet: "법 제2조제1호에 따른 대기오염물질은 별표 1과 같다." }) === "list");
check("역할: 하여야 한다 → 의무 조항", K.lawCiteRole({ t: "art", title: "위험물 등의 보관", snippet: "사업주는 … 보관하여야 하며" }) === "duty");
check("역할: 지정 등 → 대상 목록", K.lawCiteRole({ t: "art", title: "제한물질 또는 금지물질의 지정 등", snippet: "… 고시하여야 한다." }) === "list");
check("역할 문구 KO/EN", K.LAW_LABELS.panel.roles.duty === "의무 조항" && E.LAW_LABELS.panel.roles.duty === "Obligation");

/* ── 약칭 [calc] ── */
check("약칭: 화학물질관리법 → 화관법", K.lawShortName("화학물질관리법", K.LAW_SHORT) === "화관법");
check("약칭: 시행령 붙음", K.lawShortName("화학물질관리법 시행령", K.LAW_SHORT) === "화관법 시행령");
check("약칭: 가운뎃점 표기 달라도", K.lawShortName("전기·전자제품 및 자동차의 자원순환에 관한 법률", K.LAW_SHORT) === "전자제품등자원순환법");
check("약칭: 모르는 법령은 그대로", K.lawShortName("없는 법률", K.LAW_SHORT) === "없는 법률");
check("영어 약칭: Rule", E.lawShortName("산업안전보건법 시행규칙", E.LAW_SHORT) === "OSH Act Rule");
check("조문 표기 KO 그대로", K.lawShortLabel("제5조의2제1항제1호", K.LAW_SHORT.label) === "제5조의2제1항제1호");
check("조문 표기 EN", E.lawShortLabel("제5조의2제1항제1호", E.LAW_SHORT.label) === "Art. 5-2 ¶1 No. 1"
  && E.lawShortLabel("별표 1의2", E.LAW_SHORT.label) === "Annex 1-2" && E.lawShortLabel("제2조제2호다목", E.LAW_SHORT.label) === "Art. 2 No. 2(c)",
  [E.lawShortLabel("제5조의2제1항제1호", E.LAW_SHORT.label), E.lawShortLabel("제2조제2호다목", E.LAW_SHORT.label)].join(" | "));

/* ── 할 일 한 줄 ── */
const ids = Object.keys(K.LAW_DUTIES_KO);
check("할 일: 영어 문구 모두 있음", ids.every(id => E.LAW_DUTIES[id] && E.LAW_DUTIES[id].text && !/[가-힣]/.test(E.LAW_DUTIES[id].text)),
  ids.filter(id => !(E.LAW_DUTIES[id] && E.LAW_DUTIES[id].text)).join(", "));
check("할 일: 근거 조문(src) 모두 있음", ids.every(id => (K.LAW_DUTIES_KO[id].src || []).length > 0));
check("영어 화면도 src 유지", ids.every(id => (E.LAW_DUTIES[id].src || []).length === K.LAW_DUTIES_KO[id].src.length));

const lists = readOut("law/lists.json");
if (!lists) {
  console.log("SKIP law/ export not found — list id and article checks need", OUT);
} else {
  const missingList = ids.filter(id => !lists.lists[id]);
  check("[src] 할 일 목록 id 가 law/lists.json 에 있음", missingList.length === 0, missingList.join(", "));
  const docs = {};
  const missingArt = [];
  for (const id of ids) {
    for (const ref of K.LAW_DUTIES_KO[id].src) {
      const [doc, art] = ref.split(":");
      const no = art.replace(/^(\d+)-(\d+)$/, "$1의$2"); // "11-2" → "11의2"
      if (!(doc in docs)) docs[doc] = readOut(`law/${doc}.json`);
      const item = docs[doc] && (docs[doc].items || []).find(it => it.t !== "h" && it.no === no);
      if (!item || /^제\d+조(의\d+)?\s*삭제/.test(K.lawItemText(item).trim())) missingArt.push(`${id} ${ref}`);
    }
  }
  check("[src] 할 일 근거 조문이 현행 본문에 있음(삭제 조문 아님)", missingArt.length === 0, missingArt.join(", "));
  const ethylene = ["KR_CHEM_PRTR", "KR_CLEAN_AIR_VOC", "KR_GAS_FLAMMABLE", "KR_OSH_DANGEROUS_SUBSTANCES", "KR_TRANSPORT_SHIP_DGL", "NCIS_EXISTING"];
  check("[src] 에틸렌 6개 목록 모두 한 줄 있음", ethylene.every(id => K.LAW_DUTIES[id]));
}

const failed = results.filter(r => !r).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);

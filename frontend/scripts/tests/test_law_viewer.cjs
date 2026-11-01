// 국내 법령 보기·물질 「국내 근거 조문」(public/chemip/law_core.jsx · api_law.jsx) 시험 — 화면 없이 순수 함수와 자료 읽기.
// 내보낸 law/ (E:\dev-cache\chemip-static\out\v1\law, scripts/portal_build/law_export.py)가 있으면 그 파일로 실제 답을 본다:
//   [src] 법제처 현행 본문: 화학물질관리법 제2조제6호 "사고대비물질"이란 …, 대기환경보전법 시행규칙 제2조 → 별표 1
//   [calc] 조 번호 표기·앵커·법제처 주소·행정규칙 본문 줄 나누기·찾을 말 표시·FNV-1a 조각 번호(파이썬 law_export_build.fnv1a32 와 같은 값)
//
//   node frontend/scripts/tests/test_law_viewer.cjs
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const zlib = require("zlib");

const CHEMIP = path.join(__dirname, "..", "..", "public", "chemip");
const OUT = process.env.CHEMIP_STATIC_EXPORT_DIR || "E:\\dev-cache\\chemip-static\\out\\v1";
const BABEL_OPTIONS = {
  presets: ["react", "env"],
  plugins: ["transform-class-properties", "transform-object-rest-spread", "transform-flow-strip-types"],
  targets: { browsers: undefined },
  compact: false,
  comments: false,
};
const babel = require(path.join(CHEMIP, "vendor", "babel.min.js"));
const FILES = ["lang.jsx", "static_config.jsx", "static_search_index.jsx", "law_labels.jsx", "law_labels_en.jsx", "law_core.jsx", "api_law.jsx"];

function readOut(rel) {
  const p = path.join(OUT, ...rel.split("/"));
  if (!fs.existsSync(p)) return null;
  let b = fs.readFileSync(p);
  if (b[0] === 0x1f && b[1] === 0x8b) b = zlib.gunzipSync(b);
  return JSON.parse(b.toString("utf8"));
}

function load(lang, files = null) {
  const fetched = [];
  const sandbox = {
    console, URLSearchParams, URL, TextEncoder, location: { search: `?lang=${lang}` },
    CHEMIP_STATIC: { base: "http://static.test", version: "v1" },
    staticGetJson: async (url) => { fetched.push(url); const rel = url.replace("http://static.test/v1/", ""); return files ? (files[rel] || null) : readOut(rel); },
    useApi: () => ({}),
  };
  sandbox.window = sandbox;
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
const HANGUL = /[가-힣]/;

async function main() {
  const { W } = load("ko", {});

  /* ── 주소 ── */
  const p = W.lawReadParams("?view=law&law=law_000162&art=7%EC%9D%982&q=%EC%82%AC%EA%B3%A0");
  check("주소 읽기 law·art·q", p.law === "law_000162" && p.art === "7의2" && p.q === "사고", JSON.stringify(p));
  check("주소 만들기", W.lawViewHref("law_000162", "2", "황산") === "?view=law&law=law_000162&art=2&q=%ED%99%A9%EC%82%B0", W.lawViewHref("law_000162", "2", "황산"));
  check("주소 만들기: 목록", W.lawViewHref("") === "?view=law");
  check("주소 바꾸기: 다른 값 그대로, 빈 값 지움", W.lawUrlWith("https://x.test/chemip?view=law&lang=en&q=old", { law: "law_1", art: "", q: "" }) === "/chemip?view=law&lang=en&law=law_1");

  /* ── 조 번호 ── [calc] */
  check("조 표기 7의2 → 제7조의2", W.lawArtLabel("7의2") === "제7조의2");
  check("조 표기 본문 그대로", W.lawArtLabel("본문") === "본문");
  check("앵커", W.lawArtAnchor("7의2") === "law-art-7-2" && W.lawArtAnchor("12") === "law-art-12" && W.lawArtAnchor("본문") === "law-art-body");
  const meta = { url: "https://www.law.go.kr/법령/화학물질관리법", art_url: "https://www.law.go.kr/법령/화학물질관리법/{art}" };
  check("법제처 조문 주소", W.lawGoKrArticleUrl(meta, "7의2") === "https://www.law.go.kr/법령/화학물질관리법/제7조의2");
  check("행정규칙(art_url 없음) → 규칙 주소", W.lawGoKrArticleUrl({ url: "https://www.law.go.kr/행정규칙/x", art_url: "" }, "3") === "https://www.law.go.kr/행정규칙/x");
  const g = W.lawFromGoKrUrl("https://www.law.go.kr/법령/산업안전보건법시행령/제43조");
  check("법제처 주소 읽기", g && g.name === "산업안전보건법시행령" && g.art === "43", JSON.stringify(g));
  const g2 = W.lawFromGoKrUrl("https://www.law.go.kr/%EB%B2%95%EB%A0%B9/%ED%99%94%ED%95%99%EB%AC%BC%EC%A7%88%EA%B4%80%EB%A6%AC%EB%B2%95/%EC%A0%9C11%EC%A1%B0%EC%9D%982");
  check("법제처 주소 읽기(퍼센트 인코딩·조의)", g2 && g2.name === "화학물질관리법" && g2.art === "11의2", JSON.stringify(g2));
  check("법제처 다른 주소 → null", W.lawFromGoKrUrl("https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=1") === null);

  /* ── 이름 찾기 ── */
  const idx = { docs: [{ id: "law_1", kind: "law", kind_word: "법령", name: "산업안전보건법 시행령" }, { id: "admrul_2", kind: "admrul", kind_word: "행정규칙", name: "위험물 선박운송 기준" }] };
  check("id 로 찾기", W.lawResolveDoc(idx, "admrul_2")?.id === "admrul_2");
  check("이름(띄어쓰기 무시)으로 찾기", W.lawResolveDoc(idx, "산업안전보건법시행령")?.id === "law_1");
  check("없는 이름 → null", W.lawResolveDoc(idx, "없는법") === null);
  check("종류별 묶음", JSON.stringify(W.lawDocsByKind(idx).map(x => [x.kind, x.docs.length])) === '[["law",1],["admrul",1]]');
  const toc = { rows: [["law_1", "a", "43", "공정안전보고서의 제출 대상"], ["law_1", "h", "1", "제1장 총칙"]] };
  const cs = W.lawSearchCorpus(idx, toc, "공정 안전");
  check("말뭉치 찾기: 조문 제목(띄어쓰기 무시)", cs.length === 1 && cs[0].no === "43" && cs[0].name === "산업안전보건법 시행령", JSON.stringify(cs));
  check("말뭉치 찾기: 법령 이름 먼저", W.lawSearchCorpus(idx, toc, "시행령")[0].t === "doc");

  /* ── 본문 줄 ── [calc] */
  const body = "제5조(시험기준과 방법) ① 법 제8조제2항에 따른 기준은 다음 각 호와 같다. <개정 2012. 2. 7.>1. 이화학 분석 기준은 별표 9와 같다.2. 약효 기준은 별표 10과 같다.② 제1항에도 불구하고 다음과 같다.가. 첫째 나. 둘째";
  const lines = W.lawSplitBody(body);
  check("행정규칙 본문 나누기: 항·호·목", JSON.stringify(lines.map(l => l.lvl)) === "[0,0,1,1,0,2,2]", JSON.stringify(lines));
  check("행정규칙 본문: 날짜(2012. 2. 7.)는 안 나눔", lines[1].text.includes("<개정 2012. 2. 7.>"));
  const art = { t: "a", no: "2", title: "정의", head: "제2조(정의) 이 법에서 사용하는 용어의 뜻은 다음과 같다.",
    paras: [{ no: "", text: "", items: [{ no: "1", text: "1. \"화학물질\"이란 …", sub: [{ no: "가.", text: "가. 하나" }] }] }] };
  check("조문 줄: 머리 0 · 호 1 · 목 2", JSON.stringify(W.lawItemLines(art).map(l => l.lvl)) === "[0,1,2]");
  check("조문 안 찾기", JSON.stringify(W.lawSearchItems([art, { t: "h", no: "1", text: "제1장 총칙" }], "총 칙")) === "[1]");
  const hl = W.lawHighlight("사고대비 물질을 지정", "대비물질");
  check("찾을 말 표시(띄어쓰기 무시)", hl.length === 3 && hl[1].hit && hl[1].t === "대비 물질", JSON.stringify(hl));
  const te = W.lawTocEntries([{ t: "h", no: "1", text: "제1장 총칙" }, { t: "h", no: "1", text: "제1절 통칙" }, art]);
  check("차례 깊이: 장 1 · 절 2 · 조 3", JSON.stringify(te.map(e => e.depth)) === "[1,2,3]" && te[2].label === "제2조");

  /* ── 조각 번호 ── [calc] 파이썬 fnv1a32("7664-93-9") % 64 와 같아야 한다 */
  check("조각 번호(FNV-1a)", W.lawCasBucket("7664-93-9", 64, W.ssiFnv1a32) === 59 && W.lawCasBucket("50-00-0", 64, W.ssiFnv1a32) === 34);

  /* ── 패널 모양 ── */
  const lists = { as_of: "2026-10-31", lists: { L1: { title: "목록", group: "kr_law", basis: "x", cites: [
    { doc: "law_1", name: "산업안전보건법 시행령", t: "art", no: "43", label: "제43조", title: "", snippet: "s" },
    { doc: "law_1", name: "산업안전보건법 시행령", t: "annex", no: "13", label: "별표 13", title: "규정량", snippet: "", pdf: "https://p", file: "" }] } } };
  const idx2 = { docs: [{ id: "law_1", name: "산업안전보건법 시행령", url: "https://u", art_url: "https://u/{art}" }] };
  const m = W.lawProvisionModel({ l: ["L1", "NONE"], m: [["law_1", "43", "황산", "…황산…"]], mn: 3 }, lists, idx2);
  check("패널: 없는 목록 id 는 뺌", m.lists.length === 1 && m.lists[0].cites.length === 2);
  check("패널: 조 링크·법제처·별표 PDF", m.lists[0].cites[0].href === "?view=law&law=law_1&art=43" && m.lists[0].cites[0].goKr === "https://u/제43조"
    && m.lists[0].cites[1].ext === "https://p" && m.lists[0].cites[1].href === "?view=law&law=law_1");
  check("패널: 언급 → 찾을 말 붙은 링크", m.mentions[0].href === "?view=law&law=law_1&art=43&q=%ED%99%A9%EC%82%B0" && m.mentionTotal === 3);
  check("패널: 자료 없음 → null", W.lawProvisionModel(null, lists, idx2) === null && W.lawProvisionModel({ l: ["NONE"] }, lists, idx2) === null);

  /* ── 영어 문구 ── */
  const en = load("en", {}).W;
  check("영어 문구: 한글 없음(원문 값 키 제외)", !HANGUL.test(JSON.stringify({ ...en.LAW_LABELS, statuses: {} }).replace(/"[^"]*":/g, "")));

  /* ── 내보낸 자료(있으면) ── */
  const index = readOut("law/index.json");
  if (!index) {
    console.log("SKIP 내보낸 law/ 없음 — scripts/portal_build/law_export.py 를 먼저 돌린다");
  } else {
    const real = load("ko").W;
    check("index: 법령 70건 이상, 조각 수", index.count >= 70 && index.cas_buckets === 64, `${index.count}`);
    const cca = real.lawResolveDoc(index, "화학물질관리법");
    const doc = cca && readOut(`law/${cca.id}.json`);
    const a2 = doc && doc.items.find(it => it.t === "a" && it.no === "2");
    check("[src] 화학물질관리법 제2조 제6호 사고대비물질", a2 && real.lawItemLines(a2).some(l => l.lvl === 1 && l.text.startsWith("6. \"사고대비물질\"이란")));
    check("문서: 출처·받은 날", doc && /법제처/.test(doc.source.name) && /^\d{4}-\d{2}-\d{2}$/.test(doc.as_of));
    const prov = await real.fetchLawProvisions("7664-93-9");
    const accident = prov && prov.lists.find(l => l.id === "NCIS_ACCIDENT_PREP");
    check("[src] 황산: 사고대비물질 → 화학물질관리법 제2조제6호·제39조", accident && accident.cites.some(c => c.label === "제2조제6호") && accident.cites.some(c => c.no === "39"));
    const prov2 = await real.fetchLawProvisions("50-00-0");
    const air = prov2 && prov2.lists.find(l => l.id === "KR_CLEAN_AIR_POLLUTANTS");
    check("[src] 폼알데하이드: 대기오염물질 → 시행규칙 별표 1", air && air.cites.some(c => c.t === "annex" && c.no === "1" && /flDownload/.test(c.ext)));
    check("폼알데하이드: 조문 언급", prov2 && prov2.mentions.some(x => x.term === "폼알데하이드"));
    check("CAS 아님 → null", (await real.fetchLawProvisions("abc")) === null);
    const lawText = JSON.stringify(readOut("law/lists.json"));
    check("내보낸 자료에 OC 값 없음", !/OC=/.test(lawText));
  }

  const failed = results.filter(r => !r).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });

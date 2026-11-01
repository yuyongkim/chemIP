// KOSHA 기술지침 본문 검색(guide_text_core.jsx · api_guide_text.jsx) 시험 — 화면·서버 없이.
// (1) 순수 함수: 정규화·두 글자 조각·목록 풀기·후보 교집합·순서·본문 확인·발췌
// (2) 만드는 쪽(scripts/static_export/guide_text_build.py)과 정규화·조각 번호가 같은지(파이썬을 한 번 부른다)
// (3) 내보낸 색인(E:\dev-cache\chemip-static\out\v1\gs)이 있으면 실제 검색: 구리·작업환경측정·HAZOP·없는 말
//
//   node frontend/scripts/tests/test_guide_text.cjs
"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { loadStaticModules } = require("./static_vm_loader.cjs");

const OUT = "E:\\dev-cache\\chemip-static\\out";
const EXPORTER = path.join(__dirname, "..", "..", "..", "scripts", "static_export");

const results = [];
function check(name, ok, note = "") {
  results.push(Boolean(ok));
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${note ? ` — ${note}` : ""}`);
}

function pythonReference(samples, bigrams, shards) {
  const code = [
    "import json, sys",
    `sys.path.insert(0, ${JSON.stringify(EXPORTER)})`,
    "import guide_text_build as g",
    "a = json.loads(sys.stdin.buffer.read().decode('utf-8'))",
    "print(json.dumps({'norm': [g.normalize(s) for s in a['s']], 'shard': [g.shard_of(b, a['n']) for b in a['b']]}, ensure_ascii=True))",
  ].join("\n");
  const out = execFileSync("python", ["-I", "-B", "-c", code], { input: JSON.stringify({ s: samples, b: bigrams, n: shards }) });
  return JSON.parse(out.toString("utf8"));
}

async function main() {
  const { win: W, stats } = loadStaticModules({
    diskRoot: OUT, layout: "contract", extraModules: ["guide_text_core.jsx", "api_guide_text.jsx"],
  });

  /* ── (1) 순수 함수 ── */
  check("정규화: NFKC·소문자·글자와 숫자만", W.gtNorm("Flash Point 21℃ (ＡＢ)") === "flashpoint21cab", W.gtNorm("Flash Point 21℃ (ＡＢ)"));
  check("정규화: 한글 띄어쓰기·가운뎃점 제거", W.gtNorm("작업환경 측정․분석") === "작업환경측정분석");
  check("두 글자 조각: 겹치지 않게 한 번씩", JSON.stringify(W.gtBigrams("abab")) === JSON.stringify(["ab", "ba"]));
  check("두 글자 조각: 한 글자 → 없음", W.gtBigrams("a").length === 0 && W.gtBigrams("").length === 0);
  const many = Array.from({ length: 20 }, (_, i) => `b${i}`);
  const picked = W.gtPickBigrams(many);
  check("긴 검색어: 고르게 8조각, 처음·끝 포함", picked.length === W.GT_MAX_BIGRAMS && picked[0] === "b0" && picked[picked.length - 1] === "b19");
  const dec = W.gtDecode([2, 5, 3, 1]);
  check("목록 풀기: [차이, tf, …] → 문서 번호", dec.get(2) === 5 && dec.get(5) === 1 && dec.size === 2);
  const cands = W.gtCandidates({ ab: [0, 3, 2, 1, 1, 4], bc: [2, 2, 1, 7] }, ["ab", "bc"]);
  check("후보: 모든 조각이 든 문서, 가장 작은 tf", JSON.stringify(cands) === JSON.stringify([{ doc: 2, tf: 1 }, { doc: 3, tf: 4 }]), JSON.stringify(cands));
  check("후보: 없는 조각 하나 → 없음", W.gtCandidates({ ab: [0, 1] }, ["ab", "zz"]).length === 0);
  const rows = [["A-1", "구리 측정"], ["A-2", "다른 지침"], ["A-3", "구리 분석"]];
  const ord = W.gtOrderCandidates([{ doc: 1, tf: 9 }, { doc: 2, tf: 1 }, { doc: 0, tf: 2 }], rows, "구리");
  check("순서: 제목에 든 것 먼저, 그다음 tf", ord.map(c => c.doc).join(",") === "0,2,1", ord.map(c => c.doc).join(","));
  const found = W.gtFindInPages(["첫 쪽", "둘째 쪽에는 작업 환경 측정이 있고 작업환경측정이 또 있습니다."], W.gtNorm("작업환경측정"));
  check("본문 확인: 띄어쓴 본문도 맞춤, 쪽·곳 수", found && found.page === 2 && found.count === 2, JSON.stringify(found));
  check("발췌: 원문 글자 그대로", found && found.snippet.includes("작업 환경 측정"), found && found.snippet);
  check("본문 확인: 없음 → null", W.gtFindInPages(["abc"], "zz") === null);
  const toc = W.gtFindInPages(["표지 제어풍속", "목차 제어풍속·········· 3", "본문에서 제어풍속을 지킵니다"], W.gtNorm("제어풍속"));
  check("발췌 자리: 표지·목차 건너뜀, 곳 수는 모두", toc.page === 3 && toc.count === 3 && toc.snippet.startsWith("본문"), JSON.stringify(toc));
  const only1 = W.gtFindInPages(["표지 제어풍속"], W.gtNorm("제어풍속"));
  check("발췌 자리: 표지뿐이면 표지", only1.page === 1);
  const long = "가".repeat(300) + "목표" + "나".repeat(300);
  const f2 = W.gtFindInPages([long], "목표");
  check("발췌: 앞뒤 자르고 … 표시", f2.snippet.startsWith("… ") && f2.snippet.endsWith(" …") && f2.snippet.length < 200, String(f2.snippet.length));

  /* ── (2) 파이썬과 같은지 ── */
  const samples = ["Flash Point 21℃ (ＡＢ)", "작업환경 측정․분석", "Ⅱ등급 H₂O µg/m³", "KOSHA GUIDE P-82-2023", "ß Straße"];
  const bgs = ["구리", "fl", "측정", "82", "ab"];
  const ref = pythonReference(samples, bgs, 512);
  const jsNorm = samples.map(s => W.gtNorm(s));
  check("정규화: 파이썬과 같음", JSON.stringify(jsNorm) === JSON.stringify(ref.norm), `${JSON.stringify(jsNorm)} vs ${JSON.stringify(ref.norm)}`);
  const jsShard = bgs.map(b => W.gtShardOf(b, 512));
  check("조각 번호: 파이썬과 같음", JSON.stringify(jsShard) === JSON.stringify(ref.shard), `${jsShard} vs ${ref.shard}`);

  /* ── (3) 내보낸 색인 ── */
  if (!fs.existsSync(path.join(OUT, "v1", "gs", "manifest.json"))) {
    console.log("SKIP 실제 색인 없음 (run_all.py --steps guide_text)");
  } else {
    const m = await W.fetchGuideTextManifest();
    check("목록: 형식·조각 수·지침 수", m && m.shards === 512 && m.rows.length > 1000, m ? `${m.rows.length}건` : "");
    const r1 = await W.fetchGuideFullText("구리");
    const nos1 = r1.hits.map(h => r1.rows[h.doc][0]);
    check("구리 → A-1-2018(구리 작업환경측정 지침)이 맨 앞", nos1[0] === "A-1-2018", nos1.slice(0, 5).join(","));
    check("맞은 것은 모두 본문 확인·발췌 있음", r1.hits.every(h => h.count > 0 && h.page > 0 && W.gtNorm(h.snippet).includes("구리")));
    const before = stats.requests;
    const r2 = await W.fetchGuideFullText("국소배기장치 제어풍속");
    check("두 낱말(띄어쓰기 무시) → 결과·요청 수 제한", r2.hits.length > 0 && stats.requests - before <= 8 + W.GT_VERIFY,
      `${r2.hits.length}건, 요청 ${stats.requests - before}`);
    const r3 = await W.fetchGuideFullText("HAZOP");
    check("영문 HAZOP → 본문 맞춤", r3.hits.length > 0, r3.hits.slice(0, 3).map(h => r3.rows[h.doc][0]).join(","));
    const r4 = await W.fetchGuideFullText("쀍쀍쀍");
    check("없는 말 → 0건", r4.hits.length === 0 && r4.unchecked === 0);
    const r5 = await W.fetchGuideFullText("가");
    check("한 글자 → 본문 검색 안 함(제목 목록만)", r5.hits.length === 0 && r5.rows.length === m.rows.length);
  }

  const failed = results.filter(x => !x).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });

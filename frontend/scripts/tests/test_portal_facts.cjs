// 물성 답 카드·식별자·UN 번호 묶음·"주요 물성" 줄(facts_*.jsx, api_static_facts.jsx, api_facts.jsx, usearch_provider_identifiers/transport.jsx)
// 시험 — 순수 함수(검색어 읽기·번호 모양·값 표기)와, 내보내기 결과(E:\dev-cache\chemip-static\out 의 v1/search·f·g)를
// 디스크에서 읽는 가짜 fetch 로 돌린 실제 답(벤젠 인화점, toluene boiling point, UN1114, KE-02150 …). 화면·서버 없이.
//
//   node frontend/scripts/tests/test_portal_facts.cjs [--data E:/dev-cache/chemip-static/out]
"use strict";

const fs = require("fs");
const path = require("path");
const { loadStaticModules } = require("./static_vm_loader.cjs");

const arg = (name, dflt) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : dflt; };
const DATA = arg("--data", "E:/dev-cache/chemip-static/out");
const EXTRA = [
  "api_core.jsx", "api_origin.jsx", "api_chemicals.jsx", "usearch_core.jsx",
  "facts_labels.jsx", "facts_labels_en.jsx", "chem_name_core.jsx", "facts_core.jsx", "api_static_facts.jsx", "api_facts.jsx",
  "usearch_provider_identifiers.jsx", "usearch_provider_transport.jsx",
];

const results = [];
function check(name, ok, note = "") {
  results.push(Boolean(ok));
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${note ? ` — ${note}` : ""}`);
}

function load(config = {}) {
  const { win, stats } = loadStaticModules({ diskRoot: DATA, layout: "contract", config, extraModules: EXTRA });
  win.React = { useState: () => [null, () => {}], useEffect: () => {} };
  return { W: win, stats };
}

async function main() {
  const { W, stats } = load();
  const SETS = [W.FACTS_LABELS_KO, W.FACTS_LABELS_EN];
  const LEN = W.langPick(W.FACTS_LABELS_KO, W.FACTS_LABELS_EN, "en");

  /* ── 검색어 읽기 ── */
  const P = q => W.factsParseQuery(q, SETS);
  const same = (got, prop, substance) => got && got.prop === prop && got.substance === substance;
  check("읽기: 벤젠 인화점", same(P("벤젠 인화점"), "flash_point", "벤젠"), JSON.stringify(P("벤젠 인화점")));
  check("읽기: benzene flash point", same(P("benzene flash point"), "flash_point", "benzene"));
  check("읽기: Toluene Boiling Point (대소문자)", same(P("Toluene Boiling Point"), "boiling_point", "toluene"));
  check("읽기: flash point of benzene (앞쪽 낱말 + of)", same(P("flash point of benzene"), "flash_point", "benzene"));
  check("읽기: 벤젠의 끓는점 (조사 떼기)", same(P("벤젠의 끓는점"), "boiling_point", "벤젠"));
  check("읽기: 벤젠인화점 (붙여 쓴 한글)", same(P("벤젠인화점"), "flash_point", "벤젠"));
  check("읽기: 톨루엔 폭발 범위 → 폭발 범위", same(P("톨루엔 폭발 범위"), "flammability", "톨루엔"));
  check("읽기: 벤젠 UN 번호 → 운송", same(P("벤젠 UN 번호"), "transport", "벤젠"));
  check("읽기: methanol autoignition temperature (긴 낱말 먼저)", same(P("methanol autoignition temperature"), "autoignition", "methanol"));
  check("읽기: 물성 낱말만·물질만·다른 말 → null", [P("인화점"), P("flash point"), P("benzene"), P("LMTD"), P("graph"), P("")].every(x => x === null));

  /* ── 번호 모양 ── */
  const id = W.factsDetectId;
  check("번호: EC·KE·InChIKey", id("200-753-7")?.type === "ec" && id("KE-02150")?.key === "KE-02150" && id("ke02150")?.key === "KE-02150"
    && id("uhovqnzjysornb-uhfffaoysa-n")?.key === "UHOVQNZJYSORNB-UHFFFAOYSA-N");
  check("번호: CAS·글자는 식별자 아님", id("71-43-2") === null && id("benzene") === null && id("1114") === null);
  const un = W.factsDetectUn;
  check("UN: UN1114 · UN 1114 · 유엔 1114 · 1114", un("UN1114")?.un === "1114" && un("un 1114")?.prefixed && un("유엔 1114")?.un === "1114"
    && un("1114")?.prefixed === false);
  check("UN: 다섯 자리·CAS·글자 → null", un("11145") === null && un("71-43-2") === null && un("UN") === null);

  /* ── 값 표기 ── */
  check("값: 끝의 (조건) 떼기", W.factsValueText({ t: "10 ㎪(20℃)", c: "20℃" }) === "10 ㎪" && W.factsValueText({ t: "-11 ℃", c: null }) === "-11 ℃");
  const dv = W.factsDisplayValue({ t: "2.8 (공기=1)", n: 2.8, u: null, c: "공기=1" }, "en");
  check("값: 영어 화면 + 한글 원문 → 숫자", dv.text === "2.8" && !dv.sourceText, JSON.stringify(dv));
  const dt = W.factsDisplayValue({ t: "(불용성)", n: null }, "en");
  check("값: 숫자 없는 한글 원문은 원문 그대로(원문 표시)", dt.text === "(불용성)" && dt.sourceText);
  check("값: 영어 이름 고르기", W.factsEnglishPart("벤젠(BENZENE)", "en") === "BENZENE" && W.factsEnglishPart("벤젠(BENZENE)", "ko") === "벤젠(BENZENE)");
  check("이름: 화면 언어 먼저", W.factsPickName("벤젠", "Benzene", "en") === "Benzene" && W.factsPickName("", "Benzene", "ko") === "Benzene");

  /* ── 실제 파일 ── */
  const factsDir = path.join(DATA, "v1", "f");
  if (!fs.existsSync(path.join(factsDir, "71-43-2.json"))) {
    check(`실제 파일: ${factsDir}\\71-43-2.json 있음`, false, "run_all.py --steps facts_portal 먼저");
  } else {
    const ans = await W.fetchFactsAnswer("벤젠 인화점");
    check("답: 벤젠 인화점 → -11 ℃, ICSC, KOSHA MSDS §9, 물질 링크", ans && ans.values[0].text === "-11 ℃" && ans.values[0].origin === "ICSC"
      && ans.source === "KOSHA MSDS §9" && ans.href === "?view=product&pv=chemical&chem=001008" && ans.cas === "71-43-2", JSON.stringify(ans));
    const en = await W.fetchFactsAnswer("benzene flash point");
    check("답: benzene flash point → 같은 값", en && en.values[0].text === "-11 ℃" && en.cas === "71-43-2", JSON.stringify(en && en.values));
    const tol = await W.fetchFactsAnswer("toluene boiling point");
    check("답: toluene boiling point → 숫자 °C", tol && tol.cas === "108-88-3" && /℃|°C/.test(tol.values[0].text), JSON.stringify(tol && tol.values));
    const lim = await W.fetchFactsAnswer("벤젠 폭발 범위");
    check("답: 벤젠 폭발 범위 → 하한·상한 두 줄", lim && lim.values.length === 2 && lim.values[0].part === "하한" && lim.values[0].text === "1.2 %"
      && lim.values[1].text === "8.0 %");
    const tr = await W.fetchFactsAnswer("벤젠 UN 번호");
    check("답: 벤젠 UN 번호 → UN 1114, 등급 3, 용기 II, EmS", tr && tr.transport && tr.transport.un === "1114"
      && tr.transport.facts.some(f => f.k === "cls" && f.value === "3") && tr.transport.facts.some(f => f.k === "pg" && f.value === "II")
      && tr.transport.facts.some(f => f.k === "ems" && f.value === "F-E, S-D"));
    check("답: 물성 낱말 없으면 null", (await W.fetchFactsAnswer("벤젠")) === null);
    const nf = await W.fetchFactsAnswer("zzqqxx 인화점");
    check("답: 물질 없음 → null", nf === null);

    const facts = await W.fetchFacts("71-43-2");
    const enAns = W.factsAnswer(facts, "vapor_density", { name: "벤젠", name_en: "Benzene", chem_id: "001008", cas_no: "71-43-2" }, LEN, "en");
    check("답(en): 이름 영어, 한글 조건 원문은 조건 칸", enAns.title === "Vapour density · Benzene" && enAns.values[0].text === "2.8"
      && enAns.values[0].condition === "공기=1", JSON.stringify(enAns));

    const strip = W.factsStripItems(facts, W.FACTS_LABELS_KO, "ko");
    const ks = strip.map(x => x.k);
    check("주요 물성: 인화점·끓는점·폭발 범위·UN, 순서대로", ks[0] === "flash_point" && ks.includes("flammability") && ks[ks.length - 1] === "transport"
      && strip.find(x => x.k === "flammability").text === "하한 1.2 % · 상한 8.0 %" && /UN 1114/.test(strip.find(x => x.k === "transport").text), ks.join(","));
    const stripEn = W.factsStripItems(facts, LEN, "en");
    check("주요 물성(en): 한글 없음", stripEn.every(x => !/[가-힣]/.test(`${x.label}${x.text}`) || x.sourceText), JSON.stringify(stripEn.map(x => x.text)));
    check("주요 물성: 파일 없음 → 빈 줄", W.factsStripItems(null, W.FACTS_LABELS_KO, "ko").length === 0);
    check("파일 없음(404) → null, 오류 아님", (await W.fetchFacts("99999-99-9")) === null && (await W.fetchFacts("not-cas")) === null);

    const t = await W.USP_TRANSPORT.search("UN1114");
    check("UN 묶음: UN1114 → 요약 줄 + 벤젠(001008), 딱 맞음", t.items[0].id === "u:1114" && /1114/.test(t.items[0].title)
      && /3/.test(t.items[0].sub) && t.items.some(it => it.href === "?view=product&pv=chemical&chem=001008") && t.items[0].score === W.USEARCH_SCORE.exact,
      JSON.stringify(t.items.slice(0, 2)));
    const t2 = await W.USP_TRANSPORT.search("1114");
    check("UN 묶음: 숫자만 → 한 단계 낮은 점수", t2.items[0].score === W.USEARCH_SCORE.prefix);
    check("UN 묶음: 없는 번호·다른 말 → 빈 결과", (await W.USP_TRANSPORT.search("UN0000")).items.length === 0 && (await W.USP_TRANSPORT.search("벤젠")).items.length === 0);

    const ke = await W.USP_IDENTIFIERS.search("KE-02150");
    check("식별자 묶음: KE-02150 → 벤젠", ke.items.length >= 1 && ke.items[0].href === "?view=product&pv=chemical&chem=001008" && ke.items[0].badge === "KE",
      JSON.stringify(ke.items[0]));
    const ec = await W.USP_IDENTIFIERS.search("200-753-7");
    check("식별자 묶음: EC 200-753-7 → 벤젠(Wikidata)", ec.items.some(it => /71-43-2/.test(it.sub)), JSON.stringify(ec.items[0]));
    const ik = await W.USP_IDENTIFIERS.search("UHOVQNZJYSORNB-UHFFFAOYSA-N");
    check("식별자 묶음: InChIKey → 벤젠(Wikidata)", ik.items.some(it => /71-43-2/.test(it.sub)), JSON.stringify(ik.items[0]));
    check("식별자 묶음: 번호 모양 아니면 요청 없음", await (async () => { const n = stats.requests; await W.USP_IDENTIFIERS.search("benzene"); return stats.requests === n; })());
  }

  /* ── 정적 자료 꺼짐 ── */
  const { W: OFF, stats: offStats } = load({ base: "" });
  check("정적 꺼짐: 파일·조각·UN 목록 모두 null, 요청 0", (await OFF.staticFacts("71-43-2")) === null && (await OFF.staticIdShard("KE-02150")) === null
    && (await OFF.staticUnIndex()) === null && offStats.requests === 0);

  const failed = results.filter(x => !x).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });

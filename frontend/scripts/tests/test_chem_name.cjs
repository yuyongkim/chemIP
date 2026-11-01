// 물질 이름 다듬기(public/chemip/chem_name_core.jsx) + 화면 이름(product_msds_helpers.jsx chemDisplayNames) 시험 — 화면 없이 순수 함수.
//   [src] KOSHA 이름 원문(정적 검색 색인 search/d 에서 고른 실제 값), f/74-85-1.json names.en
//   [calc] 관용명 떼기·겹괄호·잘린 괄호·변형 표기, 영어 이름 고르기, 한국어/영어 화면의 제목·부제·관용명
//
//   node frontend/scripts/tests/test_chem_name.cjs
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const CHEMIP = path.join(__dirname, "..", "..", "public", "chemip");
const babel = require(path.join(CHEMIP, "vendor", "babel.min.js"));
const FILES = ["lang.jsx", "product_labels.jsx", "product_labels_en.jsx", "chem_name_core.jsx", "product_msds_helpers.jsx"];

function load(lang) {
  const sandbox = { console, URLSearchParams, location: { search: `?lang=${lang}` } };
  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);
  for (const rel of FILES) {
    const code = babel.transform(fs.readFileSync(path.join(CHEMIP, rel), "utf8"), { presets: ["react", "env"], filename: rel }).code;
    vm.runInContext(code, ctx, { filename: rel });
  }
  return sandbox;
}

const results = [];
function check(name, ok, note = "") {
  results.push(Boolean(ok));
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${note ? ` — ${note}` : ""}`);
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const K = load("ko");
const E = load("en");
const split = K.chemSplitKoshaName;

const CASES = [
  // [원문, 기대 이름, 기대 관용명]
  ["에틸렌 ( 관용명 : ACETENE )", "에틸렌", "ACETENE"],
  ["벤젠 (Benzene)", "벤젠 (Benzene)", ""],
  ["벤젠", "벤젠", ""],
  ["에틸렌(관용명:ACETENE)", "에틸렌", "ACETENE"],
  ["에틸렌; 관용명: 에텐", "에틸렌", "에텐"],
  ["아조벤젠 (AZOBENZENE) (아조벤젠 ( 관용명 : 다이페닐디아젠(DIPHENYLDIAZENE); ))", "아조벤젠 (AZOBENZENE)", "다이페닐디아젠(DIPHENYLDIAZENE)"],
  ["뷰틸 수소 프탈산 ( 관용명 : 1,2-벤젠디카복실산, 모노뷰틸 에스터(1,2-BENZENEDICARBOXYLIC ACID, ) (BUTYL HYDROGEN PHTHALATE)",
    "뷰틸 수소 프탈산 (BUTYL HYDROGEN PHTHALATE)", "1,2-벤젠디카복실산, 모노뷰틸 에스터(1,2-BENZENEDICARBOXYLIC ACID…)"],
  ["모조에페드린 수화염화물 ( 관용명 : 벤젠메탄올, 알파-(1-메틸아미노)에틸)-, 수화염화물 )", "모조에페드린 수화염화물", "벤젠메탄올, 알파-(1-메틸아미노)에틸)-, 수화염화물"],
  ["디하이드록시벤젠 ( 관용명 : Dihydroybenzene ) (디하이드록시벤젠 ( 관용명 : Dihydroxybenzene ))", "디하이드록시벤젠", "Dihydroybenzene"],
  ["탄소 탈수효소 ( 관용명 : 탈하이드라타제, 탄산염(DEHYDRATASE, CARBONATE); ) (CARBONIC ANHYDRASE))", "탄소 탈수효소 (CARBONIC ANHYDRASE)", "탈하이드라타제, 탄산염(DEHYDRATASE, CARBONATE)"],
  ["nitrotoluene ( 관용명 : 벤젠, 메틸나이트로-(BENZENE, METHYLNITRO-); )", "nitrotoluene", "벤젠, 메틸나이트로-(BENZENE, METHYLNITRO-)"],
];
for (const [raw, name, synonym] of CASES) {
  const r = split(raw);
  check(`[src] 이름 떼기: ${raw.slice(0, 40)}`, r.name === name && r.synonym === synonym, JSON.stringify(r));
}
check("빈 이름", same(split(""), { name: "", synonym: "" }));

/* 영어 이름 고르기 [src] f/74-85-1.json names.en */
check("[src] 영어 이름: 동의어 줄보다 단일 이름", K.chemPickEnName(["Ethene; Acetene; Bicarburetted hydrogen; Olefiant gas; Elayl", "Ethylene", "ethylene"]) === "Ethylene");
check("영어 이름: 단일 이름이 없으면 첫 동의어", K.chemPickEnName(["Ethene; Acetene"]) === "Ethene");
check("영어 이름: 없음", K.chemPickEnName(null) === "" && K.chemPickEnName([]) === "");

/* 화면 이름 */
const eth = { name: "에틸렌 ( 관용명 : ACETENE )", name_en: "" };
const ethFilled = { name: "에틸렌 ( 관용명 : ACETENE )", name_en: "Ethylene" };
const k1 = K.chemDisplayNames(eth);
check("KO 제목: 에틸렌, 관용명 따로", k1.primary === "에틸렌" && k1.secondary === "" && k1.synonym === "ACETENE", JSON.stringify(k1));
const k2 = K.chemDisplayNames(ethFilled);
check("KO 제목: 에틸렌 · Ethylene", k2.primary === "에틸렌" && k2.secondary === "Ethylene", JSON.stringify(k2));
const e2 = E.chemDisplayNames(ethFilled);
check("EN 제목: Ethylene · 에틸렌", e2.primary === "Ethylene" && e2.secondary === "에틸렌" && e2.synonym === "ACETENE", JSON.stringify(e2));
const b = K.chemDisplayNames({ name: "벤젠 (Benzene)", name_en: "Benzene" });
check("벤젠은 그대로: 벤젠 · Benzene, 관용명 없음", b.primary === "벤젠" && b.secondary === "Benzene" && b.synonym === "", JSON.stringify(b));
const be = E.chemDisplayNames({ name: "벤젠 (Benzene)", name_en: "Benzene" });
check("EN 벤젠: Benzene · 벤젠", be.primary === "Benzene" && be.secondary === "벤젠");
const lead = K.chemDisplayNames({ name: "납 산화물(PbO) ( 관용명 : LEAD OXIDE )", name_en: "Lead oxide" });
check("관용명이 영문명과 같으면 숨김", lead.synonym === "" && lead.primary === "납 산화물(PbO)", JSON.stringify(lead));
check("chemLocalName: 비면 빈 값", K.chemLocalName({}) === "" && K.chemLocalName(eth) === "에틸렌" && E.chemLocalName(ethFilled) === "Ethylene");

const failed = results.filter(r => !r).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);

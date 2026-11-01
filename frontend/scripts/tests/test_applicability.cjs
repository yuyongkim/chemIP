// 적용 법규 판정기(?view=applicability, public/chemip/apl_*.jsx) 순수 모듈 시험 — 화면·서버 없이 Node vm 에서.
// 기준값은 법령 원문에서 손으로 옮긴 값(아래 주석의 별표·호)이며, 예시 혼합 사업장은 손계산과 비교한다.
//   (1) PSM: 별표 13 염소 1,500 kg, 염산(20 % 이상) 20,000 kg, 인화성 액체 제조·취급 5,000 / 저장 200,000 kg, R 합산
//   (2) 화관법: 고시 제2026-4호 별표 3 염소 0.01/0.4/2 t, 톨루엔 85 %·0.05/2/400 t, 염화수소 용액 0.2/8/40 t → 1군·2군
//   (3) 위험물: 별표 1 톨루엔 제4류 제1석유류 비수용성 200 L, 메탄올 알코올류 400 L, 배수 합·예방규정·안전관리자
//   (4) 방유제 110 %·100 %·50 %+10 %, 최대보유량
//   (5) 규정수량 정적 파일(scripts/portal_build/hazchem_quantity.py 결과)이 있으면 위 손값과 같은지
//   (6) 영어 화면: 같은 사례를 en 으로 돌려 판정이 같고 문구에 한글이 없는지
//   node frontend/scripts/tests/test_applicability.cjs
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const zlib = require("zlib");

const CHEMIP = path.join(__dirname, "..", "..", "public", "chemip");
const STATIC_TABLE = "E:/dev-cache/chemip-static/out/v1/g/hazchem_quantity.json";
const BABEL_OPTIONS = {
  presets: ["react", "env"],
  plugins: ["transform-class-properties", "transform-object-rest-spread", "transform-flow-strip-types"],
  targets: { browsers: undefined },
  compact: false,
  comments: false,
};
const babel = require(path.join(CHEMIP, "vendor", "babel.min.js"));
const MODULES = [
  "lang.jsx", "apl_units.jsx", "apl_psm_data.jsx", "apl_hazmat_data.jsx", "apl_cca_data.jsx", "apl_cites.jsx", "apl_terms.jsx",
  "apl_examples.jsx", "apl_psm_core.jsx", "apl_cca_core.jsx", "apl_hazmat_core.jsx", "apl_dike_core.jsx", "apl_evaluate.jsx",
  "apl_report.jsx", "apl_labels.jsx", "apl_labels_en.jsx",
];

function load(lang) {
  const sandbox = { console, URLSearchParams, URL, location: { search: `?lang=${lang}`, href: `http://t/chemip?lang=${lang}` } };
  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);
  for (const rel of MODULES) {
    const code = fs.readFileSync(path.join(CHEMIP, rel), "utf8");
    vm.runInContext(babel.transform(code, { ...BABEL_OPTIONS, filename: rel }).code, ctx, { filename: rel });
  }
  return sandbox;
}

let pass = 0, fail = 0;
function check(name, ok, detail) {
  if (ok) pass += 1;
  else { fail += 1; console.log(`FAIL ${name}${detail !== undefined ? ` — ${typeof detail === "string" ? detail : JSON.stringify(detail)}` : ""}`); }
}
const near = (a, b, tol = 1e-9) => Number.isFinite(a) && Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
const HANGUL = /[가-힣]/;

// 손으로 옮긴 고시 별표 3 값(화학물질안전원고시 제2026-4호, PDF 3쪽): [함량 %, 최하위, 하위, 상위] t
const HAND_ANNEX3 = {
  "7782-50-5": { no: 49, bands: [{ kind: "base", conc: 25, lowest: 0.01, lower: 0.4, upper: 2 }] },                  // 염소
  "108-88-3": { no: 28, bands: [{ kind: "base", conc: 85, lowest: 0.05, lower: 2, upper: 400 }] },                   // 톨루엔
  "67-56-1": { no: 4, bands: [{ kind: "base", conc: 85, lowest: 0.05, lower: 2, upper: 400 }] },                     // 메틸알코올
  "7647-01-0": { no: 42, bands: [{ kind: "base", conc: 10, lowest: 0.02, lower: 0.8, upper: 4 }, { kind: "solution", conc: 10, lowest: 0.2, lower: 8, upper: 40 }] }, // 염화수소 / 용액*
  "7697-37-2": { no: 46, bands: [{ kind: "base", conc: 10, lowest: 0.125, lower: 5, upper: 400 }, { kind: "base", conc: 70, concAbove: true, lowest: 0.025, lower: 1, upper: 20 }] }, // 질산 / 70 % 초과
};
const HAND_TABLE = { accident: Object.fromEntries(Object.entries(HAND_ANNEX3).map(([c, e]) => [c, [{ ...e, name: "", name_en: "" }]])), hazardous: {} };

// 예시 물질 정보(MSDS 9항 인화점·15항 위험물 글은 KOSHA MSDS 값 그대로)
const INFO = {
  "108-88-3": { flash: 4, density: 0.8623, s15: ["s15:4류 제1석유류(비수용성) (200L)"], ncis: ["사고대비물질"] },
  "67-56-1": { flash: 11, density: 0.7914, s15: ["s15:4류 알코올류 (400L)"], ncis: ["사고대비물질"] },
  "7782-50-5": { flash: null, s15: [], ncis: ["사고대비물질", "인체등유해성물질"] },
  "7647-01-0": { flash: null, s15: [], ncis: ["사고대비물질"] },
};
let rid = 0;
function rows(W, list) {
  return list.map(r => ({ id: `r${++rid}`, name: "", density: "", conc: "100", psmClass: "auto", hazmat: "auto", ...r }));
}
function infos(rs) {
  return Object.fromEntries(rs.map(r => [r.id, INFO[r.cas] || {}]));
}

function run(W, label) {
  // ── (1) PSM ──
  {
    const one = rows(W, [{ cas: "7782-50-5", qty: "1500", unit: "kg", state: "gas", use: "warehouse" }]);
    const r = W.aplPsm(one, infos(one));
    check(`${label} PSM 염소 1,500 kg = 별표 13 제7호 규정량 → R = 1, 해당`, near(r.R, 1) && r.verdict === "applies", r);
    const under = rows(W, [{ cas: "7782-50-5", qty: "1499", unit: "kg", state: "gas", use: "warehouse" }]);
    check(`${label} PSM 염소 1,499 kg → 해당 없음`, W.aplPsm(under, infos(under)).verdict === "not");
    const hcl = rows(W, [{ cas: "7647-01-0", qty: "25", unit: "t", conc: "35", state: "solution", use: "tank_out" }]);
    const rh = W.aplPsm(hcl, infos(hcl));
    check(`${label} PSM 염산 35 % 수용액 → 제49호(20 % 이상) 규정량 20,000 kg, C = 25,000 kg`, rh.groups[0]?.ref.no === 49 && near(rh.groups[0].ratio, 1.25), rh.groups[0]);
    const hcl15 = rows(W, [{ cas: "7647-01-0", qty: "25", unit: "t", conc: "15", state: "solution", use: "tank_out" }]);
    check(`${label} PSM 염산 15 % → 제49호 농도 미만, 셈 안 함`, W.aplPsm(hcl15, infos(hcl15)).items[0].status === "belowConc");
    const ahcl = rows(W, [{ cas: "7647-01-0", qty: "5000", unit: "kg", state: "gas", use: "mfg" }]);
    check(`${label} PSM 무수 염화수소(기체) → 제13호 10,000 kg`, W.aplPsm(ahcl, infos(ahcl)).groups[0]?.ref.no === 13);
    const nh3aq = rows(W, [{ cas: "7664-41-7", qty: "60", unit: "t", conc: "25", state: "solution", use: "tank_out" }]);
    const rn = W.aplPsm(nh3aq, infos(nh3aq));
    check(`${label} PSM 암모니아 25 % 수용액 → 제51호 암모니아수 50,000 kg, R = 1.2`, rn.groups[0]?.ref.no === 51 && near(rn.R, 1.2), rn.groups[0]);
    const tol = rows(W, [{ cas: "108-88-3", qty: "6000", unit: "kg", state: "liquid", use: "mfg" }]);
    const rt = W.aplPsm(tol, infos(tol));
    check(`${label} PSM 톨루엔(인화점 4 ℃) 공정 6,000 kg → 제2호 인화성 액체 제조·취급 5,000 kg, R = 1.2`, rt.groups[0]?.key === "flam_liquid" && near(rt.R, 1.2), rt);
    const tolS = rows(W, [{ cas: "108-88-3", qty: "150000", unit: "kg", state: "liquid", use: "tank_out" }]);
    check(`${label} PSM 톨루엔 저장 150,000 kg → 저장 규정량 200,000 kg, R = 0.75`, near(W.aplPsm(tolS, infos(tolS)).R, 0.75));
    const pure = rows(W, [{ cas: "7782-50-5", qty: "2000", unit: "kg", conc: "50", state: "liquid", use: "mfg" }]);
    check(`${label} PSM 순도 기준(비고 6): 염소 50 % 2,000 kg → C = 1,000 kg`, near(W.aplPsm(pure, infos(pure)).groups[0].handle, 1000));
    const ind = rows(W, [{ cas: "7782-50-5", qty: "1", unit: "kg", state: "gas", use: "warehouse" }]);
    check(`${label} PSM 제43조제1항 업종(원유 정제처리업) → 양과 무관하게 해당`, W.aplPsm(ind, infos(ind), {}, { industry: "refining" }).verdict === "applies");
  }
  // ── 예시 혼합 사업장(apl_examples.jsx mixed) ──
  const mix = rows(W, W.APL_EXAMPLES.mixed);
  const res = W.aplEvaluate(mix, infos(mix), HAND_TABLE, {});
  {
    // 손계산: 톨루엔 30,000 L × 0.867 = 26,010 kg(저장) → 26,010/200,000 = 0.13005; 메탄올 4,000 L × 0.792 = 3,168 kg(취급) → 0.6336
    //         인화성 액체 = max(0.6336, 0.13005) = 0.6336; 염소 1,000/1,500 = 0.6667; 염산 25,000/20,000 = 1.25 → R = 2.5503
    const R = Math.max(3168 / 5000, 26010 / 200000) + 1000 / 1500 + 25000 / 20000;
    check(`${label} 혼합 사업장 PSM R = ${R.toFixed(4)} → 해당`, near(res.psm.R, R, 1e-9) && res.psm.verdict === "applies", res.psm.R);
  }
  // ── (2) 화관법 ──
  {
    const T = HAND_TABLE;
    const cl = (kg) => { const x = rows(W, [{ cas: "7782-50-5", qty: String(kg), unit: "kg", state: "gas", use: "warehouse" }]); return W.aplCca(x, infos(x), T); };
    check(`${label} 화관법 염소 2,000 kg = 상위 2 t → 1군`, cl(2000).tier === "tier1");
    check(`${label} 화관법 염소 1,999 kg → 2군(하위 0.4 t 이상)`, cl(1999).tier === "tier2");
    check(`${label} 화관법 염소 399 kg → 계획서 비대상·최하위 이상`, cl(399).tier === "lowest" && cl(399).verdict === "applies");
    check(`${label} 화관법 염소 9 kg → 최하위 0.01 t 미만`, cl(9).tier === "below" && cl(9).verdict === "not");
    const cl20 = rows(W, [{ cas: "7782-50-5", qty: "5000", unit: "kg", conc: "20", state: "liquid", use: "warehouse" }]);
    check(`${label} 화관법 염소 20 % (함량기준 25 % 미만) → 대상 아님`, W.aplCca(cl20, infos(cl20), T).items[0].status === "belowConc");
    const tolL = rows(W, [{ cas: "108-88-3", qty: "1999", unit: "kg", conc: "90", state: "liquid", use: "tank_out" }]);
    check(`${label} 화관법 톨루엔 90 % 1,999 kg → 하위 2 t 미만(계획서 비대상)`, W.aplCca(tolL, infos(tolL), T).tier === "lowest");
    const tol80 = rows(W, [{ cas: "108-88-3", qty: "500", unit: "t", conc: "80", state: "liquid", use: "tank_out" }]);
    check(`${label} 화관법 톨루엔 80 %(함량기준 85 % 미만) → 대상 아님`, W.aplCca(tol80, infos(tol80), T).tier === "none");
    const hcl = rows(W, [{ cas: "7647-01-0", qty: "7.9", unit: "t", conc: "35", state: "solution", use: "tank_out" }]);
    const rh = W.aplCca(hcl, infos(hcl), T);
    check(`${label} 화관법 염산 35 % 7.9 t → 용액 값(별표 3 일반기준 가) 하위 8 t 미만`, rh.groups[0]?.lower === 8 && rh.tier === "lowest", rh.groups[0]);
    const no3 = rows(W, [{ cas: "7697-37-2", qty: "1", unit: "t", conc: "98", state: "liquid", use: "tank_out" }]);
    check(`${label} 화관법 질산 98 % → 70 % 초과 값 하위 1 t → 2군`, W.aplCca(no3, infos(no3), T).tier === "tier2");
    check(`${label} 혼합 사업장 화관법 → 2군`, res.cca.tier === "tier2", res.cca.groups.map(g => [g.cas, g.tier]));
    check(`${label} 규정수량 자료 없음 → 확인 필요`, W.aplCca(hcl, infos(hcl), null).verdict === "check");
    // 보관시설만, 모두 최하위 미만: 염소 6 kg(0.6) + 메탄올 30 kg(0.6) → R = 1.2 ≥ 1 → 최하위 이상으로 봄(고시 별표 4 제3호다목)
    const st = rows(W, [{ cas: "7782-50-5", qty: "6", unit: "kg", state: "gas", use: "warehouse" }, { cas: "67-56-1", qty: "30", unit: "kg", state: "liquid", use: "warehouse" }]);
    const rs = W.aplCca(st, infos(st), T);
    check(`${label} 보관시설만 R = Σ Q/최하위 = 1.2 → 최하위 이상`, near(rs.Rlowest, 1.2) && rs.tier === "lowest", rs.Rlowest);
  }
  // ── (3) 위험물 ──
  {
    check(`${label} MSDS "4류 제1석유류(비수용성) (200L)" → 제1석유류 비수용성 200 L`, W.aplHazmatGuess(["s15:4류 제1석유류(비수용성) (200L)"])?.key === "c4_p1");
    check(`${label} MSDS "4류 제1석유류(수용성)" → 400 L 품명`, W.aplHazmatGuess(["s15:4류 제1석유류(수용성) (400L)"])?.key === "c4_p1s");
    check(`${label} MSDS "제3석유류 비수용성액체 (2000리터)"(유 번호 없음) → 제3석유류 비수용성`, W.aplHazmatGuess(["s15:제3석유류 비수용성액체 (2000리터)"])?.key === "c4_p3");
    check(`${label} MSDS "6류 질산 (300kg)" → 질산(비중 조건)`, W.aplHazmatGuess(["s15:6류 질산 (300kg)"])?.key === "c6_nitric");
    check(`${label} MSDS "1류 과염소산염류" → 과염소산염류(염소산염류 아님)`, W.aplHazmatGuess(["s15:1류 과염소산염류 (50kg)"])?.key === "c1_perchlorate");
    check(`${label} MSDS "2류 황 (100kg)" → 황`, W.aplHazmatGuess(["s15:2류 황 (100kg)"])?.key === "c2_sulfur");
    check(`${label} MSDS "5류 유기과산화물 (10kg)" → 제5류 제1종 + 확인 필요`, W.aplHazmatGuess(["s15:5류 유기과산화물 (10kg)"])?.flags.includes("type5"));
    const tol = rows(W, [{ cas: "108-88-3", qty: "200", unit: "L", state: "liquid", use: "warehouse" }]);
    const rt = W.aplHazmat(tol, infos(tol));
    check(`${label} 위험물 톨루엔 200 L = 제1석유류 비수용성 지정수량 200 L → 배수 1, 허가 대상`, near(rt.facilities[0].mult, 1) && rt.facilities[0].permit && rt.verdict === "applies", rt.facilities[0]);
    const tolKg = rows(W, [{ cas: "108-88-3", qty: "100", unit: "kg", density: "0.867", state: "liquid", use: "warehouse" }]);
    check(`${label} 위험물 톨루엔 100 kg ÷ 0.867 = 115.3 L → 배수 0.577`, near(W.aplHazmat(tolKg, infos(tolKg)).facilities[0].mult, 100 / 0.867 / 200));
    const h = res.hazmat;
    const tank = h.facilities.find(f => f.fac === "tank_out"), gen = h.facilities.find(f => f.fac === "general");
    check(`${label} 혼합 사업장 옥외탱크저장소: 톨루엔 30,000 L ÷ 200 = 150배, 예방규정(200배) 아님, 안전관리자 상위 자격`, near(tank.mult, 150) && !tank.prevention && tank.managerLow === false, tank);
    check(`${label} 혼합 사업장 일반취급소: 메탄올 4,000 L ÷ 400 = 10배 → 예방규정 대상(+단서 확인)·안전관리자 낮은 자격(제4류 10배 이하)`, near(gen.mult, 10) && gen.prevention && gen.preventionMaybe && gen.managerLow === true, gen);
    check(`${label} 혼합 사업장 위험물 배수 합 160 → 해당`, near(h.total, 160) && h.verdict === "applies");
    const big = rows(W, [{ cas: "108-88-3", qty: "700000", unit: "L", state: "liquid", use: "mfg" }]);
    const rb = W.aplHazmat(big, infos(big));
    check(`${label} 제조소 제4류 3,500배 → 자체소방대 1대·5인(별표 8 제1호)`, rb.brigade.required && rb.brigade.trucks === 1 && rb.brigade.crew === 5, rb.brigade);
    const h2o2 = rows(W, [{ cas: "7722-84-1", qty: "1000", unit: "kg", conc: "30", state: "solution", use: "warehouse", hazmat: "c6_h2o2" }]);
    check(`${label} 과산화수소 30 % → 36 % 미만이라 위험물 아님(별표 1 비고 22)`, W.aplHazmat(h2o2, {}).items[0].status === "belowConc");
  }
  // ── (4) 방유제 ──
  {
    const d = W.aplDike({ basis: "tank", tanks: [1000, 500, 300] });
    check(`${label} 방유제 옥외탱크 1,000·500·300 m³ → 1,000 × 110 % = 1,100 m³`, near(d.required, 1100));
    check(`${label} 방유제 인화성 없는 액체 → 100 % = 1,000 m³`, near(W.aplDike({ basis: "tank_nonflam", tanks: [1000, 500] }).required, 1000));
    check(`${label} 제조소 취급탱크 100·50·30 m³ → 50 + 8 = 58 m³`, near(W.aplDike({ basis: "process", tanks: [100, 50, 30] }).required, 58));
    const e = W.aplDike({ basis: "tank", tanks: [1000], area: 1000, height: 1.2, displacement: 50 });
    check(`${label} 방유제 1,000 m² × 1.2 m − 50 = 1,150 ≥ 1,100 → 충족`, near(e.effective, 1150) && e.ok === true);
    check(`${label} 최대보유량 50 m³ × 1.18 = 59 t`, near(W.aplHolding(50, 1.18), 59));
  }
  // ── 보고서 ──
  {
    const names = Object.fromEntries(mix.map(r => [r.id, r.cas]));
    const csv = W.aplCsvString(W.aplCsvRows(res, mix, names, W.APL_LABELS));
    check(`${label} CSV: BOM·머리 줄·요약 3줄 + 물질 4줄 이상`, csv.startsWith("\ufeff") && csv.split("\r\n").length >= 1 + 3 + 4, csv.slice(0, 200));
  }
  return res;
}

const W = load("ko");
const ko = run(W, "[ko]");
const WE = load("en");
const en = run(WE, "[en]");
check("ko·en 판정이 같다", ["psm", "cca", "hazmat"].every(k => ko[k].verdict === en[k].verdict) && near(ko.psm.R, en.psm.R));

// 영어 문구: 모든 이유 문장·판정 낱말에 한글이 없다
{
  const L = WE.APL_LABELS;
  const sample = { k: "", v: { no: 7, conc: 50, need: 25, kg: 1000, C: 500, flash: 4, flam: "liquid", lfl: 1, ufl: 7, state: "gas", check: "oleum", cats: ["허가물질"], entries: [{ no: 1, name: "x", name_en: "x" }], R: 1.2, text: "4류", use: "handle" } };
  const bad = Object.keys(L.reasons).filter(k => HANGUL.test(L.reasons[k](sample.v)));
  check("en 이유 문장에 한글 없음", bad.length === 0, bad.join(", "));
  const words = [L.title, L.lede, L.disclaimer.body, ...Object.values(L.verdicts), ...Object.values(L.cca.tierText), L.dike.cca];
  check("en 머리·판정·화관법 문구에 한글 없음", !words.some(w => HANGUL.test(w)));
  const csv = WE.aplCsvRows(en, [], {}, L)[0];
  check("en CSV 머리 줄에 한글 없음", !csv.some(c => HANGUL.test(c)));
  check("en 판정 낱말에 위반(violat) 없음", !JSON.stringify(Object.values(L.verdicts)).match(/violat/i));
  check("ko 문구에 '위반' 없음", !/위반/.test(fs.readFileSync(path.join(CHEMIP, "apl_labels.jsx"), "utf8").split("\n").filter(l => !l.trim().startsWith("//")).join("\n")));
}

// 자료 점검: 별표 13 은 51 개 호(제1·2호 + 49 줄), 번호가 3–51 연속
{
  const nos = W.APL_PSM.rows.map(r => r.no);
  check("별표 13 제3–51호 49 줄, 번호 연속", nos.length === 49 && nos.every((n, i) => n === i + 3), nos);
  check("별표 13 제7호 염소 1,500 kg · 제49호 염산 20,000 kg · 제22호 질산 94.5 %", W.APL_PSM.rows.find(r => r.no === 7).q === 1500 && W.APL_PSM.rows.find(r => r.no === 49).q === 20000 && W.APL_PSM.rows.find(r => r.no === 22).conc === 94.5);
  const p1 = W.aplHazmatItemByKey("c4_p1");
  check("별표 1 제4류 제1석유류 비수용성 200 L", p1.qty === 200 && p1.unit === "L");
  check("인용 key 가 모두 APL_CITES 에 있다", [...ko.psm.cites, ...ko.cca.cites, ...ko.hazmat.cites, "hz_rule_b6", "hz_rule_b4", "cca_r_b5"].every(k => W.APL_CITES[k] && W.APL_CITES[k].url.startsWith("https://www.law.go.kr/")));
}

// (5) 정적 파일이 손값과 같은지
if (fs.existsSync(STATIC_TABLE)) {
  let raw = fs.readFileSync(STATIC_TABLE);
  if (raw[0] === 0x1f && raw[1] === 0x8b) raw = zlib.gunzipSync(raw);
  const T = JSON.parse(raw.toString("utf8"));
  for (const [cas, hand] of Object.entries(HAND_ANNEX3)) {
    const e = (T.accident[cas] || [])[0];
    const same = e && e.no === hand.no && hand.bands.every((b, i) => ["conc", "lowest", "lower", "upper"].every(k => e.bands[i] && e.bands[i][k] === b[k]) && e.bands[i].kind === b.kind);
    check(`정적 규정수량 파일 = 손값: ${cas} 별표 3 제${hand.no}호`, same, e);
  }
  check("정적 파일 별표 2 연번 1,557 · 별표 3 100", T.counts.annex2 === 1557 && T.counts.annex3 === 100, T.counts);
  const cl2 = T.hazardous["7782-50-5"]?.[0];
  check("정적 파일 별표 2 염소(연번 1283) 급성 1 %·0.01/0.4/2", cl2 && cl2.no === 1283 && cl2.bands[0].conc === 1 && cl2.bands[0].upper === 2, cl2);
  const mixS = rows(W, W.APL_EXAMPLES.mixed);
  check("정적 파일로 돌려도 혼합 사업장 2군", W.aplEvaluate(mixS, infos(mixS), T).cca.tier === "tier2");
} else {
  console.log(`SKIP 정적 규정수량 파일 없음: ${STATIC_TABLE} (python -I -B scripts/portal_build/hazchem_quantity.py)`);
}

console.log(`\ntest_applicability: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

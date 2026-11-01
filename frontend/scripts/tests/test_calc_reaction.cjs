// 반응·경제 묶음 계산기 시험 — calc_batch_reactor·calc_runaway·calc_economics·calc_flue_gas (+ calc_reaction_math·calc_economics_math).
// 화면 없이 순수 모듈만 Node vm 에 올린다(test_calculators.cjs 와 같은 Babel 설정). 기준값 표시:
//   [src] 인쇄된 값(책·강의·법령·발표), [calc] 식에서 손으로 유도한 값.
// 같은 사례를 ko·en 으로 돌려 수치가 같은지, en 문구(경고·오류·판정 글)에 한글이 없는지도 본다.
//
//   node frontend/scripts/tests/test_calc_reaction.cjs
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const CHEMIP = path.join(__dirname, "..", "..", "public", "chemip");
const babel = require(path.join(CHEMIP, "vendor", "babel.min.js"));
const BABEL_OPTIONS = { presets: ["react", "env"], plugins: ["transform-class-properties", "transform-object-rest-spread"], compact: false, comments: false };
const FILES = [
  "lang.jsx", "calc_labels.jsx", "calc_labels_en.jsx", "calc_units.jsx", "calc_physics.jsx", "calc_reactor.jsx",
  "calc_reaction_math.jsx", "calc_batch_reactor.jsx", "calc_runaway.jsx", "calc_economics_ppi.jsx", "calc_economics_math.jsx",
  "calc_economics.jsx", "calc_flue_gas.jsx", "calc_engine.jsx", "calc_chart_scale.jsx", "term_glossary.jsx", "term_glossary_en.jsx",
];
const KEYS = ["batch_reactor", "runaway", "economics", "flue_gas"];

function load(lang) {
  const sandbox = { console, URLSearchParams, location: { search: `?lang=${lang}` } };
  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);
  for (const rel of FILES) {
    const code = babel.transform(fs.readFileSync(path.join(CHEMIP, rel), "utf8"), { ...BABEL_OPTIONS, filename: rel }).code;
    vm.runInContext(code, ctx, { filename: rel });
  }
  sandbox.defs = Object.fromEntries(KEYS.map(k => [k, sandbox[`CALC_DEF_${k.toUpperCase()}`]]));
  return sandbox;
}
const W = load("ko");
const WE = load("en");
const HANGUL = /[가-힣ㄱ-ㆎ]/;

const results = [];
function check(name, ok, note = "") {
  results.push(Boolean(ok));
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${note ? ` — ${note}` : ""}`);
}
function near(name, got, want, tol) {
  check(name, Number.isFinite(got) && Math.abs(got - want) <= tol * Math.abs(want), `${got} vs ${want} (허용 ${tol * 100}%)`);
}

function runIn(win, key, over = {}, tables = {}) {
  const def = win.defs[key];
  const state = win.calcInitialState(def, {});
  for (const [k, v] of Object.entries(over)) {
    const input = def.inputs.find(i => i.key === k);
    if (!input) throw new Error(`${key}: 칸 없음 ${k}`);
    if (input.type === "choice") state[k] = v;
    else if (typeof v === "object") state[k] = { raw: String(v.raw), unit: v.unit };
    else state[k] = { ...state[k], raw: String(v) };
  }
  for (const [k, rows] of Object.entries(tables)) state[k] = rows.map(r => Object.fromEntries(Object.entries(r).map(([c, x]) => [c, String(x)])));
  const r = win.calcEvaluate(def, state);
  r.chart = win.calcChartFor(def, r);
  return r;
}
const enIssues = [];
function run(key, over, tables) {
  const ko = runIn(W, key, over, tables);
  const en = runIn(WE, key, over, tables);
  for (const [k, v] of Object.entries(ko.outputs || {})) {
    if (typeof v === "number" && !Object.is(v, en.outputs?.[k])) enIssues.push(`${key}.${k} 수치 다름`);
  }
  [en.error, ...(en.warnings || []), ...Object.values(en.outputs || {}).filter(x => typeof x === "string")]
    .filter(t => t && HANGUL.test(t)).forEach(t => enIssues.push(`${key}: ${t.slice(0, 40)}`));
  return ko;
}
const C2K = (c) => c + 273.15;

// ════ batch_reactor ════
let r = run("batch_reactor");
near("[calc] 회분 1차 k 0.1/min, X 90 % → t = ln10/0.1 = 23.03 min (R5)", r.outputs?.t_out / 60, Math.log(10) / 0.1, 1e-9);
near("[calc] 1차 반감기 ln2/k = 6.931 min", r.outputs?.half / 60, Math.log(2) / 0.1, 1e-9);
check("회분 그래프 있음", Boolean(r.chart && r.chart.series[0].points.length > 10));
r = run("batch_reactor", { b_n: 2, b_k: 0.5, b_ca0: 2, b_X: 80 });
near("[calc] 2차 t = X/(k C_A0 (1−X)) = 0.8/(0.5·2·0.2) = 4 min (Levenspiel 3장 적분형)", r.outputs?.t_out / 60, 4, 1e-9);
near("[calc] 2차 반감기 1/(k C_A0) = 1 min", r.outputs?.half / 60, 1, 1e-9);
r = run("batch_reactor", { b_n: 2, b_k: 0.5, b_ca0: 2, b_solve: "X", b_t: 4 });
near("[calc] 2차 역산 t 4 min → X 80 %", r.outputs?.X_out, 80, 1e-9);
r = run("batch_reactor", { b_n: 0, b_k: 0.1, b_ca0: 1, b_solve: "X", b_t: 20 });
check("[calc] 0차 k·t > C_A0 → X = 100 % + 경고", r.outputs?.X_out === 100 && r.warnings.length === 1, `${r.outputs?.X_out}`);
r = run("batch_reactor", { b_n: 0, b_k: 0.1, b_ca0: 1, b_X: 50 });
near("[calc] 0차 t = C_A0 X / k = 5 min", r.outputs?.t_out / 60, 5, 1e-9);

r = run("batch_reactor", { mode: "series" });
near("[calc] kτ = 2, N = 2 → X = 1 − 1/4 = 75 % (R5)", r.outputs?.X_N, 75, 1e-12);
near("[calc] kτ = 2, CSTR 1 개 → 66.67 % (R5)", r.outputs?.X_1, 200 / 3, 1e-12);
near("[calc] kτ = 2, PFR → 86.47 % (R5)", r.outputs?.X_pfr, 100 * (1 - Math.exp(-2)), 1e-12);
r = run("batch_reactor", { mode: "series", s_N: 100 });
check("[calc] N = 100 이면 PFR 에 1 % 안", Math.abs(r.outputs?.X_N - r.outputs?.X_pfr) < 1, `${r.outputs?.X_N} / ${r.outputs?.X_pfr}`);
check("직렬 그래프 있음", Boolean(r.chart && r.chart.hlines.length === 1));
near("[calc] 직렬 역함수 calcSeriesCstrKtau(2, 0.75) = 2", W.calcSeriesCstrKtau(2, 0.75), 2, 1e-12);

r = run("batch_reactor", { mode: "arrhenius" });
{
  // 독립 최소제곱(ln k 대 1/T) — 같은 자료
  const T = [313, 319, 323, 328, 333], k = [0.00043, 0.00103, 0.0018, 0.00355, 0.00717];
  const x = T.map(t => 1 / t), y = k.map(Math.log), mx = x.reduce((a, b) => a + b) / 5, my = y.reduce((a, b) => a + b) / 5;
  const sl = x.reduce((s, xi, i) => s + (xi - mx) * (y[i] - my), 0) / x.reduce((s, xi) => s + (xi - mx) ** 2, 0);
  near("[calc] Fogler 4판 예제 3-1 자료 최소제곱 Ea = −R·기울기 (121.5 kJ/mol)", r.outputs?.Ea, -sl * 8.314462618 / 1000, 1e-9);
  near("[calc] 같은 자료 A = exp(절편)", r.outputs?.A, Math.exp(my - sl * mx), 1e-9);
  near("[src] Fogler 동반 사이트의 그림 풀이(10배 구간법) ≈ 116 kJ/mol 과 5 % 안", r.outputs?.Ea, 116, 0.05);
}
check("R² > 0.99", r.outputs?.r2 > 0.99, `${r.outputs?.r2}`);
check("Arrhenius 그래프(로그 축) 있음", Boolean(r.chart && r.chart.y.log && r.chart.series.length === 2));
r = run("batch_reactor", { mode: "arrhenius" }, { a_rows: [{ T: 300, k: 1 }, { T: 310, k: 2 }] });
near("[calc] 300→310 K 에서 k 두 배 → Ea = R ln2/(1/300 − 1/310) = 53.6 kJ/mol (R5)", r.outputs?.Ea, 8.314462618 * Math.log(2) / (1 / 300 - 1 / 310) / 1000, 1e-9);
r = run("batch_reactor", { mode: "arrhenius", a_tu: "C" }, { a_rows: [{ T: 26.85, k: 1 }, { T: 36.85, k: 2 }] });
near("[calc] 같은 자료 °C 입력 → 같은 Ea", r.outputs?.Ea, 8.314462618 * Math.log(2) / (1 / 300 - 1 / 310) / 1000, 1e-9);
r = run("batch_reactor", { mode: "arrhenius" }, { a_rows: [{ T: 300, k: 1 }, { T: 300, k: 2 }] });
check("같은 온도만 → 계산 오류", Boolean(r.error), r.error);

r = run("batch_reactor", { mode: "adiabatic" });
near("[src] Fogler 예제 11-3: T = 330 + 43.4 X → X 50 % 에서 351.7 K", r.outputs?.T_X, 330 + 0.5 * 6900 / 159, 1e-12);
near("[src] 같은 예제 ΔTad = 6900/159 = 43.4 K", r.outputs?.dTad, 43.4, 0.001);
near("[src] 같은 예제 X 50 % 단열 PFR 1.408 m³ (Michigan ChE 344 강의 14)", r.outputs?.V_pfr, 1.408, 0.005);
near("[src] 같은 예제 X 50 % 단열 CSTR 1.368 m³ (같은 강의)", r.outputs?.V_cstr, 1.368, 0.005);
check("단열 평형점 있음(Xe > 50 %)", r.outputs?.Xe > 50 && r.outputs?.Xe < 100, `${r.outputs?.Xe} % @ ${r.outputs?.Te} K`);
check("단열 그래프: 수지 선 + 평형 곡선", Boolean(r.chart && r.chart.series.length === 2));
r = run("batch_reactor", { mode: "adiabatic", a_T0: 300, a_dH: -80, a_cp: 400, a_eq: "none", a_kin: "none", a_X: 99 });
near("[calc] ΔH −80 kJ/mol, ΣθCp 400 → ΔTad 200 K, X=1 에서 500 K (R5)", r.outputs?.dTad, 200, 1e-12);
r = run("batch_reactor", { mode: "adiabatic", a_X: 90 });
check("목표 X > Xe → 단간 냉각 경고", r.warnings.some(w => /단간 냉각/.test(w)));

// ════ runaway ════
r = run("runaway");
near("[calc] Q′r 200 kJ/kg, cp 2 → ΔTad 100 K", r.outputs?.dTad, 100, 1e-12);
near("[calc] X_ac 30 % → 축적분 30 K (R4)", r.outputs?.dTacc, 30, 1e-12);
near("[calc] MTSR = 60 + 30 = 90 °C", r.outputs?.MTSR, C2K(90), 1e-12);
{
  const v = { cp: 2000, q0: 10, Tq: C2K(100), Ea: 75000 };
  near("[calc] T₀ 100 °C, q₀ 10 W/kg, Ea 75 kJ/mol → TMRad 0.86 h (R4)", W.calcRunawayTmr(v, C2K(100)) / 3600, 0.858, 0.002);
}
{
  const td = r.outputs?.TD24;
  const v = { cp: 2000, q0: 3, Tq: C2K(150), Ea: 50000 };
  near("[calc] TD24 에서 TMRad = 24 h (자기 일관)", W.calcRunawayTmr(v, td) / 3600, 24, 1e-6);
}
check("[calc] 기본값: MTSR 90 < TD24 ≈ 105 < MTT 110 °C → 2등급", r.outputs?.cls === 2 && r.outputs?.TD24 > C2K(100) && r.outputs?.TD24 < C2K(110) && Boolean(r.outputs?.clsText), `${r.outputs?.cls} TD24 ${r.outputs?.TD24 - 273.15}`);
check("스크리닝 경고 항상", r.warnings.some(w => /참고용 스크리닝/.test(w)));
check("열폭주 그래프(로그 TMRad, 24 h 선)", Boolean(r.chart && r.chart.y.log && r.chart.hlines.some(h => h.y === 24)));
// 등급 순서 — Stoessel 1993 정의 [calc], Stoessel·Nanchen·Tran-Van(2025) 예 [src] (MTSR 자리에 THmax, TD24 자리에 TSTAB)
const SC = W.calcStoesselClass;
check("[src] 저장 예: THmax 50·MTT 88·TSTAB 60 °C → 2등급 (Stoessel 2025)", SC(50, 88, 60) === 2);
check("[src] 패들 건조기(증기): THmax 160·MTT 122·TSTAB 110 °C → 5등급 (Stoessel 2025)", SC(160, 122, 110) === 5);
check("[calc] 1등급: MTSR 80 < MTT 100 < TD24 150", SC(80, 100, 150) === 1);
check("[calc] 3등급: MTT 56 < MTSR 81 < TD24 130", SC(81, 56, 130) === 3);
check("[calc] 4등급: MTT 80 < TD24 100 < MTSR 120", SC(120, 80, 100) === 4);
check("[calc] 5등급: TD24 70 < MTSR 90 < MTT 110", SC(90, 110, 70) === 5);
r = run("runaway", { Xac: 100, Q: 400, Qd: 1000 });
near("[calc] 회분 X_ac 100 %, 400 kJ/kg → MTSR 260 °C", r.outputs?.MTSR, C2K(260), 1e-12);
near("[calc] 분해열 1000 kJ/kg → 분해 ΔTad 500 K, 최종 760 °C", r.outputs?.Tend, C2K(760), 1e-12);
check("MTSR 이 MTT·TD24 보다 높으면 4 또는 5등급", r.outputs?.cls >= 4, `${r.outputs?.cls}`);
r = run("runaway", { q0: 1e-12 });
check("TD24 못 찾음 → 계산 오류", Boolean(r.error), r.error);

// ════ economics ════
r = run("economics");
near("[calc] $10 M, 100 → 200 t/d, n 0.6 → 15.16 (R5)", r.outputs?.C2, 10 * Math.pow(2, 0.6), 1e-12);
check("용량 그래프 있음", Boolean(r.chart && r.chart.markers.length === 2));
r = run("economics", { mode: "escalate" });
near("[calc] 100 × 800/500 = 160", r.outputs?.C_now, 160, 1e-12);
r = run("economics", { mode: "escalate", src: "ppi", ser: "PCU332410332410", y0: 2015, y1: 2025 });
near("[src] BLS PPI 보일러·열교환기 2015 → 2025 = 294.211/165.4", r.outputs?.idx_ratio, 294.211 / 165.4, 1e-9);
check("PPI 대용 경고", r.warnings.some(w => /CEPCI/.test(w)));
r = run("economics", { mode: "escalate", src: "ppi", y0: 2005, y1: 2025 });
check("PPI 10 년 넘으면 경고 2개", r.warnings.length === 2);
r = run("economics", { mode: "npv" });
near("[calc] −1000 + 300×5, 10 % → NPV +137.24 (R5)", r.outputs?.npv, 137.236, 1e-4);
near("[calc] IRR 15.24 % (R5 ≈ 15.2 %)", r.outputs?.irr, 15.2382, 1e-4);
near("[calc] 단순 회수 3.333 년 (R5)", r.outputs?.pb, 10 / 3, 1e-9);
near("[calc] 할인 회수 4 + 49.05/186.28 = 4.263 년", r.outputs?.dpb, 4.26333, 1e-4);
near("[calc] 연간 균등 가치 137.24 × CRF(10 %, 5) = 36.20", r.outputs?.eav, 137.236 * 0.263797, 1e-4);
check("NPV 그래프: 누적 2개 선", Boolean(r.chart && r.chart.series.length === 2));
r = run("economics", { mode: "npv" }, { cf: [{ cf: -100 }, { cf: 230 }, { cf: -132 }] });
check("[calc] 부호 두 번 바뀜 → IRR 여럿 경고", r.warnings.some(w => /IRR/.test(w)));
r = run("economics", { mode: "npv" }, { cf: [{ cf: -1000 }, { cf: 100 }] });
check("회수 못함 → 경고·pb 없음", r.outputs?.pb == null && r.warnings.length > 0);
r = run("economics", { mode: "utility" });
near("[calc] 유틸리티 (100·180 + 2·40000 + 200·50) × 8000 = 8.64 × 10⁸", r.outputs?.u_y, (18000 + 80000 + 10000) * 8000, 1e-12);

// ════ flue_gas ════
r = run("flue_gas");
near("[calc] CH₄ 과잉 공기 10 % → 건조 CO₂ 1/9.501 = 10.525 % (공기 O₂ 20.95 %)", r.outputs?.co2d, 100 / (1 + 0.2 + 2.2 * 0.7905 / 0.2095), 1e-9);
near("[calc] 같은 경우 건조 O₂ 2.105 %", r.outputs?.o2d, 20 / (1 + 0.2 + 2.2 * 0.7905 / 0.2095), 1e-9);
near("[calc] 같은 경우 습 H₂O = 2/11.501 = 17.39 %", r.outputs?.h2ow, 200 / (3.2 + 2.2 * 0.7905 / 0.2095), 1e-9);
{
  const f = { m: 1, x: 4, y: 0, s: 0, n: 0 };
  const b = W.calcFlueBalance(f, 0.1);
  const co21 = 100 * 1 / (1 + 0.2 + 2.2 * 0.79 / 0.21);
  check("[src 근사] R5 의 10.55 %(공기 O₂ 21 %)와 0.3 % 안", Math.abs(100 * b.mol.CO2 / b.dry - 10.55) / 10.55 < 0.003 && Math.abs(co21 - 10.55) < 0.01, `${100 * b.mol.CO2 / b.dry} / ${co21}`);
}
const tdew = r.outputs?.Tdew;
near("[calc] 수증기 이슬점: p_H₂O = 0.1739 × 101.325 kPa 의 포화 온도", W.calcWaterPsat(tdew), 101325 * 2 / (3.2 + 2.2 * 0.7905 / 0.2095), 1e-6);
check("메탄 수증기 이슬점 55–60 °C", tdew > C2K(55) && tdew < C2K(60), `${tdew - 273.15} °C`);
near("[src 식] 1. BImSchV 가스: (180 − 20)(0.66/(21 − 2.105) + 0.009)", r.outputs?.qA, 160 * (0.66 / (21 - r.outputs.o2d) + 0.009), 1e-12);
r = run("flue_gas", { mode: "o2", o2m: 20 / (1 + 0.2 + 2.2 * 0.7905 / 0.2095) });
near("[calc] 역산: 측정 O₂ 2.105 % → 과잉 공기 10 %", r.outputs?.excess, 10, 1e-9);
r = run("flue_gas", { mode: "co2", co2m: 100 / (1 + 0.2 + 2.2 * 0.7905 / 0.2095) });
near("[calc] 역산: 측정 CO₂ 10.525 % → 과잉 공기 10 %", r.outputs?.excess, 10, 1e-9);
r = run("flue_gas", { mode: "co2", co2m: 15 });
check("메탄 CO₂ 15 %(이론 11.7 % 초과) → 계산 오류", Boolean(r.error), r.error);
r = run("flue_gas", { m: 1, x: 0, y: 0, s: 0, excess: 0 });
near("[calc] 탄소(C)를 이론 공기로 → 건조 CO₂ = 20.95 %", r.outputs?.co2d, 20.95, 1e-9);
r = run("flue_gas", { m: 7, x: 13, s: 0.05, excess: 20 });
check("황 있으면 SO₂ ppm·황산 이슬점(수증기 이슬점보다 높음)", r.outputs?.so2d > 0 && r.outputs?.Tacid > r.outputs?.Tdew, `${r.outputs?.Tacid - 273.15} / ${r.outputs?.Tdew - 273.15} °C`);
{
  const T = W.calcAcidDewPoint(76 * 133.322387415, 0.0076 * 133.322387415);
  near("[calc] Verhoff–Banchero: p_H₂O 76 mmHg, p_SO₃ 0.0076 mmHg → 1000/(2.276 − 0.0294 ln76 − 0.0858 ln0.0076 + 0.0062 ln76 ln0.0076)", T,
    1000 / (2.276 - 0.0294 * Math.log(76) - 0.0858 * Math.log(0.0076) + 0.0062 * Math.log(76) * Math.log(0.0076)), 1e-9);
}
r = run("flue_gas", { tA: 40 });
check("배가스가 이슬점 아래 → 응축 경고", r.warnings.some(w => /응축/.test(w)));
check("배가스 그래프 있음", Boolean(run("flue_gas").chart));

// ════ 정의·용어·영어 ════
for (const k of KEYS) {
  const d = WE.defs[k];
  const texts = [d.title, d.summary, ...d.formula, ...d.notes, ...d.reference];
  for (const i of d.inputs) texts.push(i.label, i.hint, i.unit, ...(i.options || []).map(o => o.label), ...(i.columns || []).map(c => c.label), ...(i.columns || []).map(c => c.unit));
  for (const o of d.outputs) texts.push(o.label, o.unit);
  const bad = texts.filter(t => t && HANGUL.test(String(t)));
  check(`${k}: en 정의에 한글 없음 (${texts.length}개)`, bad.length === 0, bad.slice(0, 3).join(" | "));
  const terms = [...d.inputs.map(i => i.term), ...d.inputs.flatMap(i => (i.columns || []).map(c => c.term)), ...d.outputs.map(o => o.term)].filter(Boolean);
  const miss = terms.filter(t => !W.TERM_GLOSSARY_KO[t] || !WE.TERM_GLOSSARY_EN[t]);
  check(`${k}: term ${terms.length}개 모두 용어집(ko·en)에`, miss.length === 0, miss.join(", "));
}
check("en 실행: 수치 같음·한글 없음", enIssues.length === 0, enIssues.slice(0, 4).join(" | "));
const longDefs = Object.entries(W.TERM_GLOSSARY_KO).filter(([k, e]) => /^(rx|rw|ec|fg)_/.test(k) && e.def.length > 160).map(([k]) => k)
  .concat(Object.entries(WE.TERM_GLOSSARY_EN).filter(([k, e]) => /^(rx|rw|ec|fg)_/.test(k) && e.def.length > 160).map(([k]) => `${k}(en)`));
check("새 용어 정의 160자 이하", longDefs.length === 0, longDefs.join(", "));
check("CEPCI 값이 자료에 없음(PPI 계열 id 만)", WE.CALC_PPI_SERIES.every(s => /^(WPU|PCU)/.test(s.id)));

const failed = results.filter(x => !x).length;
console.log(`\n${results.length - failed}/${results.length} PASS`);
process.exit(failed ? 1 : 0);

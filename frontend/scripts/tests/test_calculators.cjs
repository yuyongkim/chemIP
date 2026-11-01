// 공학 계산기(public/chemip/calc_*.jsx) 시험 — 화면 없이 정의·엔진·딥링크의 순수 함수만 Node vm 에 올린다.
// 번역은 빌드와 같은 vendored Babel·설정(static_vm_loader.cjs 와 같음). 기준값은 손계산 또는 공개 표값이며,
// 마찰계수는 이 파일 안의 별도 풀이(이분법 Colebrook)와 비교한다.
//
// 화면 언어: 같은 모듈을 ko·en 두 벌로 올린다(lang.jsx 의 ?lang=). 기준값 시험은 ko 로 하고, 같은 사례를 en 으로도 돌려
// 수치가 같은지·en 문구(경고·오류·판정)에 한글이 없는지 본다. 정의·용어집·공용 문구의 영어 빠짐도 여기서 잡는다.
//
//   node frontend/scripts/tests/test_calculators.cjs
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const CHEMIP = path.join(__dirname, "..", "..", "public", "chemip");
const BABEL_OPTIONS = {
  presets: ["react", "env"],
  plugins: ["transform-class-properties", "transform-object-rest-spread", "transform-flow-strip-types"],
  targets: { browsers: undefined },
  compact: false,
  comments: false,
};
// index.html 순서 가운데 React 가 없는 계산기 모듈(화면 컴포넌트 calc_view·form·field… 는 빼고)
const PURE = /^calc_(?!view|nav|form|field|table_field|table_out|results|notes|unit_select|substance_link|out_table|chart(?!_scale))[a-z0-9_]+\.jsx$/;   // calc_chart*.jsx 는 화면(그래프), calc_chart_scale 은 순수
// 화면 언어(lang.jsx)와 용어 설명 자료(React 없음) — term key·영어 점검용
const PURE_EXTRA = ["lang.jsx", "term_glossary.jsx", "term_glossary_en.jsx", "apl_terms.jsx"];   // apl_terms: 적용 법규 판정기 화면이 쓰는 용어 key(APL_TERM_KEYS)
const babel = require(path.join(CHEMIP, "vendor", "babel.min.js"));

function loadCalcModules(lang = "ko") {
  const html = fs.readFileSync(path.join(CHEMIP, "index.html"), "utf8");
  const files = [...html.matchAll(/<script type="text\/babel" src="([^"?]+)/g)].map(m => m[1]).filter(f => PURE.test(f) || PURE_EXTRA.includes(f));
  const sandbox = { console, URLSearchParams, location: { search: `?lang=${lang}` } };
  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);
  for (const rel of files) {
    const code = babel.transform(fs.readFileSync(path.join(CHEMIP, rel), "utf8"), { ...BABEL_OPTIONS, filename: rel }).code;
    vm.runInContext(code, ctx, { filename: rel });
  }
  return { win: sandbox, files };
}

const { win: W, files } = loadCalcModules("ko");
const { win: WE } = loadCalcModules("en");
const HANGUL = /[가-힣ㄱ-ㆎ]/;
const enIssues = {};          // 계산기 key → en 문제(한글 남음·수치 다름)
const enCases = {};           // 계산기 key → en 으로도 돌린 사례 수
function enIssue(key, msg) { (enIssues[key] = enIssues[key] || []).push(msg); }
const results = [];
const covered = new Set();
function check(name, ok, note = "") {
  results.push(Boolean(ok));
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${note ? ` — ${note}` : ""}`);
}
function rel(a, b) { return Math.abs(a - b) / Math.abs(b); }
function near(name, got, want, tol, unit = "") {
  check(name, Number.isFinite(got) && rel(got, want) <= tol, `${got} vs ${want}${unit ? " " + unit : ""} (허용 ${tol * 100}%)`);
}

// 계산기 하나를 화면과 같은 길로 돌린다: 기본 상태 → 덮어쓸 칸(show 단위 글자) → calcEvaluate
function runIn(win, key, overrides, tables) {
  const def = win.calcFind(key);
  const state = W.calcInitialState(def, {});
  for (const [k, v] of Object.entries(overrides)) {
    const input = def.inputs.find(i => i.key === k);
    if (!input) throw new Error(`${key}: 칸 없음 ${k}`);
    if (input.type === "choice") state[k] = v;
    else if (typeof v === "object") state[k] = { raw: String(v.raw), unit: v.unit };
    else state[k] = { ...state[k], raw: String(v) };
  }
  for (const [k, rows] of Object.entries(tables)) state[k] = rows.map(r => Object.fromEntries(Object.entries(r).map(([c, x]) => [c, String(x)])));
  return win.calcEvaluate(def, state);
}

// en 결과가 ko 결과와 수치·모양이 같고, en 문구에 한글이 없는지
function compareEn(key, ko, en) {
  enCases[key] = (enCases[key] || 0) + 1;
  const texts = [en.error, ...Object.values(en.errors || {}), ...(en.warnings || [])];
  if (Boolean(ko.error) !== Boolean(en.error)) enIssue(key, `계산 오류 유무 다름: ${ko.error} / ${en.error}`);
  if (Object.keys(ko.errors || {}).join() !== Object.keys(en.errors || {}).join()) enIssue(key, "칸 오류 key 다름");
  if ((ko.warnings || []).length !== (en.warnings || []).length) enIssue(key, "경고 개수 다름");
  if (Boolean(ko.outputs) !== Boolean(en.outputs)) enIssue(key, "결과 유무 다름");
  for (const [k, v] of Object.entries(ko.outputs || {})) {
    const e = en.outputs?.[k];
    if (v && typeof v === "object") {   // 결과 표(type "table"): 수는 같고, 글자 칸·열 이름은 en 으로 본다
      const nums = (x) => (typeof x === "number" ? [x] : x && typeof x === "object" ? Object.values(x).flatMap(nums) : []);
      const strs = (x) => (typeof x === "string" ? [x] : x && typeof x === "object" ? Object.values(x).flatMap(strs) : []);
      if (JSON.stringify(nums(v)) !== JSON.stringify(nums(e))) enIssue(key, `출력 표 ${k} 수치 다름`);
      texts.push(...strs(e));
      continue;
    }
    if (typeof v === "number" ? !Object.is(v, e) : typeof e !== "string") enIssue(key, `출력 ${k} 다름: ${v} / ${e}`);
    if (typeof e === "string") texts.push(e);
  }
  texts.filter(t => t && HANGUL.test(t)).forEach(t => enIssue(key, `en 문구에 한글: ${t}`));
}

function run(key, overrides = {}, tables = {}) {
  covered.add(key);
  const ko = runIn(W, key, overrides, tables);
  compareEn(key, ko, runIn(WE, key, overrides, tables));
  return ko;
}

// ── 단위 환산 ──
near("1 atm = 760 mmHg (관례 mmHg 133.322387 Pa 라 759.9999)", W.calcConvert("pressure", 1, "atm", "mmHg"), 760, 1e-6);
near("1 psi = 6.894757 kPa", W.calcConvert("pressure", 1, "psi", "kPa"), 6.894757, 1e-6);
near("0 °F = 255.372 K", W.calcConvert("temperature", 0, "F", "K"), 255.3722222, 1e-9);
near("100 °C = 212 °F", W.calcConvert("temperature", 100, "C", "F"), 212, 1e-12);
near("1000 cfm = 28.3168 m³/min", W.calcConvert("flow", 1000, "cfm", "m3min"), 28.316846592, 1e-12);
near("1 hp = 0.7457 kW", W.calcConvert("power", 1, "hp", "kW"), 0.74569987, 1e-8);

// ── 1. ppm ↔ mg/m³ ── NIOSH Pocket Guide 환산: 벤젠 1 ppm = 3.19 mg/m³, 톨루엔 1 ppm = 3.77 mg/m³
let r = run("ppm_mgm3", { mw: 78.11 });
near("벤젠 1 ppm → 3.19 mg/m³ (NIOSH NPG)", r.outputs?.mgm3_out, 3.19, 0.002);
r = run("ppm_mgm3", { mw: 92.14 });
near("톨루엔 1 ppm → 3.77 mg/m³ (NIOSH NPG)", r.outputs?.mgm3_out, 3.77, 0.002);
r = run("ppm_mgm3", { dir: "mg2ppm", mgm3: 100, mw: 92.14 });
near("톨루엔 100 mg/m³ → 26.54 ppm (= 100×24.45/92.14)", r.outputs?.ppm_out, 100 * 24.45 / 92.14, 1e-9);
r = run("ppm_mgm3", { mw: 78.11, basis: "tp" });
near("T·P 기준(25 °C, 1 atm) Vm = 24.465 L/mol", r.outputs?.vm, 0.0820573661 * 298.15, 1e-6);
r = run("ppm_mgm3", { mw: 78.11, basis: "tp", T: 0 });
near("0 °C 이면 Vm = 22.414 L/mol", r.outputs?.vm, 22.41396954, 1e-6);
r = run("ppm_mgm3", { mw: -5 });
check("분자량 음수 → 칸 오류", r.outputs === null && /0 g\/mol보다 커야/.test(r.errors.mw || ""), r.errors.mw);
r = run("ppm_mgm3", { mw: "abc" });
check("숫자 아님 → 칸 오류", r.outputs === null && r.errors.mw === W.CALC_LABELS.errors.notNumber);
r = run("ppm_mgm3", { mw: "" });
check("빈칸 → 값을 넣으십시오", r.errors.mw === W.CALC_LABELS.errors.required);
r = run("ppm_mgm3", { basis: "tp", T: -300 });
check("−300 °C → 0 K 보다 커야", /0 K보다/.test(r.errors.T || ""), r.errors.T);

// ── 2. 혼합물 노출지수 ── 500/1000 + 45/200 + 40/200 = 0.925
r = run("mix_exposure");
near("노출지수 E = 0.925", r.outputs?.E, 0.925, 1e-12);
check("E ≤ 1 → 이내", /이내/.test(r.outputs?.verdict || ""));
r = run("mix_exposure", {}, { rows: [{ name: "A", C: 60, TLV: 100 }, { name: "B", C: 30, TLV: 50 }] });
near("0.6 + 0.6 = 1.2", r.outputs?.E, 1.2, 1e-12);
check("E > 1 → 초과", /초과/.test(r.outputs?.verdict || ""));
r = run("mix_exposure", {}, { rows: [{ name: "A", C: 1, TLV: 0 }] });
check("노출기준 0 → 셀 오류", r.outputs === null && Object.keys(r.errors).some(k => k.startsWith("rows.0.TLV")));
r = run("mix_exposure", {}, { rows: [{ name: "", C: "", TLV: "" }] });
check("값 있는 행 없음 → 행 개수 오류", r.outputs === null && Boolean(r.errors.rows));

// ── 3. 혼합 LFL/UFL (Le Chatelier) ── 손계산: x = 0.5, 0.25, 0.25
r = run("mix_lfl");
near("LFL_mix = 1/(0.5/5 + 0.25/3 + 0.25/2.1) = 3.3071", r.outputs?.lfl, 1 / (0.5 / 5 + 0.25 / 3 + 0.25 / 2.1), 1e-12);
near("UFL_mix = 1/(0.5/15 + 0.25/12.4 + 0.25/9.5) = 12.530", r.outputs?.ufl, 1 / (0.5 / 15 + 0.25 / 12.4 + 0.25 / 9.5), 1e-12);
near("LFL_mix 숫자 3.3071", r.outputs?.lfl, 3.30709, 1e-5);
check("합계 2 vol% < LFL → 하한 미만", /하한 미만/.test(r.outputs?.verdict || ""), r.outputs?.verdict);
r = run("mix_lfl", {}, { rows: [{ name: "단일", y: 7, LFL: 5, UFL: 15 }] });
near("단일 성분이면 LFL 그대로", r.outputs?.lfl, 5, 1e-12);
check("7 vol% → 연소 범위 안", r.outputs?.verdict === "연소 범위 안");
r = run("mix_lfl", {}, { rows: [{ name: "a", y: 1, LFL: 5, UFL: "" }, { name: "b", y: 1, LFL: 2, UFL: 10 }] });
check("UFL 하나 비면 UFL 없음, LFL 은 계산", r.outputs && r.outputs.ufl === undefined && Math.abs(r.outputs.lfl - 1 / (0.5 / 5 + 0.5 / 2)) < 1e-12);

// ── 4. 희석 환기 ── ACGIH 야드파운드 식 Q[cfm] = 403e6·SG·ER·K/(M·C) (21.1 °C)와 비교.
// G = 1 kg/h 액체가 증발 → SG·ER[pint/min] = (1000/60 g/min) / (473.176473 g/pint 물) — SG 는 약분된다.
r = run("ventilation", { G: 1, C: 50, mw: 92.14, K: 3, T: { raw: 70, unit: "F" }, P: 1 });
const qAcgih = 403e6 * (1000 / 60 / 473.176473) * 3 / (92.14 * 50);
near("Q = ACGIH 403 식(70 °F) 과 일치", W.calcConvert("flow", r.outputs?.Q, "m3s", "cfm"), qAcgih, 0.005, "cfm");
r = run("ventilation", { G: 1, C: 50, mw: 92.14, K: 3, V: 500 });
const cmg25 = 50 * 92.14 / (W.CALC_CONST.R * 298.15 / 101325 * 1000);
near("25 °C: Q = G·K/C 손계산", r.outputs?.Q, (1e6 / 3600) * 3 / cmg25, 1e-12, "m³/s");
near("시간당 환기 횟수 = 3600·Q/V", r.outputs?.ach, (1e6 / 3600) * 3 / cmg25 * 3600 / 500, 1e-12);
r = run("ventilation", { K: 0.5 });
check("K < 1 → 칸 오류", Boolean(r.errors.K), r.errors.K);

// ── 5. 이상기체 ── 0 °C, 101.325 kPa, 1 mol → 22.41397 L (CODATA 표준 몰부피)
r = run("ideal_gas");
near("V = 22.41397 L", W.calcConvert("volume", r.outputs?.V_out, "m3", "L"), 22.41396954, 1e-8);
r = run("ideal_gas", { solve: "T", V: 24.465, P: 101.325, n: 1 });
near("T = 298.15 K (24.465 L)", r.outputs?.T_out, 24.465e-3 * 101325 / 8.314462618, 1e-12);
r = run("ideal_gas", { solve: "P", V: 10, n: 2, T: 25 });
near("P = nRT/V = 495.8 kPa", r.outputs?.P_out, 2 * 8.314462618 * 298.15 / 0.01, 1e-12);
r = run("ideal_gas", { solve: "n", V: 1000, P: 101.325, T: 25 });
near("n = PV/RT = 40.87 mol (1 m³)", r.outputs?.n_out, 101325 / (8.314462618 * 298.15), 1e-12);

// ── 6. 희석 ── 12 M 원액으로 1 M 500 mL → 41.67 mL, 용매 458.33 mL
r = run("dilution");
near("V₁ = 41.667 mL", W.calcConvert("volume", r.outputs?.V1_out, "m3", "mL"), 500 / 12, 1e-12);
near("더할 용매 = 458.33 mL", W.calcConvert("volume", r.outputs?.add, "m3", "mL"), 500 - 500 / 12, 1e-12);
r = run("dilution", { solve: "C2", C1: 12, V1: 10, V2: 500 });
near("C₂ = 0.24", r.outputs?.C2_out, 0.24, 1e-12);
r = run("dilution", { solve: "C2", C1: 1, V1: 500, V2: 100 });
check("V₂ < V₁ → 경고(농도 상승)", r.warnings.length === 1 && r.outputs.add === undefined);

// ── 7. 몰농도 ↔ 질량 % ── 진한 염산 37 %, 1.19 g/mL → 12.08 M; 진한 황산 98 %, 1.84 → 18.39 M
r = run("concentration");
near("HCl 37 % → 12.08 M", r.outputs?.M_out, 10 * 37 * 1.19 / 36.46, 1e-12);
near("HCl 37 % 몰랄농도 16.11 mol/kg", r.outputs?.b, 37000 / (36.46 * 63), 1e-12);
r = run("concentration", { w: 98, rho: 1.84, mw: 98.08 });
near("H₂SO₄ 98 % → 18.39 M", r.outputs?.M_out, 18.39, 0.001);
r = run("concentration", { dir: "M2w", M: 12.0768, rho: 1.19, mw: 36.46 });
near("되돌리기 12.0768 M → 37 %", r.outputs?.w_out, 37, 1e-4);
r = run("concentration", { dir: "M2w", M: 40, rho: 1.0, mw: 36.46 });
check("질량 % ≥ 100 → 계산 오류", Boolean(r.error), r.error);

// ── 8. Antoine ── 기본 상수(물) vs IAPWS-IF97 포화압력: 25 °C 3.1699 kPa, 100 °C 101.418 kPa
r = run("antoine");
near("100 °C → 101.418 kPa (IAPWS-IF97) ±0.2 %", r.outputs?.P_out, 101418, 0.002, "Pa");
r = run("antoine", { T: 25 });
near("25 °C → 3.1699 kPa (IAPWS-IF97) ±0.5 %", r.outputs?.P_out, 3169.9, 0.005, "Pa");
near("25 °C 손계산 10^(A − B/(C+T)) mmHg", W.calcConvert("pressure", r.outputs?.P_out, "Pa", "mmHg"), Math.pow(10, 8.07131 - 1730.63 / 258.426), 1e-12);
r = run("antoine", { mode: "T", P: 101.325 });
check("1 atm → 끓는점 100.00 °C ±0.05", Math.abs(r.outputs?.T_out - 373.15) < 0.05, `${r.outputs?.T_out} K`);
r = run("antoine", { base: "ln", A: 8.07131 * Math.LN10, B: 1730.63 * Math.LN10, T: 60 });
near("ln 형식 상수(×ln10)도 같은 값", W.calcConvert("pressure", r.outputs?.P_out, "Pa", "mmHg"), Math.pow(10, 8.07131 - 1730.63 / 293.426), 1e-12);
// NIST 형식(log10, bar, K): 같은 물 상수를 K·bar 로 바꾼 값과 같아야 한다
r = run("antoine", { pu: "bar", tu: "K", A: 8.07131 + Math.log10(133.322387415 / 1e5), C: 233.426 - 273.15, T: 60 });
near("NIST 형식(bar, K) 변환 상수도 같은 값", W.calcConvert("pressure", r.outputs?.P_out, "Pa", "mmHg"), Math.pow(10, 8.07131 - 1730.63 / 293.426), 1e-9);
r = run("antoine", { tu: "K", C: -300, T: 0 });   // C + T = −300 + 273.15 < 0
check("C + T ≤ 0 → 계산 오류", Boolean(r.error), r.error);

// ── 9. Reynolds ── 998.2 × 1 × 0.05 / 0.001002 = 49 810
r = run("reynolds");
near("Re = 49 810", r.outputs?.Re, 998.2 * 0.05 / 0.001002, 1e-12);
check("난류 판정", r.outputs?.regime === "난류");
r = run("reynolds", { v: 0.01 });
check("Re = 498 → 층류", r.outputs?.regime === "층류");
r = run("reynolds", { v: 0.06 });
check("Re = 2989 → 천이", r.outputs?.regime === "천이 영역");

// ── 10. 배관 압력손실 ── 마찰계수: 이 파일의 이분법 Colebrook 과 비교
function colebrookBisect(Re, rr) {
  const g = (f) => 1 / Math.sqrt(f) + 2 * Math.log10(rr / 3.7 + 2.51 / (Re * Math.sqrt(f)));
  let lo = 1e-4, hi = 1;
  for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2; if (g(lo) * g(mid) <= 0) hi = mid; else lo = mid; }
  return (lo + hi) / 2;
}
near("Colebrook(Re 1e5, ε/D 1e-4) = 이분법 값", W.calcFrictionColebrook(1e5, 1e-4), colebrookBisect(1e5, 1e-4), 1e-9);
near("Colebrook(Re 1e5, ε/D 1e-4) ≈ 0.0185 (Moody 선도)", W.calcFrictionColebrook(1e5, 1e-4), 0.0185, 0.01);
near("Colebrook 매끈한 관(Re 1e5, ε=0) ≈ 0.0180", W.calcFrictionColebrook(1e5, 0), 0.0180, 0.01);
let worst = 0;
for (const Re of [5e3, 1e4, 1e5, 1e6, 1e7, 1e8]) for (const rr of [1e-6, 1e-5, 1e-4, 1e-3, 1e-2]) {
  worst = Math.max(worst, rel(W.calcFrictionSwameeJain(Re, rr), colebrookBisect(Re, rr)));
}
check("Swamee–Jain vs Colebrook 적용 범위 30점 최대 차 ≤ 3 %", worst <= 0.03, `최대 ${(worst * 100).toFixed(2)} %`);
check("Swamee–Jain vs Colebrook (Re 1e5, ε/D 1e-4) ≤ 1 %", rel(W.calcFrictionSwameeJain(1e5, 1e-4), colebrookBisect(1e5, 1e-4)) <= 0.01);
r = run("pipe_dp");
{
  const v = (50 / 3600) / (Math.PI * 0.1 * 0.1 / 4);
  const Re = 998.2 * v * 0.1 / 0.001002;
  const f = colebrookBisect(Re, 0.046e-3 / 0.1);
  const dp = f * (100 / 0.1) * 998.2 * v * v / 2;
  near("물 50 m³/h, DN100, 100 m: ΔP 손계산", r.outputs?.dp, dp, 1e-6, "Pa");
  near("손실 수두 h_f = ΔP/(ρg)", r.outputs?.hf, dp / (998.2 * 9.80665), 1e-6, "m");
  near("유속 1.768 m/s", r.outputs?.vel, v, 1e-12);
}
r = run("pipe_dp", { mode: "vel", v: 0.5, D: 50, L: 100, rho: 1260, mu: { raw: 1, unit: "Pas" } });
near("층류: ΔP = 32 μ L v / D² (Hagen–Poiseuille) = 640 kPa", r.outputs?.dp, 32 * 1 * 100 * 0.5 / (0.05 * 0.05), 1e-12, "Pa");
r = run("pipe_dp", { mode: "vel", v: 0.06, D: 50 });
check("천이 영역 → 경고", r.warnings.some(w => /천이/.test(w)));
r = run("pipe_dp", { method: "swamee", mode: "vel", v: 0.08, D: 50 });
check("Swamee–Jain 범위 밖(Re < 5000) → 경고", r.warnings.some(w => /Swamee/.test(w)));

// ── 11. 펌프 동력 ── 0.01 m³/s, 30 m, 1000 kg/m³ → 2.942 kW, η 70 % → 4.203 kW
r = run("pump_power");
near("수동력 2.942 kW", r.outputs?.Ph, 1000 * 9.80665 * 0.01 * 30, 1e-12, "W");
near("축동력 4.203 kW", r.outputs?.Ps, 1000 * 9.80665 * 0.01 * 30 / 0.7, 1e-12, "W");
r = run("pump_power", { eta: 120 });
check("효율 120 % → 칸 오류", Boolean(r.errors.eta));

// ── 12. 현열 열량 ── 1000 kg/h 물 20 → 80 °C: 69.67 kW
r = run("heat_duty");
near("Q = 69.67 kW", r.outputs?.Q, (1000 / 3600) * 4180 * 60, 1e-12, "W");
r = run("heat_duty", { Tin: { raw: 176, unit: "F" }, Tout: { raw: 68, unit: "F" } });
near("°F 입력: 176 → 68 °F = 80 → 20 °C, ΔT = −60 K", r.outputs?.dT, -60, 1e-9);
check("냉각 판정", /냉각/.test(r.outputs?.dir || ""));

// ── 13. LMTD ──
r = run("lmtd", { Thi: 100, Tho: 60, Tci: 20, Tco: 60 });
near("대칭(ΔT₁ = ΔT₂ = 40) → LMTD = 40", r.outputs?.lmtd, 40, 1e-12);
r = run("lmtd");
near("향류 150→90 / 30→70: (80−60)/ln(80/60) = 69.52", r.outputs?.lmtd, 20 / Math.log(80 / 60), 1e-12);
r = run("lmtd", { flow: "parallel" });
near("병류 같은 온도: (120−20)/ln 6 = 55.81", r.outputs?.lmtd, 100 / Math.log(6), 1e-12);
r = run("lmtd", { mode: "Q" });
near("Q = U·A·LMTD = 347.6 kW", r.outputs?.Q, 500 * 10 * 20 / Math.log(80 / 60), 1e-12, "W");
r = run("lmtd", { mode: "A" });
near("A = Q/(U·LMTD) = 8.631 m²", r.outputs?.A_out, 300000 / (500 * 20 / Math.log(80 / 60)), 1e-12, "m²");
r = run("lmtd", { flow: "parallel", Thi: 100, Tho: 60, Tci: 20, Tco: 70 });
check("병류 온도 교차 → 계산 오류", Boolean(r.error), r.error);
near("거의 같은 ΔT 극한(40, 40.0000001) 안정", W.calcLmtd(40, 40.0000001), 40.00000005, 1e-9);

// ════ v2 추가 계산기 (docs/calculators/CALC_BENCHMARK_v2.md) ════
const explicit = new Set();   // 아래에서 기준값으로 시험한 계산기(기본값 돌리기만 한 것은 빼고)
function runX(key, o, t) { explicit.add(key); return run(key, o, t); }

// ── 14. 8시간 TWA ── OSHA 1910.1000(d)(1)(ii): (2×150 + 2×75 + 4×50) ÷ 8 = 81.25 ppm < 100
r = runX("twa8h");
near("OSHA 예시 TWA = 81.25 ppm", r.outputs?.E, 81.25, 1e-12);
check("81.25 < 100 → 이내", /이내/.test(r.outputs?.verdict || ""), r.outputs?.verdict);
near("TWA ÷ 노출기준 = 0.8125", r.outputs?.ratio, 0.8125, 1e-12);
near("Brief & Scala 12 h → RF = 0.5", W.calcBriefScala(12), 0.5, 1e-12);
near("Brief & Scala 10 h → RF = 0.7", W.calcBriefScala(10), 0.7, 1e-12);
r = runX("twa8h", { shift: 12, oel: 100 }, { rows: [{ C: 60, T: 12 }] });
near("12 h 근무: 보정 노출기준 = 50", r.outputs?.oelAdj, 50, 1e-12);
check("12 h × 60 ppm > 보정 50 → 초과", /초과/.test(r.outputs?.verdict || ""), r.outputs?.verdict);
r = runX("twa8h", {}, { rows: [{ C: 10, T: 20 }, { C: 10, T: 5 }] });
check("시간 합계 25 h → 계산 오류", Boolean(r.error), r.error);
r = runX("twa8h", {}, { rows: [{ C: 100, T: 4 }] });
near("4 h 만 측정 → 50 (나머지 0 가정) + 경고", r.outputs?.E, 50, 1e-12);
check("8 h 미만 경고", r.warnings.some(w => /8 h 보다 짧/.test(w)));

// ── 15. 이론 공기량·Cst ── Crowl & Louvar 예제 6-4 헥산: Cst 2.16, LFL 1.19, UFL 7.56 (식 6-11 의 4.773 = 1/0.2095)
r = runX("stoich_air");
near("헥산 Cst = 2.16 vol%", r.outputs?.cst, 2.16, 0.002);
near("헥산 LFL 추정 1.19 (실측 1.1–1.2)", r.outputs?.lflEst, 1.19, 0.003);
near("헥산 UFL 추정 7.56 (실측 7.5)", r.outputs?.uflEst, 7.56, 0.002);
near("Cst = 100/(4.773m + 1.19x − 2.38y + 1) 꼴과 일치", r.outputs?.cst, 100 / (1 / 0.2095 * 6 + 14 / 4 / 0.2095 + 1), 1e-12);
near("헥산 z = 9.5", r.outputs?.z, 9.5, 1e-12);
r = runX("stoich_air", { m: 1, x: 4, y: 0 });
near("메탄 질량 공연비 ≈ 17.2 (Turns: 17.1–17.2)", r.outputs?.afr, 17.2, 0.01);
near("메탄 Cst = 9.48 vol% (100/(1+2/0.2095))", r.outputs?.cst, 100 / (1 + 2 / 0.2095), 1e-12);
near("메탄 배기 CO₂(건조, 이론공기) = 1/(1+7.547) = 11.70 %", r.outputs?.co2, 100 / (1 + 2 / 0.2095 * 0.7905), 1e-12);
r = runX("stoich_air", { m: 4, x: 10, y: 0, lfl: 1.8 });
near("부탄 LOC = z·LFL = 6.5 × 1.8 = 11.7 % O₂", r.outputs?.loc, 11.7, 1e-12);
r = runX("stoich_air", { m: 0, x: 0, y: 2 });
check("C·H 없음 → 계산 오류", Boolean(r.error));

// ── 16. 웅덩이 증발 ── Crowl & Louvar 식 3-12·3-14 손계산(톨루엔 25 °C, 1 m², P_sat 3.79 kPa)
r = runX("evaporation");
{
  const K = 0.83e-2 * Math.cbrt(18.015 / 92.14);
  near("K = 0.83 (18/92.14)^⅓ = 0.4818 cm/s", r.outputs?.K, K * 100, 1e-12);
  near("Q_m = M K A P_sat / (R T)", r.outputs?.Qm, 0.09214 * K * 1 * 3790 / (8.314462618 * 298.15), 1e-12, "kg/s");
  check("환기량 없으면 농도 숨김", r.outputs?.Cppm === undefined);
  r = runX("evaporation", { Qv: 100, Km: 3 });
  const qm = 0.09214 * K * 3790 / (8.314462618 * 298.15);
  const cmg = qm * 1e6 * 3 / (100 / 60);
  near("실내 C = K_mix Q_m / Q_v (mg/m³)", r.outputs?.Cmg, cmg, 1e-12);
  near("ppm = C·RT/(PM)", r.outputs?.Cppm, cmg * (8.314462618 * 298.15 / 101325 * 1000) / 92.14, 1e-12);
  // Crowl 식 3-15 형태 C_ppm = K A P_sat 10⁶ / (k Q_v P), k = 1/K_mix
  near("Crowl 식 3-15 와 같음", r.outputs?.Cppm, K * 1 * 3790 * 1e6 / ((1 / 3) * (100 / 60) * 101325), 1e-9);
}

// ── 17. 가우스 플룸 ── Briggs 개활지 D, x = 3 km: σy = 0.08·3000/√1.3, σz = 0.06·3000/√5.5; 지상 축 C = Q/(π σy σz u)
r = runX("gaussian_plume");
{
  const sy = 240 / Math.sqrt(1.3), sz = 180 / Math.sqrt(5.5);
  near("σy(D, 3 km) = 210.5 m", r.outputs?.sy, sy, 1e-12);
  near("σz(D, 3 km) = 76.75 m", r.outputs?.sz, sz, 1e-12);
  near("지상 누출 지면 축 C = Q/(π σy σz u) = 8.44×10⁻³ mg/m³", r.outputs?.C, 3e-3 / (Math.PI * sy * sz * 7) * 1e6, 1e-12);
  near("C 숫자 8.44e-3 mg/m³", r.outputs?.C, 8.44e-3, 0.002);
}
near("σy(A, 1 km) = 0.22·1000/√1.1 = 209.8 m", W.CALC_BRIGGS_RURAL.A.y(1000), 220 / Math.sqrt(1.1), 1e-12);
near("σz(F, 1 km) = 16/1.3 = 12.31 m", W.CALC_BRIGGS_RURAL.F.z(1000), 16 / 1.3, 1e-12);
near("σz(E, 1 km) = 30/1.3 = 23.08 m", W.CALC_BRIGGS_RURAL.E.z(1000), 30 / 1.3, 1e-12);
near("σz(C, 1 km) = 80/√1.2", W.CALC_BRIGGS_RURAL.C.z(1000), 80 / Math.sqrt(1.2), 1e-12);
r = runX("gaussian_plume", { H: 50, z: 0, y: 100, cls: "B", x: 500 });
{
  const sy = 0.16 * 500 / Math.sqrt(1.05), sz = 0.12 * 500;
  const c = 3e-3 / (Math.PI * sy * sz * 7) * Math.exp(-1e4 / (2 * sy * sy)) * Math.exp(-2500 / (2 * sz * sz)) * 1e6;
  near("높이 50 m 누출, y = 100 m: 반사 항 포함 손계산", r.outputs?.C, c, 1e-12);
}
r = runX("gaussian_plume", { mw: 46.01 });
near("ppm = mg/m³ × 24.45 / M", r.outputs?.ppm, r.outputs?.C * 24.45 / 46.01, 1e-12);
r = runX("gaussian_plume", { x: 50 });
check("x < 100 m → 범위 경고", r.warnings.some(w => /100 m/.test(w)));

// ── 18. 안전밸브 API 520 ── python fluids 문서(API 520 예제) 값과 비교
r = runX("relief_valve");
near("기체 임계: A = 3 699.05 mm² (fluids API520_A_g 0.0036990460647 m²)", r.outputs?.A, 0.0036990460646834414, 1e-6, "m²");
check("임계 흐름 판정", /임계\(초크\)/.test(r.outputs?.flow || ""));
check("API 526 글자 = P (6.38 in² = 4 116 mm²)", /^P /.test(r.outputs?.letter || ""), r.outputs?.letter);
r = runX("relief_valve", { P2: 532 });
near("기체 아임계(P₂ 532 kPa): A = 4 248.36 mm² (fluids 0.004248358776)", r.outputs?.A, 0.004248358775943481, 1e-6, "m²");
check("아임계 판정 + 경고", /아임계/.test(r.outputs?.flow || "") && r.warnings.length === 1);
near("C(k = 1.35) = 0.026694 (fluids API520_C)", W.calcApi520C(1.35), 0.02669419967057233, 1e-6);
{
  const P1 = 1.1 * 1724 + 101.325, P2 = 0.2 * 1724 + 101.325;
  r = runX("relief_valve", { fluid: "liquid", Q: 6814, G: 0.9, P1, P2, Kw: 0.97 });
  near("액체: A = 3 066.1 mm² (fluids API520_A_l 0.0030661356 m²)", r.outputs?.A, 0.0030661356203, 1e-3, "m²");
}
check("API 526: 0.5 in² → G", /^G /.test(W.calcApi526Letter(0.5 * 645.16)));
check("API 526: 30 in² → T 초과 안내", /T 보다 큼/.test(W.calcApi526Letter(30 * 645.16)));
r = runX("relief_valve", { P2: 700 });
check("배압 ≥ 방출 압력 → 계산 오류", Boolean(r.error));

// ── 19. 압축인자 Pitzer ── SVNA n-부탄 510 K, 25 bar: Z = 0.879
r = runX("compressibility");
near("n-부탄 Z = 0.879 (SVNA 예제)", r.outputs?.Z, 0.879, 0.001);
near("B⁰ = −0.232", r.outputs?.B0, -0.232, 0.003);
near("B¹ = 0.059", r.outputs?.B1, 0.059, 0.01);
near("V = ZRT/P ≈ 1.49 L/mol (SVNA 1 489–1 491 cm³/mol)", W.calcConvert("volume", r.outputs?.Vm, "m3", "L"), 1.490, 0.002);
near("ρ = PM/(ZRT) = 39.0 kg/m³", r.outputs?.rho, 25e5 * 0.058123 / (r.outputs?.Z * 8.314462618 * 510), 1e-12);
check("기본 조건은 경고 없음", r.warnings.length === 0);
r = runX("compressibility", { P: 80 });
check("P_r 2.1 → 범위 경고", r.warnings.length > 0);

// ── 20. 완충 pH ── 같은 농도면 pH = pKa; 0.1 M 아세트산 + 0.05 M 아세트산나트륨 → 4.76 + log 0.5 = 4.459
r = runX("buffer_ph");
near("[A⁻] = [HA] → pH = pKa = 4.76", r.outputs?.pH, 4.76, 1e-12);
r = runX("buffer_ph", { A: 0.05, HA: 0.1 });
near("pH = 4.76 + log₁₀ 0.5 = 4.459", r.outputs?.pH, 4.76 + Math.log10(0.5), 1e-12);
r = runX("buffer_ph", { mode: "ratio", target: 5, total: 0.1 });
near("pH 5 → 비 10^0.24 = 1.738", r.outputs?.ratio, Math.pow(10, 0.24), 1e-12);
near("[A⁻] = 0.1 × 1.738/2.738 = 0.06348 M", r.outputs?.Aout, 0.1 * Math.pow(10, 0.24) / (1 + Math.pow(10, 0.24)), 1e-12);
r = runX("buffer_ph", { A: 0.2, HA: 0.01 });
check("비 20 → 완충 범위 경고", r.warnings.some(w => /0.1–10/.test(w)));

// ── 21. 물 포화 (IAPWS-IF97 검증표 35·36) ──
near("IF97: 300 K → 3.53658941 kPa", W.calcWaterPsat(300), 3.53658941e3, 1e-8, "Pa");
near("IF97: 500 K → 2.63889776 MPa", W.calcWaterPsat(500), 2.63889776e6, 1e-8, "Pa");
near("IF97: 600 K → 12.3443146 MPa", W.calcWaterPsat(600), 12.3443146e6, 1e-8, "Pa");
near("IF97: 0.1 MPa → 372.755919 K", W.calcWaterTsat(0.1e6), 372.755919, 1e-8, "K");
near("IF97: 1 MPa → 453.035632 K", W.calcWaterTsat(1e6), 453.035632, 1e-8, "K");
near("IF97: 10 MPa → 584.149488 K", W.calcWaterTsat(10e6), 584.149488, 1e-8, "K");
r = runX("water_sat");
near("100 °C → 101.418 kPa", r.outputs?.Psat, 101418, 1e-4, "Pa");
r = runX("water_sat", { mode: "T", P: 101.325 });
near("1 atm → 99.974 °C (IF97)", W.calcConvert("temperature", r.outputs?.Tsat, "K", "C"), 99.974, 1e-4);
r = runX("water_sat", { T: 400 });
check("400 °C(임계 온도 위) → 칸 오류", Boolean(r.errors.T), r.errors.T);

// ── 21b. 증기표 (IAPWS-IF97 전체) ── 검증표 전부는 test_steam.cjs. 여기서는 화면 길(단위 글자)로: 1 MPa·300 °C 표 5 계열 값
r = runX("steam");
near("1 MPa·300 °C h = 3051.70 kJ/kg (Çengel 표 A-6 3051.6)", r.outputs?.h / 1e3, 3051.7, 1e-4);
check("1 MPa·300 °C → 영역 2, 과열 증기", r.outputs?.region === "2" && /과열/.test(r.outputs?.phase || ""), r.outputs?.phase);
r = runX("steam", { mode: "Tx", T: 100, x: 0.5 });
near("100 °C·x 0.5 → p = 101.418 kPa", r.outputs?.p, 101418, 1e-4, "Pa");
check("습증기 → cp 없음, h_fg 있음", r.outputs && r.outputs.cp === undefined && r.outputs.hfg > 2.2e6);
r = runX("steam", { mode: "ph", p: 3, h: 500 });
near("3 MPa·500 kJ/kg → 391.80 K (IF97 표 7, 25 mK)", r.outputs?.T, 391.798509, 1e-4, "K");
r = runX("steam", { mode: "ps", p: 20, s: 5 });
check("20 MPa·5 kJ/(kg·K) → 3영역", r.outputs?.region === "3", r.outputs?.region);
r = runX("steam", { mode: "pT", p: { raw: 22, unit: "MPa" }, T: 373 });
check("임계점 부근 → 경고", r.outputs && r.warnings.length === 1);
r = runX("steam", { mode: "ph", h: -100 });
check("h 가 범위 아래 → 계산 오류", Boolean(r.error), r.error);
r = runX("steam_table");
check("포화표 기본(0.01–200 °C, 10 °C) → 21행", r.outputs?.n === 21, r.outputs?.n);
r = runX("steam_table", { basis: "p" });
check("압력표 기본(100–1000 kPa, 100 kPa) → 10행", r.outputs?.n === 10, r.outputs?.n);
r = runX("steam_table", { T1: 200, T2: 100 });
check("끝 < 시작 → 계산 오류", Boolean(r.error));

// ── 22. 배관 지름 ── 50 m³/h, 2 m/s → D = √(4·0.013889/(2π)) = 94.03 mm
r = runX("pipe_size");
near("D = 94.03 mm", W.calcConvert("length", r.outputs?.D, "m", "mm"), Math.sqrt(4 * (50 / 3600) / (Math.PI * 2)) * 1000, 1e-12);
r = runX("pipe_size", { Di: 102.3 });
near("안지름 102.3 mm(4\" Sch40) 유속 = 1.690 m/s", r.outputs?.vAct, (50 / 3600) / (Math.PI * 0.1023 * 0.1023 / 4), 1e-12);
r = runX("pipe_size", { Di: 80 });
check("가는 관 → 경고", r.warnings.length === 1);

// ── 23. NPSHa ── 20 °C 물, 개방 탱크, 액면 +2 m, 손실 1 m: (101325 − 2339)/(998.2 g) + 2 − 1 = 11.112 m
r = runX("npsha");
{
  const want = (101325 - 2339) / (998.2 * 9.80665) + 1;
  near("NPSHa = 11.11 m", r.outputs?.npsha, want, 1e-12, "m");
  near("여유비 = NPSHa / 3", r.outputs?.ratio, want / 3, 1e-12);
  check("여유 충분", r.outputs?.verdict === "여유 충분");
}
r = runX("npsha", { z: -5, hf: 2 });
check("흡상 5 m + 손실 2 m → NPSHa 3.11 < 여유비 1.1×3", /여유 부족/.test(r.outputs?.verdict || ""), r.outputs?.verdict);
r = runX("npsha", { Pv: 47.39, z: -5, hf: 2 });   // 80 °C 물
check("80 °C 물 흡상 → NPSHa < NPSHr", /캐비테이션/.test(r.outputs?.verdict || ""), r.outputs?.verdict);
near("IF97 로 구한 20 °C 물 증기압 2.339 kPa = 기본 hint 값", W.calcWaterPsat(293.15), 2339.2, 1e-4, "Pa");

// ── 24. 오리피스 ── 손계산: D 100, d 50 mm, C 0.61, ΔP 25 kPa, 물
r = runX("orifice");
{
  const A0 = Math.PI * 0.05 * 0.05 / 4, b4 = 0.5 ** 4;
  const Q = 0.61 * A0 * Math.sqrt(2 * 25000 / (998.2 * (1 - b4)));
  near("Q = C A₀ √(2ΔP/(ρ(1−β⁴))) = 0.008737 m³/s", r.outputs?.Q_out, Q, 1e-12, "m³/s");
  const s = Math.sqrt(1 - b4 * (1 - 0.61 * 0.61));
  near("영구 손실(ISO 5167-2) ≈ 72.6 % of ΔP", r.outputs?.loss, 25000 * (s - 0.61 * 0.25) / (s + 0.61 * 0.25), 1e-12, "Pa");
  check("영구 손실비 β 0.5 에서 0.70–0.75 (ISO 근사 1 − 0.24β − 0.52β² − 0.16β³ = 0.73)", r.outputs.loss / 25000 > 0.70 && r.outputs.loss / 25000 < 0.75);
  r = runX("orifice", { mode: "dp", Q: Q * 3600 });
  near("되돌리기: 유량 → ΔP = 25 kPa", r.outputs?.dp_out, 25000, 1e-9, "Pa");
}
r = runX("orifice", { d: 90 });
check("β 0.9 → 범위 경고", r.warnings.some(w => /β/.test(w)));
r = runX("orifice", { d: 120 });
check("d ≥ D → 계산 오류", Boolean(r.error));

// ── 25. 보온 열손실 ── Incropera 예제 3.5: r_cr = k/h = 0.055/5 = 11 mm
r = runX("insulation_loss", { k: 0.055, h: 5 });
near("임계 반지름 = 11 mm (Incropera 예제 3.5)", W.calcConvert("length", r.outputs?.rcr, "m", "mm"), 11, 1e-12);
r = runX("insulation_loss");
{
  const r1 = 0.05715, r2 = r1 + 0.05;
  const q = 130 / (Math.log(r2 / r1) / (2 * Math.PI * 0.045) + 1 / (2 * Math.PI * r2 * 10));
  near("q' = ΔT / (R_cond + R_conv) 손계산", r.outputs?.q, q, 1e-12, "W/m");
  near("겉면 온도 = T∞ + q'/(2π r₂ h)", W.calcConvert("temperature", r.outputs?.Ts, "K", "C"), 20 + q / (2 * Math.PI * r2 * 10), 1e-9);
  near("보온 없음 q' = 2π r₁ h ΔT", r.outputs?.qBare, 2 * Math.PI * r1 * 10 * 130, 1e-12);
  near("전체 100 m", r.outputs?.Q, q * 100, 1e-12, "W");
}
r = runX("insulation_loss", { Do: 10, t: 2, k: 0.055, h: 5 });
check("r₁ < r_cr 얇은 보온 → 열손실 증가 경고·감소율 음수", r.warnings.length > 0 && r.outputs.saving < 0);

// ── 26. 관 안 대류 ── Dittus–Boelter·Gnielinski 손계산
r = runX("nusselt");
{
  const Re = 998.2 * 1 * 0.025 / 0.001002, Pr = 4182 * 0.001002 / 0.598;
  near("Pr = cp μ / k = 7.007", r.outputs?.Pr, Pr, 1e-12);
  near("DB 가열 Nu = 0.023 Re^0.8 Pr^0.4", r.outputs?.Nu, 0.023 * Re ** 0.8 * Pr ** 0.4, 1e-12);
  near("h = Nu k / D", r.outputs?.h, 0.023 * Re ** 0.8 * Pr ** 0.4 * 0.598 / 0.025, 1e-12);
  r = runX("nusselt", { dir: "cool" });
  near("DB 냉각 n = 0.3", r.outputs?.Nu, 0.023 * Re ** 0.8 * Pr ** 0.3, 1e-12);
  r = runX("nusselt", { corr: "gn" });
  const f = (0.790 * Math.log(Re) - 1.64) ** -2;
  near("Gnielinski 손계산", r.outputs?.Nu, (f / 8) * (Re - 1000) * Pr / (1 + 12.7 * Math.sqrt(f / 8) * (Pr ** (2 / 3) - 1)), 1e-12);
  check("Gnielinski 와 DB 차 20 % 안 (Incropera: 두 식 모두 쓸 수 있는 범위)", rel(r.outputs.Nu, 0.023 * Re ** 0.8 * Pr ** 0.4) < 0.2);
}
r = runX("nusselt", { v: 0.05 });
check("층류 → 계산 오류", Boolean(r.error));

// ── 27. 습공기 ── 20 °C, 50 %, 101.325 kPa: W 7.26 g/kg, 이슬점 9.26 °C, h 38.6 kJ/kg (ASHRAE 습공기 선도)
r = runX("psychro");
near("p_ws(20 °C) = 2.3392 kPa (ASHRAE 표 3)", r.outputs?.pws, 2339.2, 1e-4, "Pa");
near("W = 7.26 g/kg", r.outputs?.W, 7.26, 0.002);
near("이슬점 9.26 °C", W.calcConvert("temperature", r.outputs?.Td, "K", "C"), 9.26, 0.002);
near("h = 38.6 kJ/kg", r.outputs?.h, 38.6, 0.003);
near("v = 0.840 m³/kg (습공기 선도)", r.outputs?.v, 0.840, 0.002);
r = runX("psychro", { RH: 100 });
near("RH 100 % → 이슬점 = 건구", r.outputs?.Td, 293.15, 1e-9, "K");
near("포화 20 °C W_s = 14.758 g/kg (ASHRAE 2017 표 2, 증가 계수 포함 → 이상기체 식은 0.4 % 작음)", r.outputs?.W, 14.758, 0.006);
near("포화 20 °C h_s = 57.555 kJ/kg (ASHRAE 표 2)", r.outputs?.h, 57.555, 0.004);
r = runX("psychro", { RH: 0 });
near("건조 공기 20 °C v_da = 0.8301 m³/kg (ASHRAE 표 2)", r.outputs?.v, 0.8301, 0.001);
r = runX("psychro", { T: 5, RH: 30 });
check("이슬점 0 °C 아래 → 경고, 이슬점 숨김", r.outputs && r.outputs.Td === undefined && r.warnings.length === 1);
// 가열·냉각·혼합 — Çengel & Boles 14장 예제(냉각·제습 −511 kJ/min, 혼합 19.0 °C·89 %). 자세한 시험은 test_steam.cjs
r = runX("psychro", { mode: "coil", T: 30, RH: 80, Q1: 10, Tout: 14 });
near("냉각·제습 열량 −511 kJ/min = −8.52 kW", r.outputs?.q, -511e3 / 60, 0.01, "W");
check("냉각·제습 → 결로 경고", r.warnings.length === 1 && r.outputs.cond > 0);
r = runX("psychro", { mode: "mix", T: 14, RH: 100, Q1: 50, T2: 32, RH2: 60, Q2: 20 });
check("혼합 19.0 °C ± 0.15", Math.abs(W.calcConvert("temperature", r.outputs?.To, "K", "C") - 19.0) < 0.15, r.outputs?.To);

// ── 28. 용기 부피 ── 2:1 타원 πD³/24, 반구 πD³/12, ASME F&D 0.0810 D³(깊이 0.169 D)
{
  const H = W.CALC_HEADS;
  near("2:1 타원 헤드 = πD³/24 (D = 2 m → 1.0472 m³)", W.calcHeadLiquid(H.ell21, 2, "vertical", Infinity), Math.PI * 8 / 24, 1e-12);
  near("반구 헤드 = πD³/12", W.calcHeadLiquid(H.hemi, 2, "vertical", Infinity), Math.PI * 8 / 12, 1e-12);
  near("ASME F&D 깊이 = 0.1693 D", W.calcHeadProfile(H.asme, 1).depth, 0.16934, 1e-4);
  near("ASME F&D 부피 = 0.0810 D³ (표값 0.080999)", W.calcHeadLiquid(H.asme, 1, "vertical", Infinity), 0.080999, 1e-3);
  // 수치 적분(접시형 길) 자체 점검: 같은 적분을 타원 단면에 쓰면 닫힌 식과 같아야 한다
  const pe = W.calcHeadProfile(H.ell21, 2);
  near("Simpson 세움 적분 = 닫힌 식(2:1, h 0.3 m)", W.calcSimpson(s => Math.PI * pe.r(s) ** 2, 0, 0.3), W.calcHeadLiquid(H.ell21, 2, "vertical", 0.3), 1e-9);
  near("Simpson 눕힘 적분 = 닫힌 식(2:1, h 0.7 m)", W.calcSimpson(s => W.calcCircleSegment(pe.r(s), 0.7 - 1), 0, pe.depth, [], 2000), W.calcHeadLiquid(H.ell21, 2, "horizontal", 0.7), 1e-4);
  near("눕힘 접시형 꽉 참 = 세움 꽉 참", W.calcHeadLiquid(H.asme, 2, "horizontal", 2), W.calcHeadLiquid(H.asme, 2, "vertical", Infinity), 1e-5);
  near("눕힘 접시형 절반 = 꽉 참의 절반", W.calcHeadLiquid(H.asme, 2, "horizontal", 1), W.calcHeadLiquid(H.asme, 2, "vertical", Infinity) / 2, 1e-5);
}
r = runX("vessel_volume");
{
  const total = Math.PI * 6 + 2 * Math.PI * 8 / 24;
  near("눕힘 2:1, D 2 m, L 6 m: 전체 = 6π + π·8/12 = 20.944 m³", r.outputs?.total, total, 1e-12);
  near("액위 = 반지름 → 절반", r.outputs?.liquid, total / 2, 1e-12);
  near("채움률 50 %", r.outputs?.fill, 50, 1e-10);
}
r = runX("vessel_volume", { level: 0.5 });
{
  const seg = 1 * Math.acos(0.5) - 0.5 * Math.sqrt(1 - 0.25);
  near("눕힘 액위 0.5 m: 동체 활꼴 × L + (a/R) π h²(3R−h)/3", r.outputs?.liquid, seg * 6 + 0.5 * Math.PI * 0.25 * 2.5 / 3, 1e-12);
}
r = runX("vessel_volume", { orient: "vertical", level: 3 });
near("세움 2:1, 액위 3 m(헤드 0.5 + 동체 2.5): πD³/24 + π·2.5", r.outputs?.liquid, Math.PI * 8 / 24 + Math.PI * 2.5, 1e-12);
r = runX("vessel_volume", { orient: "vertical", level: 6.8 });
near("세움 꼭대기 헤드 안(7 − 0.2): 전체 − 꼭지점 0.2 m 빈 부분", r.outputs?.liquid,
  Math.PI * 6 + 2 * Math.PI * 8 / 24 - Math.PI * 1 * 0.04 * (1.5 - 0.2) / (3 * 0.25), 1e-12);
r = runX("vessel_volume", { orient: "vertical", head: "flat", level: 2 });
near("평판 세움 = 원통 π R² h", r.outputs?.liquid, Math.PI * 2, 1e-12);
r = runX("vessel_volume", { level: 2.5 });
check("액위 > 지름(눕힘) → 계산 오류", Boolean(r.error), r.error);

// ── 29. 반응기 ── X = 90 %: CSTR/PFR = 0.9/(0.1 ln 10) = 3.909 (Levenspiel·Fogler 비교)
r = runX("reactor");
near("CSTR V = v₀X/(k(1−X)) = 9 000 L", W.calcConvert("volume", r.outputs?.V_out, "m3", "L"), (100 / 60) * 0.9 / ((0.1 / 60) * 0.1), 1e-12);
near("CSTR ÷ PFR (X 0.9) = 3.909", r.outputs?.ratio, 0.9 / (0.1 * Math.log(10)), 1e-12);
r = runX("reactor", { type: "pfr" });
near("PFR V = (v₀/k) ln 10 = 2 302.6 L", W.calcConvert("volume", r.outputs?.V_out, "m3", "L"), 1000 * Math.log(10), 1e-12);
near("PFR Da = ln 10", r.outputs?.Da, Math.log(10), 1e-12);
r = runX("reactor", { mode: "X", V: 1000 });
near("CSTR kτ = 1 → X = 50 %", r.outputs?.X_out, 50, 1e-12);
r = runX("reactor", { type: "pfr", mode: "X", V: 1000 });
near("PFR kτ = 1 → X = 1 − e⁻¹ = 63.21 %", r.outputs?.X_out, 100 * (1 - Math.exp(-1)), 1e-12);
r = runX("reactor", { X: 100 });
check("X = 100 % → 칸 오류", Boolean(r.errors.X));

// ── 30. 공학 단위 변환기 ── NIST SP 811 (2008) 부록 B 환산 계수, CODATA 2018 몰부피, GPSA 379.49 scf/lb-mol
{
  const U = (kind, x, unit, extra = {}) => runX("units", { kind, [`x_${kind}`]: { raw: x, unit }, ...extra });
  const nist = (name, kind, unit, dimTo, toUnit, want, tol = 2e-6) => near(`단위 ${name} (NIST SP 811)`, U(kind, 1, unit).outputs?.[`${dimTo}__${toUnit}`], want, tol);
  nist("1 kgf/cm² = 98.0665 kPa(a)", "pressure", "kgcm2a", "pressure_ag", "kPa", 98.0665);
  nist("1 psia = 6.894757 kPa(a)", "pressure", "psia", "pressure_ag", "kPa", 6.894757);
  nist("1 psia = 6894.757 Pa(a)", "pressure", "psia", "pressure_ag", "Pa", 6894.757);
  nist("1 Btu(IT) = 1.055056 kJ", "energy", "btu", "energy", "kJ", 1.055056);
  nist("1 kWh = 3.6 MJ", "energy", "kWh", "energy", "MJ", 3.6, 1e-12);
  nist("1 kcal(IT) = 4.1868 kJ", "energy", "kcal", "energy", "kJ", 4.1868, 1e-12);
  nist("1 RT = 3.516853 kW", "power", "rt", "power", "kW", 3.516853);
  nist("1 PS = 0.7354988 kW", "power", "ps", "power", "kW", 0.7354988);
  nist("1 kcal/h = 1.163 W", "power", "kcalh", "power", "W", 1.163, 1e-12);
  nist("1 Btu/(h·ft²) = 3.154591 W/m²", "heatflux", "btuhft2", "heatflux", "Wm2", 3.154591);
  nist("1 Btu/(h·ft·°F) = 1.730735 W/(m·K)", "conductivity", "btuhftF", "conductivity", "WmK", 1.730735);
  nist("1 Btu/(h·ft²·°F) = 5.678263 W/(m²·K)", "htc", "btuhft2F", "htc", "Wm2K", 5.678263);
  nist("1 lb/(ft·h) = 4.133789×10⁻⁴ Pa·s", "viscosity", "lbfth", "viscosity", "Pas", 4.133789e-4);
  nist("1 ft²/s = 0.09290304 m²/s", "kinviscosity", "ft2s", "kinviscosity", "m2s", 0.09290304, 1e-12);
  nist("1 lb/gal = 119.8264 kg/m³", "density", "lbgal", "density", "kgm3", 119.8264);
  nist("1 bbl/d = 0.1589873 m³/d", "flow", "bbld", "flow", "m3d", 0.1589873);
  nist("1 short ton = 907.1847 kg", "mass", "ston", "mass", "kg", 907.18474, 1e-12);
  nist("1 lbmol/h = 0.45359237 kmol/h", "molarflow", "lbmolh", "molarflow", "kmolh", 0.45359237, 1e-12);
  near("단위 1 mmH₂O = 9.80665 Pa (관례값)", W.calcConvert("pressure", 1, "mmH2O", "Pa"), 9.80665, 1e-12);
  near("단위 1 inH₂O = 249.0889 Pa (NIST 관례값)", W.calcConvert("pressure", 1, "inH2O", "Pa"), 249.0889, 1e-9);
  // 게이지 ↔ 절대
  r = U("pressure", 0, "barg");
  near("0 barg = 101.325 kPa(a)", r.outputs?.pressure_ag__kPa, 101.325, 1e-12);
  r = U("pressure", 1, "kgcm2g");
  near("1 kgf/cm²g = 0.980665 + 1.01325 = 1.993915 bar(a)", r.outputs?.pressure_ag__bara, 1.993915, 1e-9);
  near("1 kgf/cm²g = 14.2233 psig", r.outputs?.pressure_ag__psig, 98066.5 / 6894.757293168, 1e-9);
  r = U("pressure", 1, "barg", { patm: 95 });
  near("현지 대기압 95 kPa: 1 barg = 195 kPa(a)", r.outputs?.pressure_ag__kPa, 195, 1e-12);
  near("현지 대기압 95 kPa: 1 barg = 1 barg 그대로", r.outputs?.pressure_ag__barg, 1, 1e-12);
  r = U("pressure", 2, "bara", { patm: 95 });
  near("2 bar(a), 대기압 95 kPa → 1.05 barg", r.outputs?.pressure_ag__barg, 1.05, 1e-12);
  r = U("pressure", -2, "barg");
  check("−2 barg → 절대 압력 음수 오류", Boolean(r.error), r.error);
  // 온도
  r = U("temperature", 100, "F");
  near("100 °F = 37.7778 °C", r.outputs?.temperature__C, 37.777777778, 1e-9);
  near("100 °C = 671.67 °R", U("temperature", 100, "C").outputs?.temperature__R, 671.67, 1e-12);
  check("−300 °C → 0 K 이상 칸 오류", Boolean(U("temperature", -300, "C").errors.x_temperature));
  // 점도 ↔ 동점도 (ν = μ/ρ)
  r = U("viscosity", 1.002, "cP");
  near("물 1.002 cP, 998.2 kg/m³ → 1.0038 cSt", r.outputs?.kinviscosity__cSt, 1.002 / 998.2 * 1000, 1e-12);
  r = U("viscosity", 1, "cP", { rho: "" });
  check("밀도 비우면 동점도 줄 없음", r.outputs && r.outputs.kinviscosity__cSt === undefined && r.outputs.viscosity__Pas === 1e-3);
  r = U("kinviscosity", 100, "cSt", { rho: 900 });
  near("100 cSt × 900 kg/m³ = 90 cP", r.outputs?.viscosity__cP, 90, 1e-12);
  // 기체 유량 — CODATA 2018 몰부피 22.41396954 L/mol, ISO 15 °C 23.6447, GPSA 379.49 scf/lb-mol
  const G = (gu, gx, extra = {}) => runX("units", { kind: "gasflow", gu, gx, ...extra });
  r = G("kmolh", 1);
  near("1 kmol/h = 22.41397 Nm³/h (CODATA 2018)", r.outputs?.gas__Nm3h, 22.41396954, 1e-8);
  near("1 kmol/h = 23.6447 Sm³/h (15 °C)", r.outputs?.gas__Sm3h, 8.314462618 * 288.15 / 101325 * 1000, 1e-12);
  near("1 kmol/h = 24.465 Am³/h (25 °C, 1 atm, Z 1)", r.outputs?.gas__Am3h, 24.4654, 1e-5);
  near("1 lb-mol/h = 379.49 SCFH → 6.3248 SCFM (GPSA)", G("kmolh", 0.45359237).outputs?.gas__scfm, 379.49 / 60, 2e-4);
  near("1 MMSCFD = 1e6/379.49 lb-mol/d (GPSA)", G("mmscfd", 1).outputs?.gas__kmolh, 1e6 / 379.49 * 0.45359237 / 24, 2e-4);
  r = G("Nm3h", 1000);
  near("메탄 1000 Nm³/h → 715.76 kg/h (M 16.043)", r.outputs?.gas__kgh, 1000 / 22.41396954 * 16.043, 1e-9);
  near("메탄 표준 밀도 0.7158 kg/Nm³", r.outputs?.gas_rho_n, 16.043 / 22.41396954, 1e-9);
  r = G("Sm3h", 1000, { sref: "s20" });
  near("20 °C 기준 1000 Sm³/h → 932.0 Nm³/h", r.outputs?.gas__Nm3h, 1000 * 273.15 / 293.15, 1e-12);
  r = G("Am3h", 100, { Pg: { raw: 1101.325, unit: "kPa" }, Tg: 25, Z: 0.95 });
  near("실제 100 m³/h, 1101.325 kPa(a), 25 °C, Z 0.95 → kmol/h", r.outputs?.gas__kmolh, 100 * 1101325 / (0.95 * 8.314462618 * 298.15 * 1000), 1e-12);
  // 기체 농도 — NIOSH NPG: 벤젠 1 ppm = 3.19 mg/m³ (25 °C, 1 atm)
  r = runX("units", { kind: "conc", mw: 78.11 });
  near("벤젠 1 ppm → 3.19 mg/m³ (NIOSH NPG)", r.outputs?.conc__mgm3, 3.19, 0.002);
  near("1 ppm = 1000 ppb = 0.0001 vol%", r.outputs?.conc__ppb * 1e-7, r.outputs?.conc__pct, 1e-12);
  r = runX("units", { kind: "conc", cu: "mgm3", cx: 100, mw: 92.14 });
  near("톨루엔 100 mg/m³ → 26.55 ppm (Vm 24.465)", r.outputs?.conc__ppm, 100 * 24.4654 / 92.14, 1e-5);
}
{
  const def = W.calcFind("units");
  const st = W.calcInitialState(def, W.calcReadLink("?view=calc&calc=units&kind=gasflow&mw=44.01").values);
  check("units 딥링크: kind=gasflow, mw=44.01 채움", st.kind === "gasflow" && st.mw.raw === "44.01");
  const sec = [{ section_seq: 9, content: [{ msdsItemCode: "I38", itemDetail: "44.01 | 출처" }] }];
  check("물질 → 단위 변환기 링크(분자량 채움)", W.calcSubstanceUnitsHref({ name: "이산화탄소" }, sec) === "?view=calc&calc=units&kind=gasflow&mw=44.01&name=%EC%9D%B4%EC%82%B0%ED%99%94%ED%83%84%EC%86%8C");
}

// ── 31. 공정제어 ── 기준값 사례 전체는 test_process_control.cjs. 여기는 등록·영어 점검용 대표 사례.
{
  const tbl = (res, m) => res.outputs?.table?.rows.find(x => x.method.startsWith(m));
  r = runX("pid_tuning");
  near("SIMC PI Kc = 2.5 (Skogestad 강의 K=1, τ=10, θ=2)", tbl(r, "SIMC")?.Kc, 2.5, 1e-12);
  near("SIMC PI τI = 10", tbl(r, "SIMC")?.tI, 10, 1e-12);
  r = runX("pid_tuning", { K: 100, tau: 100, theta: 1, tc: 1 });
  near("Seborg 예제 12.4 SIMC τI = 8", tbl(r, "SIMC")?.tI, 8, 1e-12);
  r = runX("loop_sim");
  check("폐루프 모의: 방법 3줄 성능 표(IMC = SIMC 합침)", r.outputs?.table?.rows.length === 3);
  r = runX("loop_sim", { Kc_m: 20, tI_m: 10 });
  check("폐루프 모의: Kc > Ku 직접 입력 → 경고", r.warnings.length > 0);
  r = runX("tf_tools");
  near("2차 ζ = 0.5 오버슈트 16.30 %", r.outputs?.os, 100 * Math.exp(-Math.PI * 0.5 / Math.sqrt(0.75)), 1e-12);
  r = runX("tf_tools", { tool: "routh" });
  near("Routh 10s³+17s²+8s+1+Kc: Ku = 12.6", r.outputs?.Ku, 12.6, 1e-7);
  r = runX("tf_tools", { tool: "bode" });
  near("SIMC 루프 GM = π (Skogestad 2003: 3.14)", r.outputs?.gm, Math.PI, 1e-6);
}

// ── 설비 사이징(펌프·조절밸브·압축기·ε-NTU·피팅·분리기) ── 사례는 test_calc_sizing_cases.cjs
require("./test_calc_sizing_cases.cjs")({ W, runX, near, check });

// ── 반응·경제 묶음 ── 자세한 기준값 시험은 test_calc_reaction.cjs([src]/[calc] 표시). 여기서는 대표 사례만.
r = runX("batch_reactor");
near("회분 1차 k 0.1/min, X 90 % → 23.03 min", r.outputs?.t_out / 60, Math.log(10) / 0.1, 1e-9);
r = runX("batch_reactor", { mode: "adiabatic" });
near("Fogler 예제 11-3 단열 PFR X 50 % → 1.408 m³", r.outputs?.V_pfr, 1.408, 0.005);
r = runX("runaway");
near("MTSR = 60 + 0.3 × 200/2 = 90 °C", r.outputs?.MTSR, 363.15, 1e-12);
check("기본값 Stoessel 2등급", r.outputs?.cls === 2, `${r.outputs?.cls}`);
r = runX("economics", { mode: "npv" });
near("NPV −1000 + 300×5 @10 % = 137.24", r.outputs?.npv, 137.236, 1e-4);
r = runX("flue_gas");
near("CH₄ 과잉 공기 10 % → 건조 CO₂ 10.525 %", r.outputs?.co2d, 100 / (1.2 + 2.2 * 0.7905 / 0.2095), 1e-9);

// ── 탱크 증발 손실 ── [src] US EPA AP-42 7.1(2026-06판) 7.1.7 예제 1(세운 원뿔 지붕, 덴버) · 예제 2(눕힌 탱크). 인쇄값은 2–4 자리라 허용 0.3–1 %
{
  r = run("tank_losses");
  check("탱크 예제 1: 기본값으로 오류 없음", r.outputs && !r.error, r.error);
  const us = W.calcTankLosses(r.values)._us;
  near("[src] 예제 1 H_VO = 4.0625 ft", us.HVO, 4.0625, 1e-9);
  near("[src] 예제 1 V_V = 114.86 ft³", us.VV, 114.86, 1e-4);
  near("[src] 예제 1 T_B = 512.96 °R", us.TB, 512.96, 1e-5);
  near("[src] 예제 1 T_LA = 514.24 °R", us.TLA, 514.24, 1e-5);
  near("[src] 예제 1 T_V = 515.5 °R", us.TV, 515.5, 1e-4);
  near("[src] 예제 1 P_VA = 0.9553 psia (Raoult)", us.PVA, 0.9553, 0.002);
  near("[src] 예제 1 M_V = 78.59", us.Mv, 78.59, 0.001);
  near("[src] 예제 1 W_V = 1.36×10⁻² lb/ft³", us.WV, 0.0136, 0.005);
  near("[src] 예제 1 ΔT_V = 31.97 °R", us.dTV, 31.97, 1e-4);
  near("[src] 예제 1 ΔP_V = 0.438 psia", us.dPV, 0.438, 0.003);
  near("[src] 예제 1 K_E = 0.0961", us.KE, 0.0961, 0.003);
  near("[src] 예제 1 K_S = 0.829", us.KS, 0.829, 0.001);
  near("[src] 예제 1 N = 5.7", us.N, 5.7, 0.005);
  near("[src] 예제 1 L_S = 45.4 lb/yr", us.LS, 45.4, 0.003);
  near("[src] 예제 1 L_W = 15.4 lb/yr", us.LW, 15.4, 0.005);
  near("[src] 예제 1 L_T = 60.8 lb/yr (kg 출력 → lb)", W.calcConvert("mass", r.outputs.LT, "kg", "lb"), 60.8, 0.003);
  check("[src] 예제 1 성분별: 벤젠 94 %", /94\.\d %/.test(r.outputs.species || ""), r.outputs.species);
  r = run("tank_losses", { shape: "horizontal", L: 12, HLX: 5.75, HLN: 2.25 });
  const us2 = W.calcTankLosses(r.values)._us;
  near("[src] 예제 2 D_E = 9.57 ft", us2.D, 9.57, 0.001);
  near("[src] 예제 2 H_VO = 2.36 ft", us2.HVO, 2.36, 0.002);
  near("[src] 예제 2 T_LA = 516.25 °R", us2.TLA, 516.25, 1e-5);
  near("[src] 예제 2 T_V = 518.93 °R", us2.TV, 518.93, 1e-5);
  near("[src] 예제 2 ΔT_V = 35.22 °R", us2.dTV, 35.22, 3e-4);
  near("[src] 예제 2 P_VA = 1.012 psia", us2.PVA, 1.012, 0.002);
  near("[src] 예제 2 W_V = 0.0143 lb/ft³", us2.WV, 0.0143, 0.003);
  near("[src] 예제 2 K_E = 0.108", us2.KE, 0.108, 0.005);
  near("[src] 예제 2 K_S = 0.888", us2.KS, 0.888, 0.001);
  near("[src] 예제 2 L_S = 85 lb/yr", us2.LS, 85, 0.005);
  r = run("tank_losses", { shape: "horizontal", L: 12, buried: "yes" });
  check("[calc] 지하 눕힌 탱크 → 정치 손실 0", r.outputs && r.outputs.LS === 0);
  // [calc] 물질 하나(증기압 1점 + 끓는점): 같은 Clausius–Clapeyron 두 점이면 P(T_ref) = P_ref, P(T_b) = 1 atm
  const L1 = W.tankLiquid({ vp: "cc", M: 78.11, Pref: 10000, Tref: 293.15, Tb: 353.25 });
  near("[calc] 1점 근사: P(T_ref) = 10 kPa", W.calcConvert("pressure", L1.comps[0].P(W.calcConvert("temperature", 293.15, "K", "R")), "psi", "Pa"), 10000, 1e-9);
  near("[calc] 1점 근사: P(T_b) = 101.325 kPa", W.calcConvert("pressure", L1.comps[0].P(W.calcConvert("temperature", 353.25, "K", "R")), "psi", "Pa"), 101325, 1e-9);
  r = run("tank_losses", { vp: "cc", M: 78.11, Pref: 10, Tref: 20, Tb: 80.1 });
  check("[calc] 1점 근사 모드 계산됨", r.outputs && r.outputs.LT > 0 && !r.outputs.species, r.error);
  // [calc] K_N: N > 36 이면 (180 + N)/(6N); 처리량 100 배 → N = 570.7, K_N = 0.2193
  r = run("tank_losses", { Q: 845000 });
  near("[calc] N = 570.7 → K_N = (180 + N)/(6N)", r.outputs?.KN, (180 + r.outputs.N) / (6 * r.outputs.N), 1e-12);
  check("[calc] N > 36 경고", r.warnings.some(w => /36/.test(w)));
  // [calc] 호흡 밸브 ±0.5 psig: 식 1-42 조건이면 K_B = (P_A/K_N − P_VA)/(P_BP + P_A − P_VA)
  r = run("tank_losses", { PBP: 0.5, PBV: -0.5 });
  const us3 = W.calcTankLosses(r.values)._us;
  near("[calc] K_B = (12.08 − 0.9555)/(0.5 + 12.08 − 0.9555)", us3.KB, (12.08 - us3.PVA) / (0.5 + 12.08 - us3.PVA), 1e-9);
  check("[calc] 넓은 밸브 설정 → 정치 손실 감소", us3.LS < us.LS, `${us3.LS} < ${us.LS}`);
  r = run("tank_losses", { insul: "full", TB: 30 });
  check("[calc] 단열: ΔT_V = 0, T_LA = T_B", r.outputs && r.outputs.dTV === 0 && Math.abs(r.outputs.TLA - 303.15) < 1e-9);
  r = run("tank_losses", { HL: 13 });
  check("액위 ≥ 동체 높이 → 계산 오류", Boolean(r.error), r.error);
  r = run("tank_losses", { TAX: 30, TAN: 40 });
  check("최고 < 최저 기온 → 계산 오류", Boolean(r.error), r.error);
}

// ── 폭발위험장소 도우미 ── [calc] 손계산(Crowl & Louvar 4장 구멍 누출식, Q_c = W/(ρ_g k LFL), V_z = f Q_c / C)
{
  r = run("area_class");
  const g = 1.31, M = 0.01604, p = 5e5, T = 293.15, A = Math.PI / 4 * 1e-6, R = 8.314462618;
  const rho0 = p * M / (R * T);
  const Wc = 0.75 * A * Math.sqrt(g * rho0 * p * Math.pow(2 / (g + 1), (g + 1) / (g - 1)));
  near("[calc] 메테인 5 bar, 1 mm, C_d 0.75 → 임계 흐름 W", r.outputs?.W, Wc, 1e-12, "kg/s");
  check("[calc] 5 bar → 임계(초크) 흐름", /임계/.test(r.outputs?.regime || ""));
  const rhoG = 101325 * M / (R * T);
  near("[calc] Q_c = W/(ρ_g·0.5·0.044)", r.outputs?.Qc, Wc / (rhoG * 0.5 * 0.044), 1e-12);
  near("[calc] V_z = 2·Q_c/(6/3600)", r.outputs?.Vz, 2 * Wc / (rhoG * 0.5 * 0.044) / (6 / 3600), 1e-12);
  near("[calc] 배경 농도 X_b = f·(W/ρ_g)/Q / LFL", r.outputs?.Xb, 100 * 2 * (Wc / rhoG) / (6 * 200 / 3600) / 0.044, 1e-12, "%");
  check("2차 누출 → 2종 장소 안내", /2종/.test(r.outputs?.zone || ""), r.outputs?.zone);
  r = run("area_class", { p: 1.5 });
  const pr = 101325 / 1.5e5, rho1 = 1.5e5 * M / (R * T);
  const Ws = 0.75 * A * Math.sqrt(rho1 * 1.5e5 * (2 * g / (g - 1)) * (Math.pow(pr, 2 / g) - Math.pow(pr, (g + 1) / g)));
  near("[calc] 1.5 bar → 아임계 식", r.outputs?.W, Ws, 1e-12);
  check("[calc] 1.5 bar → 아임계 흐름", /아임계/.test(r.outputs?.regime || ""));
  r = run("area_class", { src: "liquid", d: 2, Cd: 0.61, dp: 300, rho: 870 });
  near("[calc] 액체 W = C_d·A·√(2ρΔp)", r.outputs?.W, 0.61 * Math.PI / 4 * 4e-6 * Math.sqrt(2 * 870 * 3e5), 1e-12);
  r = run("area_class", { src: "direct", W: 0.001, ach: 12, V0: 100, grade: "primary" });
  check("[calc] V_z < 0.1 m³ → NE 후보 안내", r.outputs?.Vz < 0.1 && /NE/.test(r.outputs?.zone || ""), `${r.outputs?.Vz}`);
  check("1차 누출 → 1종 장소 안내", /1종/.test(r.outputs?.zone || ""));
  r = run("area_class", { src: "direct", W: 100, ach: 1, V0: 50, grade: "continuous" });
  check("[calc] 배경 농도 ≥ k·LFL → 희석 부족 안내", /희석 부족/.test(r.outputs?.zone || "") && /0종/.test(r.outputs?.zone || ""), r.outputs?.zone);
  r = run("area_class", { V0: "", ach: "" });
  check("실 부피·환기 없으면 V_z 없음", r.outputs && r.outputs.Vz === undefined && r.outputs.Qc > 0);
  r = run("area_class", { p: 0.9 });
  check("저장 압력 < 대기압 → 오류", Boolean(r.error), r.error);
}

// ── Joback 기여도법 ── 자세한 사례(SMILES 552개 대조 포함)는 test_calc_joback.cjs. [src] 위키백과 "Joback method" 아세톤 풀이 예.
r = runX("joback");
near("[src] 아세톤 Tb = 322.11 K", r.outputs?.Tb, 322.11, 1e-9);
near("[src] 아세톤 Tc = 500.5590 K", r.outputs?.Tc, 500.5590, 1e-6);
near("[src] 아세톤 Pc = 48.0250 bar", r.outputs?.Pc / 1e5, 48.0250, 1e-5);
near("[src] 아세톤 Cp°(300 K) = 75.3264 J/(mol·K)", runX("joback", { T: 300 }).outputs?.cp, 75.3264, 1e-6);
r = runX("joback", { mode: "smiles" }, { smi: [{ smiles: "Cc1ccccc1O" }] });
near("[calc] o-크레졸 SMILES → Tb = 198.2 + ΣΔTb(CH3 + 4 r=CH + 2 r=C + ArOH)", r.outputs?.Tb, 198.2 + 23.58 + 4 * 26.73 + 2 * 31.01 + 76.34, 1e-9);
r = runX("joback", { mode: "smiles" }, { smi: [{ smiles: "CC.O" }] });
check("SMILES 혼합물(.) → 계산 오류", r.outputs === null && Boolean(r.error), r.error);

// ── 물성 → 계산기 링크(calc_facts_link.jsx) ──
{
  const facts = { props: { vapor_pressure: [{ n: 10000, u: "Pa", c: "20℃" }], boiling_point: [{ n: 80.1, u: "°C" }], molar_mass: [{ n: 78.11, u: "g/mol" }], lfl: [{ n: 1.2, u: "%" }] } };
  const h = new URLSearchParams(W.calcTankLossesHref(facts, "벤젠").slice(1));
  check("탱크 링크: vp=cc, Pref 10 kPa, Tref 20, Tb 80.1, M 78.11", h.get("calc") === "tank_losses" && h.get("vp") === "cc" && h.get("Pref") === "10" && h.get("Tref") === "20" && h.get("Tb") === "80.1" && h.get("M") === "78.11", String(h));
  const h2 = new URLSearchParams(W.calcTankLossesHref(null, "").slice(1));
  check("물성 없음 → 빈 칸으로 연다", h2.get("Pref") === "" && h2.get("M") === "");
  const h3 = new URLSearchParams(W.calcAreaClassHref(facts, "벤젠").slice(1));
  check("폭발위험장소 링크: M, LFL", h3.get("calc") === "area_class" && h3.get("M") === "78.11" && h3.get("LFL") === "1.2");
}

// ── 독성 probit ── RIVM 염소 기술 근거 문서(20180315-chlorine-INTERIM, 7쪽·표 5) 인쇄 값 [src] + 손계산 [calc]
{
  const K = { a: -13.7, b: 1.93, n: 1.04 };   // RIVM 염소, C mg/m³, t min
  near("[calc] Φ: Pr 5 → 50 %", W.calcToxProbitPercent(5), 50, 1e-12);
  near("[calc] Pr(1 %) = 2.6737 (Φ⁻¹(0.01) = −2.3263)", W.calcToxProbitOf(0.01), 5 - 2.3263479, 1e-6);
  near("[src] Pr(0.1 %) = 1.91 (RIVM 문서)", W.calcToxProbitOf(0.001), 1.91, 0.002);
  near("[calc] Pr → % → Pr 왕복", W.calcToxProbitOf(W.calcToxProbitPercent(3.3) / 100), 3.3, 1e-9);
  { const c = W.calcToxConcAt(K, W.calcToxProbitOf(0.001), 60);
    check("[src] 염소 60분 LC0.1 = 47 mg/m³ (RIVM 7쪽, 정수로 인쇄 → 반올림 비교)", Math.round(c) === 47, `${c}`); }
  near("[src] 염소 30분 LC0.1 = 91 mg/m³ (RIVM 표 5)", W.calcToxConcAt(K, W.calcToxProbitOf(0.001), 30), 91, 0.01);
  near("[src] 염소 30분 LC1 = 132 mg/m³ (RIVM 표 5)", W.calcToxConcAt(K, W.calcToxProbitOf(0.01), 30), 132, 0.01);
  near("[src] 염소 30분 LC50 = 426 mg/m³ (반올림 전 a −13.664, b 1.927, n 1.038; RIVM 7쪽)",
    W.calcToxConcAt({ a: -13.664, b: 1.927, n: 1.038 }, 5, 30), 426, 0.005);
}
r = runX("toxic_probit", { t: 60 });
near("[src] 계산기: 염소(RIVM) 60분 LC1 = 68 mg/m³ (RIVM 7쪽)", r.outputs?.lc1_mg, 68, 0.01, "mg/m³");
check("계산기: 염소 RIVM 상수 출처 글자", /RIVM Chloor/.test(r.outputs?.basis || ""), r.outputs?.basis);
check("계산기: 참고용 스크리닝·KORA 안내 경고", r.warnings.some(w => /KORA/.test(w)));
r = runX("toxic_probit");
{
  const Y = -13.7 + 1.93 * Math.log(Math.pow(400, 1.04) * 30);
  near("[calc] 염소 400 mg/m³ × 30분: Pr = −13.7 + 1.93 ln(400^1.04 · 30)", r.outputs?.Y, Y, 1e-9);
  near("[calc] 같은 노출 치사 비율", r.outputs?.P, W.calcToxProbitPercent(Y), 1e-9, "%");
  near("[calc] 이 농도에서 50 % 까지 시간 = exp((5 − a)/b)/C^n", r.outputs?.t50, Math.exp((5 + 13.7) / 1.93) / Math.pow(400, 1.04) * 60, 1e-9, "s");
  near("[calc] LC1 ppm = mg/m³ × 24.45 / 70.906 (DOE PAC 분자량)", r.outputs?.lc1_ppm, r.outputs?.lc1_mg * 24.45 / 70.906, 1e-9, "ppm");
}
r = runX("toxic_probit", { src: "custom", cunit: "ppm", C: 400 });
near("[calc] Crowl & Louvar 표 2-5 염소 상수(−8.29, 0.92, n 2), 400 ppm × 30분 → Pr 5.863 (R4 예)", r.outputs?.Y, -8.29 + 0.92 * Math.log(400 * 400 * 30), 1e-9);
near("[calc] 같은 노출 → 약 81 %", r.outputs?.P, 80.6, 0.005, "%");
r = runX("toxic_probit", { cunit: "ppm", C: 100 });
near("[calc] ppm 입력(RIVM 상수 mg/m³): 100 ppm = 290.0 mg/m³ 로 바꿔 계산",
  r.outputs?.Y, -13.7 + 1.93 * Math.log(Math.pow(100 * 70.906 / 24.45, 1.04) * 30), 1e-9);
r = runX("toxic_probit", { src: "custom", kunit: "ppm", cunit: "mgm3" });
check("직접 입력 ppm 상수 + mg/m³ 입력 + 분자량 없음 → 오류", Boolean(r.error), r.error);
r = runX("toxic_probit", { sub: "7664-41-7", t: 10, C: 5000 });
near("[calc] 암모니아(RIVM a −16.5, b 0.99, n 2.02) 5000 mg/m³ × 10분", r.outputs?.Y, -16.5 + 0.99 * Math.log(Math.pow(5000, 2.02) * 10), 1e-9);
{
  const ch = W.calcFind("toxic_probit").chart(runIn(W, "toxic_probit", {}, {}).values, {});
  check("그래프: 10·30·60분 곡선 + 입력점", ch && ch.series.length === 3 && ch.markers.length === 1 && ch.x.log === true,
    ch && ch.series.map(s => s.key).join(","));
  check("그래프: 곡선이 0 → 100 % 로 오른다", ch && ch.series.every(s => s.points[0][1] < 1 && s.points[s.points.length - 1][1] > 99));
}
check("RIVM 목록 60종 이상, 염소·암모니아·황화수소·시안화수소·포스겐·이산화황 포함",
  W.TOXIC_PROBIT_RIVM.length >= 60 && ["7782-50-5", "7664-41-7", "7783-06-4", "74-90-8", "75-44-5", "7446-09-5"].every(c => W.TOXIC_PROBIT_RIVM.some(x => x.cas === c)));

// ── 용어 설명(term) ── 모든 term key 가 용어집에 있고, 항목마다 이름·정의가 있다
{
  const G = W.TERM_GLOSSARY || {};
  const used = [];
  for (const def of W.CALC_REGISTRY) {
    for (const i of def.inputs) {
      if (i.term) used.push([def.key, i.term]);
      (i.columns || []).forEach(c => c.term && used.push([def.key, c.term]));
    }
    def.outputs.forEach(o => o.term && used.push([def.key, o.term]));
  }
  (W.APL_TERM_KEYS || []).forEach(t => used.push(["applicability", t]));   // 계산기 목록 밖 화면(apl_view.jsx)의 칸·결과 용어
  const unknown = used.filter(([, t]) => !G[t]).map(([k, t]) => `${k}:${t}`);
  check(`term key ${used.length}개 모두 용어집에 있음`, unknown.length === 0, unknown.join(", "));
  const bad = Object.entries(G).filter(([, e]) => !e.term || !e.def || e.def.length > 160).map(([k]) => k);
  check(`용어집 ${Object.keys(G).length}개 항목 모두 이름·정의(160자 이하)`, bad.length === 0, bad.join(", "));
  const noTerm = W.CALC_REGISTRY.filter(d => !used.some(([k]) => k === d.key)).map(d => d.key);
  check("계산기마다 용어 설명이 하나 이상", noTerm.length === 0, noTerm.join(", "));
  const unusedKeys = Object.keys(G).filter(k => !used.some(([, t]) => t === k));
  check("쓰이지 않는 용어 없음", unusedKeys.length === 0, unusedKeys.join(", "));
}

// ── 모든 계산기: 기본값으로 오류 없이 결과, 시험 포함 여부 ──
for (const def of W.CALC_REGISTRY) {
  const res = run(def.key);
  const vals = Object.values(res.outputs || {});
  // engine(무거운 wasm, 예: CoolProp)이 있는 계산기는 여기(동기 vm)서 엔진을 올리지 않는다 — 빈 결과면 통과, 기준값 시험은 test_fluid_vle.cjs
  const pending = def.engine && !def.engine.ready();
  check(`${def.key}: 기본값 계산 OK${pending ? " (엔진 대기: 빈 결과, 수치 시험은 test_fluid_vle.cjs)" : ""}`, res.outputs && !res.error && (pending ? vals.length === 0 : vals.length > 0) && !vals.some(v => typeof v === "number" && !Number.isFinite(v)));
  check(`${def.key}: 식·근거 문헌 있음`, def.formula.length > 0 && def.reference.length > 0);
}

// ── 딥링크·물질 연결 ──
const link = W.calcReadLink("?view=calc&calc=ppm_mgm3&mw=78.1134&name=%EB%B2%A4%EC%A0%A0&dir=mg2ppm");
check("딥링크 읽기", link.calc === "ppm_mgm3" && link.values.mw === "78.1134" && link.name === "벤젠" && link.values.dir === "mg2ppm");
check("다른 화면 주소는 null", W.calcReadLink("?view=board&calc=x") === null);
{
  const def = W.calcFind("ppm_mgm3");
  const st = W.calcInitialState(def, link.values);
  check("딥링크 값이 칸·선택에 들어감", st.mw.raw === "78.1134" && st.dir === "mg2ppm");
  check("안내 줄 2개(분자량, 방향)", W.calcPrefillApplied(def, link.values).length === 2);
  check("없는 선택값은 무시", W.calcInitialState(def, { dir: "zzz" }).dir === "ppm2mg");
}
const sections = [{ section_seq: 9, content: [
  { msdsItemCode: "I36", msdsItemNameKor: "점도", itemDetail: "0.604 cP(25℃)|   ※출처 : ECHA" },
  { msdsItemCode: "I38", msdsItemNameKor: "분자량", itemDetail: "78.1134   |   ※출처 : ChemIDplus" },
] }];
check("MSDS 9항 분자량 읽기(벤젠 정적 자료 형식)", W.calcMolarMassFromSections(sections) === 78.1134);
check("'자료없음' → null", W.calcMolarMassFromSections([{ section_seq: 9, content: [{ msdsItemCode: "I38", itemDetail: "자료없음" }] }]) === null);
check("범위 표기(예: '100~200') → null", W.calcMolarMassFromSections([{ section_seq: 9, content: [{ msdsItemCode: "I38", itemDetail: "100~200 | 출처" }] }]) === null);
check("섹션 없음 → null", W.calcMolarMassFromSections(undefined) === null);
check("물질 링크(분자량 있음)", W.calcSubstanceHref({ name: "벤젠" }, sections) === "?view=calc&calc=ppm_mgm3&mw=78.1134&name=%EB%B2%A4%EC%A0%A0");
check("물질 링크(분자량 없음) → mw 빈칸", W.calcSubstanceHref({ name: "X" }, []) === "?view=calc&calc=ppm_mgm3&mw=&name=X");
{
  const def = W.calcFind("ppm_mgm3");
  const res = W.calcEvaluate(def, W.calcInitialState(def, { mw: "" }));
  check("mw 빈칸으로 열면 '값을 넣으십시오'", res.errors.mw === W.CALC_LABELS.errors.required);
}

// ── 2성분 VLE(vle_binary) ── 자세한 사례(UNIFAC·공비점·CoolProp 물성)는 test_fluid_vle.cjs. 여기서는 SVNA 7판 예제 10.1(Raoult) 한 묶음.
r = runX("vle_binary", { c1: "custom", c2: "custom", model: "ideal", ab: "ln", apu: "kPa", atu: "C", A1: 14.2724, B1: 2945.47, C1: 224.00, A2: 14.2043, B2: 2972.64, C2: 209.00, basis: "T", T: 75, z1: 0.6 });
near("[src SVNA 예제 10.1] 아세토나이트릴/나이트로메테인 75 °C, x₁ = 0.6 → BUBL P = 66.72 kPa", r.outputs?.bub_P / 1000, 66.72, 1e-4);
near("[src SVNA 예제 10.1] y₁ = 0.7483", r.outputs?.bub_y, 0.7483, 2e-4);
near("[src SVNA 예제 10.1] DEW P (y₁ = 0.6) = 59.74 kPa", r.outputs?.dew_P / 1000, 59.74, 1e-4);

// ── 숫자 표기 ──
check("표기 3.1947 → 3.195", W.calcFormatNumber(3.19468) === "3.195");
check("표기 49810 → 49,810", W.calcFormatNumber(49810.4) === "49,810");
check("표기 1.5e-5 → 1.5 × 10⁻⁵", W.calcFormatNumber(1.5e-5) === "1.5 × 10⁻⁵");
check("표기 2.5e7 → 2.5 × 10⁷", W.calcFormatNumber(2.5e7) === "2.5 × 10⁷");

// ════ 영어 화면(?lang=en) — 영어 빠짐 없음 ════
// 1) 위 사례를 모두 en 으로도 돌렸다: 수치는 ko 와 똑같고, 경고·오류·판정 문구에 한글이 없어야 한다.
for (const def of W.CALC_REGISTRY) {
  const issues = enIssues[def.key] || [];
  check(`${def.key}: en 결과 ${enCases[def.key] || 0}사례 — 수치 같음·한글 없음`, enCases[def.key] > 0 && issues.length === 0, issues.slice(0, 3).join(" | "));
}

// 2) 소스: 한글 글자는 tr("한국어", "English") 의 첫 인자 안에만 있어야 한다(compute 안의 아직 안 돈 길도 잡는다).
//    예외: 자료 대조용 글자(MSDS 항목 이름).
const SRC_ALLOW = { "calc_link.jsx": ["분자량"] };
function hangulOutsideTr(rel) {
  const found = [];
  const allow = SRC_ALLOW[rel] || [];
  const inTrFirst = (p) => {
    for (let q = p; q && q.parentPath; q = q.parentPath) {
      const par = q.parent;
      if (par.type === "CallExpression" && par.callee.type === "Identifier" && par.callee.name === "tr") return par.arguments[0] === q.node;
    }
    return false;
  };
  const visit = (p, text) => { if (HANGUL.test(text) && !allow.includes(text) && !inTrFirst(p)) found.push(`${p.node.loc?.start.line}: ${text.slice(0, 40)}`); };
  const plugin = () => ({ visitor: {
    StringLiteral(p) { visit(p, p.node.value); },
    TemplateLiteral(p) { visit(p, p.node.quasis.map(q => q.value.cooked).join("…")); },
  } });
  babel.transform(fs.readFileSync(path.join(CHEMIP, rel), "utf8"), { filename: rel, plugins: [plugin], code: false, comments: false });
  return found;
}
{
  const srcFiles = files.filter(f => PURE.test(f) && f !== "calc_labels.jsx");
  const bad = srcFiles.map(f => [f, hangulOutsideTr(f)]).filter(([, b]) => b.length);
  check(`소스 ${srcFiles.length}개: 한글은 모두 tr() 안`, bad.length === 0, bad.map(([f, b]) => `${f} ${b.slice(0, 2).join(" / ")}`).join(" | "));
}

// 3) 정의: en 으로 올린 정의의 보이는 글자(제목·요약·칸·선택·표·결과·단위·식·주의·근거)에 한글이 없다.
function defTexts(win, def) {
  const out = [["title", def.title], ["summary", def.summary]];
  const unitText = (x) => (x.dim ? win.calcUnitLabel(x.dim, x.show || x.unit) : x.unit);
  for (const i of def.inputs) {
    out.push([`${i.key}.label`, i.label], [`${i.key}.hint`, i.hint], [`${i.key}.unit`, unitText(i)]);
    if (i.dim) Object.values(win.CALC_UNITS[i.dim]).forEach(u => out.push([`${i.key}.units`, u.label]));
    (i.options || []).forEach(o => out.push([`${i.key}.${o.v}`, o.label]));
    (i.columns || []).forEach(c => out.push([`${i.key}.${c.key}`, c.label], [`${i.key}.${c.key}.unit`, c.unit]));
    (i.rows || []).forEach((r, ri) => (i.columns || []).filter(c => c.text).forEach(c => out.push([`${i.key}.${ri}.${c.key}`, r[c.key]])));
  }
  for (const o of def.outputs) {
    out.push([`${o.key}.label`, o.label], [`${o.key}.unit`, unitText(o)]);
    if (o.dim) Object.values(win.CALC_UNITS[o.dim]).forEach(u => out.push([`${o.key}.units`, u.label]));
  }
  ["formula", "notes", "reference"].forEach(f => (def[f] || []).forEach((t, n) => out.push([`${f}.${n}`, t])));
  return out.filter(([, t]) => t != null && t !== "");
}
for (const def of WE.CALC_REGISTRY) {
  const texts = defTexts(WE, def);
  const bad = texts.filter(([, t]) => HANGUL.test(String(t))).map(([k]) => k);
  check(`${def.key}: en 정의 글자 ${texts.length}개 한글 없음`, bad.length === 0, bad.join(", "));
  check(`${def.key}: 제목 ko·en 다름 (${def.title})`, HANGUL.test(W.calcFind(def.key).title) && def.title !== W.calcFind(def.key).title);
}

// 4) 공용 문구: CALC_LABELS_EN·TERM_HINT_LABELS_EN 이 한국어와 같은 모양이고 한글이 없다(함수는 예시 인자로 불러 본다).
function labelLeaves(obj, pre = "") {
  return Object.entries(obj).flatMap(([k, v]) => (v && typeof v === "object" ? labelLeaves(v, `${pre}${k}.`) : [[`${pre}${k}`, v]]));
}
function labelText(v) { return typeof v === "function" ? v(...Array(v.length).fill("x")) : v; }
for (const [name, ko, en] of [["CALC_LABELS", W.CALC_LABELS_KO, WE.CALC_LABELS_EN], ["TERM_HINT_LABELS", W.TERM_HINT_LABELS_KO, WE.TERM_HINT_LABELS_EN]]) {
  const enMap = new Map(labelLeaves(en || {}));
  const missingKeys = labelLeaves(ko || {}).map(([k]) => k).filter(k => !enMap.has(k));
  const hangul = [...enMap].filter(([, v]) => HANGUL.test(String(labelText(v)))).map(([k]) => k);
  check(`${name}: 영어 문구 빠짐 없음·한글 없음 (${enMap.size}개)`, Boolean(ko) && missingKeys.length === 0 && hangul.length === 0, [...missingKeys, ...hangul].join(", "));
}
check("en 화면은 CALC_LABELS = 영어", WE.CALC_LABELS.title === WE.CALC_LABELS_EN.title && W.CALC_LABELS.title === W.CALC_LABELS_KO.title);

// 5) 용어집: 한국어 항목마다 영어 이름·정의(160자 이하)가 있고, en 으로 고른 항목(이름·정의·단위·근거)에 한글이 없다.
{
  const ko = W.TERM_GLOSSARY_KO || {}, en = WE.TERM_GLOSSARY_EN || {};
  const noEn = Object.keys(ko).filter(k => !en[k] || !en[k].term || !en[k].def || en[k].def.length > 160);
  const extra = Object.keys(en).filter(k => !ko[k]);
  check(`용어집 ${Object.keys(ko).length}개 모두 영어 이름·정의(160자 이하)`, Object.keys(ko).length > 0 && noEn.length === 0 && extra.length === 0, [...noEn, ...extra].join(", "));
  const hangul = Object.entries(WE.TERM_GLOSSARY).filter(([, e]) => ["term", "def", "unit", "ref"].some(f => e[f] && HANGUL.test(e[f]))).map(([k]) => k);
  check("en 용어집(이름·정의·단위·근거) 한글 없음", hangul.length === 0, hangul.join(", "));
}

const missing = W.CALC_REGISTRY.map(d => d.key).filter(k => !covered.has(k));
check("등록된 계산기 모두 시험함", missing.length === 0, missing.join(", "));
// v2 계산기는 기본값 돌리기만으로는 부족 — 기준값 시험(runX)이 있어야 한다
const V2_KEYS = ["twa8h", "stoich_air", "evaporation", "gaussian_plume", "relief_valve", "compressibility", "buffer_ph", "water_sat",
  "pipe_size", "npsha", "orifice", "insulation_loss", "nusselt", "psychro", "vessel_volume", "reactor", "pid_tuning", "loop_sim", "tf_tools", "batch_reactor", "runaway", "economics", "flue_gas"];
const noRef = V2_KEYS.filter(k => !explicit.has(k));
check(`v2 계산기 ${V2_KEYS.length}개 모두 기준값 시험`, noRef.length === 0 && V2_KEYS.every(k => W.calcFind(k)), noRef.join(", "));

const failed = results.filter(x => !x).length;
console.log(`\n${results.length - failed}/${results.length} PASS (모듈 ${files.length}개, 계산기 ${W.CALC_REGISTRY.length}개)`);
process.exit(failed ? 1 : 0);

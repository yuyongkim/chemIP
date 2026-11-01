// 분리공정 계산기(flash·mccabe·fug·rayleigh·absorption, public/chemip/calc_*.jsx) 기준값 시험 — 교과서 예제 수치와 손계산.
// test_calculators.cjs 와 같은 길(index.html 순서의 React 없는 calc_* 모듈 → Node vm, ko·en 두 벌)로 올리고, 화면과 같은
// calcEvaluate 로 돌린다. 출처 표기: [src] = 출처에 인쇄된 값, [calc] = 식에서 손으로 낸 값(교과서 식 대조).
//
//   node frontend/scripts/tests/test_calc_separations.cjs
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
// test_calculators.cjs 와 같은 거르기 + 화면 컴포넌트(채우기 단추)
const PURE = /^calc_(?!view|nav|form|field|table_field|table_out|results|notes|unit_select|substance_link|out_table|facts_fill\.|chart(?!_scale))[a-z0-9_]+\.jsx$/;
const PURE_EXTRA = ["lang.jsx", "term_glossary.jsx", "term_glossary_en.jsx"];
const babel = require(path.join(CHEMIP, "vendor", "babel.min.js"));

function load(lang) {
  const html = fs.readFileSync(path.join(CHEMIP, "index.html"), "utf8");
  const files = [...html.matchAll(/<script type="text\/babel" src="([^"?]+)/g)].map(m => m[1]).filter(f => PURE.test(f) || PURE_EXTRA.includes(f))
    .filter(f => fs.existsSync(path.join(CHEMIP, f)));   // 병렬 작업 중 옮겨진 파일은 건너뜀
  const sandbox = { console, URLSearchParams, location: { search: `?lang=${lang}` } };
  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);
  for (const rel of files) {
    const code = babel.transform(fs.readFileSync(path.join(CHEMIP, rel), "utf8"), { ...BABEL_OPTIONS, filename: rel }).code;
    // 다른 작업이 아직 index.html 에 안 올린 정의를 등록 목록이 가리키면(병렬 작업 중) 빈 자리 정의로 메우고 다시 돈다
    for (let tries = 0; ; tries++) {
      try { vm.runInContext(code, ctx, { filename: rel }); break; } catch (e) {
        const m = /^(CALC_DEF_\w+) is not defined/.exec(e.message || "");
        if (!m || tries > 50) throw e;
        sandbox[m[1]] = { key: `_pending_${m[1]}`, group: "_pending", inputs: [], outputs: [], compute: () => ({}) };
      }
    }
  }
  return sandbox;
}

const W = load("ko");
const WE = load("en");
const HANGUL = /[가-힣]/;
const results = [];
function check(name, ok, note = "") {
  results.push(Boolean(ok));
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${note ? ` — ${note}` : ""}`);
}
function near(name, got, want, tol, abs = false) {
  const err = abs ? Math.abs(got - want) : Math.abs(got - want) / Math.abs(want);
  check(name, Number.isFinite(got) && err <= tol, `${got} vs ${want} (${abs ? "±" + tol : "허용 " + tol * 100 + "%"})`);
}

// 화면과 같은 길: 기본 상태 → 덮어쓸 칸(show 단위 글자) → calcEvaluate. en 도 같은 수치·한글 없는 문구인지 본다.
function runIn(win, key, over = {}, tables = {}) {
  const def = win.calcFind(key);
  const st = win.calcInitialState(def, {});
  for (const [k, v] of Object.entries(over)) {
    const i = def.inputs.find(x => x.key === k);
    if (!i) throw new Error(`${key}: no input ${k}`);
    st[k] = i.type === "choice" ? v : typeof v === "object" ? { raw: String(v.raw), unit: v.unit } : { ...st[k], raw: String(v) };
  }
  for (const [k, rows] of Object.entries(tables)) st[k] = rows.map(r => Object.fromEntries(Object.entries(r).map(([c, x]) => [c, String(x)])));
  return { res: win.calcEvaluate(def, st), def };
}
const enBad = [];
function run(key, over, tables) {
  const { res, def } = runIn(W, key, over, tables);
  const en = runIn(WE, key, over, tables).res;
  for (const [k, v] of Object.entries(res.outputs || {})) if (typeof v === "number" && !Object.is(v, en.outputs?.[k])) enBad.push(`${key}.${k}`);
  [en.error, ...(en.warnings || []), ...Object.values(en.outputs || {}).filter(v => typeof v === "string")].filter(t => t && HANGUL.test(t)).forEach(t => enBad.push(`${key}: ${t}`));
  if (def.chart && res.outputs) {
    const c = W.calcChartFor(def, res), ce = WE.calcChartFor(WE.calcFind(key), en);
    res.chart = c;
    if (ce) [ce.x.label, ce.y.label, ce.ariaLabel, ...ce.series.map(s => s.label), ...(ce.markers || []).map(m => m.label)].filter(t => t && HANGUL.test(t)).forEach(t => enBad.push(`${key} chart: ${t}`));
  }
  return res;
}
const C = (T) => W.calcConvert("temperature", T, "K", "C");
const kPa = (P) => P / 1000;

// ════ 1. 기포점·이슬점·플래시 ════
// [src] Smith, Van Ness & Abbott 7판 10장 예제(아세토나이트릴(1)/나이트로메테인(2), ln P[kPa] = A − B/(t[°C] + C), Raoult)
const ACN_NM = [{ name: "acetonitrile", z: 0.6, A: 14.2724, B: 2945.47, C: 224.0 }, { name: "nitromethane", z: 0.4, A: 14.2043, B: 2972.64, C: 209.0 }];
const LNKPA = { base: "ln", pu: "kPa", tu: "C" };
let r = run("flash", { solve: "bubbleP", ...LNKPA, T: 75 }, { rows: ACN_NM });
near("[src] SVA 10장: 75 °C, x₁ = 0.6 → 기포점 P = 66.72 kPa", kPa(r.outputs?.P_out), 66.72, 0.0005);
check("[src] 같은 예: y₁ = 0.7483", /acetonitrile 0\.7483/.test(r.outputs?.y || ""), r.outputs?.y);
r = run("flash", { solve: "bubbleT", ...LNKPA, P: 70 }, { rows: ACN_NM });
near("[src] SVA 10장: 70 kPa, x₁ = 0.6 → 기포점 T = 76.42 °C", C(r.outputs?.T_out), 76.42, 0.01, true);
near("[src] 같은 예: y₁ = 0.7472", Number((/acetonitrile ([\d.]+)/.exec(r.outputs?.y || "") || [])[1]), 0.7472, 2e-4, true);
r = run("flash", { solve: "dewT", ...LNKPA, P: 70 }, { rows: ACN_NM });
near("[src] SVA 10장: 70 kPa, y₁ = 0.6 → 이슬점 T = 79.58 °C", C(r.outputs?.T_out), 79.58, 0.01, true);
check("[src] 같은 예: x₁ = 0.4351", /acetonitrile 0\.4351/.test(r.outputs?.x || ""), r.outputs?.x);
check("2성분 → T–x–y 그래프(기포·이슬 곡선 41점)", r.chart && r.chart.series.length === 2 && r.chart.series[0].points.length === 41, JSON.stringify(r.chart?.series?.map(s => s.points.length)));

// [src] 같은 장 플래시 예제: 아세톤/아세토나이트릴/나이트로메테인 80 °C, 110 kPa, z = 0.45/0.35/0.20,
// P^sat = 195.75 / 97.84 / 50.32 kPa(문제에 주어진 값) → V = 0.7364, x = 0.2859/0.3810/0.3331. P^sat 고정은 A = ln P^sat, B = 0 으로 넣는다.
const SVA_FLASH = [["acetone", 0.45, 195.75], ["acetonitrile", 0.35, 97.84], ["nitromethane", 0.20, 50.32]].map(([name, z, p]) => ({ name, z, A: Math.log(p), B: 0, C: 1 }));
r = run("flash", { solve: "flash", ...LNKPA, T: 80, P: 110 }, { rows: SVA_FLASH });
near("[src] SVA 10장 플래시: V/F = 0.7364", r.outputs?.beta, 0.7364, 0.0002, true);
check("[src] 같은 예: x = 0.2859 · 0.3810 · 0.3331", /acetone 0\.2859 · acetonitrile 0\.381 · nitromethane 0\.3331/.test(r.outputs?.x || ""), r.outputs?.x);
check("두 상 판정", /두 상/.test(r.outputs?.phase || ""), r.outputs?.phase);
r = run("flash", { solve: "bubbleP", ...LNKPA, T: 80 }, { rows: SVA_FLASH });
near("[src] 같은 예: 기포점 압력 132.40 kPa", kPa(r.outputs?.P_out), 132.40, 0.0005);
r = run("flash", { solve: "dewP", ...LNKPA, T: 80 }, { rows: SVA_FLASH });
near("[src] 같은 예: 이슬점 압력 101.52 kPa", kPa(r.outputs?.P_out), 101.52, 0.0005);
r = run("flash", { solve: "flash", ...LNKPA, T: 80, P: 140 }, { rows: SVA_FLASH });
check("P > 기포점 압력 → 과냉 액체(β = 0)", r.outputs?.beta === 0 && /과냉/.test(r.outputs?.phase || ""), r.outputs?.phase);
r = run("flash", { solve: "flash", ...LNKPA, T: 80, P: 100 }, { rows: SVA_FLASH });
check("P < 이슬점 압력 → 과열 증기(β = 1)", r.outputs?.beta === 1 && /과열/.test(r.outputs?.phase || ""), r.outputs?.phase);

// [calc] R5 §2.2: z = 0.3/0.3/0.4, K = 2/1/0.5 → 닫힌 꼴 β = 0.1/0.35
r = run("flash", { kmodel: "k" });
near("[calc] Rachford–Rice 닫힌 꼴 β = 0.2857", r.outputs?.beta, 0.1 / 0.35, 1e-9);
r = run("flash", { kmodel: "k", solve: "bubbleT" });
check("직접 K + 기포점 → 계산 오류", Boolean(r.error), r.error);

// [calc] 벤젠–톨루엔 x = 0.5/0.5, 760 mmHg, R5 Antoine(log₁₀ mmHg °C) → 기포점 ≈ 92 °C (R5: 92.0 °C 에서 ΣxP ≈ 757 mmHg)
r = run("flash", { solve: "bubbleT", P: 101.325 });
const pB = (t) => Math.pow(10, 6.90565 - 1211.033 / (t + 220.79)), pT = (t) => Math.pow(10, 6.95464 - 1344.8 / (t + 219.482));
near("[calc] 벤젠–톨루엔 기포점: ½(P_B + P_T) = 760 mmHg 를 만족", 0.5 * pB(C(r.outputs?.T_out)) + 0.5 * pT(C(r.outputs?.T_out)), 760, 1e-6);
near("[calc] 같은 값 ≈ 92.1 °C (R5 손 어림)", C(r.outputs?.T_out), 92.1, 0.2, true);
r = run("flash");
check("기본값(벤젠–톨루엔 95 °C, 1 atm) 두 상", r.outputs && /두 상/.test(r.outputs.phase), r.outputs?.phase);

// [calc] Wilson K: 프로판 Tc 369.8 K, Pc 42.48 bar, ω 0.152, 300 K, 10 bar → K = (42.48/10)·exp[5.373·1.152·(1 − 369.8/300)]
{
  const m = W.calcSepWilsonModel([{ Tc: 369.8, Pc: 42.48e5, w: 0.152 }]);
  near("[calc] Wilson K 식 그대로", m.s(300)[0] / 10e5, 4.248 * Math.exp(5.373 * 1.152 * (1 - 369.8 / 300)), 1e-12);
  near("Wilson: K = 1 온도(tsat)에서 다시 K = 1", m.s(m.tsat(10e5)[0])[0] / 10e5, 1, 1e-9);
}
r = run("flash", { kmodel: "wilson", solve: "bubbleT", P: 1000 });
check("Wilson 프로판–부탄 1 MPa 기포점 → 프로판(28 °C)–부탄(79 °C) 끓는점 사이", r.outputs && C(r.outputs.T_out) > 20 && C(r.outputs.T_out) < 80, `${C(r.outputs?.T_out)} °C`);

// ── Antoine 채우기(순수 함수) ──
check("조건 글자 '20℃' → 20", W.calcFactsTempC("20℃") === 20 && W.calcFactsTempC("25 °C") === 25 && W.calcFactsTempC("760 mmHg") === null);
{
  // f/71-43-2.json 의 실제 값 모양: 증기압 10 kPa(20℃), 끓는점 80 °C
  const facts = { props: { boiling_point: [{ n: 80, u: "°C" }], vapor_pressure: [{ n: 10000, u: "Pa", c: "20℃" }] } };
  const fit = W.calcAntoineFromFacts(facts);
  const p = (t) => Math.pow(10, fit.A - fit.B / (fit.C + t));
  near("[calc] 벤젠 두 점 맞춤: 80 °C 에서 760 mmHg", p(80), 760, 1e-9);
  near("[calc] 같은 맞춤: 50 °C 증기압이 R5 Antoine 과 5 % 안", p(50), pB(50), 0.05);
  check("끓는점 없으면 null", W.calcAntoineFromFacts({ props: { vapor_pressure: [{ n: 10000, u: "Pa", c: "20℃" }] } }) === null);
  check("조건 온도 없는 증기압은 건너뜀 → null", W.calcAntoineFromFacts({ props: { boiling_point: [{ n: 80, u: "°C" }], vapor_pressure: [{ n: 10000, u: "Pa", c: null }] } }) === null);
  const conv = W.calcAntoineToConv(fit, { base: "ln", pu: "kPa", tu: "K" });
  near("꼴 바꾸기(log₁₀ mmHg °C → ln kPa K) 같은 증기압", Math.exp(conv.A - conv.B / (conv.C + 323.15)) * 1000 / 133.322387415, p(50), 1e-9);
  const back = W.calcAntoineConvert(W.calcAntoineConvert({ A: 6.90565, B: 1211.033, C: 220.79 }, W.CALC_ANTOINE_BASE_FORM, W.CALC_ANTOINE_SI_FORM), W.CALC_ANTOINE_SI_FORM, W.CALC_ANTOINE_BASE_FORM);
  near("꼴 바꾸기 왕복", back.A, 6.90565, 1e-12);
}
if (W.CALC_VLE_ANTOINE_DATA) {
  const pre = W.calcAntoinePreset("Benzene", null);
  check("사전 설정 물질: 'Benzene' 찾음", pre && pre.id === "Benzene");
  near("사전 설정 벤젠 80.1 °C → 101.3 kPa ±0.5 %", pre && Math.exp(pre.A - pre.B / (pre.C + 353.25)), 101325, 0.005);
  if (W.CALC_FLUID_DATA) check("사전 설정 물질: CAS 108-88-3 → Toluene", (W.calcAntoinePreset("x", "108-88-3") || {}).id === "Toluene");
  check("사전 설정 물질: 한국어 이름 '톨루엔'", !W.CALC_FLUID_NAMES || (W.calcAntoinePreset("톨루엔", null) || {}).id === "Toluene");
}

// ════ 2. McCabe–Thiele ════
// [calc] R5 §2.1: α = 2.5, xF = 0.5, q = 1, xD = 0.95, xB = 0.05 → Rmin = 1.10, 전환류 ≈ Fenske ln 361/ln 2.5 = 6.43
r = run("mccabe");
near("[calc] α 2.5: Rmin = 1.10 (Underwood 2성분 식)", r.outputs?.Rmin, 1.1, 1e-9);
// 계단 수의 분수 부분은 마지막 계단 수평 길이 비율(교과서 관례)이라 연속식 Fenske 와 0.1단쯤 다르다
near("[calc] 전환류 계단 수 ≈ Fenske 6.43 (±0.15단)", r.outputs?.Nmin, Math.log(361) / Math.log(2.5), 0.15, true);
check("기본값(1.3 Rmin): N > Nmin, 급액단 1 < f < N", r.outputs && r.outputs.N > r.outputs.Nmin && r.outputs.feed > 1 && r.outputs.feed < r.outputs.N + 1, JSON.stringify(r.outputs));
check("계단 그래프: 평형·대각·정류·탈거·q·계단 6계열", r.chart && r.chart.series.length === 6 && r.chart.series[5].points.length > 10);
// [src] Geankoplis 예제 11.4-1: 벤젠–톨루엔 101.3 kPa, xF 0.45, 원료 54.4 °C(q = 1 + 159·(366.7 − 327.6)/32 099 = 1.194),
// xD 0.95, xW 0.10, R = 4 → D = 41.2 kmol/h(F 100), 이론단 7.6 단(재비기 포함, FOSSEE 판 7.5), 급액 5 번째 단.
// 평형은 Raoult + R5 Antoine 상수(책의 표 11.1-1 도 Raoult 로 만든 값: 예제 11.1-1).
const qG = 1 + 159 * (366.7 - 327.6) / 32099;
r = run("mccabe", { eqmode: "raoult", P: 101.32, xF: 0.45, q: qG, xD: 0.95, xB: 0.10, rmode: "R", R: 4 });
near("[src] Geankoplis 11.4-1: D = 41.2 kmol/h (F = 100)", 100 * r.outputs?.DF, 41.2, 0.05, true);
near("[src] Geankoplis 11.4-1: 이론단 7.6 단(재비기 포함) ±0.4", r.outputs?.N, 7.6, 0.4, true);
// 4 번째 계단의 x(0.468)가 두 조작선 교점(0.4686)과 거의 같아 4·5 어느 쪽도 최적에 가깝다(책은 그래프로 5)
check("[src] Geankoplis 11.4-1: 급액 4–5 번째 단(책 5, 경계)", r.outputs?.feed === 4 || r.outputs?.feed === 5, String(r.outputs?.feed));
// [src] Geankoplis 예제 11.4-2: 같은 원료의 최소 환류비 Rm = 1.17, 전환류 5.8 단(재비기 포함, FOSSEE 판)
// 책은 그래프에서 y′ = 0.702 를 읽어 1.17. 여기 Raoult 곡선은 y′ = 0.7066 — y′ 0.004 차이가 Rm 3 % 차이가 된다
near("[src] Geankoplis 11.4-2: Rm = 1.17 (그래프 읽음) ±4 %", r.outputs?.Rmin, 1.17, 0.04);
near("[src] Geankoplis 11.4-2: 전환류 5.8 단 ±0.3", r.outputs?.Nmin, 5.8, 0.3, true);
r = run("mccabe", { rmode: "R", R: 1.0 });
check("R < Rmin → 계산 오류(단 수 무한)", Boolean(r.error) && /최소 환류비/.test(r.error), r.error);
r = run("mccabe", { xB: 0.6 });
check("xB > xF → 계산 오류", Boolean(r.error));
r = run("mccabe", { eqmode: "raoult" }, { pair: [{ name: "T", A: 6.95464, B: 1344.8, C: 219.482 }, { name: "B", A: 6.90565, B: 1211.033, C: 220.79 }] });
check("Raoult 쌍 순서가 거꾸로(중 성분 먼저) → 오류", Boolean(r.error) && /경 성분/.test(r.error), r.error);
r = run("mccabe", { q: 0 });
check("q = 0 (포화 증기 원료)도 풀림", r.outputs && r.outputs.Rmin > 1.1, String(r.outputs?.Rmin));

// ════ 3. FUG ════
// [calc] R5 §2.6 2성분: Nmin = 6.43, Rmin = 1.10, R = 1.3·Rmin = 1.43 → X = 0.136, Y = 0.518, N ≈ 14.4
r = run("fug", { lk: 1, hk: 2, rLK: 0.95, rHK: 0.95, mult: 1.3 }, { rows: [{ name: "A", z: 0.5, alpha: 2.5 }, { name: "B", z: 0.5, alpha: 1 }] });
near("[calc] R5 2성분 Fenske Nmin = 6.43", r.outputs?.Nmin, 6.43, 0.001);
near("[calc] R5 Underwood Rmin = 1.10", r.outputs?.Rmin, 1.1, 1e-6);
near("[calc] R5 Gilliland–Molokanov N ≈ 14.4", r.outputs?.N, 14.4, 0.01);
near("[calc] Molokanov Y(0.136) = 0.518", W.calcGillilandY(0.136), 0.518, 0.002);
// [src] Geankoplis 예제 11.7-2·11.7-3: C4/C5/C6/C7 = 0.40/0.25/0.20/0.15, LK = C5, HK = C6, 회수율 0.90/0.90, q = 1
near("[src] Geankoplis 11.7-2: Fenske Nm = 5.389 (α_LK 평균 2.258)", W.calcFenskeNmin(0.9, 0.9, 2.258), 5.389, 0.003);
{
  const a = [5.2, 2.3, 1, 0.4667], z = [0.4, 0.25, 0.2, 0.15];
  const { theta } = W.calcUnderwoodTheta(a, z, 1, 1, 2.3);
  near("[src] Geankoplis 11.7-3: Underwood Rm = 0.395 (책의 xD 0.6197/0.3489/0.0310/0.0004)", W.calcUnderwoodRmin(a, [0.6197, 0.3489, 0.0310, 0.0004], theta), 0.395, 0.01);
  const kb = W.calcKirkbride(11, 0.25, 0.20, 0.0704, 0.0310, 35.516 / 64.484);
  near("[src] Geankoplis 11.7-3: Kirkbride N = 11 → 급액 위 5.96 단(6 번째 단)", kb.NR, 5.96, 0.01, true);
}
r = run("fug");
near("[src] 기본값(Geankoplis 11.7-3 원료): Rmin ≈ 0.395 (Fenske 분배 xD 로) ±2 %", r.outputs?.Rmin, 0.395, 0.02);
check("FUG 기본값: Gilliland 선도에 운전점", r.chart && r.chart.markers.length === 1 && r.chart.x.log === true);
const note12 = r.outputs?.N;
r = run("fug", { lk: 3, hk: 2 });
check("LK 의 α ≤ HK → 오류", Boolean(r.error));
r = run("fug", { lk: 7 });
check("없는 행 번호 → 오류", Boolean(r.error));

// ════ 4. Rayleigh 단증류 ════
// [src] Treybal 예제 9.6: n-헵탄–n-옥탄 50 mol%, 100 mol 중 60 mol 유출, 1 atm → xW = 0.33, yD,av = 0.614 (α ≈ 2.16 로 어림)
r = run("rayleigh");
near("[src] Treybal 9.6: 잔액 xW = 0.33 (±0.005)", r.outputs?.xW, 0.33, 0.005, true);
near("[src] Treybal 9.6: 유출액 평균 yD,av = 0.614 (±0.005)", r.outputs?.xD, 0.614, 0.005, true);
near("물질 수지 W = 40 mol", r.outputs?.W, 40, 1e-9);
{
  // [calc] 닫힌 꼴 = 1/(y − x) 수치 적분(Simpson 2000 칸)
  const a = 2.16, xF = 0.5, xW = r.outputs?.xW, n = 2000, h = (xF - xW) / n;
  const f = (x) => 1 / (a * x / (1 + (a - 1) * x) - x);
  let s = f(xW) + f(xF);
  for (let i = 1; i < n; i++) s += (i % 2 ? 4 : 2) * f(xW + i * h);
  near("[calc] Rayleigh 닫힌 꼴 = ∫dx/(y − x) 수치 적분", Math.log(100 / r.outputs?.W), s * h / 3, 1e-8);
}
r = run("rayleigh", { mode: "xW", xW: 0.3 });
const r2 = run("rayleigh", { frac: r.outputs?.DF });
near("xW → D/F → xW 왕복", r2.outputs?.xW, 0.3, 1e-9);
r = run("rayleigh", { mode: "xW", xW: 0.6 });
check("xW > xF → 오류", Boolean(r.error));

// ════ 5. 흡수·탈거 ════
// [src] Geankoplis 예제 10.3-3: y_{N+1} = 0.01, y₁ = 0.00101, x₀ = 0, m = 2.53, 평균 A = 1.193 → N = 5.05
r = run("absorption", { LV: 1.193 * 2.53, yout: 0.00101 });
near("[src] Geankoplis 10.3-3: Kremser N = 5.05", r.outputs?.N, 5.05, 0.005);
near("A = 1.193", r.outputs?.A, 1.193, 1e-9);
// [calc] R5 §2.11: A = 1.4, N = 5 → φ = 0.9387
r = run("absorption", { solve: "out", N: 5, LV: 1.4 * 2.53 });
near("[calc] Kremser A 1.4, N 5 → 상대 회수율 0.9387", r.outputs?.phi, 0.9387, 0.0005);
r = run("absorption", { proc: "strip", solve: "out", N: 5, LV: 2.53 / 1.4, xin: 0.01, yin: 0 });
near("[calc] 탈거 S 1.4, N 5 → 0.9387 (같은 꼴)", r.outputs?.phi, 0.9387, 0.0005);
near("탈거 물질 수지: y_out = (L/V)(x_in − x_out)", r.outputs?.yout, (1 / 1.4 * 2.53) * (0.01 - r.outputs?.xout), 1e-9);
// [src] Geankoplis 예제 10.6-2·10.6-3: 아세톤 y₁ 0.026 → y₂ 0.005, x₂ = 0, 평형 x 0.0333 ↔ p 30 mmHg(m = (30/760)/0.0333),
// 불활성 기체 13.65·물 45.36 kmol/h, V = 3.852e-3 kmol/s, S = 0.186 m², Kya = 0.022523 → HOG = 0.919 m, NOG = 2.059(대수 평균 추진력)
const mG = (30 / 760) / 0.0333;
r = run("absorption", { m: mG, LV: 45.36 / 13.65, yin: 0.026, yout: 0.005, flux: 3.852e-3 / 0.186, Ka: 0.022523 });
near("[src] Geankoplis 10.6-3: HOG = 0.919 m", r.outputs?.HTU, 0.919, 0.001);
near("[src] Geankoplis 10.6-3: NOG = 2.059 (Colburn 식은 대수 평균과 ±2 %)", r.outputs?.NTU, 2.059, 0.02);
near("[calc] (L/V)min = (y_in − y_out)/(y_in/m)", r.outputs?.LVmin, (0.026 - 0.005) / (0.026 / mG), 1e-12);
near("충전 높이 = HOG × NOG", r.outputs?.Z, r.outputs?.HTU * r.outputs?.NTU, 1e-12);
r = run("absorption", { LV: 0.5 * 2.53, yout: 0.001 });
check("A = 0.5 < 1 로 90 % 회수 불가 → 오류", Boolean(r.error) && /A/.test(r.error), r.error);
r = run("absorption", { solve: "out", N: 4, LV: 2.53 });
near("A = 1 → φ = N/(N + 1)", r.outputs?.phi, 0.8, 1e-9);
check("Kremser 그래프: 지금 A + 기준 곡선", r.chart && r.chart.series.length >= 4);

// ── 정의 공통: 용어 key, en 결과 ──
for (const key of ["flash", "mccabe", "fug", "rayleigh", "absorption"]) {
  const def = W.calcFind(key);
  check(`${key}: 등록·분리공정 묶음`, def && def.group === "separation" && W.CALC_GROUPS.includes("separation"));
  const terms = [...def.inputs.flatMap(i => [i.term, ...(i.columns || []).map(c => c.term)]), ...def.outputs.map(o => o.term)].filter(Boolean);
  const missing = terms.filter(t => !W.TERM_GLOSSARY_KO[t] || !WE.TERM_GLOSSARY_EN[t]);
  check(`${key}: 용어 ${new Set(terms).size}개 모두 한·영 용어집에 있음`, missing.length === 0, missing.join(", "));
}
check("en: 수치 같음·문구·그래프 글자에 한글 없음", enBad.length === 0, enBad.slice(0, 4).join(" | "));
console.log(`(참고) FUG 기본값 Gilliland–Molokanov N = ${note12}`);

const failed = results.filter(x => !x).length;
console.log(`\n${results.length - failed}/${results.length} PASS`);
process.exit(failed ? 1 : 0);

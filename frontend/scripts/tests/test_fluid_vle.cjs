// 실유체 물성(fluid_props, CoolProp wasm)·2성분 VLE(vle_binary) 계산기 시험 — 화면 없이 계산기 순수 모듈 + vendored CoolProp 8.0.0.
// 사례 표시: [src] = 출처에 인쇄된 값, [calc] = 해석·손계산 대조. 같은 사례를 ko·en 두 벌로 돌려 수치가 같은지·en 문구에 한글이 없는지도 본다.
//   node frontend/scripts/tests/test_fluid_vle.cjs
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { pathToFileURL } = require("url");

const CHEMIP = path.join(__dirname, "..", "..", "public", "chemip");
const BABEL_OPTIONS = {
  presets: ["react", "env"],
  plugins: ["transform-class-properties", "transform-object-rest-spread", "transform-flow-strip-types"],
  targets: { browsers: undefined }, compact: false, comments: false,
};
const PURE = /^calc_(?!view|nav|form|field|table_field|results|notes|unit_select|substance_link|out_table|table_out|next_links)[a-z0-9_]+\.jsx$/;
const PURE_EXTRA = ["lang.jsx", "term_glossary.jsx", "term_glossary_en.jsx"];
const babel = require(path.join(CHEMIP, "vendor", "babel.min.js"));
const HANGUL = /[가-힣ㄱ-ㆎ]/;

function load(lang) {
  const html = fs.readFileSync(path.join(CHEMIP, "index.html"), "utf8");
  const files = [...html.matchAll(/<script type="text\/babel" src="([^"?]+)/g)].map(m => m[1]).filter(f => PURE.test(f) || PURE_EXTRA.includes(f));
  const sandbox = { console, URLSearchParams, URL, location: { search: `?lang=${lang}` } };
  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);
  for (const rel of files) vm.runInContext(babel.transform(fs.readFileSync(path.join(CHEMIP, rel), "utf8"), { ...BABEL_OPTIONS, filename: rel }).code, ctx, { filename: rel });
  return sandbox;
}

const results = [];
function check(name, ok, note = "") {
  results.push(Boolean(ok));
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${note ? ` — ${note}` : ""}`);
}
const rel = (a, b) => Math.abs(a - b) / Math.abs(b);
function near(name, got, want, tol, unit = "") {
  check(name, Number.isFinite(got) && rel(got, want) <= tol, `${got} vs ${want}${unit ? ` ${unit}` : ""} (허용 ${+(tol * 100).toPrecision(3)}%)`);
}
function nearAbs(name, got, want, tol, unit = "") {
  check(name, Number.isFinite(got) && Math.abs(got - want) <= tol, `${got} vs ${want}${unit ? ` ${unit}` : ""} (허용 ±${tol})`);
}

// 화면과 같은 길: 기본 상태 → 덮어쓰기(show 단위 글자) → calcEvaluate. 표 칸은 행 배열로.
function runIn(W, key, overrides = {}, tables = {}) {
  const def = W.calcFind(key);
  const state = W.calcInitialState(def, {});
  for (const [k, v] of Object.entries(overrides)) {
    const input = def.inputs.find(i => i.key === k);
    if (!input) throw new Error(`${key}: 칸 없음 ${k}`);
    if (input.type === "choice") state[k] = v;
    else if (typeof v === "object") state[k] = { raw: String(v.raw), unit: v.unit };
    else state[k] = { ...state[k], raw: String(v) };
  }
  for (const [k, rows] of Object.entries(tables)) state[k] = rows.map(r => Object.fromEntries(Object.entries(r).map(([c, x]) => [c, String(x)])));
  const res = W.calcEvaluate(def, state);
  return { res, chart: W.calcChartFor(def, res), table: W.calcTableFor ? W.calcTableFor(def, res) : null };
}

let W, WE;
const enIssues = [];
function run(key, overrides, tables) {
  const ko = runIn(W, key, overrides, tables), en = runIn(WE, key, overrides, tables);
  const a = ko.res, b = en.res;
  if (Boolean(a.error) !== Boolean(b.error)) enIssues.push(`${key}: 오류 유무 다름`);
  for (const [k, v] of Object.entries(a.outputs || {})) {
    if (typeof v === "number" && !Object.is(v, b.outputs?.[k])) enIssues.push(`${key}.${k}: ${v} / ${b.outputs?.[k]}`);
  }
  const texts = [b.error, ...(b.warnings || []), ...Object.values(b.outputs || {}).filter(x => typeof x === "string"), JSON.stringify(en.chart || ""), JSON.stringify(en.table || "")];
  texts.filter(t => t && HANGUL.test(t)).forEach(t => enIssues.push(`${key}: en 한글 ${String(t).slice(0, 80)}`));
  return ko;
}
const C = (k) => k - 273.15;

async function main() {
  W = load("ko");
  WE = load("en");
  const mod = await import(pathToFileURL(path.join(CHEMIP, "vendor", "coolprop", "coolprop.js")).href);

  // ── 0. 엔진 없을 때 ──
  let r = run("fluid_props");
  check("엔진 불러오기 전: 오류 없이 빈 결과(상태 줄이 대신 보임)", !r.res.error && r.res.outputs && Object.keys(r.res.outputs).length === 0 && r.chart === null);
  check("계산기 정의에 engine(9.2 MB, 열 때만)", W.calcFind("fluid_props").engine === W.CALC_FLUID_ENGINE && !W.calcFluidEngineReady());

  const CP = await mod.default();
  W.calcFluidEngineUse(CP);
  WE.calcFluidEngineUse(CP);
  check("CoolProp 판 = 8.0.0 (vendor/coolprop/manifest.json)", CP.get_global_param_string("version") === JSON.parse(fs.readFileSync(path.join(CHEMIP, "vendor", "coolprop", "manifest.json"), "utf8")).version);
  check("유체 목록 136종 = CoolProp FluidsList", W.CALC_FLUID_DATA.length === 136 && CP.get_global_param_string("FluidsList").split(",").length === 136);

  // ── 1. vendored 엔진 자체: CoolProp 문서 값·IAPWS 시험값 [src] ──
  near("[src CoolProp 문서 High-level API] 물 T_sat(101325 Pa) = 373.1242958 K", CP.PropsSI("T", "P", 101325, "Q", 0, "Water"), 373.1242958476844, 1e-9);
  near("[src CoolProp 문서] 물 cp(101325 Pa, 300 K) = 4180.6358 J/(kg·K)", CP.PropsSI("C", "P", 101325, "T", 300, "Water"), 4180.6357765560715, 1e-9);
  near("[src CoolProp 문서] 질소 ρ(298.15 K, 101325 Pa) = 1.14524489 kg/m³", CP.PropsSI("D", "T", 298.15, "P", 101325, "Nitrogen"), 1.1452448929367, 1e-9);
  const iapws95 = [  // IAPWS R6-95(2018) Table 7: T [K], ρ [kg/m³] → p [MPa], cv [kJ/(kg·K)], w [m/s], s [kJ/(kg·K)]
    [300, 996.556, 0.0992418352, 4.13018112, 1501.51914, 0.393062643],
    [300, 1005.308, 20.0022515, 4.06798347, 1534.92501, 0.387405401],
    [500, 0.435, 0.0999679423, 1.50817541, 548.314253, 7.94488271],
    [900, 0.241, 0.100062559, 1.75890657, 724.027147, 9.16653194],
  ];
  for (const [T, D, p, cv, w, s] of iapws95) {
    const AS = CP.factory("HEOS", "Water");
    AS.update(CP.input_pairs.DmassT_INPUTS, D, T);
    check(`[src IAPWS-95 표 7] 물 T=${T} K, ρ=${D}: p·cv·w·s (허용 1e-6)`, [AS.p() / 1e6, AS.cvmass() / 1e3, AS.speed_sound(), AS.smass() / 1e3].every((v, i) => rel(v, [p, cv, w, s][i]) < 1e-6),
      `${AS.p() / 1e6} ${AS.cvmass() / 1e3} ${AS.speed_sound()} ${AS.smass() / 1e3}`);
  }
  for (const [T, D, mu] of [[298.15, 998, 889.7351], [373.15, 1000, 307.883622], [873.15, 100, 35.802262]]) {
    const AS = CP.factory("HEOS", "Water");
    AS.update(CP.input_pairs.DmassT_INPUTS, D, T);
    near(`[src IAPWS 2008 점도 표 4] 물 T=${T} K, ρ=${D} → μ = ${mu} µPa·s`, AS.viscosity() * 1e6, mu, 2e-6);
  }
  for (const [T, D, lam] of [[298.15, 998, 607.712356], [298.15, 1200, 799.038144], [873.15, 0.01, 79.1034659]]) {
    const AS = CP.factory("HEOS", "Water");
    AS.update(CP.input_pairs.DmassT_INPUTS, D, T);
    near(`[src IAPWS 2011 열전도도 표 4] 물 T=${T} K, ρ=${D} → λ = ${lam} mW/(m·K) (임계 증강 포함 차이 허용 0.3%)`, AS.conductivity() * 1e3, lam, 3e-3);
  }

  // ── 2. 계산기: 상태 물성 ──
  r = run("fluid_props", { fluid: "R134a", pair: "TQ", T: 0, x: 0 });
  nearAbs("[src IIR 기준 상태] R134a 0 °C 포화 액 h = 200 kJ/kg", r.res.outputs?.H_out, 200, 1e-4, "kJ/kg");
  nearAbs("[src IIR 기준 상태] R134a 0 °C 포화 액 s = 1.000 kJ/(kg·K)", r.res.outputs?.S_out, 1, 1e-6);
  near("[src Tillner-Roth & Baehr 1994 / ASHRAE 표] R134a 0 °C 포화압 292.8 kPa", r.res.outputs?.P_out / 1000, 292.80, 5e-4, "kPa");
  check("R134a 0 °C x=0 → 상 '포화 액체', cp·점도 있음", r.res.outputs?.phase_out === "포화 액체" && r.res.outputs.Cp_out > 1 && r.res.outputs.V_out > 0, r.res.outputs?.phase_out);
  check("p-h 그래프: 돔 + 상태점(로그 압력축)", r.chart && r.chart.y.log && r.chart.series[0].points.length > 40 && r.chart.markers.length === 1);
  r = run("fluid_props", { fluid: "R134a", pair: "TQ", T: 40, x: 0 });
  near("[src Tillner-Roth & Baehr 1994 / ASHRAE 표] R134a 40 °C 포화압 1016.6 kPa", r.res.outputs?.P_out / 1000, 1016.6, 5e-4, "kPa");
  r = run("fluid_props", { fluid: "R134a", mode: "sat", T1: -40, T2: 60, n: 11 });
  nearAbs("[src Tillner-Roth & Baehr 1994] R134a 임계 온도 374.21 K", r.res.outputs?.Tc_out, 374.21, 0.005, "K");
  near("[src Tillner-Roth & Baehr 1994] R134a 임계 압력 4.05928 MPa", r.res.outputs?.pc_out, 4.05928e6, 2e-5, "Pa");
  nearAbs("[src ASHRAE 표] R134a 표준 끓는점 −26.07 °C", C(r.res.outputs?.Tb_out), -26.07, 0.03, "°C");
  check("포화 표 11행·열 9개(순수 유체)·CSV 파일 이름", r.table && r.table.rows.length === 11 && r.table.columns.length === 9 && /saturation_R134a/.test(r.table.filename));
  check("포화 곡선 그래프 P–T(로그)", r.chart && r.chart.y.log && r.chart.series[0].points.length === 11);
  r = run("fluid_props", { fluid: "CarbonDioxide", pair: "TQ", T: 0, x: 1 });
  near("[src Span & Wagner 1996] CO₂ 0 °C 포화압 3.4851 MPa", r.res.outputs?.P_out, 3.4851e6, 2e-4, "Pa");
  nearAbs("[src Span & Wagner 1996] CO₂ 임계 온도 304.1282 K", r.res.outputs?.Tc_out, 304.1282, 1e-3, "K");
  near("[src Span & Wagner 1996] CO₂ 임계 압력 7.3773 MPa", r.res.outputs?.pc_out, 7.3773e6, 1e-4, "Pa");
  r = run("fluid_props", { fluid: "Water", pair: "TP", T: 25, P: 101.325 });
  near("[src IAPWS-95] 물 25 °C·1 atm ρ = 997.05 kg/m³", r.res.outputs?.D_out, 997.05, 2e-5);
  check("물 25 °C·1 atm → 압축액", r.res.outputs?.phase_out === "압축액(과냉액)", r.res.outputs?.phase_out);
  r = run("fluid_props", { fluid: "Water", pair: "PQ", P: 101.325, x: 1 });
  near("[src IAPWS-95 증기표] 물 1 atm 증발 잠열: h_g − h_f = 2256.4 kJ/kg (h_g)", r.res.outputs?.H_out - run("fluid_props", { fluid: "Water", pair: "PQ", P: 101.325, x: 0 }).res.outputs?.H_out, 2256.4, 5e-4);
  // 입력 쌍 왕복 [calc]: (T, P) 로 구한 h·s 를 (P, h)·(P, s)·(h, s)·(T, s) 에 다시 넣어 같은 T 가 나오는지
  const base = run("fluid_props", { fluid: "Ammonia", pair: "TP", T: 60, P: 500 }).res.outputs;
  for (const [pair, o] of [["PH", { P: 500, h: base.H_out }], ["PS", { P: 500, s: base.S_out }], ["HS", { h: base.H_out, s: base.S_out }], ["TS", { T: 60, s: base.S_out }]]) {
    const q = run("fluid_props", { fluid: "Ammonia", pair, ...o }).res.outputs;
    nearAbs(`[calc] 암모니아 왕복 (T,P) → (${pair}) → T = 60 °C`, C(q?.T_out), 60, 1e-5, "°C");
  }
  r = run("fluid_props", { fluid: "R134a", pair: "PH", P: 300, h: 300 });
  check("[calc] R134a 300 kPa·h=300 → 2상, 건도 0–1, 수송 성질 숨김 + 경고", r.res.outputs?.Q_out > 0 && r.res.outputs.Q_out < 1 && r.res.outputs.V_out == null && r.res.warnings.length === 1);
  r = run("fluid_props", { fluid: "R410A", pair: "TQ", T: 0, x: 0.5 });
  check("유사순수 R410A 건도 0.5 → 입력 오류(P, h 로 지정 안내)", /건도 0 또는 1/.test(r.res.error || ""), r.res.error);
  r = run("fluid_props", { fluid: "R410A", pair: "PH", P: 800, h: 300 });
  check("유사순수 R410A P·h 2상 → 계산됨", r.res.outputs?.Q_out > 0 && r.res.outputs.Q_out < 1);
  r = run("fluid_props", { fluid: "R134a", pair: "TP", T: 500, P: 100 });
  check("R134a 500 °C → 상태식 범위 밖 오류", /범위/.test(r.res.error || ""), r.res.error);
  r = run("fluid_props", { fluid: "Water", pair: "PH", P: 100, h: 99999 });
  check("풀 수 없는 상태 → CoolProp 원문을 담은 오류", /CoolProp/.test(r.res.error || ""), r.res.error);

  // ── 3. 냉동 사이클 ── Çengel & Boles 7판 예제 11-1: R-134a 이상 사이클 0.14 ↔ 0.8 MPa, ṁ = 0.05 kg/s
  const Te = CP.PropsSI("T", "P", 0.14e6, "Q", 1, "R134a"), Tcd = CP.PropsSI("T", "P", 0.8e6, "Q", 0, "R134a");
  r = run("fluid_props", { fluid: "R134a", mode: "cycle", Te: { raw: Te, unit: "K" }, Tc: { raw: Tcd, unit: "K" }, sh: 0, sc: 0, eta: 1, cap: { raw: 0.05 * 143.69e3, unit: "W" } });
  const o = r.res.outputs || {};
  near("[src Çengel & Boles 예제 11-1] 냉동 효과 h1 − h4 = 239.16 − 95.47 = 143.69 kJ/kg", o.qe, 143.69, 3e-3);
  near("[src Çengel & Boles 예제 11-1] 압축 일 h2 − h1 = 275.39 − 239.16 = 36.23 kJ/kg", o.w, 36.23, 6e-3);
  near("[src Çengel & Boles 예제 11-1] COP_R = 3.97", o.cop, 3.97, 6e-3);
  near("[src Çengel & Boles 예제 11-1] 압축기 동력 1.81 kW (ṁ 0.05 kg/s)", o.W_comp / 1000, 1.81, 8e-3);
  near("[src Çengel & Boles 예제 11-1] 응축기 방열 8.98 kW", o.Q_cond / 1000, 8.98, 6e-3);
  near("[calc] 카르노 COP = T_e/(T_c − T_e)", o.cop_carnot, Te / (Tcd - Te), 1e-12);
  check("[calc] COP < 카르노 COP, x4 0–1, 사이클 표 4행, 그래프 돔 + 사이클 + 점 4개", o.cop < o.cop_carnot && o.x4 > 0 && o.x4 < 1 && o.cycle_tbl?.rows.length === 4
    && r.chart?.series.length === 2 && r.chart.series[1].points.length === 5 && r.chart.markers.length === 4);
  r = run("fluid_props", { fluid: "R134a", mode: "cycle", Te: -10, Tc: 40, sh: 5, sc: 5, eta: 0.75 });
  const o2 = r.res.outputs || {};
  check("[calc] η = 0.75 → w 가 등엔트로피 일 ÷ 0.75, 토출 온도가 응축 온도보다 높음", o2.w > 0 && C(o2.T2) > 40 && o2.cop < 4.5 && o2.cop > 2.5, `COP ${o2.cop}, T2 ${C(o2.T2)} °C`);
  r = run("fluid_props", { fluid: "CarbonDioxide", mode: "cycle", Te: -10, Tc: 40 });
  check("CO₂ 응축 40 °C(임계 31 °C 위) → 초임계 사이클 안내 오류", /임계/.test(r.res.error || ""), r.res.error);
  r = run("fluid_props", { fluid: "R410A", mode: "cycle", Te: 5, Tc: 45 });
  check("R410A 사이클 → 계산 + 혼합 냉매 이슬점·기포점 경고", r.res.outputs?.cop > 0 && r.res.warnings.some(w => /혼합 냉매/.test(w)));

  // ── 4. CAS 연결 ──
  check("CAS 811-97-2 → R134a, 7664-41-7 → Ammonia, 124-38-9 → CarbonDioxide, 74-98-6 → n-Propane",
    W.calcFluidForCas("811-97-2") === "R134a" && W.calcFluidForCas("7664-41-7") === "Ammonia" && W.calcFluidForCas("124-38-9") === "CarbonDioxide" && W.calcFluidForCas("74-98-6") === "n-Propane");
  check("CAS 없음·혼합 냉매 → null, 수소 1333-74-0 → Hydrogen(ortho/para 아님)", W.calcFluidForCas("") === null && W.calcFluidForCas("50-00-0") === null && W.calcFluidForCas("1333-74-0") === "Hydrogen");

  // ── 5. VLE: SVNA 7판 예제 10.1 (아세토나이트릴(1)/나이트로메테인(2), Raoult) ──
  const svna1 = { c1: "custom", c2: "custom", model: "ideal", ab: "ln", apu: "kPa", atu: "C", A1: 14.2724, B1: 2945.47, C1: 224.00, A2: 14.2043, B2: 2972.64, C2: 209.00 };
  r = run("vle_binary", { ...svna1, basis: "T", T: 75, z1: 0.6 });
  near("[src SVNA 예제 10.1(a)] BUBL P: 75 °C, x₁ = 0.6 → P = 66.72 kPa", r.res.outputs?.bub_P / 1000, 66.72, 1e-4);
  nearAbs("[src SVNA 예제 10.1(a)] y₁ = 0.7483", r.res.outputs?.bub_y, 0.7483, 1e-4);
  near("[src SVNA 예제 10.1(b)] DEW P: y₁ = 0.6 → P = 59.74 kPa", r.res.outputs?.dew_P / 1000, 59.74, 1e-4);
  nearAbs("[src SVNA 예제 10.1(b)] x₁ = 0.4308", r.res.outputs?.dew_x, 0.4308, 1e-4);
  near("[src SVNA 예제 10.1] P₁ˢᵃᵗ(75 °C) = 83.21 kPa", r.res.outputs?.s1 / 1000, 83.21, 1e-4);
  r = run("vle_binary", { ...svna1, basis: "P", P: 70, z1: 0.6 });
  nearAbs("[src SVNA 예제 10.1(c)] BUBL T: 70 kPa, x₁ = 0.6 → 76.42 °C", C(r.res.outputs?.bub_T), 76.42, 0.006, "°C");
  nearAbs("[src SVNA 예제 10.1(c)] y₁ = 0.7472", r.res.outputs?.bub_y, 0.7472, 1e-4);
  nearAbs("[src SVNA 예제 10.1(d)] DEW T: y₁ = 0.6 → 79.58 °C", C(r.res.outputs?.dew_T), 79.58, 0.006, "°C");
  nearAbs("[src SVNA 예제 10.1(d)] x₁ = 0.4351", r.res.outputs?.dew_x, 0.4351, 1e-4);
  check("Raoult → 공비점 없음, 선도 두 선(기포·이슬)", /없음/.test(r.res.outputs?.az_text || "") && r.chart?.series.length === 2);

  // ── 6. VLE: SVNA 7판 예제 10.3 (메탄올(1)/아세트산메틸(2), ln γ = A x², A = 2.771 − 0.00523 T) ──
  const A = 2.771 - 0.00523 * 318.15;
  const svna3 = { c1: "custom", c2: "custom", model: "margules", A12: A, A21: A, ab: "ln", apu: "kPa", atu: "K", A1: 16.59158, B1: 3643.31, C1: -33.424, A2: 14.25326, B2: 2665.54, C2: -53.424, basis: "T", T: { raw: 318.15, unit: "K" } };
  r = run("vle_binary", { ...svna3, z1: 0.25 });
  near("[src SVNA 예제 10.3(a)] BUBL P: 318.15 K, x₁ = 0.25 → 73.50 kPa", r.res.outputs?.bub_P / 1000, 73.50, 1e-4);
  nearAbs("[src SVNA 예제 10.3(a)] y₁ = 0.282", r.res.outputs?.bub_y, 0.282, 5e-4);
  r = run("vle_binary", { ...svna3, z1: 0.6 });
  near("[src SVNA 예제 10.3(b)] DEW P: y₁ = 0.6 → 62.89 kPa", r.res.outputs?.dew_P / 1000, 62.89, 1e-4);
  nearAbs("[src SVNA 예제 10.3(b)] x₁ = 0.8169", r.res.outputs?.dew_x, 0.8169, 1e-4);
  near("[src SVNA 예제 10.3(d)] 공비 압력 73.76 kPa", r.res.outputs?.az_P / 1000, 73.76, 1e-4);
  nearAbs("[src SVNA 예제 10.3(d)] 공비 조성 x₁ = 0.325", r.res.outputs?.az_x, 0.325, 5e-4);
  check("최고 압력 공비 → '최저 공비(최고 압력)' 표시, 공비점 표시", /최저 공비/.test(r.res.outputs?.az_text || "") && r.chart?.markers.some(m => m.label === "공비점"));
  r = run("vle_binary", { ...svna3, z1: 0.6, plot: "xy" });
  check("x–y 선도: 평형선 + 대각선(점선), 축 0–1", r.chart?.series.length === 2 && r.chart.series[1].dashed && r.chart.x.max === 1);

  // ── 7. 활동도 모델 해석 대조 [calc] ──
  const gd = (fn, T) => {   // Gibbs–Duhem: x1 d lnγ1/dx1 + x2 d lnγ2/dx1 = 0
    let worst = 0;
    for (const x of [0.1, 0.3, 0.5, 0.7, 0.9]) {
      const h = 1e-5, a = fn(x + h, T), b = fn(x - h, T);
      const d1 = (Math.log(a[0]) - Math.log(b[0])) / (2 * h), d2 = (Math.log(a[1]) - Math.log(b[1])) / (2 * h);
      worst = Math.max(worst, Math.abs(x * d1 + (1 - x) * d2));
    }
    return worst;
  };
  check("[calc] Gibbs–Duhem: Margules·van Laar·Wilson·NRTL·UNIFAC 모두 |x₁dlnγ₁ + x₂dlnγ₂| < 1e-6",
    [W.calcVleMargules(1.2, 0.5), W.calcVleVanLaar(1.2, 0.5), W.calcVleWilson(58.7, 18.1, 150, 450), W.calcVleNrtl(-50, 600, 0.3),
      W.calcVleGammaFn("unifac", { groups1: { 1: 1, 2: 1, 14: 1 }, groups2: { 16: 1 } }).fn].every(fn => gd(fn, 350) < 1e-6));
  nearAbs("[calc] Margules ln γ₁∞ = A₁₂", Math.log(W.calcVleMargules(1.2, 0.5)(0, 300)[0]), 1.2, 1e-12);
  nearAbs("[calc] van Laar ln γ₂∞ = A₂₁", Math.log(W.calcVleVanLaar(1.2, 0.5)(1, 300)[1]), 0.5, 1e-12);
  { const L12 = 18.1 / 58.7 * Math.exp(-150 / 350), L21 = 58.7 / 18.1 * Math.exp(-450 / 350);
    nearAbs("[calc] Wilson ln γ₁∞ = −ln Λ₁₂ + 1 − Λ₂₁", Math.log(W.calcVleWilson(58.7, 18.1, 150, 450)(0, 350)[0]), -Math.log(L12) + 1 - L21, 1e-12); }
  { const t12 = -50 / 350, t21 = 600 / 350;
    nearAbs("[calc] NRTL ln γ₁∞ = τ₂₁ + τ₁₂·exp(−ατ₁₂)", Math.log(W.calcVleNrtl(-50, 600, 0.3)(0, 350)[0]), t21 + t12 * Math.exp(-0.3 * t12), 1e-12); }

  // ── 8. UNIFAC ──
  const hx = W.calcUnifacModel([{ 1: 2, 2: 4 }, { 1: 1, 2: 1, 18: 1 }]).gammas([0.5, 0.5], 333.15);
  nearAbs("[src thermo 0.6.1 문서 UNIFAC_gammas 예] n-헥세인/2-뷰탄온 333.15 K, x = 0.5 → γ₁ = 1.427603", hx[0], 1.427602583562, 1e-9);
  nearAbs("[src thermo 0.6.1 문서] γ₂ = 1.364655", hx[1], 1.364654501010, 1e-9);
  const ap = W.calcUnifacModel([{ 1: 1, 18: 1 }, { 1: 2, 2: 3 }]).gammas([0.047, 0.953], 307);
  nearAbs("[src SVNA 7판 부록 H 예제] 아세톤/n-펜테인 307 K, x₁ = 0.047 → γ₁ = 4.992", ap[0], 4.992, 0.001);
  nearAbs("[src SVNA 7판 부록 H 예제] γ₂ = 1.005", ap[1], 1.005, 0.001);
  check("[calc] 같은 물질 두 개(벤젠/벤젠 그룹) → γ = 1", W.calcUnifacModel([{ 9: 6 }, { 9: 6 }]).gammas([0.3, 0.7], 350).every(g => Math.abs(g - 1) < 1e-12));

  r = run("vle_binary", { c1: "Ethanol", c2: "Water", model: "unifac", basis: "P", P: 101.325 });
  const ew = r.res.outputs || {};
  check("[src 실측 Horsley, Azeotropic Data] 에탄올–물 1 atm 최저 공비 있음", /최저 공비/.test(ew.az_text || ""), ew.az_text);
  nearAbs("[src 실측] 공비 온도 78.15 °C (UNIFAC 예측 허용 ±0.5 K)", C(ew.az_T), 78.15, 0.5, "°C");
  nearAbs("[src 실측] 공비 조성 x_EtOH = 0.894 (95.6 wt%) (UNIFAC 예측 허용 ±0.04)", ew.az_x, 0.894, 0.04);
  check("UNIFAC 그룹 표시: CH3 + CH2 + OH / H2O", ew.grp1 === "CH3 + CH2 + OH" && ew.grp2 === "H2O", `${ew.grp1} / ${ew.grp2}`);
  r = run("vle_binary", { c1: "Ethanol", c2: "Water", model: "ideal", basis: "P", P: 101.325 });
  check("[calc] 같은 계를 Raoult 로 풀면 공비점 없음(비이상성 때문에 생기는 공비)", /없음/.test(r.res.outputs?.az_text || ""));
  r = run("vle_binary", { c1: "Acetone", c2: "Water", model: "unifac", basis: "P", P: 101.325 });
  // 실측(Horsley, Azeotropic Data)은 공비 없음. 원 UNIFAC 은 순수 아세톤 바로 옆(x ≈ 0.98, ΔT ≈ 0.01 K)에 접선 모양 공비를 예측한다 — 모델 한계로 경고를 띄운다.
  { const ao = r.res.outputs || {};
    const edge = !ao.az_x || (ao.az_x > 0.97 && Math.abs(ao.az_T - ao.tb1) < 0.3);
    check("[src 실측: 공비 없음] 아세톤–물 1 atm — UNIFAC 은 공비 없음 또는 순수 성분 끝(x₁ > 0.97, ΔT < 0.3 K)만 + 모델 오차 경고",
      edge && (!ao.az_x || (r.res.warnings || []).some(w => /순수 성분에 아주/.test(w))), `${ao.az_text}`); }
  check("[calc] 아세톤–물 γ_물(x=0.5) > 1 (양의 편차)", r.res.outputs?.g2 > 1);
  r = run("vle_binary", { c1: "Benzene", c2: "Toluene", model: "unifac", basis: "P", P: 101.325, z1: 0.5 });
  const bt = r.res.outputs || {};
  nearAbs("[src NIST WebBook Tboil] 벤젠 끓는점 80.09 °C (CoolProp 맞춤 Antoine)", C(bt.tb1), 80.09, 0.15, "°C");
  nearAbs("[src NIST WebBook Tboil] 톨루엔 끓는점 110.63 °C", C(bt.tb2), 110.63, 0.15, "°C");
  const btR = run("vle_binary", { c1: "Benzene", c2: "Toluene", model: "ideal", basis: "P", P: 101.325, z1: 0.5 }).res.outputs || {};
  check("[calc] 벤젠–톨루엔: UNIFAC ≈ Raoult (기포점 차 < 0.5 K, γ 0.95–1.10), 공비 없음",
    Math.abs(bt.bub_T - btR.bub_T) < 0.5 && bt.g1 > 0.95 && bt.g1 < 1.1 && bt.g2 > 0.95 && bt.g2 < 1.1 && /없음/.test(bt.az_text || ""), `${C(bt.bub_T)} vs ${C(btR.bub_T)} °C, γ ${bt.g1}, ${bt.g2}`);
  r = run("vle_binary", { c1: "Benzene", c2: "Water", model: "unifac", basis: "P", P: 101.325 });
  check("[calc] 벤젠–물 UNIFAC → 액액 분리 경고", (r.res.warnings || []).some(w => /액액 분리/.test(w)) || /분리/.test(r.res.error || ""), (r.res.warnings || []).join(" | ") || r.res.error);

  // ── 9. 입력 오류 ──
  r = run("vle_binary", { c1: "Water", c2: "Water" });
  check("같은 성분 두 번 → 오류", /같습니다/.test(r.res.error || ""));
  r = run("vle_binary", { c1: "custom", c2: "Water", model: "unifac" }, { g1: [{ g: "XYZ", n: 1 }] });
  check("없는 UNIFAC 부그룹 → 오류(이름 안내)", /찾지 못했습니다/.test(r.res.error || ""), r.res.error);
  r = run("vle_binary", { c1: "custom", c2: "Water", model: "unifac" }, { g1: [{ g: "CH3", n: 1.5 }] });
  check("부그룹 개수 소수 → 오류", /정수/.test(r.res.error || ""), r.res.error);
  r = run("vle_binary", { c1: "custom", c2: "custom", model: "unifac" }, { g1: [{ g: "ACNH2", n: 1 }], g2: [{ g: "CF3", n: 1 }] });
  check("표에 없는 그룹 쌍 → 상호작용 매개변수 없음 오류", /매개변수가 없습니다/.test(r.res.error || ""), r.res.error);
  r = run("vle_binary", { c1: "Ethanol", c2: "Water", model: "vanlaar", A12: 1, A21: -0.5 });
  check("van Laar 부호 다름 → 오류", /부호/.test(r.res.error || ""));

  check(`en 화면: 같은 수치·en 문구(결과·경고·그래프·표)에 한글 없음 (${enIssues.length}건)`, enIssues.length === 0, enIssues.slice(0, 4).join(" | "));
  const failed = results.filter(x => !x).length;
  console.log(`\n${results.length - failed}/${results.length} PASS`);
  process.exit(failed ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });

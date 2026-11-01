// 증기표(IAPWS-IF97)·습공기 선도 시험 — public/chemip 의 calc_if97*.jsx·calc_steam*.jsx·calc_psy*.jsx·calc_table_data.jsx 순수 함수만 Node vm 에 올린다.
// 기준값:
//   IAPWS R7-97(2012) 검증표 — 1영역 표 5, 2영역 표 15, 3영역 표 33, 5영역 표 42(유효숫자 9자리), B23 경계(623.15 K ↔ 16.5291643 MPa),
//   역방향 식 검증표 7·9(1영역 T(p,h)·T(p,s)), 24·29(2영역), IAPWS SR3-03(2014) 3영역 T(p,h)·T(p,s) — 순방향 식을 풀어 얻은 T 는
//   역방향 식 값과 그 식의 허용 오차(1영역·3영역 25 mK, 2영역 10 mK; 여기서는 모두 25 mK) 안에서 같아야 한다.
//   증기표 교과서 값(Çengel & Boles, Thermodynamics 부록 표 A-4·A-5·A-6, IAPWS-95 기반 → IF97 과 0.1 % 안).
//   습공기: Çengel & Boles 14장 예제(냉각·제습: 30 °C·80 %·10 m³/min → 14 °C 포화, Q = −511 kJ/min, 응축수 0.131 kg/min;
//   단열 혼합: 14 °C 포화 50 m³/min + 32 °C·60 % 20 m³/min → 19.0 °C, 89 %).
//
//   node frontend/scripts/tests/test_steam.cjs
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const CHEMIP = path.join(__dirname, "..", "..", "public", "chemip");
const babel = require(path.join(CHEMIP, "vendor", "babel.min.js"));
const BABEL_OPTIONS = {
  presets: ["react", "env"],
  plugins: ["transform-class-properties", "transform-object-rest-spread", "transform-flow-strip-types"],
  targets: { browsers: undefined },
  compact: false,
  comments: false,
};
const MODULES = [
  "lang.jsx", "calc_units.jsx", "calc_physics.jsx", "calc_if97_coef.jsx", "calc_if97.jsx", "calc_if97_solve.jsx", "calc_steam_chart.jsx",
  "calc_steam.jsx", "calc_steam_table.jsx", "calc_psy_math.jsx", "calc_psychro_chart.jsx", "calc_psychro.jsx", "calc_table_data.jsx",
];

function load(lang) {
  const sandbox = { console, URLSearchParams, location: { search: `?lang=${lang}` } };
  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);
  for (const rel of MODULES) {
    const code = babel.transform(fs.readFileSync(path.join(CHEMIP, rel), "utf8"), { ...BABEL_OPTIONS, filename: rel }).code;
    vm.runInContext(code, ctx, { filename: rel });
  }
  return sandbox;
}

const W = load("ko");
const WE = load("en");
const results = [];
function check(name, ok, note = "") {
  results.push(Boolean(ok));
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${note ? ` — ${note}` : ""}`);
}
function near(name, got, want, tol) {
  const ok = Number.isFinite(got) && Math.abs(got - want) <= tol * Math.abs(want);
  check(name, ok, `${got} vs ${want} (허용 ${tol})`);
}
function nearAbs(name, got, want, tol) {
  check(name, Number.isFinite(got) && Math.abs(got - want) <= tol, `${got} vs ${want} (± ${tol})`);
}

// ── IAPWS-IF97 순방향 식 검증표(v m³/kg, h·u kJ/kg, s·cp kJ/(kg·K), w m/s) ──
const PROPS = ["v", "h", "u", "s", "cp", "w"];
const SCALE = { v: 1, h: 1e3, u: 1e3, s: 1e3, cp: 1e3, w: 1 };
function verify(table, label, fn) {
  for (const [a, b, ...want] of table) {
    const st = fn(a, b);
    PROPS.forEach((k, i) => near(`IF97 ${label} (${a}, ${b}) ${k}`, st[k] / SCALE[k], want[i], 1e-8));
  }
}
// 표 5 — 1영역: T [K], p [MPa]
verify([
  [300, 3, 0.100215168e-2, 0.115331273e3, 0.112324818e3, 0.392294792, 0.417301218e1, 0.150773921e4],
  [300, 80, 0.971180894e-3, 0.184142828e3, 0.106448356e3, 0.368563852, 0.401008987e1, 0.163469054e4],
  [500, 3, 0.120241800e-2, 0.975542239e3, 0.971934985e3, 0.258041912e1, 0.465580682e1, 0.124071337e4],
], "1영역 표 5", (T, p) => W.if97Region1(p * 1e6, T));
// 표 15 — 2영역
verify([
  [300, 0.0035, 0.394913866e2, 0.254991145e4, 0.241169160e4, 0.852238967e1, 0.191300162e1, 0.427920172e3],
  [700, 0.0035, 0.923015898e2, 0.333568375e4, 0.301262819e4, 0.101749996e2, 0.208141274e1, 0.644289068e3],
  [700, 30, 0.542946619e-2, 0.263149474e4, 0.246861076e4, 0.517540298e1, 0.103505092e2, 0.480386523e3],
], "2영역 표 15", (T, p) => W.if97Region2(p * 1e6, T));
// 표 42 — 5영역
verify([
  [1500, 0.5, 0.138455090e1, 0.521976855e4, 0.452749310e4, 0.965408875e1, 0.261609445e1, 0.917068690e3],
  [1500, 30, 0.230761299e-1, 0.516723514e4, 0.447495124e4, 0.772970133e1, 0.272724317e1, 0.928548002e3],
  [2000, 30, 0.311385219e-1, 0.657122604e4, 0.563707038e4, 0.853640523e1, 0.288569882e1, 0.106736948e4],
], "5영역 표 42", (T, p) => W.if97Region5(p * 1e6, T));
// 표 33 — 3영역: T [K], ρ [kg/m³] → p [MPa], h, u, s, cp, w
for (const [T, rho, p, h, u, s, cp, w] of [
  [650, 500, 0.255837018e2, 0.186343019e4, 0.181226279e4, 0.405427273e1, 0.138935717e2, 0.502005554e3],
  [650, 200, 0.222930643e2, 0.237512401e4, 0.226365868e4, 0.485438792e1, 0.446579342e2, 0.383444594e3],
  [750, 500, 0.783095639e2, 0.225868845e4, 0.210206932e4, 0.446971906e1, 0.634165359e1, 0.760696041e3],
]) {
  const st = W.if97Region3(rho, T);
  near(`IF97 3영역 표 33 (${T}, ${rho}) p`, st.p / 1e6, p, 1e-8);
  [["h", h], ["u", u], ["s", s], ["cp", cp], ["w", w]].forEach(([k, want]) => near(`IF97 3영역 표 33 (${T}, ${rho}) ${k}`, st[k] / SCALE[k], want, 1e-8));
  // (p, T) 로 되풀기: 밀도 풀이가 같은 ρ 를 찾아야 한다
  const back = W.if97PT(st.p, T);
  near(`3영역 (p,T) → ρ 되찾기 (${T} K, ${rho} kg/m³)`, back && back.rho, rho, 1e-9);
}
// B23 경계(표 1 아래 검증값)
near("B23: 623.15 K → 16.5291643 MPa", W.if97B23p(623.15) / 1e6, 0.165291643e2, 1e-8);
near("B23: 16.5291643 MPa → 623.15 K", W.if97B23T(0.165291643e8), 0.623150000e3, 1e-8);

// ── 영역 고르기 ──
check("영역: 300 K·3 MPa → 1", W.if97RegionPT(3e6, 300) === 1);
check("영역: 300 K·3.5 kPa → 2", W.if97RegionPT(3500, 300) === 2);
check("영역: 650 K·25.58 MPa → 3", W.if97RegionPT(25.5837018e6, 650) === 3);
check("영역: 1500 K·0.5 MPa → 5", W.if97RegionPT(0.5e6, 1500) === 5);
check("영역: 1500 K·60 MPa → 범위 밖", W.if97RegionPT(60e6, 1500) === 0);
check("영역: 700 K·110 MPa → 범위 밖", W.if97RegionPT(110e6, 700) === 0);

// ── 역방향 식 검증값과 순방향 풀이의 일치(25 mK) ──
const TOL_T = 0.025;
for (const [p, h, T] of [
  [3, 500, 0.391798509e3], [80, 500, 0.378108626e3], [80, 1500, 0.611041229e3],                          // 표 7
  [0.001, 3000, 0.534433241e3], [3, 3000, 0.575373370e3], [3, 4000, 0.101077577e4],                     // 표 24
  [5, 3500, 0.801299102e3], [5, 4000, 0.101531583e4], [25, 3500, 0.875279054e3],
  [40, 2700, 0.743056411e3], [60, 2700, 0.791137067e3], [60, 3200, 0.882756860e3],
  [20, 1700, 629.3083892], [50, 2000, 690.5718338], [100, 2100, 733.6163014],                           // SR3 3영역
  [20, 2500, 641.8418053], [50, 2400, 735.1848618], [100, 2700, 842.0460876],
]) {
  const r = W.if97Solve("ph", p * 1e6, h * 1e3);
  nearAbs(`(p,h) ${p} MPa·${h} kJ/kg → T (역방향 식 값과 25 mK 안)`, r.state && r.state.T, T, TOL_T);
}
for (const [p, s, T] of [
  [3, 0.5, 0.307842258e3], [80, 0.5, 0.309979785e3], [80, 3, 0.565899909e3],                             // 표 9
  [0.1, 7.5, 0.399517097e3], [0.1, 8, 0.514127081e3], [2.5, 8, 0.103984917e4],                          // 표 29
  [8, 6, 0.600484040e3], [8, 7.5, 0.106495556e4], [90, 6, 0.103801126e4],
  [20, 5.75, 0.697992849e3], [80, 5.25, 0.854011484e3], [80, 5.75, 0.949017998e3],
  [20, 3.7, 620.8841563], [50, 3.5, 618.1549029], [100, 4, 705.6880237],                                // SR3 3영역
  [20, 5, 640.1176443], [50, 4.5, 716.3687517], [100, 5, 847.4332825],
]) {
  const r = W.if97Solve("ps", p * 1e6, s * 1e3);
  nearAbs(`(p,s) ${p} MPa·${s} kJ/(kg·K) → T (25 mK 안)`, r.state && r.state.T, T, TOL_T);
}
// 풀이 → 순방향 되돌리기는 정확히 같다(역방향 식 대신 순방향을 풀었으므로)
{
  const r = W.if97Solve("ph", 60e6, 2700e3);
  near("(p,h) 풀이의 h 가 넣은 값과 같음 (1e-10)", r.state.h, 2700e3, 1e-10);
  const r2 = W.if97Solve("ps", 20e6, 5e3);
  near("(p,s) 풀이의 s 가 넣은 값과 같음 (3영역, 1e-10)", r2.state.s, 5e3, 1e-10);
}

// ── 증기표 교과서 값(Çengel & Boles 부록, IAPWS-95 기반; IF97 과 0.1 % 안) ──
{
  const s100 = W.if97SatPair(373.15);
  near("100 °C 포화 압력 101.42 kPa", s100.p / 1e3, 101.42, 1e-3);
  near("100 °C v_g 1.6720 m³/kg", s100.vap.v, 1.6720, 1e-3);
  near("100 °C h_f 419.17 kJ/kg", s100.liq.h / 1e3, 419.17, 1e-3);
  near("100 °C h_g 2675.6 kJ/kg", s100.vap.h / 1e3, 2675.6, 1e-3);
  near("100 °C s_g 7.3542 kJ/(kg·K)", s100.vap.s / 1e3, 7.3542, 1e-3);
  let r = W.if97Solve("px", 1e6, 0);
  near("1 MPa T_sat 179.88 °C", r.state.T - 273.15, 179.88, 1e-3);
  near("1 MPa h_f 762.51 kJ/kg", r.state.h / 1e3, 762.51, 1e-3);
  near("1 MPa s_f 2.1381 kJ/(kg·K)", r.state.s / 1e3, 2.1381, 1e-3);
  r = W.if97Solve("px", 1e6, 1);
  near("1 MPa v_g 0.19436 m³/kg", r.state.v, 0.19436, 1e-3);
  near("1 MPa h_g 2777.1 kJ/kg", r.state.h / 1e3, 2777.1, 1e-3);
  near("1 MPa s_g 6.5850 kJ/(kg·K)", r.state.s / 1e3, 6.5850, 1e-3);
  r = W.if97Solve("pT", 1e6, 573.15);
  check("1 MPa·300 °C → 과열 증기, 2영역", r.state.phase === "vapor" && r.state.region === 2);
  near("1 MPa·300 °C v 0.25799 m³/kg (표 A-6)", r.state.v, 0.25799, 1e-3);
  near("1 MPa·300 °C h 3051.6 kJ/kg", r.state.h / 1e3, 3051.6, 1e-3);
  near("1 MPa·300 °C s 7.1246 kJ/(kg·K)", r.state.s / 1e3, 7.1246, 1e-3);
  // 350 °C 포화(3영역 포화 풀이): 표 A-4 ρ_f = 1/0.001740, ρ_g = 1/0.008806, h_f 1670.9, h_g 2563.6
  const s350 = W.if97SatPair(623.15 + 1e-6);
  near("350 °C v_f 0.001740 (3영역 포화)", s350.liq.v, 0.001740, 2e-3);
  near("350 °C v_g 0.008806 (3영역 포화)", s350.vap.v, 0.008806, 2e-3);
  near("350 °C h_f 1670.9 (3영역 포화)", s350.liq.h / 1e3, 1670.9, 1e-3);
  near("350 °C h_g 2563.6 (3영역 포화)", s350.vap.h / 1e3, 2563.6, 1e-3);
  // 623.15 K 에서 1·2영역 포화값과 3영역 포화값이 이어진다(경계에서 두 식의 차 0.1 % 안)
  const lo = W.if97SatPair(623.15);
  near("623.15 K 경계: 포화 액체 h 가 1영역·3영역 사이에서 이어짐", s350.liq.h, lo.liq.h, 1e-3);
  near("623.15 K 경계: 포화 증기 h 가 2영역·3영역 사이에서 이어짐", s350.vap.h, lo.vap.h, 1e-3);
}

// ── 습증기·모드 ──
{
  let r = W.if97Solve("ph", 1e6, 2000e3);
  const s = W.if97SatPair(W.calcWaterTsat(1e6));
  check("(p,h) 1 MPa·2000 kJ/kg → 습증기", r.state.phase === "wet" && r.state.region === 4);
  near("습증기 x = (h − h_f)/(h_g − h_f)", r.state.x, (2000e3 - s.liq.h) / (s.vap.h - s.liq.h), 1e-12);
  const r2 = W.if97Solve("Tx", r.state.T, r.state.x);
  near("(T,x) 되풀기 → 같은 h", r2.state.h, 2000e3, 1e-10);
  r = W.if97Solve("Tx", 647.0, 0.5);
  check("임계점 0.1 K 아래 (T,x) 풀림", Boolean(r.state) && r.state.sat.liq.rho > 322 && r.state.sat.vap.rho < 322);
  check("임계 온도 그대로 (T,x) → critical 오류", W.if97Solve("Tx", 647.096, 0.5).error === "critical");
  const sc = W.if97Solve("ph", 25e6, 2000e3).state;
  check("25 MPa·2000 kJ/kg → 3영역 초임계(T > T_c)", sc.phase === "super" && sc.region === 3 && sc.T > 647.096, sc.T);
  check("25 MPa·1500 kJ/kg → 압축액(T < T_c)", W.if97Solve("ph", 25e6, 1500e3).state.phase === "liquid");
  check("25 MPa·700 K → 초임계", W.if97Solve("pT", 25e6, 700).state.phase === "super");
  check("(p,h) 너무 작음 → low", W.if97Solve("ph", 1e6, -100e3).error === "low");
  check("(p,s) 너무 큼 → high", W.if97Solve("ps", 1e6, 20e3).error === "high");
  check("(p,x) 임계압 위 → range", W.if97Solve("px", 23e6, 0.5).error === "range");
  check("임계점 부근 경고 판정", W.if97NearCritical(22e6, 646) && !W.if97NearCritical(10e6, 646));
}

// ── 증기표 계산기 정의(화면 단위 값 그대로) ──
{
  const D = W.CALC_DEF_STEAM, DE = WE.CALC_DEF_STEAM;
  const v = { mode: "pT", p: 1e6, T: 573.15, chart: "ts" };
  const o = D.compute(v), oe = DE.compute(v);
  check("steam: 1 MPa·300 °C → 과열 증기, 영역 2", /과열/.test(o.phase) && o.region === "2", o.phase);
  check("steam (en): 같은 수치, 영어 상태 이름", oe.h === o.h && /Superheated/.test(oe.phase), oe.phase);
  const w = D.compute({ mode: "px", p: 1e6, x: 0.9, chart: "ts" });
  check("steam: 습증기면 cp·cv·w 없음, x·h_fg 있음", w.cp === undefined && w.w === undefined && w.x === 0.9 && w.hfg > 2e6);
  const e = DE.compute({ mode: "ph", p: 1e6, h: -1e6, chart: "ts" });
  check("steam (en): 오류 문구 영어", e.error && !/[가-힣]/.test(e.error), e.error);
  const ch = D.chart({ chart: "ts" }, o);
  check("T–s 선도: 돔·등압선 두 계열, 상태점 표시", ch.series.length === 2 && ch.series[0].points.length > 100 && ch.markers[0].x === o.s / 1000);
  const hs = D.chart({ chart: "hs" }, o);
  check("몰리에 선도: 세로축 kJ/kg, 상태점 h", hs.y.unit === "kJ/kg" && Math.abs(hs.markers[0].y - o.h / 1000) < 1e-9);
  const dome = W.steamDome();
  check("포화 돔: 임계점 바로 아래까지(> 647 K)", dome[dome.length - 1].T > 647 && dome.length > 50);
}

// ── 포화 증기표 ──
{
  const D = W.CALC_DEF_STEAM_TABLE;
  const v = { basis: "T", T1: 273.16, T2: 473.15, dT: 10 };
  check("포화표: 0.01–200 °C, 10 K 간격 → 21행", D.compute(v).n === 21, D.compute(v).n);
  const t = D.table(v);
  check("포화표: 열 11개·행 21개", t.columns.length === 11 && t.rows.length === 21);
  const r100 = t.rows.find(r => Math.abs(r.T - 373.16) < 1e-9);
  near("포화표 100.01 °C 행 h_fg ≈ 2256.4 kJ/kg (표 A-4)", r100.hfg / 1e3, 2256.4, 1e-3);
  check("포화표: 끝 값이 간격에 안 맞으면 끝 값 행 추가", JSON.stringify(W.steamTableSteps(0, 25, 10)) === "[0,10,20,25]");
  check("포화표: 200행 넘으면 null → 오류", W.steamTableSteps(0, 1000, 1) === null && Boolean(D.compute({ basis: "T", T1: 273.16, T2: 647, dT: 0.5 }).error));
  const tp = D.table({ basis: "p", p1: 100e3, p2: 1000e3, dp: 100e3 });
  near("압력표 1 MPa 행 T = 179.88 °C", tp.rows[tp.rows.length - 1].T - 273.15, 179.88, 1e-3);
  const csv = W.calcTableCsv(t);
  const lines = csv.split("\r\n");
  check("CSV: 머리 + 21행, 단위 표기", lines.length === 22 && lines[0].startsWith("T (°C),p (kPa),v_f (m³/kg)"), lines[0]);
  check("CSV 숫자에 천 단위 쉼표 없음", lines[11].split(",").length === 11, lines[11]);
  check("TSV: 탭 구분", W.calcTableTsv(t).split("\n")[0].split("\t").length === 11);
}

// ── 습공기: 코일·혼합 (Çengel & Boles 14장 예제) ──
{
  const D = W.CALC_DEF_PSYCHRO;
  const coil = D.compute({ mode: "coil", T: 303.15, RH: 80, P: 101325, Q1: 10 / 60, Tout: 287.15 });
  near("냉각·제습: 건조 공기 11.25 kg/min", coil.mda * 60, 11.25, 0.005);
  near("냉각·제습: 열량 −511 kJ/min", coil.q * 60 / 1000, -511, 0.01);
  near("냉각·제습: 응축수 0.131 kg/min", coil.cond * 60, 0.131, 0.01);
  near("냉각·제습: 출구 W₂ 0.0100 kg/kg", coil.Wo / 1000, 0.0100, 0.01);
  check("냉각·제습: 결로 경고 1개", coil.warnings.length === 1);
  const heat = D.compute({ mode: "coil", T: 283.15, RH: 70, P: 101325, Q1: 1, Tout: 303.15 });
  near("가열: 절대 습도 그대로", heat.Wo, heat.W, 1e-12);
  check("가열: 열량 +, 응축수 0, 상대 습도 낮아짐", heat.q > 0 && heat.cond === 0 && heat.RHo < 70);
  const mix = D.compute({ mode: "mix", T: 287.15, RH: 100, P: 101325, Q1: 50 / 60, T2: 305.15, RH2: 60, Q2: 20 / 60 });
  nearAbs("혼합: 19.0 °C", mix.To - 273.15, 19.0, 0.15);
  nearAbs("혼합: 상대 습도 89 %", mix.RHo, 89, 1);
  near("혼합: 건조 공기 질량 보존 (60.5 + 22.5 kg/min)", mix.mda * 60, 83.0, 0.005);
  const ch = D.chart({ mode: "mix", T: 287.15, RH: 100, P: 101325, Q1: 50 / 60, T2: 305.15, RH2: 60, Q2: 20 / 60 }, mix);
  check("습공기 선도(혼합): 포화선 + RH 4 + 혼합선 = 6 계열, 상태점 3개", ch.series.length === 6 && ch.markers.length === 3);
  check("습공기 선도: 계열 점이 세로축 위를 넘지 않음", ch.series.every(s => s.points.every(p => p[1] <= ch.y.max + 1e-9)));
  const cc = D.chart({ mode: "coil", T: 303.15, RH: 80, P: 101325, Q1: 10 / 60, Tout: 287.15 }, coil);
  const path = cc.series.find(s => s.key === "process").points;
  nearAbs("코일 과정선: 이슬점까지 수평 뒤 포화선 따라 14 °C", path[path.length - 1][0], 14, 1e-9);
  const st = D.compute({ mode: "state", T: 293.15, RH: 50, P: 101325 });
  check("상태 모드: 나가는 공기 줄 없음", st.To === undefined && st.q === undefined && Math.abs(st.W - 7.26) < 0.02);
  const fog = D.compute({ mode: "mix", T: 278.15, RH: 100, P: 101325, Q1: 1, T2: 313.15, RH2: 100, Q2: 1 });
  check("포화 공기 둘 혼합 → 과포화 경고", fog.RHo > 100 && fog.warnings.length === 1);
}

const failed = results.filter(x => !x).length;
console.log(`\n${results.length - failed}/${results.length} PASS`);
process.exit(failed ? 1 : 0);

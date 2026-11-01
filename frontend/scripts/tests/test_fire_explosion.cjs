// 화재·폭발 계산기(pool_fire·bleve·vce·probit_harm) 기준값 시험 — 화면 없이 순수 모듈만 Node vm 에 올린다.
// 불러오기는 test_calculators.cjs 의 loadCalcModules 와 같은 방식(test_calc_*.cjs 들도 같은 사본을 둔다 — 공용 로더로 뽑을 후보).
// 사례 표시: [src] 출처에 인쇄된 값, [calc] 식으로 따로 손계산(이 파일 안 독립 식 또는 R4 조사의 별도 Python 계산)한 값.
//
//   node frontend/scripts/tests/test_fire_explosion.cjs
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const CHEMIP = path.join(__dirname, "..", "..", "public", "chemip");
const BABEL_OPTIONS = {
  presets: ["react", "env"],
  plugins: ["transform-class-properties", "transform-object-rest-spread", "transform-flow-strip-types"],
  targets: { browsers: undefined }, compact: false, comments: false,
};
const PURE = /^calc_(?!view|nav|form|field|table_field|table_out|results|notes|unit_select|substance_link|out_table|chart(?!_scale))[a-z0-9_]+\.jsx$/;
const PURE_EXTRA = ["lang.jsx", "term_glossary.jsx", "term_glossary_en.jsx", "apl_terms.jsx"];
const babel = require(path.join(CHEMIP, "vendor", "babel.min.js"));

function load(lang) {
  const html = fs.readFileSync(path.join(CHEMIP, "index.html"), "utf8");
  const files = [...html.matchAll(/<script type="text\/babel" src="([^"?]+)/g)].map(m => m[1]).filter(f => PURE.test(f) || PURE_EXTRA.includes(f));
  const sandbox = { console, URLSearchParams, location: { search: `?lang=${lang}` } };
  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);
  for (const rel of files) {
    const code = babel.transform(fs.readFileSync(path.join(CHEMIP, rel), "utf8"), { ...BABEL_OPTIONS, filename: rel }).code;
    vm.runInContext(code, ctx, { filename: rel });
  }
  return sandbox;
}

const W = load("ko");
const WE = load("en");
const results = [];
function check(name, ok, note = "") { results.push(Boolean(ok)); console.log(`${ok ? "PASS" : "FAIL"} ${name}${note ? ` — ${note}` : ""}`); }
function near(name, got, want, tol) { check(name, Number.isFinite(got) && Math.abs(got - want) / Math.abs(want) <= tol, `${got} vs ${want} (허용 ${tol * 100}%)`); }
function nearAbs(name, got, want, tol) { check(name, Number.isFinite(got) && Math.abs(got - want) <= tol, `${got} vs ${want} (± ${tol})`); }

// 화면과 같은 길: 기본 상태 → 칸 덮어쓰기(show 단위 글자 또는 {raw, unit}) → calcEvaluate. ko·en 수치가 같은지도 본다.
function runIn(win, key, over) {
  const def = win.calcFind(key);
  const st = win.calcInitialState(def, {});
  for (const [k, v] of Object.entries(over)) {
    const inp = def.inputs.find(i => i.key === k);
    if (!inp) throw new Error(`${key}: 칸 없음 ${k}`);
    if (inp.type === "choice") st[k] = v;
    else if (typeof v === "object") st[k] = { raw: String(v.raw), unit: v.unit };
    else st[k] = { ...st[k], raw: String(v) };
  }
  return win.calcEvaluate(def, st);
}
function run(key, over = {}) {
  const ko = runIn(W, key, over), en = runIn(WE, key, over);
  const same = JSON.stringify(ko.outputs) === JSON.stringify(en.outputs) && (ko.warnings || []).length === (en.warnings || []).length;
  if (!same) check(`${key} ko·en 수치 같음 ${JSON.stringify(over)}`, false);
  if (ko.error || !ko.outputs) check(`${key} 계산됨 ${JSON.stringify(over)}`, false, ko.error || JSON.stringify(ko.errors));
  return ko;
}
const MI = 1609.344, FT = 0.3048, LB = 0.45359237;

// ════ pool_fire ════
// [src] EPA RMP OCA 예제 29: 에틸 에터 풀 10 400 ft², PFF 4.3 → 5 kW/m² 거리 440 ft
let r = run("pool_fire", { size: "A", A: { raw: 10400, unit: "ft2" }, PFF: 4.3 });
near("[src] EPA 예제 29 에틸 에터 PFF 4.3 × √10 400 ft² = 440 ft", r.outputs.d_pff / FT, 440, 0.01);
// [calc] Burgess n-헥세인(기본값): 1e-3 × 44 700 / (335 + 2.27 × 43.7) = 0.103 (R4: 0.103, 측정 약 0.074)
r = run("pool_fire");
near("[calc] Burgess n-헥세인 m″ = 0.1029 kg/(m²·s)", r.outputs.mpp, 1e-3 * 44700 / (335 + 2.27 * (68.7 - 25)), 1e-9);
// [calc] R4 휘발유 예: D 10 m, m″ 0.055, ρa 1.2 kg/m³(Ta 21.02 °C 에서 1 atm 공기), Shokri–Beyler E = 48 kW/m², τ = 1
const TA_RHO12 = 101325 * 0.028966 / (8.314462618 * 1.2) - 273.15;
const gas = { rate: "given", mpp: 0.055, Ta: TA_RHO12, tau: "one", D: 10 };
r = run("pool_fire", gas);
near("[calc] Thomas H = 15.8 m (R4)", r.outputs.H, 42 * 10 * Math.pow(0.055 / (1.2 * Math.sqrt(9.80665 * 10)), 0.61), 1e-6);
nearAbs("[calc] Thomas H ≈ 15.8 m (R4 인쇄값)", r.outputs.H, 15.8, 0.05);
near("[calc] Shokri–Beyler E(10 m) = 47.99 kW/m²", r.outputs.E / 1000, 58 * Math.pow(10, -0.0823), 1e-9);
near("[calc] 열방출률 Q = 189 MW (R4)", r.outputs.Q / 1e6, 0.055 * Math.PI * 25 * 44.7, 1e-9);
for (const [R, want] of [[20, 5.3], [30, 2.6], [50, 1.0]]) {
  r = run("pool_fire", { ...gas, R });
  nearAbs(`[calc] 고체 화염 ${R} m → ${want} kW/m² (R4 별도 Python)`, r.outputs.q_sf / 1000, want, 0.05);
}
// [calc] 점원: 화염 중심(H/2) 까지 x, q = X_r Q / (4π x²), τ = 1
r = run("pool_fire", { ...gas, R: 30 });
{
  const H = r.outputs.H, Q = r.outputs.Q, x = Math.sqrt(900 + H * H / 4);
  near("[calc] 점원 30 m = 0.35 Q / (4π x²)", r.outputs.q_ps, 0.35 * Q / (4 * Math.PI * x * x), 1e-9);
}
// [calc] 거리 출력은 그 거리에서 다시 계산하면 그 복사열이 된다
r = run("pool_fire", gas);
{
  const d5 = r.outputs.d_sf_5, d4 = r.outputs.d_sf_4;
  near("[calc] d(5 kW/m²) 에서 고체 화염 q = 5 kW/m²", run("pool_fire", { ...gas, R: d5 }).outputs.q_sf, 5000, 1e-6);
  check("[calc] d(4) > d(5) > d(12.5)", d4 > d5 && d5 > r.outputs.d_sf_12_5);
  check("[calc] E 48 kW/m² 이면 37.5 kW/m² 는 화염 밖에서 도달 안 함 → 줄 숨김 + 경고", r.outputs.d_sf_37_5 === undefined && r.warnings.some(w => /37.5/.test(w)));
}
// [calc] EPA 식 D-28 PFF √A 는 X_r 0.4·τ 1·지면 점원·Burgess(Ta 298 K) 거리와 같다(유도 관계)
{
  const v = { dHc: 33.8e6, dHv: 357e3, cp: 2330, Tb: 307.6 };
  const pff = W.calcRmpPoolFireFactor(v.dHc, v.dHv, v.cp, v.Tb);
  const A = 100, mdot = W.calcBurgessRate(v.dHc, v.dHv, v.cp, v.Tb, 298) * A;
  near("[calc] PFF·√A = √(0.4 ṁ ΔHc / (4π·5000))", pff * Math.sqrt(A), Math.sqrt(0.4 * mdot * v.dHc / (4 * Math.PI * 5000)), 1e-9);
}
// [calc] 투과율: Pietersen 2.02 (Pw x)^−0.09, Pw = 0.5 × Psat(25 °C) = 1 584.6 Pa, x = 74.5 m → 0.706
near("[calc] τ Pietersen (1 584.6 Pa × 74.5 m) = 0.706", W.calcTransmissivity("pietersen", 0.5 * W.calcWaterPsat(298.15), 74.5), 2.02 * Math.pow(0.5 * 3169.9 * 74.5, -0.09), 2e-3);
near("[calc] τ Cook = 1.389 − 0.135 log10(Pw x)", W.calcTransmissivity("cook", 1000, 100), 1.389 - 0.135 * 5, 1e-12);

// ════ bleve ════
// [src] EPA RMP 참조표 30 화구 지속시간(1 000 / 10 000 / 50 000 / 100 000 / 500 000 lb → 3.5 / 7.5 / 12.7 / 15.5 / 20.3 s)
for (const [lb, s] of [[1000, 3.5], [10000, 7.5], [50000, 12.7], [100000, 15.5], [500000, 20.3]]) {
  r = run("bleve", { M: { raw: lb, unit: "lb" } });
  nearAbs(`[src] RMP 표 30 지속시간 ${lb} lb → ${s} s (표는 0.1 s 반올림)`, r.outputs.t, s, 0.06);
}
// [src] EPA RMP 참조표 30 프로페인 2도 화상 거리(mi, 표는 반올림) — 식 D-36, ΔHc 46 333 kJ/kg
for (const [lb, mi, tol] of [[1000, 0.05, 0.005], [10000, 0.1, 0.05], [50000, 0.3, 0.05], [75000, 0.4, 0.05], [100000, 0.4, 0.05], [200000, 0.5, 0.05], [300000, 0.6, 0.05]]) {
  r = run("bleve", { M: { raw: lb, unit: "lb" } });
  nearAbs(`[src] RMP 표 30 프로페인 ${lb} lb → ${mi} mi`, r.outputs.d_epa / MI, mi, tol);
}
// 알려진 차이(실패로 세지 않음): 표 30 프로페인 500 000 lb 는 0.7 mi 로 읽히나 식 D-36 은 0.76 mi(반올림 0.8). PDF 글자 추출의 열 밀림인지 확인 필요.
console.log(`INFO RMP 표 30 프로페인 500 000 lb: 표 0.7 mi / 식 D-36 ${(run("bleve", { M: { raw: 500000, unit: "lb" } }).outputs.d_epa / MI).toFixed(3)} mi`);
// [calc] R4 프로페인 10 000 kg, P_v 0.85 MPa, 25 °C·RH 50 %, Pietersen τ
r = run("bleve");
nearAbs("[calc] D_max = 125.0 m", r.outputs.D, 5.8 * Math.cbrt(1e4), 1e-9);
nearAbs("[calc] t = 9.69 s", r.outputs.t, 9.69, 0.01);
nearAbs("[calc] H = 93.7 m", r.outputs.H, 0.75 * 5.8 * Math.cbrt(1e4), 1e-9);
nearAbs("[calc] f = 0.256", r.outputs.f, 0.27 * Math.pow(0.85, 0.32), 1e-12);
nearAbs("[calc] E = 250 kW/m² (R4)", r.outputs.E / 1000, 250, 1);
for (const [R, want] of [[100, 36.7], [200, 13.2], [300, 6.2]]) {
  r = run("bleve", { R });
  nearAbs(`[calc] ${R} m → ${want} kW/m² (R4 별도 Python)`, r.outputs.q / 1000, want, 0.1);
}
r = run("bleve", { R: 100 });
nearAbs("[calc] 100 m 화상 사망 3.7 % (R4, Y = 3.21)", r.outputs.P_death, 3.7, 0.15);
{
  const d = r.outputs.d_dose;
  const at = run("bleve", { R: d }).outputs;
  near("[calc] 2도 화상 열량 거리에서 열량 = 3.42 × 10⁶", at.dose, 3.42e6, 1e-6);
}

// ════ vce ════
// [src] EPA RMP OCA 예제 16: 프로페인 50 000 lb → 1 psi 0.3 mi (식 C-2 재계산 0.2975)
r = run("vce", { M: { raw: 50000, unit: "lb" } });
nearAbs("[src] RMP 예제 16 프로페인 50 000 lb → 0.3 mi", r.outputs.d_rmp / MI, 0.3, 0.005);
// [calc] Kinney–Graham: TNT 1 kg 30 m → 5.7 kPa, 1 000 kg 100 m → 20.0 kPa (R4)
const tnt = kg => ({ M: kg, dHc: 4686, eta: 100 });
r = run("vce", { ...tnt(1), R: 30 });
near("[calc] W = 1 kg TNT", r.outputs.W, 1, 1e-12);
nearAbs("[calc] TNT 1 kg · 30 m → 5.7 kPa", r.outputs.p_tnt / 1000, 5.7, 0.05);
r = run("vce", { ...tnt(1000), R: 100 });
nearAbs("[calc] TNT 1 000 kg · 100 m → 20.0 kPa", r.outputs.p_tnt / 1000, 20.0, 0.1);
// [calc] 프로페인 1 000 kg, η 5 %, ΔHc 46 350 → W 495 kg, 1 psi 198 m (R4)
r = run("vce", { M: 1000, dHc: 46350, eta: 5 });
nearAbs("[calc] W = 494.6 kg TNT", r.outputs.W, 494.6, 0.1);
nearAbs("[calc] 1 psi 거리 198 m", r.outputs.d_tnt_1psi, 198, 1.5);
// [src] Pierorazio(2005) 표: 3D·중간·중간 = 0.44 (ALOHA 표 14, Farrell 부탄 예제의 Mf)
r = run("vce");
near("[src] BST 3D 중간 반응성·중간 혼잡 Mf = 0.44", r.outputs.mach_out, 0.44, 1e-12);
check("[src] BST 2D 높음·높음 = DDT(5.2)", W.calcBstMach("2D", "high", "high") === 5.2 && W.calcBstMach("2.5D", "low", "low") === 0.053);
// [src] ALOHA 표 15 맞춤식은 x0 에서 근거리 평탄값 D 와 이어진다(문서 계수 자체 점검)
for (const f of W.CALC_BST_FITS) near(`[src] ALOHA BST Mf ${f.mach}: A·B^(1/x0)·x0^C = D`, f.A * Math.pow(f.B, 1 / f.x0) * Math.pow(f.x0, f.C), f.D, 0.02);
// [calc] Mf 0.7, x = 1 → A·B = 0.2800; 표적 과압 = Pa × 곡선(E = 2·M·ΔHc 에서 x 가 1 이 되는 거리)
{
  const E = 2 * 1000 * 46333e3, R = Math.cbrt(E / 101325);
  r = run("vce", { mach: 0.7, R });
  near("[calc] BST Mf 0.7, x = 1 → ΔP = 0.3764 × 0.7439 atm", r.outputs.p_bst, 101325 * 0.3764 * 0.7439, 1e-6);
}

// ════ probit_harm ════
// [calc] R4: 폐출혈 100 kPa → Y 2.45 (0.5 %), 200 kPa → 7.24 (98.8 %); 20 kPa → 고막 6.9 %, 구조물 54.7 %
r = run("probit_harm", { p: 100 });
nearAbs("[calc] 폐 100 kPa Y = 2.45", r.outputs.Y_lung, -77.1 + 6.91 * Math.log(1e5), 1e-9);
nearAbs("[calc] 폐 100 kPa → 0.5 %", r.outputs.P_lung, 0.5, 0.1);
r = run("probit_harm", { p: 200 });
nearAbs("[calc] 폐 200 kPa → 98.8 %", r.outputs.P_lung, 98.8, 0.1);
r = run("probit_harm", { p: 20 });
nearAbs("[calc] 20 kPa 고막 → 6.9 %", r.outputs.P_eardrum, 6.9, 0.1);
nearAbs("[calc] 20 kPa 구조물 → 54.7 %", r.outputs.P_structure, 54.7, 0.1);
// [src] Finney(1971) probit 표: 10 % ↔ 3.72, 50 % ↔ 5.00, 90 % ↔ 6.28, 99 % ↔ 7.33
for (const [Y, P] of [[3.72, 10], [5, 50], [6.28, 90], [7.33, 99]]) nearAbs(`[src] Finney 표 Y ${Y} → ${P} %`, run("probit_harm", { kind: "y", Y }).outputs.P_y, P, 0.06);
// [calc] erf 기준값: erf(1) = 0.8427007929, erf(3.5) = 0.9999992569
nearAbs("[calc] erf(1)", W.calcHarmErf(1), 0.8427007929497149, 1e-12);
nearAbs("[calc] erf(3.5)", W.calcHarmErf(3.5), 0.9999992569016276, 1e-12);
// [calc] 열복사 10 kW/m² · 40 s: 사망 Y = −14.9 + 2.56 ln(40·10000^(4/3)/1e4)
r = run("probit_harm", { kind: "thermal", I: 10, t: 40 });
nearAbs("[calc] 10 kW/m² · 40 s 화상 사망 Y", r.outputs.Y_death, -14.9 + 2.56 * Math.log(40 * Math.pow(1e4, 4 / 3) / 1e4), 1e-9);
near("[calc] 열량 = 40 × 10000^(4/3)", r.outputs.dose, 40 * Math.pow(1e4, 4 / 3), 1e-12);
r = run("probit_harm", { kind: "thermal", I: 1, t: 60 });
check("[calc] 1.7 kW/m² 미만 → 경고", r.warnings.length === 1);

// ════ 이어서 계산 링크 ════
{
  const res = runIn(W, "bleve", { R: 100 });
  const links = W.calcNextLinksFor(W.calcFind("bleve"), res);
  check("bleve → probit_harm 링크(열복사·지속시간)", links.length === 1 && /calc=probit_harm/.test(links[0].href) && /kind=thermal/.test(links[0].href) && /t=9\.69/.test(links[0].href), links[0] && links[0].href);
  const m = W.calcFireMassLinks(1234.5);
  check("질량 링크: bleve·vce 두 개, M=1234.5", m.length === 2 && m.every(l => W.calcFind(l.calc) && l.values.M === 1234.5));
  check("질량 0 → 링크 없음", W.calcFireMassLinks(0).length === 0);
  const def = W.calcFind("probit_harm");
  const pre = W.calcInitialState(def, { kind: "thermal", I: "36.7", t: "9.69" });
  check("probit_harm 이 링크 값으로 채워짐", pre.kind === "thermal" && pre.I.raw === "36.7" && pre.t.raw === "9.69");
}

const failed = results.filter(x => !x).length;
console.log(`\n${results.length - failed}/${results.length} PASS (화재·폭발)`);
process.exit(failed ? 1 : 0);

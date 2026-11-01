// 공정제어 계산기(pid_tuning · loop_sim · tf_tools) 시험 — 화면 없이 정의·엔진·수식 모듈만 Node vm 에 올린다.
// 기준값: 공개 예제(Skogestad 강의·2003 논문, Seborg et al. 예제 12.4, NTNU 강의 Routh 예제 3, Nise 예제 6.2·6.4)와
// 해석적으로 유도한 값(1차 응답, 데드타임 적분 루프의 구간별 해, P 제어 오프셋, 2차 응답 식). 출처는 사례 이름에 적었다.
// test_calculators.cjs 와 달리 계산기 등록 목록(calc_registry.jsx)을 올리지 않는다 — 이 세 계산기만 따로 본다.
//
//   node frontend/scripts/tests/test_process_control.cjs
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const CHEMIP = path.join(__dirname, "..", "..", "public", "chemip");
const babel = require(path.join(CHEMIP, "vendor", "babel.min.js"));
const BABEL_OPTIONS = {
  presets: ["react", "env"],
  plugins: ["transform-class-properties", "transform-object-rest-spread", "transform-flow-strip-types"],
  targets: { browsers: undefined }, compact: false, comments: false,
};
const MODULES = [
  "lang.jsx", "calc_labels.jsx", "calc_labels_en.jsx", "term_glossary.jsx", "term_glossary_en.jsx", "calc_units.jsx",
  "calc_ctrl_fopdt.jsx", "calc_ctrl_tuning.jsx", "calc_ctrl_sim.jsx", "calc_ctrl_routh.jsx", "calc_ctrl_step.jsx", "calc_ctrl_margins.jsx",
  "calc_pid_tuning.jsx", "calc_loop_sim.jsx", "calc_tf_tools.jsx", "calc_engine.jsx",
];
const KEYS = ["pid_tuning", "loop_sim", "tf_tools"];

function load(lang) {
  const sb = { console, URLSearchParams, location: { search: `?lang=${lang}` } };
  sb.window = sb;
  const ctx = vm.createContext(sb);
  for (const rel of MODULES) {
    const code = babel.transform(fs.readFileSync(path.join(CHEMIP, rel), "utf8"), { ...BABEL_OPTIONS, filename: rel }).code;
    vm.runInContext(code, ctx, { filename: rel });
  }
  sb.DEFS = [sb.CALC_DEF_PID_TUNING, sb.CALC_DEF_LOOP_SIM, sb.CALC_DEF_TF_TOOLS];
  return sb;
}
const W = load("ko"), WE = load("en");
const HANGUL = /[가-힣ㄱ-ㆎ]/;

const results = [];
function check(name, ok, note = "") { results.push(Boolean(ok)); console.log(`${ok ? "PASS" : "FAIL"} ${name}${note ? ` — ${note}` : ""}`); }
function near(name, got, want, tol) {
  const ok = Number.isFinite(got) && (want === 0 ? Math.abs(got) <= tol : Math.abs(got - want) / Math.abs(want) <= tol);
  check(name, ok, `${got} vs ${want} (허용 ${want === 0 ? tol : tol * 100 + "%"})`);
}

// 화면과 같은 길: 기본 상태 → 덮어쓸 칸 → calcEvaluate. ko·en 두 번 돌려 수치가 같고 en 에 한글이 없는지도 본다.
function evalIn(win, key, o = {}, tables = {}) {
  const def = win.DEFS.find(d => d.key === key);
  const st = win.calcInitialState(def, {});
  for (const [k, v] of Object.entries(o)) {
    const i = def.inputs.find(x => x.key === k);
    if (!i) throw new Error(`${key}: 칸 없음 ${k}`);
    st[k] = i.type === "choice" ? v : { ...st[k], raw: String(v) };
  }
  for (const [k, rows] of Object.entries(tables)) st[k] = rows.map(r => Object.fromEntries(Object.entries(r).map(([c, x]) => [c, String(x)])));
  return win.calcEvaluate(def, st);
}
function texts(x) {
  if (x == null) return [];
  if (typeof x === "string") return [x];
  if (typeof x === "number") return [];
  if (Array.isArray(x)) return x.flatMap(texts);
  return Object.values(x).flatMap(texts);
}
function numbers(x) {
  if (typeof x === "number") return [x];
  if (x && typeof x === "object") return Object.values(x).flatMap(numbers);
  return [];
}
const enProblems = [];
let enRuns = 0;
function run(key, o, t) {
  const ko = evalIn(W, key, o, t), en = evalIn(WE, key, o, t);
  enRuns++;
  const a = numbers(ko.outputs || {}), b = numbers(en.outputs || {});
  if (a.length !== b.length || a.some((x, i) => !Object.is(x, b[i]))) enProblems.push(`${key} ${JSON.stringify(o)}: 수치 다름`);
  if (Boolean(ko.error) !== Boolean(en.error) || (ko.warnings || []).length !== (en.warnings || []).length) enProblems.push(`${key}: 오류·경고 모양 다름`);
  texts([en.error, en.warnings, en.outputs]).filter(s => HANGUL.test(s)).forEach(s => enProblems.push(`${key}: en 한글 "${s.slice(0, 40)}"`));
  return ko;
}
const row = (r, method) => r.outputs?.table?.rows.find(x => x.method === method || x.method.startsWith(method));

// ════ 1. PID 튜닝 ════
let r = run("pid_tuning");
near("SIMC PI Kc = 2.5 (Skogestad NTNU 강의: K=1, τ=10, θ=2, τc=θ)", row(r, "SIMC")?.Kc, 2.5, 1e-12);
near("SIMC PI τI = 10 (같은 예)", row(r, "SIMC")?.tI, 10, 1e-12);
near("ZN 반응 곡선 PI Kc = 0.9τ/(Kθ) = 4.5", row(r, "Ziegler–Nichols 반응")?.Kc, 4.5, 1e-12);
near("ZN 반응 곡선 PI τI = 3.33θ = 6.667", row(r, "Ziegler–Nichols 반응")?.tI, 2 / 0.3, 1e-12);
near("Cohen–Coon PI Kc = 4.58 (R5)", row(r, "Cohen–Coon")?.Kc, 5 * (0.9 + 2 / 120), 1e-12);
near("Cohen–Coon PI τI = 4.71 (R5)", row(r, "Cohen–Coon")?.tI, 61.2 / 13, 1e-12);
near("ITAE 부하 PI K·Kc = 0.859(θ/τ)^−0.977 (Seborg 표 12.3, SNU 강의 표와 같은 계수)", row(r, "ITAE (부하")?.KKc, 0.859 * 0.2 ** -0.977, 1e-12);
near("ITAE 설정값 PI τI = τ/(1.03 − 0.165θ/τ)", row(r, "ITAE (설정값")?.tI, 10 / (1.03 - 0.165 * 0.2), 1e-12);
{
  const m = W.ctrlUltimate({ K: 1, tau: 10, theta: 2 });
  near("Ku 위상 조건 atan(τω_u) + θω_u = π", Math.atan(10 * m.wu) + 2 * m.wu, Math.PI, 1e-10);
  near("Ku = √(1+τ²ω_u²)/K 출력", r.outputs?.Ku, Math.sqrt(1 + 100 * m.wu ** 2), 1e-12);
  near("ZN 한계 PI Kc = 0.45 Ku", row(r, "Ziegler–Nichols 한계")?.Kc, 0.45 * m.Ku, 1e-12);
}
r = run("pid_tuning", { ctype: "PID" });
near("ZN 반응 곡선 PID Kc = 1.2τ/(Kθ) = 6 (R5)", row(r, "Ziegler–Nichols 반응")?.Kc, 6, 1e-12);
check("ZN 반응 곡선 PID τI = 4, τD = 1 (R5)", row(r, "Ziegler–Nichols 반응")?.tI === 4 && row(r, "Ziegler–Nichols 반응")?.tD === 1);
near("IMC PID Kc = (τ+θ/2)/(K(τc+θ/2)) = 11/3 (Seborg 표 12.1)", row(r, "IMC")?.Kc, 11 / 3, 1e-12);
check("IMC PID τI = τ+θ/2 = 11, τD = τθ/(2τ+θ) = 0.909", row(r, "IMC")?.tI === 11 && Math.abs(row(r, "IMC")?.tD - 20 / 22) < 1e-12);
check("PID 를 고르면 SIMC 는 PI 값(형식 PI) + 경고", row(r, "SIMC")?.form === "PI" && r.warnings.some(w => /SIMC/.test(w)));
r = run("pid_tuning", { K: 100, tau: 100, theta: 1, tc: 1 });
near("Seborg 예제 12.4 (a) IMC: Kc = 0.5", row(r, "IMC")?.Kc, 0.5, 1e-12);
near("Seborg 예제 12.4 (a) IMC: τI = 100", row(r, "IMC")?.tI, 100, 1e-12);
near("Seborg 예제 12.4 (c) Skogestad: Kc = 0.5", row(r, "SIMC")?.Kc, 0.5, 1e-12);
near("Seborg 예제 12.4 (c) Skogestad: τI = min(τ, 4(τc+θ)) = 8", row(r, "SIMC")?.tI, 8, 1e-12);
check("θ/τ = 0.01 → 상관식 범위 밖 경고", r.warnings.some(w => /0\.1 ≤ θ\/τ ≤ 1/.test(w)));
{
  const t28 = 1 + 5 * Math.log(1 / (1 - 0.283)), t63 = 1 + 5 * Math.log(1 / (1 - 0.632));
  r = run("pid_tuning", { src: "smith", du: 1, dy: 2, t28, t63 });
  near("두 점 맞춤: 정확한 FOPDT(K=2, τ=5, θ=1) 응답 → K = 2", r.outputs?.K_fit, 2, 1e-12);
  near("두 점 맞춤 → τ = 5 (0.283 ≈ 1 − e^(−1/3) 반올림 차 0.2 % 이내)", r.outputs?.tau_fit, 5, 2e-3);
  near("두 점 맞춤 → θ = 1", r.outputs?.theta_fit, 1, 1e-2);
}
r = run("pid_tuning", { src: "smith", t28: 7, t63: 3 });
check("두 점 맞춤: t₆₃ < t₂₈ → 계산 오류", Boolean(r.error));
r = run("pid_tuning", { src: "smith", t28: 1, t63: 6 });
check("두 점 맞춤: 데드타임 음수(t₆₃ > 3t₂₈) → 계산 오류", Boolean(r.error), r.error);
r = run("pid_tuning", { Ku: 8, Pu: 7 });
near("시험값 Ku = 8, Pu = 7 → ZN 한계 PI Kc = 3.6", row(r, "Ziegler–Nichols 한계")?.Kc, 3.6, 1e-12);
near("시험값 → ZN 한계 PI τI = Pu/1.2 = 5.833", row(r, "Ziegler–Nichols 한계")?.tI, 7 / 1.2, 1e-12);
r = run("pid_tuning", { theta: 0 });
check("θ = 0, τc 비움 → 계산 오류(쓸 규칙 없음)", Boolean(r.error));
r = run("pid_tuning", { theta: 0, tc: 2 });
check("θ = 0, τc = 2 → IMC·SIMC 두 행만", r.outputs?.table?.rows.length === 2 && r.outputs?.Ku == null);
r = run("pid_tuning", { ctype: "P" });
check("P 제어: ZN 두 가지 + Cohen–Coon 세 행", r.outputs?.table?.rows.length === 3);

// ════ 2. 폐루프 모의 ════
{
  const sim = W.ctrlSimulate({ K: 2, tau: 5, theta: 1 }, null, { tEnd: 20, sp: 1, dt: 0.001 });
  const at = (s, t) => s.y[Math.round(t / (s.t[1] - s.t[0]))];
  near("열린 루프 K=2, τ=5, θ=1: t = 6 에서 63.2 % = 1.264 (R5)", at(sim, 6), 2 * (1 - Math.exp(-1)), 2e-3);
  check("열린 루프: t < θ 에서는 0 (데드타임 버퍼)", at(sim, 0.99) === 0);
  const p = W.ctrlSimulate({ K: 1, tau: 10, theta: 0 }, { Kc: 4 }, { tEnd: 30, sp: 1 });
  near("P 제어 오프셋: y∞ = KKc/(1+KKc) = 0.8 (해석해)", p.y[p.y.length - 1], 0.8, 1e-3);
  const imc = W.ctrlSimulate({ K: 1, tau: 10, theta: 0 }, { Kc: 5, tI: 10 }, { tEnd: 10, sp: 1, dt: 0.001 });
  near("θ = 0, IMC PI(τc = 2): y(2) = 1 − e⁻¹ (폐루프 1차, 해석해)", at(imc, 2), 1 - Math.exp(-1), 2e-3);
  const simc = W.ctrlSimulate({ K: 1, tau: 10, theta: 2 }, { Kc: 2.5, tI: 10 }, { tEnd: 20, sp: 1, dt: 0.001 });
  near("SIMC 루프 L = e^(−2s)/(4s): y(2θ) = θ/(τc+θ) = 0.5 (구간별 해석해)", at(simc, 4), 0.5, 3e-3);
  near("같은 루프: y(3θ) = 0.875 (구간별 해석해)", at(simc, 6), 0.875, 3e-3);
}
r = run("loop_sim");
{
  const rows = r.outputs?.table?.rows || [];
  const imc = rows.find(x => x.method.startsWith("IMC")), zn = rows.find(x => x.method.startsWith("Ziegler"));
  check("기본 비교: τ ≤ 4(τc+θ) 라 IMC = SIMC 한 줄로 합침 → 3줄", rows.length === 3 && rows.some(x => x.method === "IMC (λ) = SIMC (Skogestad)"), rows.map(x => x.method).join(", "));
  check("ZN 오버슈트 > IMC 오버슈트 (1/4 감쇠 규칙이 더 진동)", zn?.os > imc?.os, `${zn?.os} / ${imc?.os}`);
  check("설정값·부하 IAE 최소 방법 표시", Boolean(r.outputs?.best_sp) && Boolean(r.outputs?.best_load));
  const def = W.CALC_DEF_LOOP_SIM, ch = def.chart({ ...W.calcEvaluate(def, W.calcInitialState(def, {})).values });
  check("그래프: 설정값 + 방법 3개, 시간축 0 … tEnd, 부하 세로선", ch.series.length === 4 && ch.series[0].kind === "step" && ch.vlines.length === 1 && ch.x.min === 0);
  const chMv = def.chart({ ...W.calcEvaluate(def, W.calcInitialState(def, {})).values, show: "mv" });
  check("그래프 u: 설정값 선 없음, 방법 3개", chMv.series.length === 3);
  const res = W.ctrlLoopRuns({ ...W.calcEvaluate(def, W.calcInitialState(def, {})).values });
  const s = res.runs.find(x => x.key === "imc").sim;
  near("부하 계단 뒤 적분 동작으로 설정값 복귀(끝값 = 1)", s.y[s.y.length - 1], 1, 1e-2);
}
r = run("loop_sim", { Kc_m: 20, tI_m: 10 });
{
  const man = r.outputs?.table?.rows.find(x => x.method === "직접 입력");
  check("Kc = 20 (> Ku ≈ 8.5) 직접 입력 → 불안정 표시·경고", man?.os === "불안정" && r.warnings.length > 0);
}
r = run("loop_sim", { ctype: "PID", cmp: "itae" });
check("PID · ITAE 묶음 4개(ITAE 둘·IMC PID·SIMC PI — 설정이 달라 합치지 않음)", r.outputs?.table?.rows.length === 4);
r = run("loop_sim", { cmp: "zn", load: 0 });
check("부하 0 → 부하 IAE 최소 줄 없음", r.outputs && r.outputs.best_load == null && r.outputs.tLoad == null);
r = run("loop_sim", { theta: 0 });
check("θ = 0, τc 비움 → 계산 오류", Boolean(r.error));

// ════ 3. 전달함수 도구 ════
r = run("tf_tools");
{
  const q = Math.sqrt(0.75);
  near("2차 ζ = 0.5: 오버슈트 = exp(−πζ/√(1−ζ²)) = 16.30 % (Seborg 식 5-55)", r.outputs?.os, 100 * Math.exp(-Math.PI * 0.5 / q), 1e-12);
  near("감쇠비 = 오버슈트² = 0.02658", r.outputs?.decay, Math.exp(-2 * Math.PI * 0.5 / q), 1e-12);
  near("주기 P = 2πτ/√(1−ζ²) = 7.255", r.outputs?.period, 2 * Math.PI / q, 1e-12);
  near("첫 정점 값 = 1 + 오버슈트 (응답 식으로 확인)", W.ctrlStepValue({ K: 1, tau: 1, zeta: 0.5 }, r.outputs?.tPeak), 1 + Math.exp(-Math.PI * 0.5 / q), 1e-10);
  near("상승 시간: 처음 최종값 도달 y(t_r) = 1", W.ctrlStepValue({ K: 1, tau: 1, zeta: 0.5 }, r.outputs?.tRise), 1, 1e-10);
  check("그래프: 계단 응답 1개 + 최종값 선", W.CALC_DEF_TF_TOOLS.chart({ tool: "step", order: "2", tu: "min", K: 1, tau: 1, zeta: 0.5, theta: 0 }).series.length === 1);
}
r = run("tf_tools", { order: "1", tau: 5, theta: 1 });
near("1차 τ = 5, θ = 1: 63.2 % 시각 = 6", r.outputs?.t63, 6, 1e-12);
near("1차 ±5 % 정착 = θ + τ ln 20 = 15.98 (해석해)", r.outputs?.ts, 1 + 5 * Math.log(20), 1e-6);
check("1차: 오버슈트 없음", r.outputs?.os == null);
r = run("tf_tools", { zeta: 1 });
{
  const t = W.ctrlBisect(x => (1 + x) * Math.exp(-x) - 0.05, 1, 10);
  near("임계 감쇠 ζ = 1: ±5 % 정착 (1+t)e^(−t) = 0.05 → 4.744", r.outputs?.ts, t, 1e-6);
  check("ζ = 1: 오버슈트 없음, 판정 임계 감쇠", r.outputs?.os == null && /임계/.test(r.outputs?.verdict_step));
}
const ROUTH_DEF = [{ a: 10, b: 0 }, { a: 17, b: 0 }, { a: 8, b: 0 }, { a: 1, b: 1 }];
r = run("tf_tools", { tool: "routh" }, { poly: ROUTH_DEF });
near("10s³+17s²+8s+1+Kc: Ku = 12.6 (NTNU 강의 예제 3, Seborg 11장)", r.outputs?.Ku, 12.6, 1e-7);
near("ω_u = √((1+Ku)/17) = 0.8944", r.outputs?.wu, Math.sqrt(13.6 / 17), 1e-6);
near("Pu = 2π/ω_u = 7.025", r.outputs?.Pu, 2 * Math.PI / Math.sqrt(13.6 / 17), 1e-6);
check("Kc = 5 → 안정, 부호 변화 0", r.outputs?.rhp === 0 && /안정/.test(r.outputs?.verdict_routh));
near("Routh 배열 s¹ 첫 열 = (17·8 − 10·6)/17", r.outputs?.routh?.rows[2]?.c0, (136 - 60) / 17, 1e-12);
r = run("tf_tools", { tool: "routh", Kc: 15 }, { poly: ROUTH_DEF });
check("Kc = 15 (> 12.6) → 오른쪽 반평면 근 2개", r.outputs?.rhp === 2);
r = run("tf_tools", { tool: "routh" }, { poly: [{ a: 1 }, { a: 6 }, { a: 11 }, { a: 6, b: 1 }] });
near("(s+1)(s+2)(s+3) + K: Ku = 60 (6·11 = 6 + K, 해석해)", r.outputs?.Ku, 60, 1e-7);
near("같은 식: ω_u = √11", r.outputs?.wu, Math.sqrt(11), 1e-6);
r = run("tf_tools", { tool: "routh" }, { poly: [{ a: 1 }, { a: 1 }, { a: 2 }, { a: 8 }] });
check("s³+s²+2s+8 → 오른쪽 반평면 근 2개 (근 −2, 0.5 ± 1.94j)", r.outputs?.rhp === 2 && /0\.5 \+ 1\.936j/.test(r.outputs?.roots), r.outputs?.roots);
r = run("tf_tools", { tool: "routh" }, { poly: [1, 2, 3, 6, 5, 3].map(a => ({ a })) });
check("Nise 예제 6.2 (첫 열 0 → ε): 오른쪽 반평면 근 2개", r.outputs?.rhp === 2 && r.warnings.some(w => /ε/.test(w)));
r = run("tf_tools", { tool: "routh" }, { poly: [1, 7, 6, 42, 8, 56].map(a => ({ a })) });
check("Nise 예제 6.4 (0 행 → 보조 다항식): 오른쪽 반평면 근 0, 허수축 근 → 임계 판정", r.outputs?.rhp === 0 && /임계/.test(r.outputs?.verdict_routh));
{
  const roots = W.ctrlPolyRoots([1, 7, 6, 42, 8, 56]).filter(z => z.im > 0).map(z => z.im).sort((a, b) => a - b);
  near("Nise 예제 6.4 근: ±j√2", roots[0], Math.SQRT2, 1e-8);
  near("Nise 예제 6.4 근: ±2j", roots[1], 2, 1e-8);
}
r = run("tf_tools", { tool: "routh" }, { poly: [{ a: 0, b: 0 }, { a: 1 }] });
check("상수만 남는 식 → 계산 오류", Boolean(r.error));
r = run("tf_tools", { tool: "bode" });
near("SIMC τc = θ 루프: GM = π (Skogestad 2003 표: 3.14)", r.outputs?.gm, Math.PI, 1e-6);
near("SIMC τc = θ 루프: PM = 90° − 0.5 rad = 61.35° (Skogestad 2003: 61.4°)", r.outputs?.pm, 90 - 0.5 * 180 / Math.PI, 1e-6);
near("SIMC τc = θ 루프: ω_c = 1/(τc+θ) = 0.25", r.outputs?.wc, 0.25, 1e-6);
{
  const ku = W.ctrlUltimate({ K: 1, tau: 10, theta: 2 }).Ku;
  r = run("tf_tools", { tool: "bode", Kc_b: ku, tI: "" });
  near("P 제어 Kc = Ku → GM = 1 (한계 이득과 맞물림)", r.outputs?.gm, 1, 1e-6);
  r = run("tf_tools", { tool: "bode", Kc_b: 5, tI: "" });
  const wc = Math.sqrt(24) / 10;
  near("P 제어 Kc = 5: ω_c = √((KKc)²−1)/τ (해석해)", r.outputs?.wc, wc, 1e-6);
  near("P 제어 Kc = 5: PM = 180 − atan(τω_c) − θω_c (해석해)", r.outputs?.pm, 180 - (Math.atan(10 * wc) + 2 * wc) * 180 / Math.PI, 1e-6);
  r = run("tf_tools", { tool: "bode", Kc_b: 20, tI: "" });
  check("Kc = 20 > Ku → 불안정 판정", /불안정/.test(r.outputs?.verdict_bode));
  const ch = W.CALC_DEF_TF_TOOLS.chart({ tool: "bode", bshow: "ar", tu: "min", K_b: 1, tau_b: 10, theta_b: 2, Kc_b: 2.5, tI: 10 });
  check("Bode 그래프: 로그 x·로그 y, |L| = 1 선, ω_c 세로선", ch.x.log && ch.y.log && ch.hlines[0].y === 1 && Math.abs(ch.vlines[0].x - 0.25) < 1e-6);
  const chp = W.CALC_DEF_TF_TOOLS.chart({ tool: "bode", bshow: "phase", tu: "min", K_b: 1, tau_b: 10, theta_b: 2, Kc_b: 2.5, tI: 10 });
  check("위상 그래프: −180° 선, 최저 위상 > −900°(ω ≤ 4π/θ)", chp.hlines[0].y === -180 && Math.min(...chp.series[0].points.map(p => p[1])) > -900);
}
r = run("tf_tools", { tool: "bode", theta_b: 0 });
check("θ = 0 → GM 없음(무한대) 경고, PM 은 있음", r.outputs?.gm == null && r.outputs?.pm > 0 && r.warnings.length > 0);

// ════ 4. 정의·용어·영어 ════
for (const def of WE.DEFS) {
  const t = [def.title, def.summary, ...def.formula, ...def.notes, ...def.reference];
  def.inputs.forEach(i => { t.push(i.label, i.hint, i.unit); (i.options || []).forEach(o => t.push(o.label)); (i.columns || []).forEach(c => t.push(c.label)); });
  def.outputs.forEach(o => t.push(o.label, o.unit));
  const bad = t.filter(s => s && HANGUL.test(s));
  check(`${def.key}: en 정의에 한글 없음 (${t.filter(Boolean).length}개)`, bad.length === 0, bad.slice(0, 2).join(" | "));
  const terms = [...def.inputs.flatMap(i => [i.term, ...(i.columns || []).map(c => c.term)]), ...def.outputs.map(o => o.term)].filter(Boolean);
  const missing = terms.filter(k => !W.TERM_GLOSSARY_KO[k] || !WE.TERM_GLOSSARY_EN[k]);
  check(`${def.key}: term ${terms.length}개 모두 ko·en 용어집에 있음`, missing.length === 0, missing.join(", "));
  check(`${def.key}: 그룹 control·식·근거 있음`, def.group === "control" && def.formula.length && def.reference.length);
}
check(`ko·en 같은 수치, en 결과에 한글 없음 (${enRuns}사례)`, enProblems.length === 0, enProblems.slice(0, 3).join(" | "));
check("묶음 이름: 공정제어 / Process control", W.CALC_LABELS.groups.control?.name === "공정제어" && WE.CALC_LABELS.groups.control?.name === "Process control");
{
  const src = KEYS.map(k => fs.readFileSync(path.join(CHEMIP, `calc_${k}.jsx`), "utf8")).join("\n");
  check("화공기사 검색어가 요약에 있음", /화공기사/.test(src));
}

const failed = results.filter(x => !x).length;
console.log(`\n${results.length - failed}/${results.length} PASS (공정제어 계산기 ${KEYS.length}개)`);
process.exit(failed ? 1 : 0);

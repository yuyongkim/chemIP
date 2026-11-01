// 계산기 그래프(calc_chart_scale.jsx 순수 계산 + 계산기 정의의 chart()) 시험 — 화면 없이 Node vm 에 올린다.
// 눈금·범위·좌표 변환·경로·가까운 점·자료 표, 그리고 antoine·pipe_dp·reactor 그래프 점이 compute 결과와 맞는지 본다.
//
//   node frontend/scripts/tests/test_calc_chart.cjs
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const CHEMIP = path.join(__dirname, "..", "..", "public", "chemip");
const BABEL_OPTIONS = { presets: ["react", "env"], plugins: ["transform-class-properties", "transform-object-rest-spread", "transform-flow-strip-types"], targets: { browsers: undefined }, comments: false };
const PURE = /^calc_(?!view|nav|form|field|table_field|results|notes|unit_select|substance_link|chart(?!_scale))[a-z0-9_]+\.jsx$/;
const EXTRA = ["lang.jsx", "term_glossary.jsx", "term_glossary_en.jsx"];
const babel = require(path.join(CHEMIP, "vendor", "babel.min.js"));

function load(lang) {
  const html = fs.readFileSync(path.join(CHEMIP, "index.html"), "utf8");
  const files = [...html.matchAll(/<script type="text\/babel" src="([^"?]+)/g)].map(m => m[1]).filter(f => PURE.test(f) || EXTRA.includes(f));
  const sb = { console, URLSearchParams, location: { search: `?lang=${lang}` } };
  sb.window = sb;
  const ctx = vm.createContext(sb);
  for (const rel of files) vm.runInContext(babel.transform(fs.readFileSync(path.join(CHEMIP, rel), "utf8"), { ...BABEL_OPTIONS, filename: rel }).code, ctx, { filename: rel });
  return sb;
}

const W = load("ko");
const WE = load("en");
const results = [];
function check(name, ok, note = "") { results.push(Boolean(ok)); console.log(`${ok ? "PASS" : "FAIL"} ${name}${note ? ` — ${note}` : ""}`); }
const near = (a, b, tol) => Number.isFinite(a) && Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));

// ── 눈금·축 ──
check("nice step 0..97 / 5 → 20", W.calcChartNiceStep(97, 5) === 20);
check("nice step 0..0.37 / 4 → 0.1", near(W.calcChartNiceStep(0.37, 4), 0.1, 1e-12));
let ax = W.calcChartAxis({}, [3, 97], 5);
check("선형 축 3–97 → 0–100, 눈금 0,20,…,100", ax.min === 0 && ax.max === 100 && ax.ticks.join() === "0,20,40,60,80,100", ax.ticks.join());
ax = W.calcChartAxis({ min: 0, max: 100 }, [50, 60], 5);
check("min·max 를 주면 그 범위", ax.min === 0 && ax.max === 100);
ax = W.calcChartAxis({ log: true }, [0.5, 3000, -1, 0], 5);
check("로그 축 0.5–3000 → 0.1–10⁴, 0 이하 버림", near(ax.min, 0.1, 1e-12) && near(ax.max, 1e4, 1e-12) && ax.ticks.length === 6, ax.ticks.join());
ax = W.calcChartAxis({}, [5, 5], 5);
check("값이 하나여도 범위가 생긴다", ax.max > ax.min);
check("값이 없으면 null", W.calcChartAxis({}, [], 5) === null);
check("눈금 글자: 간격 0.5 → 소수 1자리", W.calcChartTickLabel(1.5, { step: 0.5 }) === "1.5" && W.calcChartTickLabel(2, { step: 0.5 }) === "2.0");
check("눈금 글자: 10⁶ 이상 → a×10ⁿ", W.calcChartTickLabel(2e6, { step: 1e6 }) === "2×10⁶", W.calcChartTickLabel(2e6, { step: 1e6 }));
check("눈금 글자: 로그 10⁻⁴ → 10⁻⁴", W.calcChartTickLabel(1e-4, { log: true }) === "10⁻⁴", W.calcChartTickLabel(1e-4, { log: true }));
check("축 제목: 단위 붙이기, '—' 는 빼기", W.calcChartAxisTitle({ label: "T", unit: "°C" }) === "T (°C)" && W.calcChartAxisTitle({ label: "f", unit: "—" }) === "f");

// ── 좌표·경로 ──
const map = W.calcChartMap({ min: 0, max: 10, log: false }, 100, 300);
check("선형 변환 5 → 200 px", map(5) === 200);
const lmap = W.calcChartMap({ min: 1, max: 100, log: true }, 0, 200);
check("로그 변환 10 → 가운데", near(lmap(10), 100, 1e-12));
const id = v => v;
check("선 경로", W.calcChartPath([[0, 0], [10, 5]], "line", id, id, 0) === "M0,0L10,5");
check("계단 경로(step-after)", W.calcChartPath([[0, 0], [10, 5]], "step", id, id, 0) === "M0,0H10V5");
check("면 경로는 기준선까지 닫힘", /Z$/.test(W.calcChartPath([[0, 1], [10, 5]], "area", id, id, 0)));

// ── 모델 ──
const props = { x: { label: "x", unit: "m" }, y: { label: "y", unit: "s" }, width: 390, height: 260,
  series: [{ key: "a", label: "A", points: [[0, 0], [1, 1], [2, 4]] }, { key: "b", label: "B", points: [[0, 1], [1, 2], [2, 3]], dashed: true }],
  markers: [{ x: 1, y: 2, label: "M" }], vlines: [{ x: 1.5, label: "v" }, { x: 99 }], hlines: [{ y: 3.5 }] };
const m = W.calcChartModel(props);
check("모델: 계열 2·색 칸 1·2", m && m.lines.length === 2 && m.lines[0].slot === 1 && m.lines[1].slot === 2);
check("모델: 범위 밖 vline 은 뺀다", m.vlines.length === 1 && m.hlines.length === 1);
check("모델: 그림 폭 안(390px)", m.left > 0 && m.right <= 390 && m.right - m.left > 200, `${m.left}–${m.right}`);
check("모델: x 눈금 글자가 겹치지 않게 ≤ 5개(390px)", m.xTicks.length <= 6, String(m.xTicks.length));
const hits = W.calcChartNearest(m, m.sx(1.1), 0);
check("가까운 점: 계열마다 x = 1", hits.length === 2 && hits.every(h => h.pt[0] === 1));
check("키보드 x 목록 0,1,2", W.calcChartXStops(m).join() === "0,1,2");
check("빈 자료 → 모델 null", W.calcChartModel({ x: {}, y: {}, series: [] }) === null);
let t = W.calcChartTable(props);
check("자료 표: x 가 같으면 넓은 표 3열", t.wide && t.head.length === 3 && t.rows.length === 3 && t.rows[2][2] === 3);
t = W.calcChartTable({ ...props, series: [props.series[0], { key: "c", label: "C", points: [[5, 5]] }] });
check("자료 표: x 가 다르면 긴 표", !t.wide && t.rows.length === 4);
check("구간 점 0–10 ×4", W.calcChartRange(0, 10, 4).join() === "0,2.5,5,7.5,10");

// ── 계산기 그래프: 정의의 chart() 가 compute 결과와 맞는다 ──
function evalDef(win, key, over = {}) {
  const def = win.calcFind(key);
  const st = win.calcInitialState(def, {});
  Object.entries(over).forEach(([k, v]) => { st[k] = typeof st[k] === "string" ? v : { ...st[k], raw: String(v) }; });
  const r = win.calcEvaluate(def, st);
  return { def, r, chart: win.calcChartFor(def, r) };
}
function chartChecks(win, tag) {
  let { r, chart } = evalDef(win, "antoine");
  const p100 = chart?.series[0].points.find(p => Math.abs(p[0] - 100) < 1e-9);
  check(`${tag} antoine: 그래프 100 °C 점 = 결과 P (kPa)`, p100 && near(p100[1], r.outputs.P_out / 1000, 1e-12), p100 && p100[1]);
  check(`${tag} antoine: 1 atm 기준선·계산점`, chart.hlines[0].y === 101.325 && near(chart.markers[0].y, 101.418, 0.002));
  check(`${tag} antoine: 곡선이 증가`, chart.series[0].points.every((p, i, a) => i === 0 || p[1] > a[i - 1][1]));
  ({ r, chart } = evalDef(win, "antoine", { mode: "T", P: 50 }));
  check(`${tag} antoine T 모드: 계산점 x = 끓는점 °C`, near(chart.markers[0].x, r.outputs.T_out - 273.15, 1e-12) && chart.markers[0].y === 50);
  ({ r, chart } = evalDef(win, "pipe_dp"));
  const mk = chart.markers[0];
  check(`${tag} pipe_dp: 계산점 = (50 m³/h, ΔP)`, near(mk.x, 50, 1e-12) && near(mk.y, r.outputs.dp / 1000, 1e-12));
  const pts = chart.series[0].points;
  const atX0 = pts.find(p => near(p[0], 50, 1e-9));
  check(`${tag} pipe_dp: 곡선 50 m³/h 점 = 결과 ΔP`, atX0 && near(atX0[1], r.outputs.dp / 1000, 1e-9), atX0 && atX0[1]);
  check(`${tag} pipe_dp: 난류에서 ΔP ∝ Q^~1.8–2 (2배 유량 → 3.4–4배)`, (() => { const a = pts.find(p => near(p[0], 50, 1e-9))[1], b = pts[pts.length - 1][1]; return b / a > 3.3 && b / a < 4.01; })());
  ({ r, chart } = evalDef(win, "pipe_dp", { mode: "vel" }));
  check(`${tag} pipe_dp 유속 모드: x 축 = 유속`, chart.x.unit === "m/s" && near(chart.markers[0].x, 2, 1e-12));
  ({ r, chart } = evalDef(win, "reactor"));
  const V = r.outputs.V_out * 1000;
  const cstr = chart.series.find(s => s.key === "cstr").points, pfr = chart.series.find(s => s.key === "pfr").points;
  const iV = cstr.findIndex(p => near(p[0], V, 1e-9));
  check(`${tag} reactor: CSTR 곡선이 V 에서 X = 90 %`, iV > 0 && near(cstr[iV][1], 90, 1e-9), iV >= 0 ? cstr[iV][1] : "no point");
  check(`${tag} reactor: 같은 V 에서 PFR ≥ CSTR`, cstr.every((p, i) => pfr[i][1] >= p[1] - 1e-12));
  check(`${tag} reactor: 계열 2개·PFR 점선·0–100 %`, chart.series.length === 2 && chart.series[1].dashed && chart.y.max === 100);
  return chart;
}
chartChecks(W, "ko");
const HANGUL = /[가-힣]/;
const enChart = chartChecks(WE, "en");
const enTexts = ["antoine", "pipe_dp", "reactor"].flatMap(k => {
  const c = evalDef(WE, k).chart;
  return [c.x.label, c.y.label, c.ariaLabel, ...c.series.map(s => s.label), ...(c.markers || []).map(mm => mm.label)];
});
check("en 그래프 문구에 한글 없음", enChart && enTexts.every(s => !HANGUL.test(s || "")), enTexts.filter(s => HANGUL.test(s || "")).join(" | "));
check("chart() 가 던지면 null(결과는 그대로)", W.calcChartFor({ chart() { throw new Error("x"); } }, { outputs: {}, values: {} }) === null);
check("CALC_LABELS.chart ko·en", W.CALC_LABELS.chart.table(3) !== WE.CALC_LABELS.chart.table(3) && !HANGUL.test(WE.CALC_LABELS.chart.table(3)));

const failed = results.filter(x => !x).length;
console.log(`\n${results.length - failed}/${results.length} PASS`);
process.exit(failed ? 1 : 0);

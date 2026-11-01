// 계산기 그래프(CalcChart, calc_chart.jsx)의 순수 계산 — 축 범위·눈금·좌표 변환·선 경로·가까운 점·자료 표. React 없음.
// 화면 컴포넌트(calc_chart*.jsx)는 여기서 만든 모델만 그린다. 시험: scripts/tests/test_calc_chart.cjs.
//
// 모델 입력(CalcChart 속성과 같다):
//   x, y: { label, unit, min?, max?, log? }      축. min·max 를 주면 그 범위, 없으면 자료(+ markers)에서 잡는다.
//   series: [{ key, label, points: [[x, y], …], kind?: "line"|"step"|"scatter"|"area", dashed? }]
//   markers: [{ x, y, label }]   vlines: [{ x, label }]   hlines: [{ y, label }]   범위 밖 선은 그리지 않는다.
//   width, height: 그릴 크기(px). 계열 색은 순서대로 calc.css .calc-chart-s1… (tokens.css --chart-1…).

const CALC_CHART_SERIES_MAX = 6;   // 색 칸 수(tokens.css --chart-1…6). 넘는 계열은 마지막 색을 쓴다
const CALC_CHART_PAD = { top: 26, right: 14, bottom: 42, tick: 6, char: 6.6 };   // 여백(px), 눈금 글자 한 자 폭 어림

function calcChartFinite(v) {
  return typeof v === "number" && Number.isFinite(v);
}

// 로그 축이면 0 이하를 버린다
function calcChartUsable(v, log) {
  return calcChartFinite(v) && (!log || v > 0);
}

// "보기 좋은" 간격: 1·2·5 × 10ⁿ
function calcChartNiceStep(span, count) {
  const raw = span / Math.max(1, count);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / mag;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag;
}

// 선형 축: [lo, hi] → 범위를 간격 배수로 넓히고 눈금 목록
function calcChartLinearAxis(lo, hi, count, fixedMin, fixedMax) {
  if (lo === hi) { const d = lo === 0 ? 1 : Math.abs(lo) * 0.1; lo -= d; hi += d; }
  const step = calcChartNiceStep(hi - lo, count);
  const min = calcChartFinite(fixedMin) ? fixedMin : Math.floor(lo / step + 1e-9) * step;
  const max = calcChartFinite(fixedMax) ? fixedMax : Math.ceil(hi / step - 1e-9) * step;
  const ticks = [];
  for (let t = Math.ceil(min / step - 1e-9) * step; t <= max + step * 1e-9; t += step) ticks.push(Math.abs(t) < step * 1e-9 ? 0 : t);
  return { min, max, step, ticks, log: false };
}

// 로그 축: 10 의 거듭제곱 눈금(범위가 좁으면 1·2·5 도)
function calcChartLogAxis(lo, hi, fixedMin, fixedMax) {
  if (lo === hi) { lo /= 10; hi *= 10; }
  const e0 = Math.floor(Math.log10(lo) + 1e-9);
  const e1 = Math.ceil(Math.log10(hi) - 1e-9);
  const min = calcChartFinite(fixedMin) && fixedMin > 0 ? fixedMin : Math.pow(10, e0);
  const max = calcChartFinite(fixedMax) && fixedMax > 0 ? fixedMax : Math.pow(10, Math.max(e1, e0 + 1));
  const decades = Math.log10(max / min);
  const mults = decades <= 2 ? [1, 2, 5] : [1];
  const ticks = [];
  for (let e = Math.floor(Math.log10(min)) - 1; e <= Math.ceil(Math.log10(max)); e++) {
    mults.forEach(m => { const t = m * Math.pow(10, e); if (t >= min * (1 - 1e-9) && t <= max * (1 + 1e-9)) ticks.push(t); });
  }
  return { min, max, step: null, ticks, log: true };
}

// 축 정의 + 자료 값들 → 축(범위·눈금). 값이 없으면 null
function calcChartAxis(spec, values, count) {
  const log = Boolean(spec?.log);
  const vs = values.filter(v => calcChartUsable(v, log));
  const lo = calcChartUsable(spec?.min, log) ? spec.min : vs.length ? Math.min(...vs) : null;
  const hi = calcChartUsable(spec?.max, log) ? spec.max : vs.length ? Math.max(...vs) : null;
  if (lo == null || hi == null || hi < lo) return null;
  return log ? calcChartLogAxis(lo, hi, spec?.min, spec?.max) : calcChartLinearAxis(lo, hi, count, spec?.min, spec?.max);
}

// 축 → 화소 변환 함수. a 는 화면 시작 px, b 는 끝 px
function calcChartMap(axis, a, b) {
  if (axis.log) {
    const l0 = Math.log10(axis.min), l1 = Math.log10(axis.max);
    return v => a + (Math.log10(v) - l0) / (l1 - l0) * (b - a);
  }
  return v => a + (v - axis.min) / (axis.max - axis.min) * (b - a);
}

function calcChartInRange(axis, v) {
  return calcChartUsable(v, axis.log) && v >= axis.min - Math.abs(axis.max - axis.min) * 1e-9 && v <= axis.max + Math.abs(axis.max - axis.min) * 1e-9;
}

const CALC_CHART_SUP = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };

// 눈금 글자: 선형은 간격에 맞춘 소수 자리, 아주 크거나 작으면 a×10ⁿ, 로그는 10ⁿ
function calcChartTickLabel(v, axis) {
  if (v === 0) return "0";
  const a = Math.abs(v);
  if (axis.log || a >= 1e5 || a < 1e-3) {
    const e = Math.floor(Math.log10(a) + 1e-9);
    const m = v / Math.pow(10, e);
    const sup = String(e).split("").map(ch => CALC_CHART_SUP[ch]).join("");
    if (axis.log && e >= -2 && e <= 4) return Number(v.toPrecision(3)).toLocaleString("en-US", { maximumFractionDigits: 3 });
    return `${Math.abs(m - 1) < 1e-9 ? "" : `${Number(m.toPrecision(2))}×`}10${sup}`;
  }
  const dec = Math.max(0, Math.min(6, -Math.floor(Math.log10(axis.step) + 1e-9)));
  return Number(v.toFixed(dec)).toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function calcChartAxisTitle(spec) {
  const u = spec?.unit && spec.unit !== "—" ? ` (${spec.unit})` : "";
  return `${spec?.label || ""}${u}`;
}

// 계열 점 → 그릴 점(범위 밖·0 이하 로그 값 제외, x 순서 정렬은 하지 않는다 — 넘겨준 순서가 선 순서)
function calcChartCleanPoints(points, xa, ya) {
  return (points || []).filter(p => Array.isArray(p) && calcChartUsable(p[0], xa.log) && calcChartUsable(p[1], ya.log));
}

// 선 경로 문자열. step 은 "다음 점까지 수평 유지(step-after)", area 는 아래 기준선까지 닫는다
function calcChartPath(pts, kind, sx, sy, baseY) {
  if (!pts.length) return "";
  const f = n => Math.round(n * 10) / 10;
  let d = `M${f(sx(pts[0][0]))},${f(sy(pts[0][1]))}`;
  for (let i = 1; i < pts.length; i++) {
    if (kind === "step") d += `H${f(sx(pts[i][0]))}`;
    d += `${kind === "step" ? "V" : "L"}${kind === "step" ? "" : `${f(sx(pts[i][0]))},`}${f(sy(pts[i][1]))}`;
  }
  if (kind === "area") d += `L${f(sx(pts[pts.length - 1][0]))},${f(baseY)}L${f(sx(pts[0][0]))},${f(baseY)}Z`;
  return d;
}

// 왼쪽 여백 = 가장 긴 y 눈금 글자 폭 + 눈금
function calcChartLeftPad(yTickLabels) {
  const longest = Math.max(1, ...yTickLabels.map(s => s.length));
  return Math.round(longest * CALC_CHART_PAD.char + CALC_CHART_PAD.tick + 10);
}

// 눈금 수: 폭·높이에 맞춰 줄인다(390px 화면에서 글자가 겹치지 않게)
function calcChartTickCount(px, per) {
  return Math.max(2, Math.min(8, Math.floor(px / per)));
}

// 속성 → 그릴 모델. 그릴 자료가 없으면 null
function calcChartModel({ x, y, series = [], markers = [], vlines = [], hlines = [], width = 600, height = 260 }) {
  const xs = [], ys = [];
  series.forEach(s => (s.points || []).forEach(p => { if (Array.isArray(p)) { xs.push(p[0]); ys.push(p[1]); } }));
  markers.forEach(m => { xs.push(m.x); ys.push(m.y); });
  const top = CALC_CHART_PAD.top, bottom = height - CALC_CHART_PAD.bottom;
  const ya = calcChartAxis(y, ys, calcChartTickCount(bottom - top, 44));
  if (!ya) return null;
  const yLabels = ya.ticks.map(t => calcChartTickLabel(t, ya));
  const left = calcChartLeftPad(yLabels), right = Math.max(left + 40, width - CALC_CHART_PAD.right);
  const xa = calcChartAxis(x, xs, calcChartTickCount(right - left, 70));
  if (!xa) return null;
  const sx = calcChartMap(xa, left, right), sy = calcChartMap(ya, bottom, top);
  const baseY = ya.log ? bottom : sy(calcChartInRange(ya, 0) ? 0 : ya.min);
  const lines = series.map((s, i) => {
    const pts = calcChartCleanPoints(s.points, xa, ya);
    const kind = s.kind || "line";
    return { key: s.key || `s${i}`, label: s.label || "", kind, dashed: Boolean(s.dashed), slot: Math.min(i + 1, CALC_CHART_SERIES_MAX), pts,
      d: kind === "scatter" ? "" : calcChartPath(pts, kind, sx, sy, baseY), dots: kind === "scatter" ? pts.map(p => [sx(p[0]), sy(p[1])]) : [] };
  }).filter(l => l.pts.length);
  if (!lines.length && !markers.length) return null;
  return {
    width, height, left, right, top, bottom, xa, ya, sx, sy, lines,
    xTicks: xa.ticks.map(t => ({ v: t, px: sx(t), text: calcChartTickLabel(t, xa) })),
    yTicks: ya.ticks.map((t, i) => ({ v: t, px: sy(t), text: yLabels[i] })),
    xTitle: calcChartAxisTitle(x), yTitle: calcChartAxisTitle(y),
    markers: markers.filter(m => calcChartInRange(xa, m.x) && calcChartInRange(ya, m.y)).map(m => ({ ...m, px: sx(m.x), py: sy(m.y) })),
    vlines: vlines.filter(v => calcChartInRange(xa, v.x)).map(v => ({ ...v, px: sx(v.x) })),
    hlines: hlines.filter(h => calcChartInRange(ya, h.y)).map(h => ({ ...h, py: sy(h.y) })),
  };
}

// 화소 x(px)·y(py) → 계열마다 가장 가까운 점. 선 계열은 x 거리, 산점은 평면 거리. [{ line, pt, px, py }]
function calcChartNearest(model, px, py) {
  if (!model) return [];
  return model.lines.map(line => {
    let best = null, bestD = Infinity;
    line.pts.forEach(p => {
      const qx = model.sx(p[0]), qy = model.sy(p[1]);
      const d = line.kind === "scatter" ? Math.hypot(qx - px, qy - py) : Math.abs(qx - px);
      if (d < bestD) { bestD = d; best = { line, pt: p, px: qx, py: qy }; }
    });
    return best;
  }).filter(Boolean);
}

// 키보드로 옮길 x 값 목록(모든 계열의 x, 중복 제거·정렬)
function calcChartXStops(model) {
  if (!model) return [];
  const set = new Set();
  model.lines.forEach(l => l.pts.forEach(p => set.add(p[0])));
  return [...set].sort((a, b) => a - b);
}

// 자료 표: 모든 계열의 x 가 같으면 넓은 표(x | 계열1 | 계열2 …), 아니면 긴 표(계열 | x | y)
function calcChartTable({ x, y, series = [] }) {
  const ss = series.filter(s => (s.points || []).length);
  const xsOf = s => s.points.map(p => p[0]).join("|");
  const shared = ss.length > 0 && ss.every(s => xsOf(s) === xsOf(ss[0]));
  if (shared) {
    return { wide: true, head: [calcChartAxisTitle(x), ...ss.map(s => (ss.length > 1 ? `${s.label} — ${calcChartAxisTitle(y)}` : calcChartAxisTitle(y)))],
      rows: ss[0].points.map((p, i) => [p[0], ...ss.map(s => s.points[i][1])]) };
  }
  return { wide: false, head: ["", calcChartAxisTitle(x), calcChartAxisTitle(y)],
    rows: ss.flatMap(s => s.points.map(p => [s.label, p[0], p[1]])) };
}

// 범위 [a, b] 를 n 칸으로 나눈 점(로그면 로그 간격) — 계산기 chart() 가 곡선 점을 만들 때 쓴다
function calcChartRange(a, b, n = 40, log = false) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    out.push(log ? a * Math.pow(b / a, t) : a + (b - a) * t);
  }
  return out;
}

Object.assign(window, {
  CALC_CHART_SERIES_MAX, calcChartNiceStep, calcChartAxis, calcChartMap, calcChartTickLabel, calcChartAxisTitle, calcChartPath,
  calcChartModel, calcChartNearest, calcChartXStops, calcChartTable, calcChartRange,
});

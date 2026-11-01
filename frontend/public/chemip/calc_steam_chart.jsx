// 증기표 그래프 자료(순수 함수) — T–s 선도·몰리에(h–s) 선도의 포화 돔, 상태점을 지나는 등압선, 임계점 → CalcChart 속성.
// 성질은 calc_if97.jsx·calc_if97_solve.jsx(SI), 축은 °C·kJ/kg·kJ/(kg·K) 로 바꿔 그린다.

const STEAM_CHART_N = 56;

// 포화 돔 점들(삼중점 부근 → 임계점 바로 아래). 임계점 가까이 촘촘하게(제곱 간격). 한 번만 계산한다.
let STEAM_DOME = null;
function steamDome() {
  if (STEAM_DOME) return STEAM_DOME;
  const T0 = 273.16, T1 = IF97_TC - 0.02;
  const pts = [];
  for (let i = 0; i <= STEAM_CHART_N; i++) {
    const f = 1 - Math.pow(1 - i / STEAM_CHART_N, 2);
    const sat = if97SatPair(T0 + (T1 - T0) * f);
    if (sat) pts.push(sat);
  }
  STEAM_DOME = pts;
  return pts;
}

// 압력 p 의 등압선: 압축액 → (포화 구간) → 과열 증기. 점마다 { T, s, h }(SI)
function steamIsobar(p, Tend) {
  const Tmin = IF97_LIMITS.Tmin, out = [];
  const add = (st) => { if (st) out.push({ T: st.T, s: st.s, h: st.h }); };
  const run = (a, b, n) => { for (let i = 0; i <= n; i++) add(if97PT(p, a + (b - a) * i / n)); };
  if (p < IF97_PC && p >= IF97_PTRIPLE) {
    const Ts = calcWaterTsat(p);
    const sat = if97SatPair(Ts);
    run(Tmin, Ts * (1 - 1e-9), 16);
    if (sat) { add({ ...sat.liq, T: Ts }); add({ ...sat.vap, T: Ts }); }
    if (Tend > Ts) run(Ts * (1 + 1e-9), Tend, 28);
  } else {
    run(Tmin, Tend, 44);
  }
  return out;
}

// chart(values, outputs) — values.chart: "ts" | "hs". outputs 는 기준 단위(T K, p Pa, s J/(kg·K), h J/kg)
function steamChart(values, out) {
  if (!out || !Number.isFinite(out.T) || !Number.isFinite(out.s) || !Number.isFinite(out.h)) return null;
  const hs = values.chart === "hs";
  const C = (T) => T - 273.15, kJ = (x) => x / 1000;
  const yOf = (pt) => (hs ? kJ(pt.h) : C(pt.T));
  const dome = steamDome();
  const domePts = [...dome.map(d => [kJ(d.liq.s), hs ? kJ(d.liq.h) : C(d.T)]), ...dome.slice().reverse().map(d => [kJ(d.vap.s), hs ? kJ(d.vap.h) : C(d.T)])];
  const Tend = Math.min(Math.max(out.T + 150, 773.15), if97Tmax(out.p));
  const isobar = Number.isFinite(out.p) ? steamIsobar(out.p, Tend).map(pt => [kJ(pt.s), yOf(pt)]) : [];
  const crit = dome[dome.length - 1];
  const pLabel = `${Number((out.p / 1e6).toPrecision(4))} MPa`;
  return {
    x: { label: tr("비엔트로피 s", "Specific entropy s"), unit: "kJ/(kg·K)", min: 0, max: Math.max(10, Math.ceil(kJ(out.s) + 0.5)) },
    y: hs
      ? { label: tr("비엔탈피 h", "Specific enthalpy h"), unit: "kJ/kg", min: 0, max: Math.max(3800, Math.ceil(kJ(out.h) / 200 + 1) * 200) }
      : { label: tr("온도 T", "Temperature T"), unit: "°C", min: 0, max: Math.max(500, Math.ceil(C(out.T) / 50 + 1) * 50) },
    series: [
      { key: "dome", label: tr("포화선 (돔)", "Saturation dome"), points: domePts, kind: "line" },
      ...(isobar.length ? [{ key: "isobar", label: tr(`등압선 ${pLabel}`, `Isobar ${pLabel}`), points: isobar, kind: "line", dashed: true }] : []),
    ],
    markers: [
      { x: kJ(out.s), y: hs ? kJ(out.h) : C(out.T), label: tr("상태점", "State") },
      ...(crit ? [{ x: kJ((crit.liq.s + crit.vap.s) / 2), y: hs ? kJ((crit.liq.h + crit.vap.h) / 2) : C(IF97_TC), label: tr("임계점", "Critical point") }] : []),
    ],
    height: 300,
    ariaLabel: hs ? tr("물의 몰리에(h–s) 선도와 상태점", "Mollier (h–s) chart of water with the state point")
      : tr("물의 T–s 선도와 상태점", "T–s diagram of water with the state point"),
  };
}

Object.assign(window, { steamDome, steamIsobar, steamChart });

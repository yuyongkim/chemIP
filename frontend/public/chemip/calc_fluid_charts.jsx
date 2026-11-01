// 실유체 물성 계산기의 그래프·표 자료 — p–h(몰리에) 선도의 포화 돔, 상태점, 냉동 사이클 겹치기, 포화 표·포화 곡선. React 없음.
// 돌려주는 것은 CalcChart 속성(calc_chart.jsx 머리 설명)과 결과 표 두 모양(정의의 table() · 출력 type "table"). 상태 계산은 calc_fluid_engine.jsx.
// 축: h [kJ/kg](선형), P [kPa](로그). 값은 SI 로 받아 여기서 바꾼다.

const CALC_FLUID_DOME_POINTS = 48;

// 포화 돔 점: 압력 Pmin → 0.998·pc(로그 간격 + 임계점 가까이 촘촘히). 액 쪽은 올라가고, 증기 쪽은 내려온다.
function calcFluidDome(f, Pmin) {
  const lo = Math.max(Pmin, f.pt * 1.001), hi = f.pc;
  const ps = calcChartRange(lo, hi * 0.97, CALC_FLUID_DOME_POINTS, true).concat([0.985, 0.993, 0.998].map(r => r * hi));
  const liq = [], vap = [];
  ps.forEach(P => {
    const s = calcFluidSaturation(f.id, "P", P);
    if (s.error) return;
    liq.push([s.l.H / 1000, s.l.P / 1000]);
    vap.push([s.v.H / 1000, s.v.P / 1000]);
  });
  if (!liq.length) return [];
  const top = [(liq[liq.length - 1][0] + vap[vap.length - 1][0]) / 2, hi / 1000];
  return [...liq, top, ...vap.reverse()];
}

function calcFluidPhAxes() {
  return {
    x: { label: tr("비엔탈피 h", "Specific enthalpy h"), unit: "kJ/kg" },
    y: { label: tr("압력 P", "Pressure P"), unit: "kPa", log: true },
  };
}

// 상태 모드: 돔 + 상태점
function calcFluidStateChart(f, st) {
  if (!st || st.H == null || !(st.P > 0)) return null;
  const dome = calcFluidDome(f, Math.min(f.pc / 1000, st.P / 3));
  return {
    ...calcFluidPhAxes(),
    series: [{ key: "dome", label: tr("포화선(돔)", "Saturation dome"), points: dome }],
    markers: [{ x: st.H / 1000, y: st.P / 1000, label: tr("상태점", "State") }],
    ariaLabel: tr(`${calcFluidLabel(f)} p–h 선도와 상태점`, `${calcFluidLabel(f)} p–h diagram with the state point`),
  };
}

// 사이클 모드: 돔 + 1→2→3→4→1 사이클
function calcFluidCycleChart(f, cyc) {
  if (!cyc || !cyc.states) return null;
  const [s1, s2, s3, s4] = cyc.states;
  const pt = (s) => [s.H / 1000, s.P / 1000];
  return {
    ...calcFluidPhAxes(),
    series: [
      { key: "dome", label: tr("포화선(돔)", "Saturation dome"), points: calcFluidDome(f, Math.min(f.pc / 1000, cyc.pe / 3)) },
      { key: "cycle", label: tr("냉동 사이클", "Refrigeration cycle"), points: [pt(s1), pt(s2), pt(s3), pt(s4), pt(s1)] },
    ],
    markers: [s1, s2, s3, s4].map((s, i) => ({ x: s.H / 1000, y: s.P / 1000, label: String(i + 1) })),
    ariaLabel: tr(`${calcFluidLabel(f)} p–h 선도 위 냉동 사이클`, `Refrigeration cycle on the ${calcFluidLabel(f)} p–h diagram`),
  };
}

// 포화 표 행: 온도 목록 → [{ T, P, Dl, Dv, Hl, Hv, Sl, Sv }] (SI). 계산 못 한 온도는 뺀다.
function calcFluidSatRows(f, Ts) {
  return Ts.map(T => {
    const s = calcFluidSaturation(f.id, "T", T);
    return s.error ? null : { T, P: s.l.P, Pv: s.v.P, Dl: s.l.D, Dv: s.v.D, Hl: s.l.H, Hv: s.v.H, Sl: s.l.S, Sv: s.v.S };
  }).filter(Boolean);
}

// 포화 곡선 그래프(온도 °C – 압력 kPa 로그)
function calcFluidSatChart(f, rows) {
  if (!rows.length) return null;
  return {
    x: { label: tr("온도", "Temperature"), unit: "°C" },
    y: { label: tr("포화 압력", "Saturation pressure"), unit: "kPa", log: true },
    series: [{ key: "psat", label: tr("포화 압력", "Saturation pressure"), points: rows.map(r => [r.T - 273.15, r.P / 1000]) }],
    hlines: [{ y: CALC_CONST.atm / 1000, label: "1 atm" }],
    ariaLabel: tr(`${calcFluidLabel(f)} 포화 압력 곡선`, `${calcFluidLabel(f)} saturation pressure curve`),
  };
}

// 포화 표(정의의 table() 모양 — calc_table_data.jsx: 열 { key, label, dim?, unit, show?, digits }, 행 = 기준 단위 숫자)
function calcFluidSatTable(f, rows) {
  const liq = tr("포화 액", "sat. liquid"), vap = tr("포화 증기", "sat. vapour");
  const cols = [
    { key: "T", label: "T", dim: "temperature", unit: "K", show: "C", digits: 5 },
    { key: "P", label: f.pure ? "P" : tr("P′ 기포점", "P′ bubble"), dim: "pressure", unit: "Pa", show: "kPa", digits: 5 },
    ...(f.pure ? [] : [{ key: "Pv", label: tr("P″ 이슬점", "P″ dew"), dim: "pressure", unit: "Pa", show: "kPa", digits: 5 }]),
    { key: "Dl", label: `ρ′ ${liq}`, dim: "density", unit: "kgm3", digits: 5 },
    { key: "Dv", label: `ρ″ ${vap}`, dim: "density", unit: "kgm3", digits: 4 },
    { key: "Hl", label: `h′ ${liq}`, unit: "kJ/kg", digits: 5 },
    { key: "Hv", label: `h″ ${vap}`, unit: "kJ/kg", digits: 5 },
    { key: "Hfg", label: "Δh_vap", unit: "kJ/kg", digits: 4 },
    { key: "Sl", label: `s′ ${liq}`, unit: "kJ/(kg·K)", digits: 5 },
    { key: "Sv", label: `s″ ${vap}`, unit: "kJ/(kg·K)", digits: 5 },
  ];
  return {
    caption: tr(`${calcFluidLabel(f)} 포화 표 (CoolProp)`, `${calcFluidLabel(f)} saturation table (CoolProp)`),
    filename: `saturation_${f.id.replace(/[^A-Za-z0-9-]+/g, "_")}.csv`,
    columns: cols,
    rows: rows.map(x => ({ T: x.T, P: x.P, Pv: x.Pv, Dl: x.Dl, Dv: x.Dv, Hl: x.Hl / 1000, Hv: x.Hv / 1000, Hfg: (x.Hv - x.Hl) / 1000, Sl: x.Sl / 1000, Sv: x.Sv / 1000 })),
  };
}

// 사이클 상태점 표(출력 type: "table" 모양 — calc_out_table.jsx: 첫 열은 행 이름)
function calcFluidCycleTable(cyc) {
  const names = [tr("1 압축기 입구", "1 Compressor inlet"), tr("2 압축기 출구", "2 Compressor outlet"), tr("3 응축기 출구", "3 Condenser outlet"), tr("4 증발기 입구", "4 Evaporator inlet")];
  return {
    columns: [{ key: "pt", label: tr("점", "Point") }, { key: "T", label: "T (°C)", digits: 4 }, { key: "P", label: "P (kPa)", digits: 5 },
      { key: "h", label: "h (kJ/kg)", digits: 5 }, { key: "s", label: "s (kJ/(kg·K))", digits: 5 }, { key: "x", label: tr("건도 x", "Quality x"), digits: 3 }],
    rows: cyc.states.map((s, i) => ({ pt: names[i], T: s.T - 273.15, P: s.P / 1000, h: s.H / 1000, s: s.S / 1000, x: s.Q })),
  };
}

Object.assign(window, {
  calcFluidDome, calcFluidStateChart, calcFluidCycleChart, calcFluidSatRows, calcFluidSatChart, calcFluidSatTable, calcFluidCycleTable,
});

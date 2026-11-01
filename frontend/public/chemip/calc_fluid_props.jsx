// 계산기: 실유체 물성(CoolProp) — 냉매·탄화수소·기체 136종의 상태 물성, 포화 표, p-h(몰리에) 선도, 단순 냉동 사이클 COP.
// 계산은 CoolProp 8.0.0 wasm(calc_fluid_engine.jsx, 이 계산기를 열 때만 받는다). 유체 목록·이름은 calc_fluid_data.jsx·calc_fluid_names.jsx,
// 사이클은 calc_fluid_cycle.jsx, 그래프·표는 calc_fluid_charts.jsx. 엔진이 아직 없으면 compute 는 빈 결과를 돌려준다(상태 줄이 보인다).

const CALC_FLUID_PAIR_LABELS = { TP: "T, P", TS: "T, s", TQ: tr("T, 건도 x", "T, quality x"), PQ: tr("P, 건도 x", "P, quality x"), PH: "P, h", PS: "P, s", HS: "h, s" };
const calcFluidUses = (k) => (v) => v.mode === "state" && v.pair.includes(k);

function calcFluidPhaseLabel(st, f) {
  const L = {
    liquid: tr("압축액(과냉액)", "Compressed (subcooled) liquid"),
    gas: tr("과열 증기", "Superheated vapour"),
    supercritical: tr("초임계 유체", "Supercritical fluid"),
    supercritical_gas: tr("초임계 온도 위 기체", "Gas above the critical temperature"),
    supercritical_liquid: tr("초임계 압력 위 액체", "Liquid above the critical pressure"),
    critical_point: tr("임계점", "Critical point"),
    unknown: tr("알 수 없음", "Unknown"),
  };
  if (st.phase !== "twophase") return L[st.phase] || L.unknown;
  if (st.Q === 0) return tr("포화 액체", "Saturated liquid");
  if (st.Q === 1) return tr("포화 증기", "Saturated vapour");
  return f.pure ? tr("2상(습증기)", "Two-phase (wet vapour)") : tr("2상(혼합 냉매 온도 구배 구간)", "Two-phase (blend glide region)");
}

function calcFluidMeta(f) {
  return { Tc_out: f.Tc, pc_out: f.pc, M_out: f.M * 1000, sg_out: f.sg || undefined };
}

function calcFluidRangeError(f, T, P) {
  if (T != null && (T < f.Tmin - 1e-6 || T > f.Tmax + 1e-6)) {
    return tr(`온도가 이 유체 상태식의 범위(${(f.Tmin - 273.15).toFixed(1)}–${(f.Tmax - 273.15).toFixed(0)} °C) 밖입니다.`,
      `The temperature is outside the range of this fluid's equation of state (${(f.Tmin - 273.15).toFixed(1)} to ${(f.Tmax - 273.15).toFixed(0)} °C).`);
  }
  if (P != null && P > f.pmax * (1 + 1e-9)) {
    return tr(`압력이 이 유체 상태식의 상한(${(f.pmax / 1e6).toPrecision(3)} MPa)보다 높습니다.`, `The pressure is above the upper limit of this fluid's equation of state (${(f.pmax / 1e6).toPrecision(3)} MPa).`);
  }
  return null;
}

const calcFluidFail = (msg) => ({ error: tr(`이 조건은 CoolProp 이 풀지 못했습니다: ${msg}`, `CoolProp could not solve this condition: ${msg}`) });

function calcFluidComputeState(f, v) {
  const given = { T: v.T, P: v.P, H: v.h * 1000, S: v.s * 1000, Q: v.x };
  const bad = calcFluidRangeError(f, v.pair.includes("T") ? v.T : null, v.pair.includes("P") ? v.P : null);
  if (bad) return { error: bad };
  if (!f.pure && v.pair.includes("Q") && v.x > 0 && v.x < 1) {
    return { error: tr("유사순수 혼합 냉매(R404A·R407C·R410A·R507A·공기)는 건도 0 또는 1 만 넣을 수 있습니다. 2상 상태는 P, h 로 지정하십시오.",
      "For pseudo-pure blends (R404A, R407C, R410A, R507A, air) quality must be 0 or 1. Specify two-phase states with P and h.") };
  }
  const st = calcFluidState(f.id, v.pair, given);
  if (st.error) return calcFluidFail(st.error);
  const warnings = [];
  if (st.phase === "twophase" && st.Q > 0 && st.Q < 1) warnings.push(tr("2상 상태에서는 cp·cv·음속·점도·열전도도를 정의하지 않습니다(포화 액·증기 값을 따로 보십시오).", "cp, cv, speed of sound, viscosity and thermal conductivity are not defined inside the two-phase region (look at the saturated liquid and vapour values)."));
  return {
    ...calcFluidMeta(f), T_out: st.T, P_out: st.P, D_out: st.D, H_out: st.H / 1000, S_out: st.S / 1000,
    Cp_out: st.Cp == null ? undefined : st.Cp / 1000, Cv_out: st.Cv == null ? undefined : st.Cv / 1000,
    W_out: st.W ?? undefined, V_out: st.V ?? undefined, L_out: st.L ?? undefined,
    Q_out: st.Q ?? undefined, phase_out: calcFluidPhaseLabel(st, f), warnings, _state: st,
  };
}

function calcFluidComputeCycle(f, v) {
  for (const T of [v.Te, v.Tc]) { const bad = calcFluidRangeError(f, T, null); if (bad) return { error: bad }; }
  if (v.Tc >= f.Tc) return { error: tr("응축 온도가 임계 온도 이상이면 응축하지 않습니다(초임계 사이클은 다루지 않습니다).", "At or above the critical temperature the vapour does not condense (transcritical cycles are not covered).") };
  const cyc = calcFluidCycle(f.id, { Te: v.Te, Tc: v.Tc, sh: v.sh, sc: v.sc, eta: v.eta });
  if (cyc.cpError) return calcFluidFail(cyc.cpError);
  if (cyc.error) return { error: cyc.error };
  const [s1, s2, , s4] = cyc.states;
  const out = {
    ...calcFluidMeta(f), cop: cyc.cop, cop_carnot: cyc.copCarnot, qe: cyc.qe / 1000, w: cyc.w / 1000, qc: cyc.qc / 1000,
    pe: cyc.pe, pc: cyc.pc, ratio: cyc.ratio, T2: s2.T, x4: s4.Q ?? undefined, cycle_tbl: calcFluidCycleTable(cyc), warnings: [], _cycle: cyc,
  };
  if (v.cap != null) {
    const m = v.cap / cyc.qe;
    Object.assign(out, { m_dot: m, W_comp: m * cyc.w, Q_cond: m * cyc.qc });
  }
  if (s1.Q === 1 && v.sh === 0) out.warnings.push(tr("과열도 0 — 실제 압축기는 액 압축을 막으려고 보통 3–10 K 과열시킵니다.", "Zero superheat — real compressors usually take 3–10 K of superheat to avoid liquid slugging."));
  if (!f.pure) out.warnings.push(tr("혼합 냉매: 증발 압력은 증발 온도의 이슬점, 응축 압력은 응축 온도의 기포점으로 잡았습니다.", "Blend: evaporating pressure is taken at the dew point of the evaporating temperature, condensing pressure at the bubble point of the condensing temperature."));
  return out;
}

function calcFluidComputeSat(f, v) {
  const lo = Math.max(Math.min(v.T1, v.T2), f.Tt + 0.01), hi = Math.min(Math.max(v.T1, v.T2), f.Tc - 0.01);
  if (!(hi > lo)) return { error: tr(`포화 구간은 삼중점(${(f.Tt - 273.15).toFixed(2)} °C)과 임계점(${(f.Tc - 273.15).toFixed(2)} °C) 사이입니다.`, `Saturation exists only between the triple point (${(f.Tt - 273.15).toFixed(2)} °C) and the critical point (${(f.Tc - 273.15).toFixed(2)} °C).`) };
  const n = Math.round(v.n);
  const rows = calcFluidSatRows(f, calcChartRange(lo, hi, n - 1));
  if (!rows.length) return calcFluidFail("saturation");
  const warnings = [];
  if (lo > Math.min(v.T1, v.T2) + 1e-9 || hi < Math.max(v.T1, v.T2) - 1e-9) warnings.push(tr("온도 범위를 삼중점–임계점 사이로 줄였습니다.", "The temperature range was clipped to lie between the triple point and the critical point."));
  const nb = f.pt < CALC_CONST.atm && CALC_CONST.atm < f.pc ? calcFluidState(f.id, "PQ", { P: CALC_CONST.atm, Q: 0 }) : null;
  return { ...calcFluidMeta(f), Tt_out: f.Tt, Tb_out: nb && !nb.error ? nb.T : undefined, nrows: rows.length, warnings, _rows: rows };
}

const CALC_DEF_FLUID_PROPS = {
  key: "fluid_props",
  group: "thermo",
  engine: CALC_FLUID_ENGINE,
  title: tr("실유체 물성·냉매 p-h 선도 (CoolProp)", "Real-fluid properties & refrigerant p-h chart (CoolProp)"),
  summary: tr("냉매(R134a·R32·R410A·암모니아·CO₂·프로판 등)·탄화수소·기체 136종의 밀도·엔탈피·엔트로피·비열·점도·열전도도·음속을 두 상태량으로 구하고, 포화 표·p-h(몰리에) 선도·단순 냉동 사이클 COP 를 그립니다. 처음 열 때 CoolProp 엔진(약 9 MB)을 한 번 받습니다.",
    "Density, enthalpy, entropy, heat capacities, viscosity, thermal conductivity and speed of sound of 136 refrigerants (R134a, R32, R410A, ammonia, CO₂, propane …), hydrocarbons and gases from any two state variables, plus a saturation table, a p-h (Mollier) diagram and a simple refrigeration-cycle COP. Opening it downloads the CoolProp engine (about 9 MB) once."),
  inputs: [
    { key: "fluid", type: "choice", select: true, term: "refrigerant", label: tr("유체 (냉매 등)", "Fluid (refrigerant etc.)"), default: "R134a", options: calcFluidOptions() },
    { key: "mode", type: "choice", term: "ph_diagram", label: tr("계산", "Calculation"), default: "state",
      options: [{ v: "state", label: tr("상태 물성", "State properties") }, { v: "cycle", label: tr("냉동 사이클", "Refrigeration cycle") }, { v: "sat", label: tr("포화 표", "Saturation table") }] },
    { key: "pair", type: "choice", term: "fluid_state_pair", label: tr("주는 두 값", "Given pair"), default: "TP", when: v => v.mode === "state",
      options: Object.entries(CALC_FLUID_PAIR_LABELS).map(([v, label]) => ({ v, label })) },
    { key: "T", label: tr("온도 T", "Temperature T"), dim: "temperature", unit: "K", show: "C", default: 25, positive: true, when: calcFluidUses("T") },
    { key: "P", label: tr("압력 P (절대)", "Pressure P (absolute)"), term: "absolute_pressure", dim: "pressure", unit: "Pa", show: "kPa", default: 101.325, positive: true, when: calcFluidUses("P") },
    { key: "h", label: tr("비엔탈피 h", "Specific enthalpy h"), term: "specific_enthalpy", unit: "kJ/kg", default: 420, when: calcFluidUses("H") },
    { key: "s", label: tr("비엔트로피 s", "Specific entropy s"), term: "specific_entropy", unit: "kJ/(kg·K)", default: 1.75, when: calcFluidUses("S") },
    { key: "x", label: tr("건도 x", "Quality x"), term: "fluid_quality", unit: "—", default: 1, min: 0, max: 1, when: calcFluidUses("Q") },
    { key: "Te", label: tr("증발 온도", "Evaporating temperature"), term: "evaporating_temperature", dim: "temperature", unit: "K", show: "C", default: -10, positive: true, when: v => v.mode === "cycle" },
    { key: "Tc", label: tr("응축 온도", "Condensing temperature"), term: "condensing_temperature", dim: "temperature", unit: "K", show: "C", default: 40, positive: true, when: v => v.mode === "cycle" },
    { key: "sh", label: tr("과열도", "Superheat"), term: "superheat", unit: "K", default: 5, min: 0, max: 100, when: v => v.mode === "cycle" },
    { key: "sc", label: tr("과냉도", "Subcooling"), term: "subcooling", unit: "K", default: 5, min: 0, max: 100, when: v => v.mode === "cycle" },
    { key: "eta", label: tr("압축기 등엔트로피 효율", "Compressor isentropic efficiency"), term: "isentropic_efficiency", unit: "—", default: 0.75, positive: true, max: 1, when: v => v.mode === "cycle",
      hint: tr("1 = 이상 사이클(교과서 예제). 실제 왕복동·스크롤 압축기는 약 0.6–0.8.", "1 = ideal cycle (textbook examples). Real reciprocating and scroll compressors are about 0.6–0.8.") },
    { key: "cap", label: tr("냉동 능력 (선택)", "Cooling capacity (optional)"), term: "refrigerating_effect", dim: "power", unit: "W", show: "kW", default: "", positive: true, optional: true, when: v => v.mode === "cycle" },
    { key: "T1", label: tr("시작 온도", "From temperature"), dim: "temperature", unit: "K", show: "C", default: -40, positive: true, when: v => v.mode === "sat" },
    { key: "T2", label: tr("끝 온도", "To temperature"), dim: "temperature", unit: "K", show: "C", default: 60, positive: true, when: v => v.mode === "sat" },
    { key: "n", label: tr("행 수", "Rows"), unit: "—", default: 11, min: 2, max: 41, when: v => v.mode === "sat" },
  ],
  outputs: [
    { key: "phase_out", term: "fluid_phase", label: tr("상", "Phase"), type: "text" },
    { key: "T_out", label: tr("온도", "Temperature"), dim: "temperature", unit: "K", show: "C", digits: 5 },
    { key: "P_out", term: "absolute_pressure", label: tr("압력", "Pressure"), dim: "pressure", unit: "Pa", show: "kPa", digits: 5 },
    { key: "Q_out", term: "fluid_quality", label: tr("건도 x", "Quality x"), unit: "—", digits: 4 },
    { key: "D_out", term: "density", label: tr("밀도 ρ", "Density ρ"), dim: "density", unit: "kgm3", show: "kgm3", digits: 5 },
    { key: "H_out", term: "specific_enthalpy", label: tr("비엔탈피 h", "Specific enthalpy h"), unit: "kJ/kg", digits: 5 },
    { key: "S_out", term: "specific_entropy", label: tr("비엔트로피 s", "Specific entropy s"), unit: "kJ/(kg·K)", digits: 5 },
    { key: "Cp_out", term: "cp", label: tr("정압 비열 cp", "Isobaric heat capacity cp"), unit: "kJ/(kg·K)", digits: 4 },
    { key: "Cv_out", term: "cv", label: tr("정적 비열 cv", "Isochoric heat capacity cv"), unit: "kJ/(kg·K)", digits: 4 },
    { key: "V_out", term: "viscosity", label: tr("점도 μ", "Viscosity μ"), dim: "viscosity", unit: "Pas", show: "cP", digits: 4 },
    { key: "L_out", term: "thermal_conductivity", label: tr("열전도도 k", "Thermal conductivity k"), unit: "W/(m·K)", digits: 4 },
    { key: "W_out", term: "speed_of_sound", label: tr("음속 w", "Speed of sound w"), dim: "velocity", unit: "ms", show: "ms", digits: 5 },
    { key: "cop", term: "cycle_cop", label: tr("성적계수 COP", "Coefficient of performance COP"), unit: "—", digits: 4 },
    { key: "cop_carnot", term: "cycle_cop", label: tr("카르노 COP (같은 온도)", "Carnot COP (same temperatures)"), unit: "—", digits: 4 },
    { key: "qe", term: "refrigerating_effect", label: tr("냉동 효과 q_e = h1 − h4", "Refrigerating effect q_e = h1 − h4"), unit: "kJ/kg", digits: 5 },
    { key: "w", term: "compressor_work", label: tr("압축 일 w = h2 − h1", "Compressor work w = h2 − h1"), unit: "kJ/kg", digits: 5 },
    { key: "qc", label: tr("응축 방열 q_c = h2 − h3", "Heat rejected q_c = h2 − h3"), unit: "kJ/kg", digits: 5 },
    { key: "pe", term: "evaporating_temperature", label: tr("증발 압력", "Evaporating pressure"), dim: "pressure", unit: "Pa", show: "kPa", digits: 5 },
    { key: "pc", term: "condensing_temperature", label: tr("응축 압력", "Condensing pressure"), dim: "pressure", unit: "Pa", show: "kPa", digits: 5 },
    { key: "ratio", term: "pressure_ratio", label: tr("압축비 P_c/P_e", "Pressure ratio P_c/P_e"), unit: "—", digits: 4 },
    { key: "T2", term: "discharge_temperature", label: tr("토출 온도 T2", "Discharge temperature T2"), dim: "temperature", unit: "K", show: "C", digits: 4 },
    { key: "x4", term: "fluid_quality", label: tr("증발기 입구 건도 x4", "Evaporator inlet quality x4"), unit: "—", digits: 3 },
    { key: "m_dot", term: "mass_flow", label: tr("냉매 순환량", "Refrigerant mass flow"), dim: "massflow", unit: "kgs", show: "kgh", digits: 4 },
    { key: "W_comp", term: "compressor_work", label: tr("압축기 동력", "Compressor power"), dim: "power", unit: "W", show: "kW", digits: 4 },
    { key: "Q_cond", label: tr("응축기 방열량", "Condenser heat rejection"), dim: "power", unit: "W", show: "kW", digits: 4 },
    { key: "cycle_tbl", label: tr("사이클 상태점", "Cycle state points"), type: "table" },
    { key: "nrows", term: "saturation_table", label: tr("포화 표 행 수", "Saturation table rows"), unit: "—", digits: 3 },
    { key: "Tb_out", term: "boiling_point", label: tr("표준 끓는점 (1 atm)", "Normal boiling point (1 atm)"), dim: "temperature", unit: "K", show: "C", digits: 5 },
    { key: "Tt_out", label: tr("삼중점 온도", "Triple-point temperature"), dim: "temperature", unit: "K", show: "C", digits: 5 },
    { key: "Tc_out", term: "critical_point", label: tr("임계 온도", "Critical temperature"), dim: "temperature", unit: "K", show: "C", digits: 5 },
    { key: "pc_out", term: "critical_point", label: tr("임계 압력", "Critical pressure"), dim: "pressure", unit: "Pa", show: "MPa", digits: 5 },
    { key: "M_out", term: "molar_mass", label: tr("몰질량", "Molar mass"), unit: "g/mol", digits: 5 },
    { key: "sg_out", term: "ashrae_safety_group", label: tr("ASHRAE 34 안전 등급", "ASHRAE 34 safety group"), type: "text" },
  ],
  compute(v) {
    const f = calcFluidById(v.fluid);
    if (!f) return { error: tr("목록에 없는 유체입니다.", "This fluid is not in the list.") };
    if (!calcFluidEngineReady()) return {};
    if (v.mode === "cycle") return calcFluidComputeCycle(f, v);
    if (v.mode === "sat") return calcFluidComputeSat(f, v);
    return calcFluidComputeState(f, v);
  },
  chart(v, out) {
    const f = calcFluidById(v.fluid);
    if (!f || !calcFluidEngineReady()) return null;
    if (v.mode === "cycle") return calcFluidCycleChart(f, calcFluidComputeCycle(f, v)._cycle);
    if (v.mode === "sat") return calcFluidSatChart(f, calcFluidComputeSat(f, v)._rows || []);
    return calcFluidStateChart(f, calcFluidComputeState(f, v)._state);
  },
  table(v) {
    const f = calcFluidById(v.fluid);
    if (v.mode !== "sat" || !f || !calcFluidEngineReady()) return null;
    const rows = calcFluidComputeSat(f, v)._rows;
    return rows ? calcFluidSatTable(f, rows) : null;
  },
  formula: [
    tr("상태 원리: 순수 물질의 평형 상태는 두 개의 독립 세기 상태량으로 정해진다(2상에서는 T·P 가 독립이 아니므로 건도 x 를 준다).", "State postulate: two independent intensive properties fix the equilibrium state of a pure substance (in the two-phase region T and P are not independent, so give the quality x)."),
    tr("물성 = 헬름홀츠 자유에너지 상태식 α(τ, δ) 와 그 미분(CoolProp HEOS). 점도·열전도도는 유체별 수송 상관식.", "Properties = Helmholtz-energy equation of state α(τ, δ) and its derivatives (CoolProp HEOS); viscosity and conductivity from fluid-specific transport correlations."),
    "COP = q_e / w = (h1 − h4) / (h2 − h1)",
    "h2 = h1 + (h2s − h1) / η_is,   h4 = h3,   COP_Carnot = T_e / (T_c − T_e)",
  ],
  notes: [
    tr("CoolProp 엔진(약 9 MB, 압축 전송 약 3–4 MB)은 이 계산기를 처음 열 때 한 번 받고, 그 뒤에는 브라우저 저장소에서 씁니다. 계산은 모두 이 브라우저 안에서 합니다.", "The CoolProp engine (about 9 MB, 3–4 MB compressed) is downloaded the first time this calculator opens and then served from the browser cache. All calculations run in this browser."),
    tr("엔탈피·엔트로피 기준 상태는 유체마다 CoolProp 기본값입니다(냉매는 IIR: 0 °C 포화 액 h = 200 kJ/kg, s = 1 kJ/(kg·K)). 다른 증기표와 비교할 때는 절댓값이 아니라 차이(h1 − h4 등)를 비교하십시오.", "Enthalpy and entropy reference states are CoolProp defaults for each fluid (IIR for refrigerants: saturated liquid at 0 °C has h = 200 kJ/kg, s = 1 kJ/(kg·K)). When comparing with other tables, compare differences (h1 − h4, …), not absolute values."),
    tr("R404A·R407C·R410A·R507A·공기는 혼합물을 순수 유체처럼 맞춘 유사순수 모델입니다. 온도 구배가 큰 혼합 냉매의 2상 계산은 근사입니다.", "R404A, R407C, R410A, R507A and air are pseudo-pure fits of mixtures. Two-phase results for blends with a large temperature glide are approximate."),
    tr("냉동 사이클은 배관·열교환기 압력 손실과 열 손실을 무시한 단순 모델입니다. 기기 선정에는 제조사 자료를 쓰십시오. 초임계(CO₂ 고압측) 사이클은 다루지 않습니다.", "The refrigeration cycle ignores line and heat-exchanger pressure drops and heat losses. Use manufacturer data for equipment selection. Transcritical (CO₂ high-side) cycles are not covered."),
  ],
  reference: [
    "Bell, I.H., Wronski, J., Quoilin, S., Lemort, V. (2014). Pure and Pseudo-pure Fluid Thermophysical Property Evaluation and the Open-Source Thermophysical Property Library CoolProp. Ind. Eng. Chem. Res. 53(6), 2498–2508. doi:10.1021/ie4033999",
    tr("CoolProp 8.0.0 (MIT 라이선스) — 유체별 상태식 원 논문은 coolprop.org 의 각 유체 쪽에 있습니다.", "CoolProp 8.0.0 (MIT licence) — the original equation-of-state paper for each fluid is listed on its coolprop.org fluid page."),
    "Tillner-Roth, R. & Baehr, H.D. (1994). An international standard formulation for the thermodynamic properties of 1,1,1,2-tetrafluoroethane (HFC-134a). J. Phys. Chem. Ref. Data 23, 657–729.",
    "Span, R. & Wagner, W. (1996). A new equation of state for carbon dioxide. J. Phys. Chem. Ref. Data 25, 1509–1596.",
    tr("Çengel, Y.A. & Boles, M.A., Thermodynamics: An Engineering Approach, 7판(2011), 11장 냉동 사이클(예제 11-1 로 검증)", "Çengel, Y.A. & Boles, M.A., Thermodynamics: An Engineering Approach, 7th ed. (2011), Ch. 11 Refrigeration cycles (validated with Example 11-1)"),
  ],
};

Object.assign(window, { CALC_DEF_FLUID_PROPS, calcFluidPhaseLabel });

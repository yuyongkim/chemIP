// 계산기: BLEVE 화구(fireball) 열복사 — CCPS(1994)·Roberts(1982) 지름·지속시간·높이·방사 분율, 구 형태계수·대기 투과율,
// 거리별 복사열·열량·화상 probit, 2도 화상 열량 거리, EPA RMP 부록 D.10(Hymes 점원) 거리. 공용 식은 calc_fire_*.jsx.

const CALC_BLEVE_DOSE_2ND = 3.42e6;   // (W/m²)^(4/3)·s — 5 kW/m² × 40 s 의 열량(EPA RMP OCA 부록 D 식 D-33)

// 지속시간 t [s] — M < 30 000 kg 이면 0.45 M^(1/3), 아니면 2.6 M^(1/6) (CCPS 1994; EPA RMP 식 D-31·D-32)
function calcFireballDuration(M) {
  return M < 30000 ? 0.45 * Math.cbrt(M) : 2.6 * Math.pow(M, 1 / 6);
}

// 입력(기준 단위) → 화구 모델. r: 화구 중심 바로 아래 지점에서 표적까지 지면 거리 [m]
function calcFireballModel(v) {
  const D = 5.8 * Math.cbrt(v.M);
  const t = calcFireballDuration(v.M);
  const H = 0.75 * D;
  const f = 0.27 * Math.pow(v.Pv / 1e6, 0.32);
  const E = f * v.M * v.dHc / (Math.PI * D * D * t);
  const Pw = calcFireVapourPa(v.Ta, v.RH);
  const X = r => Math.sqrt(r * r + H * H);
  const q = r => E * calcSphereViewFactor(D, X(r)) * calcTransmissivity(v.tau, Pw, Math.max(X(r) - D / 2, 0));
  return { D, t, H, f, E, X, q, Pw };
}

// EPA RMP 부록 D.10 Hymes 점원: q = 2.2 τ R ΔHc M^0.67 / (4π L²), τ = 1, R = 0.4. 열량 3.42e6 이 되는 L [m] (식 D-36)
function calcRmpFireballDistance(M, dHc) {
  const t = calcFireballDuration(M);
  const qNeed = Math.pow(CALC_BLEVE_DOSE_2ND / t, 0.75);
  return Math.sqrt(2.2 * 1 * 0.4 * dHc * Math.pow(M, 0.67) / (4 * Math.PI * qNeed));
}

function calcBleveChart(v, out) {
  const m = calcFireballModel(v);
  const far = [out.d5, out.d_dose, v.R].filter(Number.isFinite);
  const hi = 1.3 * Math.max(m.D, ...far);
  const pts = calcChartRange(0, hi, 80).map(r => [r, m.q(r) / 1000]).filter(([, q]) => q > 0);
  const qDose = Math.pow(CALC_BLEVE_DOSE_2ND / m.t, 0.75) / 1000;
  return {
    x: { label: tr("화구 아래 지점에서 지면 거리", "Ground distance from the point below the fireball"), unit: "m", min: 0 },
    y: { label: tr("복사열", "Heat flux"), unit: "kW/m²", log: true },
    series: [{ key: "q", label: tr("화구 복사열 (CCPS)", "Fireball heat flux (CCPS)"), points: pts }],
    hlines: [...CALC_FIRE_FLUX_LEVELS.map(l => ({ y: l.q, label: l.label })),
      { y: qDose, label: tr(`2도 화상 열량 (지속 ${calcFormatNumber(m.t, 3)} s)`, `Second-degree burn dose (${calcFormatNumber(m.t, 3)} s duration)`) }],
    vlines: [{ x: v.R, label: tr("표적", "Target") }],
    ariaLabel: tr("BLEVE 화구 거리별 복사열", "BLEVE fireball heat flux against distance"),
  };
}

const CALC_DEF_BLEVE = {
  key: "bleve",
  group: "fire",
  title: tr("BLEVE 화구 복사열", "BLEVE fireball radiation"),
  summary: tr("액화가스 용기가 터져 생기는 화구의 지름·지속시간·높이·방사 강도를 구하고, 거리별 복사열·열량·화상 확률과 2도 화상 거리를 어림합니다. 참고용 스크리닝입니다.",
    "Estimates the diameter, duration, height and emissive power of a fireball from a ruptured liquefied-gas vessel, and the heat flux, dose, burn probability and second-degree burn distance against distance. Screening only."),
  inputs: [
    { key: "M", label: tr("화구 연료 질량", "Fuel mass in the fireball"), term: "mass_quantity", dim: "mass", unit: "kg", show: "kg", default: 10000, positive: true,
      hint: tr("보통 용기 내용물 전체(EPA·ALOHA 기본). 누출량 계산기 결과를 넣을 수 있습니다", "Usually the whole vessel inventory (EPA and ALOHA default). You can use the result of the release calculator") },
    { key: "dHc", label: tr("연소열 ΔHc", "Heat of combustion ΔHc"), term: "heat_of_combustion", dim: "spenergy", unit: "Jkg", show: "kJkg", default: 46333, positive: true,
      hint: tr("기본값은 프로페인 46 333 kJ/kg (EPA RMP 예제 16)", "Default is propane, 46,333 kJ/kg (EPA RMP Example 16)") },
    { key: "Pv", label: tr("파열 직전 증기압 (절대)", "Vapour pressure at rupture (absolute)"), term: "burst_vapor_pressure", dim: "pressure", unit: "Pa", show: "MPa", default: 0.85, positive: true,
      hint: tr("방사 분율 f = 0.27 P^0.32 (P 는 MPa)", "Radiative fraction f = 0.27 P^0.32 (P in MPa)") },
    { key: "Ta", label: tr("주위 온도", "Ambient temperature"), dim: "temperature", unit: "K", show: "C", default: 25, positive: true },
    { key: "RH", label: tr("상대습도", "Relative humidity"), term: "relative_humidity", unit: "%", default: 50, min: 0, max: 100 },
    { key: "tau", type: "choice", label: tr("대기 투과율", "Atmospheric transmissivity"), term: "atm_transmissivity", default: "pietersen",
      options: [{ v: "pietersen", label: "Pietersen–Huerta" }, { v: "cook", label: "Cook (ALOHA)" }, { v: "one", label: tr("τ = 1 (보수적)", "τ = 1 (conservative)") }] },
    { key: "R", label: tr("표적 지면 거리", "Target ground distance"), term: "target_distance", dim: "length", unit: "m", show: "m", default: 200, min: 0 },
  ],
  outputs: [
    { key: "D", label: tr("화구 최대 지름", "Maximum fireball diameter"), term: "fireball_diameter", dim: "length", unit: "m", show: "m", digits: 3 },
    { key: "t", label: tr("화구 지속시간", "Fireball duration"), term: "fireball_duration", dim: "time", unit: "s", show: "s", digits: 3 },
    { key: "H", label: tr("화구 중심 높이", "Fireball centre height"), term: "fireball_lift", dim: "length", unit: "m", show: "m", digits: 3 },
    { key: "f", label: tr("방사 분율 f", "Radiative fraction f"), term: "radiative_fraction", unit: "—", digits: 3 },
    { key: "E", label: tr("표면 방사 강도 E", "Surface emissive power E"), term: "surface_emissive_power", dim: "heatflux", unit: "Wm2", show: "kWm2", digits: 3 },
    { key: "F", label: tr("형태계수 F (표적)", "View factor F (target)"), term: "view_factor", unit: "—", digits: 3 },
    { key: "tauR", label: tr("대기 투과율 τ (표적)", "Transmissivity τ (target)"), term: "atm_transmissivity", unit: "—", digits: 3 },
    { key: "q", label: tr("표적 복사열", "Target heat flux"), term: "heat_flux", dim: "heatflux", unit: "Wm2", show: "kWm2", digits: 3 },
    { key: "dose", label: tr("표적 열량 t·q^(4/3)", "Target dose t·q^(4/3)"), term: "thermal_dose", unit: "(W/m²)^(4/3)·s", digits: 3 },
    { key: "P_death", label: tr("화상 사망 확률 (Eisenberg probit)", "Burn fatality probability (Eisenberg probit)"), term: "probit_percent", unit: "%", digits: 3 },
    { key: "P_2nd", label: tr("2도 화상 확률", "Second-degree burn probability"), term: "probit_percent", unit: "%", digits: 3 },
    { key: "d5", label: tr("5 kW/m² 거리 (지면)", "5 kW/m² distance (ground)"), term: "thermal_threshold", dim: "length", unit: "m", show: "m", digits: 3 },
    { key: "d_dose", label: tr("2도 화상 열량 거리 (지면, CCPS 모델)", "Second-degree burn dose distance (ground, CCPS model)"), term: "thermal_dose", dim: "length", unit: "m", show: "m", digits: 3 },
    { key: "d_epa", label: tr("2도 화상 열량 거리 · EPA RMP 식 D-36", "Second-degree burn dose distance · EPA RMP Eq. D-36"), term: "rmp_endpoint", dim: "length", unit: "m", show: "m", digits: 3 },
  ],
  compute(v) {
    const m = calcFireballModel(v);
    const q = m.q(v.R);
    const warnings = [];
    if (m.f > 0.4) warnings.push(tr("방사 분율이 0.4 를 넘습니다. 보고된 범위(약 0.25–0.4) 밖이라 결과가 과대일 수 있습니다.",
      "The radiative fraction exceeds 0.4, outside the reported range (about 0.25–0.4); results may be overestimated."));
    if (v.M > 5e6) warnings.push(tr("5 000 t 를 넘는 화구는 실제 사고 기록 범위 밖입니다(ALOHA 상한).", "Fireballs above 5,000 t are beyond the historical record (ALOHA upper limit)."));
    if (m.X(v.R) <= m.D / 2) warnings.push(tr("표적이 화구 안에 있습니다.", "The target is inside the fireball."));
    const dose = calcThermalDose(q, m.t);
    const qDose = Math.pow(CALC_BLEVE_DOSE_2ND / m.t, 0.75);
    return {
      D: m.D, t: m.t, H: m.H, f: m.f, E: m.E,
      F: calcSphereViewFactor(m.D, m.X(v.R)),
      tauR: calcTransmissivity(v.tau, m.Pw, Math.max(m.X(v.R) - m.D / 2, 0)),
      q, dose,
      P_death: q > 0 ? calcProbitToPercent(calcThermalProbit("death", q, m.t)) : 0,
      P_2nd: q > 0 ? calcProbitToPercent(calcThermalProbit("second", q, m.t)) : 0,
      d5: calcFiniteOrUndef(calcSolveDistance(m.q, 5000, 1e-3, 1e5)),
      d_dose: calcFiniteOrUndef(calcSolveDistance(m.q, qDose, 1e-3, 1e5)),
      d_epa: calcRmpFireballDistance(v.M, v.dHc),
      warnings,
    };
  },
  chart: calcBleveChart,
  links: (v, o) => [
    { calc: "probit_harm", values: { kind: "thermal", I: o.q / 1000, t: o.t }, label: tr("표적 복사열·화구 지속시간으로 화상 probit", "Burn probits at the target flux for the fireball duration") },
  ],
  formula: [
    "D_max = 5.8 M^(1/3) m ;  H = 0.75 D_max",
    tr("t = 0.45 M^(1/3) s (M < 30 000 kg),  t = 2.6 M^(1/6) s (M ≥ 30 000 kg)", "t = 0.45 M^(1/3) s (M < 30,000 kg),  t = 2.6 M^(1/6) s (M ≥ 30,000 kg)"),
    tr("f = 0.27 P_v^0.32 (P_v [MPa]),  E = f M ΔHc / (π D_max² t)", "f = 0.27 P_v^0.32 (P_v [MPa]),  E = f M ΔHc / (π D_max² t)"),
    tr("q = E · F · τ,  F = (D_max/2)² / X²,  X = √(r² + H²),  τ 경로 = X − D_max/2", "q = E · F · τ,  F = (D_max/2)² / X²,  X = √(r² + H²),  τ path = X − D_max/2"),
    tr("열량 = t · q^(4/3);  2도 화상 기준 3.42 × 10⁶ (W/m²)^(4/3)·s = (5 kW/m²)^(4/3) × 40 s", "Dose = t · q^(4/3);  second-degree threshold 3.42 × 10⁶ (W/m²)^(4/3)·s = (5 kW/m²)^(4/3) × 40 s"),
    tr("EPA RMP(Hymes): L = √(2.2 τ R ΔHc M^0.67 / (4π (3.42×10⁶ / t)^(3/4))),  τ = 1, R = 0.4", "EPA RMP (Hymes): L = √(2.2 τ R ΔHc M^0.67 / (4π (3.42×10⁶ / t)^(3/4))),  τ = 1, R = 0.4"),
  ],
  notes: [
    CALC_FIRE_NOTES.screening,
    tr("표적은 화구를 바로 바라보는 면(최대 형태계수)으로 둡니다. 화구가 떠오르며 커지는 시간 변화는 보지 않고 최대 지름·평균 방사 강도로 계산합니다.",
      "The target surface faces the fireball (maximum view factor). The growth and lift-off of the fireball over time are ignored; the maximum diameter and average emissive power are used."),
    tr("BLEVE 의 폭발 과압·파편은 여기서 계산하지 않습니다. 파편은 수백 m 넘게 날아갈 수 있습니다.", "Blast overpressure and fragments from the BLEVE are not calculated here. Fragments can travel several hundred metres."),
    CALC_FIRE_NOTES.endpoint,
    tr("EPA RMP 참조표 30 은 이 식(D-36)을 0.1 mi 단위로 반올림한 표입니다.", "EPA RMP Reference Table 30 tabulates this equation (D-36), rounded to about 0.1 mi."),
  ],
  reference: [
    "Roberts, A.F. (1982). Thermal radiation hazards from releases of LPG from pressurised storage. Fire Safety Journal 4, 197–212.",
    tr("CCPS (1994). Guidelines for Evaluating the Characteristics of Vapor Cloud Explosions, Flash Fires, and BLEVEs. AIChE — 식만 인용(표·그림 옮기지 않음)",
      "CCPS (1994). Guidelines for Evaluating the Characteristics of Vapor Cloud Explosions, Flash Fires, and BLEVEs. AIChE — equations cited only (no tables or figures reproduced)"),
    tr("U.S. EPA (1999/2009). Risk Management Program Guidance for Offsite Consequence Analysis — 부록 D.10 식 D-30–D-36, 참조표 30",
      "U.S. EPA (1999/2009). Risk Management Program Guidance for Offsite Consequence Analysis — Appendix D.10 Eqs. D-30–D-36, Reference Table 30"),
    tr("Eisenberg, N.A., Lynch, C.J., Breeding, R.J. (1975). Vulnerability Model. U.S. Coast Guard CG-D-136-75 — 화상 probit",
      "Eisenberg, N.A., Lynch, C.J., Breeding, R.J. (1975). Vulnerability Model. U.S. Coast Guard CG-D-136-75 — burn probits"),
    tr("Pietersen & Huerta (1985) TNO 85-0222; Cook et al. (1990) — 대기 투과율", "Pietersen & Huerta (1985) TNO 85-0222; Cook et al. (1990) — atmospheric transmissivity"),
    tr("Crowl & Louvar, Chemical Process Safety 3판(2011), 6장 BLEVE", "Crowl & Louvar, Chemical Process Safety, 3rd ed. (2011), Ch. 6 BLEVE"),
  ],
};

Object.assign(window, { CALC_DEF_BLEVE, CALC_BLEVE_DOSE_2ND, calcFireballDuration, calcFireballModel, calcRmpFireballDistance, calcBleveChart });

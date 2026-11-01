// 계산기: 풀 화재(액면 화재) 열복사 — Burgess 연소 속도, Thomas 화염 높이, 고체 화염(Shokri–Beyler 원통 형태계수)·점원 모델,
// 대기 투과율, 복사열 단계별 거리, EPA RMP Pool Fire Factor 거리. 공용 식은 calc_fire_radiation.jsx·calc_fire_common.jsx.

// 입력(기준 단위) → 풀 화재 모델 한 벌. compute·chart 가 함께 쓴다.
function calcPoolFireModel(v) {
  const D = v.size === "A" ? Math.sqrt(4 * v.A / Math.PI) : v.D;
  const A = Math.PI * D * D / 4;
  const mpp = v.rate === "burgess" ? calcBurgessRate(v.dHc, v.dHv, v.cp, v.Tb, v.Ta) : v.mpp;
  const H = calcThomasHeight(mpp, D, calcAirDensity(v.Ta));
  const Q = mpp * A * v.dHc;
  const E = v.emis === "given" ? v.Eg : CALC_POOL_EMISSIVE[v.emis](D);
  const Pw = calcFireVapourPa(v.Ta, v.RH);
  const tau = x => calcTransmissivity(v.tau, Pw, x);
  const qSF = r => {
    const vf = calcCylinderViewFactor(r, D, H);
    return vf ? E * vf.F * tau(r - D / 2) : E;
  };
  const xPS = r => Math.sqrt(r * r + H * H / 4);
  const qPS = r => calcPointSourceFlux(tau(xPS(r)), v.Xr, Q, xPS(r));
  return { D, A, mpp, H, Q, E, tau, qSF, qPS };
}

// EPA RMP OCA 부록 D 식 D-28/D-29 의 Pool Fire Factor(무차원, 거리 = PFF·√면적): 방사 분율 0.4, τ = 1, 5 kW/m², 주위 298 K
function calcRmpPoolFireFactor(dHc, dHv, cp, Tb) {
  const dH = dHv + cp * Math.max(0, Tb - 298);
  return dHc * Math.sqrt(1e-4 / (Math.PI * 5000 * dH));
}

function calcPoolFireChart(v, out) {
  const m = calcPoolFireModel(v);
  const far = [out.d_sf_4, out.d_ps_4, v.R].filter(Number.isFinite);
  const lo = m.D / 2 * 1.02;
  const hi = Math.max(lo * 4, 1.3 * Math.max(...far));
  const pts = f => calcChartRange(lo, hi, 80).map(r => [r, f(r) / 1000]).filter(([, q]) => q > 0);
  return {
    x: { label: tr("풀 중심에서 거리", "Distance from pool centre"), unit: "m", min: 0 },
    y: { label: tr("복사열", "Heat flux"), unit: "kW/m²", log: true },
    series: [
      { key: "sf", label: tr("고체 화염 모델", "Solid-flame model"), points: pts(m.qSF) },
      { key: "ps", label: tr("점원 모델", "Point-source model"), points: pts(m.qPS), dashed: true },
    ],
    hlines: CALC_FIRE_FLUX_LEVELS.map(l => ({ y: l.q, label: l.label })),
    vlines: [{ x: v.R, label: tr("표적", "Target") }],
    ariaLabel: tr("풀 화재 거리별 복사열", "Pool fire heat flux against distance"),
  };
}

const CALC_DEF_POOL_FIRE = {
  key: "pool_fire",
  group: "fire",
  title: tr("풀 화재 복사열", "Pool fire radiation"),
  summary: tr("방류벽·바닥에 고인 인화성 액체가 탈 때 연소 속도·화염 높이·거리별 복사열을 고체 화염과 점원 두 모델로 구하고, 4 / 5 / 12.5 / 37.5 kW/m² 거리를 찾습니다. 참고용 스크리닝입니다.",
    "For a burning pool of flammable liquid (bund or spill), estimates burning rate, flame height and heat flux against distance with both the solid-flame and point-source models, and finds the 4 / 5 / 12.5 / 37.5 kW/m² distances. Screening only."),
  inputs: [
    { key: "size", type: "choice", label: tr("풀 크기", "Pool size"), term: "pool_diameter", default: "D",
      options: [{ v: "D", label: tr("지름", "Diameter") }, { v: "A", label: tr("면적", "Area") }] },
    { key: "D", label: tr("풀 지름", "Pool diameter"), term: "pool_diameter", dim: "length", unit: "m", show: "m", default: 10, positive: true, when: c => c.size === "D" },
    { key: "A", label: tr("풀 면적", "Pool area"), term: "pool_diameter", dim: "area", unit: "m2", show: "m2", default: 78.54, positive: true, when: c => c.size === "A",
      hint: tr("방류벽이면 방류벽 바닥 면적, 아니면 누출량 ÷ 액 깊이(EPA 는 1 cm)", "Bund floor area if bunded; otherwise spilled volume ÷ depth (EPA uses 1 cm)") },
    { key: "dHc", label: tr("연소열 ΔHc (저위)", "Heat of combustion ΔHc (lower)"), term: "heat_of_combustion", dim: "spenergy", unit: "Jkg", show: "kJkg", default: 44700, positive: true,
      hint: tr("기본값은 n-헥세인 예시(약 44 700 kJ/kg)", "Default is n-hexane as an example (about 44,700 kJ/kg)") },
    { key: "rate", type: "choice", label: tr("연소 속도", "Burning rate"), term: "burning_rate", default: "burgess",
      options: [{ v: "burgess", label: tr("Burgess 식으로", "Burgess correlation") }, { v: "given", label: tr("직접 입력", "Enter value") }] },
    { key: "dHv", label: tr("증발열 ΔHv (끓는점)", "Heat of vaporisation ΔHv (at boiling point)"), term: "heat_of_vaporization", dim: "spenergy", unit: "Jkg", show: "kJkg", default: 335, positive: true, when: c => c.rate === "burgess" },
    { key: "cp", label: tr("액체 비열 cp", "Liquid heat capacity cp"), term: "cp", dim: "spentropy", unit: "JkgK", show: "kJkgK", default: 2.27, positive: true, when: c => c.rate === "burgess" },
    { key: "Tb", label: tr("끓는점 Tb", "Boiling point Tb"), term: "boiling_point", dim: "temperature", unit: "K", show: "C", default: 68.7, positive: true, when: c => c.rate === "burgess" },
    { key: "mpp", label: tr("연소 속도 m″", "Burning rate m″"), term: "burning_rate", unit: "kg/(m²·s)", default: 0.055, positive: true, max: 1, when: c => c.rate === "given",
      hint: tr("측정값이 있으면 그 값(예: 휘발유 약 0.055)", "Use a measured value if available (e.g. gasoline about 0.055)") },
    { key: "Ta", label: tr("주위 온도", "Ambient temperature"), dim: "temperature", unit: "K", show: "C", default: 25, positive: true },
    { key: "RH", label: tr("상대습도", "Relative humidity"), term: "relative_humidity", unit: "%", default: 50, min: 0, max: 100 },
    { key: "tau", type: "choice", label: tr("대기 투과율", "Atmospheric transmissivity"), term: "atm_transmissivity", default: "pietersen",
      options: [{ v: "pietersen", label: "Pietersen–Huerta" }, { v: "cook", label: "Cook (ALOHA)" }, { v: "one", label: tr("τ = 1 (보수적)", "τ = 1 (conservative)") }] },
    { key: "emis", type: "choice", label: tr("표면 방사 강도 E", "Surface emissive power E"), term: "surface_emissive_power", default: "shokri",
      options: [{ v: "shokri", label: "Shokri–Beyler" }, { v: "mudan", label: "Mudan" }, { v: "given", label: tr("직접 입력", "Enter value") }] },
    { key: "Eg", label: tr("표면 방사 강도", "Surface emissive power"), term: "surface_emissive_power", dim: "heatflux", unit: "Wm2", show: "kWm2", default: 50, positive: true, when: c => c.emis === "given" },
    { key: "Xr", label: tr("방사 분율 X_r (점원)", "Radiative fraction X_r (point source)"), term: "radiative_fraction", unit: "—", default: 0.35, min: 0.05, max: 0.6,
      hint: tr("보통 0.15–0.35. 그을음이 많은 큰 화재일수록 작음", "Typically 0.15–0.35; smaller for large, sooty fires") },
    { key: "R", label: tr("표적 거리 (풀 중심에서)", "Target distance (from pool centre)"), term: "target_distance", dim: "length", unit: "m", show: "m", default: 30, positive: true },
    { key: "PFF", label: tr("EPA Pool Fire Factor (선택)", "EPA Pool Fire Factor (optional)"), term: "rmp_pff", unit: "—", default: "", optional: true, positive: true,
      hint: tr("EPA RMP OCA 부록 C 의 PFF. 비우면 Burgess 입력으로 부록 D 식 D-28 에서 구합니다", "PFF from EPA RMP OCA Appendix C. If blank, derived from the Burgess inputs with Appendix D Eq. D-28") },
  ],
  outputs: [
    { key: "D_out", label: tr("풀 지름", "Pool diameter"), term: "pool_diameter", dim: "length", unit: "m", show: "m" },
    { key: "mpp", label: tr("연소 속도 m″", "Burning rate m″"), term: "burning_rate", unit: "kg/(m²·s)", digits: 3 },
    { key: "H", label: tr("화염 높이 (Thomas)", "Flame height (Thomas)"), term: "flame_height", dim: "length", unit: "m", show: "m", digits: 3 },
    { key: "Q", label: tr("열방출률", "Heat release rate"), term: "fire_heat_release", dim: "power", unit: "W", show: "MW", digits: 4 },
    { key: "E", label: tr("표면 방사 강도 E", "Surface emissive power E"), term: "surface_emissive_power", dim: "heatflux", unit: "Wm2", show: "kWm2", digits: 3 },
    { key: "F", label: tr("형태계수 F (표적)", "View factor F (target)"), term: "view_factor", unit: "—", digits: 3 },
    { key: "tauR", label: tr("대기 투과율 τ (표적)", "Transmissivity τ (target)"), term: "atm_transmissivity", unit: "—", digits: 3 },
    { key: "q_sf", label: tr("표적 복사열 · 고체 화염", "Target heat flux · solid flame"), term: "solid_flame_model", dim: "heatflux", unit: "Wm2", show: "kWm2", digits: 3 },
    { key: "q_ps", label: tr("표적 복사열 · 점원", "Target heat flux · point source"), term: "point_source_model", dim: "heatflux", unit: "Wm2", show: "kWm2", digits: 3 },
    ...CALC_FIRE_FLUX_LEVELS.map(l => ({ key: `d_sf_${l.key}`, label: tr(`${l.q} kW/m² 거리 · 고체 화염`, `${l.q} kW/m² distance · solid flame`), term: "thermal_threshold", dim: "length", unit: "m", show: "m", digits: 3 })),
    { key: "d_ps_4", label: tr("4 kW/m² 거리 · 점원", "4 kW/m² distance · point source"), term: "thermal_threshold", dim: "length", unit: "m", show: "m", digits: 3 },
    { key: "d_ps_5", label: tr("5 kW/m² 거리 · 점원", "5 kW/m² distance · point source"), term: "thermal_threshold", dim: "length", unit: "m", show: "m", digits: 3 },
    { key: "PFF_out", label: "EPA Pool Fire Factor", term: "rmp_pff", unit: "—", digits: 3 },
    { key: "d_pff", label: tr("5 kW/m² 거리 · EPA RMP 식 10-1", "5 kW/m² distance · EPA RMP Eq. 10-1"), term: "rmp_pff", dim: "length", unit: "m", show: "m", digits: 3 },
  ],
  compute(v) {
    const m = calcPoolFireModel(v);
    const warnings = [];
    if (v.rate === "burgess" && v.Tb < v.Ta) warnings.push(tr("끓는점이 주위 온도보다 낮아(액화가스 풀) 현열 항을 0 으로 두었습니다. 땅에서 오는 열로 증발하는 초기에는 더 빨리 탈 수 있습니다.",
      "The boiling point is below ambient (liquefied-gas pool), so the sensible-heat term is set to 0. Early burning driven by ground heat can be faster."));
    if (v.R <= m.D / 2) warnings.push(tr("표적이 풀 가장자리 안(화염 안)에 있습니다. 고체 화염 값은 표면 방사 강도 E 로 두었습니다.",
      "The target is inside the pool edge (within the flame). The solid-flame value is set to the surface emissive power E."));
    const rIn = m.D / 2 * 1.0001;
    const dist = (f, q) => calcSolveDistance(f, q * 1000, rIn, 1e5);
    const out = {
      D_out: v.size === "A" ? m.D : undefined,
      mpp: m.mpp, H: m.H, Q: m.Q, E: m.E,
      F: v.R > m.D / 2 ? calcCylinderViewFactor(v.R, m.D, m.H).F : undefined,
      tauR: m.tau(Math.max(v.R - m.D / 2, 0)),
      q_sf: m.qSF(v.R), q_ps: m.qPS(v.R),
      d_ps_4: calcFiniteOrUndef(calcSolveDistance(m.qPS, 4000, 1e-3, 1e5)),
      d_ps_5: calcFiniteOrUndef(calcSolveDistance(m.qPS, 5000, 1e-3, 1e5)),
    };
    const unreached = [];
    CALC_FIRE_FLUX_LEVELS.forEach(l => {
      const d = dist(m.qSF, l.q);
      out[`d_sf_${l.key}`] = calcFiniteOrUndef(d);
      if (d == null) unreached.push(l.q);
    });
    if (unreached.length) warnings.push(tr(`고체 화염 모델에서 ${unreached.join(" · ")} kW/m² 는 화염 밖 어디에서도 도달하지 않습니다(표면 방사 강도 ${calcFormatNumber(m.E / 1000, 3)} kW/m² 이하).`,
      `In the solid-flame model, ${unreached.join(" · ")} kW/m² is not reached anywhere outside the flame (surface emissive power ${calcFormatNumber(m.E / 1000, 3)} kW/m² or less).`));
    const pff = v.PFF || (v.rate === "burgess" ? calcRmpPoolFireFactor(v.dHc, v.dHv, v.cp, v.Tb) : null);
    if (pff) { out.PFF_out = pff; out.d_pff = pff * Math.sqrt(m.A); }
    return { ...out, warnings };
  },
  chart: calcPoolFireChart,
  links: (v, o) => [
    { calc: "probit_harm", values: { kind: "thermal", I: o.q_sf / 1000, t: 40 }, label: tr("표적 복사열(고체 화염)로 화상 probit · 40초", "Burn probits at the target flux (solid flame) · 40 s") },
  ],
  formula: [
    tr("Burgess 연소 속도 m″ = 10⁻³ · ΔHc / (ΔHv + cp (Tb − Ta))  [kg/(m²·s)]  (Tb < Ta 이면 현열 항 0)", "Burgess burning rate m″ = 10⁻³ · ΔHc / (ΔHv + cp (Tb − Ta))  [kg/(m²·s)]  (sensible term 0 if Tb < Ta)"),
    "Thomas H / D = 42 · [ m″ / (ρa √(g D)) ]^0.61",
    "Shokri–Beyler E = 58 · 10^(−0.00823 D) kW/m² ;  Mudan E = 140 e^(−0.12 D) + 20 (1 − e^(−0.12 D)) kW/m²",
    tr("고체 화염 q = E · F_max · τ,  F_max = √(F_v² + F_h²) (지면 표적, 수직 원통 D × H)", "Solid flame q = E · F_max · τ,  F_max = √(F_v² + F_h²) (ground-level target, vertical cylinder D × H)"),
    tr("점원 q = τ · X_r · m″ A ΔHc / (4π x²),  x = 화염 중심(H/2 높이)까지 거리", "Point source q = τ · X_r · m″ A ΔHc / (4π x²),  x = distance to the flame centre (at H/2)"),
    tr("투과율 τ = 2.02 (P_w x)^−0.09 (Pietersen–Huerta) 또는 1.389 − 0.135 log₁₀(P_w x) (Cook), P_w = RH · P_sat(Ta) [Pa], x [m]", "Transmissivity τ = 2.02 (P_w x)^−0.09 (Pietersen–Huerta) or 1.389 − 0.135 log₁₀(P_w x) (Cook), P_w = RH · P_sat(Ta) [Pa], x [m]"),
    tr("EPA RMP: d(5 kW/m²) = PFF · √A,  PFF = ΔHc · √(10⁻⁴ / (π · 5000 · (ΔHv + cp (Tb − 298))))", "EPA RMP: d(5 kW/m²) = PFF · √A,  PFF = ΔHc · √(10⁻⁴ / (π · 5000 · (ΔHv + cp (Tb − 298))))"),
  ],
  notes: [
    CALC_FIRE_NOTES.screening,
    tr("바람이 없는 수직 원통 화염입니다. 바람에 기운 화염·연기 가림·지름 수십 m 이상의 큰 화재는 다루지 않습니다. 점원 모델은 화염 크기의 몇 배 넘게 떨어진 곳에서만 맞습니다.",
      "Assumes a vertical cylindrical flame with no wind. Wind tilt, smoke obscuration and very large fires (tens of metres and more) are not modelled. The point-source model is only valid several flame sizes away."),
    tr("고체 화염과 점원 값이 근거리에서 2배쯤 차이 나는 것은 정상입니다. 두 값을 함께 보고 판단하십시오.",
      "A near-field difference of about 2× between the solid-flame and point-source results is normal; consider both."),
    tr("Burgess 식은 측정 연소 속도보다 크게 나오는 편입니다(예: n-헥세인 계산 약 0.10, 측정 약 0.074 kg/(m²·s)). 측정값이 있으면 '직접 입력'을 쓰십시오.",
      "The Burgess correlation tends to overpredict measured burning rates (e.g. n-hexane about 0.10 calculated vs about 0.074 kg/(m²·s) measured). Use 'Enter value' when a measured rate is available."),
    CALC_FIRE_NOTES.endpoint,
    tr("열 노출 피해 확률은 '피해 probit' 계산기에 복사열과 노출 시간을 넣어 구합니다.", "For the probability of harm, enter the heat flux and exposure time in the 'Harm probits' calculator."),
  ],
  reference: [
    "Burgess, D.S., Strasser, A., Grumer, J. (1961). Diffusive burning of liquid fuels in open trays. Fire Research Abstracts and Reviews 3, 177–192.",
    "Mudan, K.S. (1984). Thermal radiation hazards from hydrocarbon pool fires. Progress in Energy and Combustion Science 10, 59–80.",
    "Thomas, P.H. (1963). The size of flames from natural fires. 9th Symposium (International) on Combustion, 844–859.",
    "Shokri, M., Beyler, C.L. (1989). Radiation from large pool fires. Journal of Fire Protection Engineering 1(4), 141–150.",
    tr("Pietersen, C.M., Huerta, S.C. (1985). Analysis of the LPG incident in San Juanico, 19 November 1984. TNO 보고서 85-0222 — 투과율 식",
      "Pietersen, C.M., Huerta, S.C. (1985). Analysis of the LPG incident in San Juanico, 19 November 1984. TNO report 85-0222 — transmissivity correlation"),
    tr("Cook, J., Bahrami, Z., Whitehouse, R.J. (1990). A comprehensive program for calculation of flame radiation levels. J. Loss Prev. Process Ind. 3, 150–155. — NOAA ALOHA 5.4.4 기술 문서 6.3.3 에 인용",
      "Cook, J., Bahrami, Z., Whitehouse, R.J. (1990). A comprehensive program for calculation of flame radiation levels. J. Loss Prev. Process Ind. 3, 150–155. — as cited in NOAA ALOHA 5.4.4 Technical Documentation §6.3.3"),
    tr("U.S. EPA (1999/2009). Risk Management Program Guidance for Offsite Consequence Analysis — 10.2절 식 10-1, 예제 29(에틸 에터 440 ft), 부록 D.9 식 D-22–D-29",
      "U.S. EPA (1999/2009). Risk Management Program Guidance for Offsite Consequence Analysis — §10.2 Eq. 10-1, Example 29 (ethyl ether, 440 ft), Appendix D.9 Eqs. D-22–D-29"),
    tr("Crowl & Louvar, Chemical Process Safety 3판(2011), 6장 화재·폭발 — 열복사 모델", "Crowl & Louvar, Chemical Process Safety, 3rd ed. (2011), Ch. 6 Fires and Explosions — thermal radiation models"),
  ],
};

Object.assign(window, { CALC_DEF_POOL_FIRE, calcPoolFireModel, calcRmpPoolFireFactor, calcPoolFireChart });

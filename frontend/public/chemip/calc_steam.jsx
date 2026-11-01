// 계산기: 증기표(IAPWS-IF97) — 두 성질 (p,T)·(p,h)·(p,s)·(T,x)·(p,x) → 영역·상태, v·ρ·h·u·s·cp·cv·w, 건도 x.
// 풀이는 calc_if97_solve.jsx, 그래프(T–s·몰리에 h–s)는 calc_steam_chart.jsx. 포화표는 calc_steam_table.jsx.

const STEAM_PHASE_LABEL = {
  liquid: () => tr("압축액 (과냉 액체)", "Compressed (subcooled) liquid"),
  vapor: () => tr("과열 증기", "Superheated vapor"),
  wet: () => tr("습증기 (포화 액체 + 포화 증기)", "Wet steam (saturated liquid + vapor)"),
  super: () => tr("초임계 유체", "Supercritical fluid"),
  satLiq: () => tr("포화 액체 (x = 0)", "Saturated liquid (x = 0)"),
  satVap: () => tr("포화 증기 (x = 1)", "Saturated vapor (x = 1)"),
};

const STEAM_ERRORS = {
  range: () => tr("IAPWS-IF97 적용 범위 밖입니다: 273.15–1073.15 K 는 100 MPa 이하, 1073.15–2273.15 K 는 50 MPa 이하, 포화 상태는 273.15 K–임계점입니다.",
    "Outside the IAPWS-IF97 range: 273.15–1073.15 K up to 100 MPa, 1073.15–2273.15 K up to 50 MPa, and saturation from 273.15 K to the critical point."),
  low: () => tr("이 압력에서 가장 낮은 값(273.15 K 의 물)보다 작습니다. 얼음은 다루지 않습니다.",
    "Below the lowest value at this pressure (water at 273.15 K). Ice is not covered."),
  high: () => tr("이 압력에서 가장 높은 값(IF97 최고 온도)보다 큽니다.", "Above the highest value at this pressure (the IF97 maximum temperature)."),
  critical: () => tr("임계점(647.096 K, 22.064 MPa) 바로 옆이라 포화 상태를 풀지 못했습니다. 조금 떨어진 값으로 넣으십시오.",
    "Too close to the critical point (647.096 K, 22.064 MPa) to solve the saturation state. Enter a value slightly farther away."),
};

const STEAM_MODES = { pT: ["p", "T"], ph: ["p", "h"], ps: ["p", "s"], Tx: ["T", "x"], px: ["p", "x"] };
const steamUses = (k) => (c) => STEAM_MODES[c.mode].includes(k);

function steamPhaseKey(st) {
  if (st.phase !== "wet") return st.phase;
  if (st.x === 0) return "satLiq";
  if (st.x === 1) return "satVap";
  return "wet";
}

const CALC_DEF_STEAM = {
  key: "steam",
  group: "chem",
  title: tr("증기표 (IAPWS-IF97) · T–s · 몰리에 선도", "Steam tables (IAPWS-IF97) · T–s · Mollier chart"),
  summary: tr("물·수증기의 두 성질(압력·온도, 압력·엔탈피, 압력·엔트로피, 온도·건도, 압력·건도)로 상태를 정하고 비체적·엔탈피·엔트로피·비열·음속을 구합니다. 압축액·습증기·과열 증기·초임계를 모두 다루고, T–s 또는 h–s(몰리에) 선도에 상태점을 그립니다.",
    "Fixes the state of water or steam from two properties (pressure–temperature, pressure–enthalpy, pressure–entropy, temperature–quality or pressure–quality) and gives specific volume, enthalpy, entropy, heat capacities and speed of sound. Covers compressed liquid, wet steam, superheated vapor and supercritical states, and plots the state on a T–s or h–s (Mollier) chart."),
  inputs: [
    { key: "mode", type: "choice", label: tr("주는 두 값", "Known pair"), term: "steam_state_pair", default: "pT",
      options: [
        { v: "pT", label: tr("압력·온도", "p, T") }, { v: "ph", label: tr("압력·엔탈피", "p, h") }, { v: "ps", label: tr("압력·엔트로피", "p, s") },
        { v: "Tx", label: tr("온도·건도", "T, x") }, { v: "px", label: tr("압력·건도", "p, x") },
      ] },
    { key: "p", label: tr("압력 (절대)", "Pressure (absolute)"), term: "absolute_pressure", dim: "pressure", unit: "Pa", show: "MPa", default: 1, positive: true, max: IF97_LIMITS.pmax, when: steamUses("p") },
    { key: "T", label: tr("온도", "Temperature"), term: "absolute_temperature", dim: "temperature", unit: "K", show: "C", default: 300, min: IF97_LIMITS.Tmin, max: IF97_LIMITS.Tmax, when: steamUses("T") },
    { key: "h", label: tr("비엔탈피 h", "Specific enthalpy h"), term: "specific_enthalpy", dim: "spenergy", unit: "Jkg", show: "kJkg", default: 2800, when: steamUses("h") },
    { key: "s", label: tr("비엔트로피 s", "Specific entropy s"), term: "specific_entropy", dim: "spentropy", unit: "JkgK", show: "kJkgK", default: 6.5, when: steamUses("s") },
    { key: "x", label: tr("건도 x", "Quality x"), term: "steam_quality", unit: "—", default: 0.9, min: 0, max: 1, when: steamUses("x") },
    { key: "chart", type: "choice", label: tr("선도", "Chart"), term: "steam_chart", default: "ts",
      options: [{ v: "ts", label: tr("T–s 선도", "T–s diagram") }, { v: "hs", label: tr("몰리에 (h–s) 선도", "Mollier (h–s) chart") }] },
  ],
  outputs: [
    { key: "phase", label: tr("상태", "Phase"), term: "steam_phase", type: "text" },
    { key: "region", label: tr("IF97 영역", "IF97 region"), term: "if97_region", type: "text" },
    { key: "T", label: tr("온도 T", "Temperature T"), term: "absolute_temperature", dim: "temperature", unit: "K", show: "C", digits: 6 },
    { key: "p", label: tr("압력 p", "Pressure p"), term: "absolute_pressure", dim: "pressure", unit: "Pa", show: "MPa", digits: 6 },
    { key: "x", label: tr("건도 x", "Quality x"), term: "steam_quality", unit: "—", digits: 5 },
    { key: "v", label: tr("비체적 v", "Specific volume v"), term: "water_specific_volume", dim: "spvolume", unit: "m3kg", digits: 6 },
    { key: "rho", label: tr("밀도 ρ", "Density ρ"), term: "density", dim: "density", unit: "kgm3", digits: 6 },
    { key: "h", label: tr("비엔탈피 h", "Specific enthalpy h"), term: "specific_enthalpy", dim: "spenergy", unit: "Jkg", show: "kJkg", digits: 6 },
    { key: "u", label: tr("비내부에너지 u", "Specific internal energy u"), term: "internal_energy", dim: "spenergy", unit: "Jkg", show: "kJkg", digits: 6 },
    { key: "s", label: tr("비엔트로피 s", "Specific entropy s"), term: "specific_entropy", dim: "spentropy", unit: "JkgK", show: "kJkgK", digits: 6 },
    { key: "cp", label: tr("정압 비열 cp", "Isobaric heat capacity cp"), term: "cp", dim: "spentropy", unit: "JkgK", show: "kJkgK", digits: 5 },
    { key: "cv", label: tr("정적 비열 cv", "Isochoric heat capacity cv"), term: "cv", dim: "spentropy", unit: "JkgK", show: "kJkgK", digits: 5 },
    { key: "w", label: tr("음속 w", "Speed of sound w"), term: "speed_of_sound", dim: "velocity", unit: "ms", digits: 5 },
    { key: "hf", label: tr("포화 액체 h_f", "Saturated liquid h_f"), term: "saturation", dim: "spenergy", unit: "Jkg", show: "kJkg", digits: 6 },
    { key: "hg", label: tr("포화 증기 h_g", "Saturated vapor h_g"), term: "saturation", dim: "spenergy", unit: "Jkg", show: "kJkg", digits: 6 },
    { key: "hfg", label: tr("증발 잠열 h_fg", "Latent heat h_fg"), term: "latent_heat", dim: "spenergy", unit: "Jkg", show: "kJkg", digits: 5 },
  ],
  compute(v) {
    const [ka, kb] = STEAM_MODES[v.mode];
    const r = if97Solve(v.mode, v[ka], v[kb]);
    if (r.error) return { error: STEAM_ERRORS[r.error]() };
    const st = r.state;
    const warnings = [];
    if (if97NearCritical(st.p, st.T)) warnings.push(tr("임계점 부근입니다. cp·음속이 아주 크게 바뀌므로 값이 입력에 민감합니다(IF97 3영역 식의 정확도도 이곳에서 낮아집니다).",
      "Near the critical point: cp and the speed of sound change very steeply, so results are sensitive to the inputs (the IF97 Region 3 equation is also less accurate here)."));
    const out = {
      phase: STEAM_PHASE_LABEL[steamPhaseKey(st)](),
      region: String(st.region),
      T: st.T, p: st.p, v: st.v, rho: st.rho, h: st.h, u: st.u, s: st.s,
      warnings,
    };
    if (st.phase === "wet") {
      Object.assign(out, { x: st.x, hf: st.sat.liq.h, hg: st.sat.vap.h, hfg: st.sat.vap.h - st.sat.liq.h });
    } else {
      Object.assign(out, { cp: st.cp, cv: st.cv, w: st.w });
    }
    return out;
  },
  chart: (values, outputs) => steamChart(values, outputs),
  formula: [
    tr("1영역(압축액)·2영역(과열 증기)·5영역(1073–2273 K): 깁스 자유에너지 g(p,T)/RT = γ(π, τ)", "Regions 1 (liquid), 2 (vapor), 5 (1073–2273 K): Gibbs free energy g(p,T)/RT = γ(π, τ)"),
    tr("3영역(임계 부근): 헬름홀츠 자유에너지 f(ρ,T)/RT = φ(δ, τ) — (p,T) 는 p(ρ,T) = p 를 ρ 에 대해 풀이", "Region 3 (near-critical): Helmholtz free energy f(ρ,T)/RT = φ(δ, τ) — for (p,T), p(ρ,T) = p is solved for ρ"),
    "v = π γ_π RT/p,  h = RT τ γ_τ,  s = R (τ γ_τ − γ),  cp = −R τ² γ_ττ",
    tr("습증기: y = y_f + x (y_g − y_f),  y = v, h, u, s", "Wet steam: y = y_f + x (y_g − y_f),  y = v, h, u, s"),
    tr("(p,h)·(p,s): 순방향 식을 T 에 대해 풀이(역방향 식 대신 — 순방향 식과 어긋남 없음)", "(p,h), (p,s): forward equations solved for T (instead of the backward equations, so results agree exactly with the forward equations)"),
    "R = 0.461526 kJ/(kg·K),  T_c = 647.096 K,  p_c = 22.064 MPa,  ρ_c = 322 kg/m³",
  ],
  notes: [
    tr("IAPWS-IF97 공식 검증표(1·2·3·5영역 표 5·15·33·42)의 v·h·u·s·cp·w 값과 유효숫자 9자리까지 같음을 시험으로 확인했습니다.",
      "Tests confirm agreement with the official IAPWS-IF97 verification tables (Regions 1, 2, 3, 5; Tables 5, 15, 33, 42) for v, h, u, s, cp and w to 9 significant figures."),
    tr("(p,h)·(p,s) 결과는 IF97 역방향 식 검증값과 25 mK 안에서 같습니다(역방향 식 자체의 허용 오차).",
      "(p,h) and (p,s) results agree with the IF97 backward-equation verification values within 25 mK (the tolerance of the backward equations themselves)."),
    tr("압력은 절대 압력입니다. 게이지 압력이면 대기압(약 0.101 MPa)을 더하십시오. 습증기에서는 cp·cv·음속을 정의하지 않습니다.",
      "Pressure is absolute; add atmospheric pressure (about 0.101 MPa) to a gauge reading. cp, cv and speed of sound are not defined for wet steam."),
    tr("엔탈피·엔트로피 기준: 삼중점(273.16 K)의 포화 액체 u = 0, s = 0 (IF97 관례, 일반 증기표와 같음).",
      "Reference state: saturated liquid at the triple point (273.16 K) has u = 0 and s = 0 (IF97 convention, as in common steam tables)."),
  ],
  reference: [
    "IAPWS R7-97(2012), Revised Release on the IAPWS Industrial Formulation 1997 for the Thermodynamic Properties of Water and Steam.",
    "Wagner, W. et al. (2000). The IAPWS Industrial Formulation 1997 for the Thermodynamic Properties of Water and Steam. J. Eng. Gas Turbines Power 122, 150–182.",
    tr("IAPWS SR1-86(1992) 포화 밀도 보조식 — 3영역 포화 풀이의 초기값으로만 사용", "IAPWS SR1-86(1992) auxiliary saturated-density equations — used only as starting values for the Region 3 saturation solve"),
  ],
};

Object.assign(window, { CALC_DEF_STEAM, STEAM_PHASE_LABEL, STEAM_ERRORS });

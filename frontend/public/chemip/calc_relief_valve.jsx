// 계산기: 안전밸브 필요 유효 면적 — API 520 Part I (기체·증기 임계/아임계, 액체) + API 526 표준 오리피스 글자.

// API 526 유효 오리피스 면적 [in²] — 글자 순서대로
const CALC_API526 = [
  ["D", 0.110], ["E", 0.196], ["F", 0.307], ["G", 0.503], ["H", 0.785], ["J", 1.287], ["K", 1.838],
  ["L", 2.853], ["M", 3.60], ["N", 4.34], ["P", 6.38], ["Q", 11.05], ["R", 16.0], ["T", 26.0],
];

// 필요 면적 [mm²] → 가장 작은 API 526 글자(면적 ≥ 필요 면적)
function calcApi526Letter(Amm2) {
  const hit = CALC_API526.find(([, a]) => a * 645.16 >= Amm2);
  return hit ? `${hit[0]} (${hit[1]} in² = ${Math.round(hit[1] * 645.16)} mm²)` : tr("T 보다 큼 — 밸브 여러 개로 나눕니다", "Larger than T — split across multiple valves");
}

// API 520 계수 C (SI: W kg/h, P kPa, A mm²)
function calcApi520C(k) {
  if (Math.abs(k - 1) < 1e-9) return 0.03948 * Math.sqrt(1 / Math.E);
  return 0.03948 * Math.sqrt(k * Math.pow(2 / (k + 1), (k + 1) / (k - 1)));
}

// 기체·증기. W [kg/h], T [K], P1·P2 [kPa abs] → { A [mm²], critical, rc }
function calcApi520Gas({ W, T, Z, M, k, P1, P2, Kd, Kb, Kc }) {
  const rc = Math.pow(2 / (k + 1), k / (k - 1));
  if (P2 / P1 <= rc) return { A: W / (calcApi520C(k) * Kd * P1 * Kb * Kc) * Math.sqrt(T * Z / M), critical: true, rc };
  const r = P2 / P1;
  const F2 = Math.sqrt((k / (k - 1)) * Math.pow(r, 2 / k) * (1 - Math.pow(r, (k - 1) / k)) / (1 - r));
  return { A: 17.9 * W / (F2 * Kd * Kc) * Math.sqrt(T * Z / (M * P1 * (P1 - P2))), critical: false, rc };
}

// 액체(인증 밸브, 과압 10 %). Q [L/min], P [kPa] → A [mm²]
function calcApi520Liquid({ Q, G, P1, P2, Kd, Kw, Kc, Kv }) {
  return 11.78 * Q / (Kd * Kw * Kc * Kv) * Math.sqrt(G / (P1 - P2));
}

const CALC_DEF_RELIEF_VALVE = {
  key: "relief_valve",
  group: "release",
  title: tr("안전밸브 크기 (API 520)", "Relief valve sizing (API 520)"),
  summary: tr("정해진 방출량을 내보내는 데 필요한 안전밸브 유효 면적을 구하고, API 526 표준 오리피스 글자를 고릅니다.",
    "Calculates the effective discharge area a relief valve needs to pass a given relieving rate and selects the API 526 standard orifice letter."),
  inputs: [
    { key: "fluid", type: "choice", label: tr("유체", "Fluid"), default: "gas",
      options: [{ v: "gas", label: tr("기체·증기", "Gas / vapour") }, { v: "liquid", label: tr("액체", "Liquid") }] },
    { key: "W", label: tr("방출 질량 유량 W", "Relieving mass flow W"), term: "relief_rate", dim: "massflow", unit: "kgs", show: "kgh", default: 24270, positive: true, when: c => c.fluid === "gas" },
    { key: "Q", label: tr("방출 부피 유량 Q", "Relieving volumetric flow Q"), term: "relief_rate", dim: "flow", unit: "m3s", show: "Lmin", default: 6814, positive: true, when: c => c.fluid === "liquid" },
    { key: "P1", label: tr("방출 압력 P₁ (절대)", "Relieving pressure P₁ (absolute)"), term: "relieving_pressure", dim: "pressure", unit: "Pa", show: "kPa", default: 670, positive: true,
      hint: tr("게이지 설정압 × (1 + 과압) + 대기압", "Set pressure (gauge) × (1 + overpressure) + atmospheric pressure") },
    { key: "P2", label: tr("배압 P₂ (절대)", "Back pressure P₂ (absolute)"), term: "back_pressure", dim: "pressure", unit: "Pa", show: "kPa", default: 101.325, positive: true },
    { key: "T", label: tr("방출 온도", "Relieving temperature"), dim: "temperature", unit: "K", show: "K", default: 348, positive: true, when: c => c.fluid === "gas" },
    { key: "M", label: tr("분자량", "Molecular weight"), term: "molar_mass", unit: "g/mol", default: 51, positive: true, when: c => c.fluid === "gas" },
    { key: "Z", label: tr("압축인자 Z", "Compressibility factor Z"), term: "compressibility", unit: "—", default: 0.9, positive: true, max: 2, when: c => c.fluid === "gas" },
    { key: "k", label: tr("비열비 k = cp/cv", "Heat capacity ratio k = cp/cv"), term: "heat_capacity_ratio", unit: "—", default: 1.11, min: 1.001, max: 2, when: c => c.fluid === "gas" },
    { key: "G", label: tr("비중 G", "Specific gravity G"), term: "specific_gravity", unit: tr("물 = 1", "water = 1"), default: 0.9, positive: true, when: c => c.fluid === "liquid" },
    { key: "Kdg", label: tr("유효 방출 계수 K_d", "Effective coefficient of discharge K_d"), term: "kd", unit: "—", default: 0.975, positive: true, max: 1, when: c => c.fluid === "gas", hint: tr("API 520 예비 크기 기체 0.975", "API 520 preliminary sizing, gas: 0.975") },
    { key: "Kdl", label: tr("유효 방출 계수 K_d", "Effective coefficient of discharge K_d"), term: "kd", unit: "—", default: 0.65, positive: true, max: 1, when: c => c.fluid === "liquid", hint: tr("API 520 예비 크기 액체 0.65", "API 520 preliminary sizing, liquid: 0.65") },
    { key: "Kb", label: tr("배압 보정 K_b", "Back pressure correction K_b"), term: "kb", unit: "—", default: 1, positive: true, max: 1, when: c => c.fluid === "gas" },
    { key: "Kw", label: tr("배압 보정 K_w", "Back pressure correction K_w"), term: "kw", unit: "—", default: 1, positive: true, max: 1, when: c => c.fluid === "liquid", hint: tr("일반형 밸브는 1, 벨로즈형은 제조사 선도", "1 for conventional valves; for balanced-bellows valves use the manufacturer's curve") },
    { key: "Kv", label: tr("점도 보정 K_v", "Viscosity correction K_v"), term: "kv", unit: "—", default: 1, positive: true, max: 1, when: c => c.fluid === "liquid" },
    { key: "Kc", label: tr("파열판 조합 K_c", "Rupture disk combination K_c"), term: "kc", unit: "—", default: 1, positive: true, max: 1, hint: tr("파열판 없음 1, 있으면 0.9", "1 without a rupture disk, 0.9 with one") },
  ],
  outputs: [
    { key: "A", label: tr("필요 유효 면적 A", "Required effective area A"), term: "orifice_area", dim: "area", unit: "m2", show: "mm2", digits: 5 },
    { key: "letter", label: tr("API 526 오리피스", "API 526 orifice"), term: "api526", type: "text" },
    { key: "flow", label: tr("흐름 조건", "Flow condition"), term: "critical_flow", type: "text" },
    { key: "rc", label: tr("임계 압력비", "Critical pressure ratio"), term: "critical_flow", unit: "—", digits: 4 },
  ],
  compute(v) {
    if (v.P2 >= v.P1) return { error: tr("배압이 방출 압력보다 낮아야 합니다.", "Back pressure must be lower than the relieving pressure.") };
    const P1 = v.P1 / 1000, P2 = v.P2 / 1000;          // kPa
    if (v.fluid === "liquid") {
      const A = calcApi520Liquid({ Q: v.Q * 6e4, G: v.G, P1, P2, Kd: v.Kdl, Kw: v.Kw, Kc: v.Kc, Kv: v.Kv });
      return { A: A * 1e-6, letter: calcApi526Letter(A), flow: tr("액체", "Liquid") };
    }
    const r = calcApi520Gas({ W: v.W * 3600, T: v.T, Z: v.Z, M: v.M, k: v.k, P1, P2, Kd: v.Kdg, Kb: v.Kb, Kc: v.Kc });
    const warnings = r.critical ? [] : [tr("아임계 흐름입니다. 일반형(conventional) 밸브 식(F₂)으로 구했습니다. 벨로즈형은 임계 식에 K_b 를 씁니다.",
      "Subcritical flow. Sized with the conventional-valve equation (F₂). For balanced-bellows valves, use the critical-flow equation with K_b.")];
    return { A: r.A * 1e-6, letter: calcApi526Letter(r.A), flow: r.critical ? tr("임계(초크) 흐름", "Critical (choked) flow") : tr("아임계 흐름", "Subcritical flow"), rc: r.rc, warnings };
  },
  formula: [
    tr("기체 임계: A = W / (C · K_d · P₁ · K_b · K_c) · √(T · Z / M),  C = 0.03948 √( k (2/(k+1))^((k+1)/(k−1)) )",
      "Gas, critical: A = W / (C · K_d · P₁ · K_b · K_c) · √(T · Z / M),  C = 0.03948 √( k (2/(k+1))^((k+1)/(k−1)) )"),
    tr("임계 판정: P₂ / P₁ ≤ (2/(k+1))^(k/(k−1))", "Critical if: P₂ / P₁ ≤ (2/(k+1))^(k/(k−1))"),
    tr("기체 아임계: A = 17.9 W / (F₂ · K_d · K_c) · √( T Z / (M P₁ (P₁ − P₂)) ),  F₂ = √( k/(k−1) · r^(2/k) · (1 − r^((k−1)/k)) / (1 − r) ),  r = P₂/P₁",
      "Gas, subcritical: A = 17.9 W / (F₂ · K_d · K_c) · √( T Z / (M P₁ (P₁ − P₂)) ),  F₂ = √( k/(k−1) · r^(2/k) · (1 − r^((k−1)/k)) / (1 − r) ),  r = P₂/P₁"),
    tr("액체: A = 11.78 Q / (K_d · K_w · K_c · K_v) · √( G / (P₁ − P₂) )", "Liquid: A = 11.78 Q / (K_d · K_w · K_c · K_v) · √( G / (P₁ − P₂) )"),
    tr("단위: A mm², W kg/h, Q L/min, P kPa(절대), T K", "Units: A mm², W kg/h, Q L/min, P kPa (absolute), T K"),
  ],
  notes: [
    tr("방출량(W, Q)은 화재·차단 등 과압 원인별로 따로 정합니다(API 521). 이 계산기는 그 방출량을 내보낼 면적만 구합니다.",
      "The relieving rate (W, Q) is determined separately for each overpressure scenario such as fire or blocked outlet (API 521). This calculator only sizes the area to pass that rate."),
    tr("2상 흐름(플래싱 액체 등)은 이 식으로 크기를 정하지 않습니다(API 520 부록 C).",
      "Do not size two-phase flow (e.g. flashing liquids) with these equations (API 520 Annex C)."),
    tr("K_d 기본값은 예비 크기용입니다. 최종 선정은 제조사 인증 K_d 와 실제 유효 면적으로 다시 확인합니다.",
      "The default K_d is for preliminary sizing. Confirm the final selection with the manufacturer's certified K_d and actual effective area."),
  ],
  reference: [
    tr("API Standard 520 Part I, Sizing, Selection, and Installation of Pressure-relieving Devices, 10판(2020) — 5.6 기체·증기 임계·아임계 식, 5.8 액체 식",
      "API Standard 520 Part I, Sizing, Selection, and Installation of Pressure-relieving Devices, 10th ed. (2020) — 5.6 gas/vapour critical and subcritical equations, 5.8 liquid equation"),
    tr("API Standard 526, Flanged Steel Pressure-relief Valves, 7판(2017) — 오리피스 글자 D–T 유효 면적",
      "API Standard 526, Flanged Steel Pressure-relief Valves, 7th ed. (2017) — effective areas of orifice letters D–T"),
    tr("Bell, C. et al., fluids (Python) safety_valve 모듈 — API 520 예제(W 24 270 kg/h, M 51, T 348 K, Z 0.90, k 1.11, P₁ 670 kPa → 3 699 mm²)로 대조",
      "Bell, C. et al., fluids (Python) safety_valve module — checked against the API 520 example (W 24 270 kg/h, M 51, T 348 K, Z 0.90, k 1.11, P₁ 670 kPa → 3 699 mm²)"),
  ],
};

Object.assign(window, { CALC_DEF_RELIEF_VALVE, calcApi520Gas, calcApi520Liquid, calcApi520C, calcApi526Letter, CALC_API526 });

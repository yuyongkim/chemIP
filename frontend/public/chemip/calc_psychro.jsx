// 계산기: 습공기 성질·습공기 선도 — 건구 온도·상대 습도·대기압 → 절대 습도, 이슬점, 엔탈피, 비체적(ASHRAE 2017 1장).
// 계산 종류: 상태 하나 / 가열·냉각 코일(나가는 온도, 이슬점 아래면 제습) / 두 공기 단열 혼합. 순수 함수는 calc_psy_math.jsx,
// 그래프(습공기 선도)는 calc_psychro_chart.jsx. 물의 포화 압력은 IAPWS-IF97 4영역(calc_physics.jsx) — 0 °C 이상 물 위 포화만 다룬다.

const PSY_MODE = (k) => (c) => c.mode === k;
const PSY_FLOW = (c) => c.mode !== "state";

// 정의의 compute·chart 가 함께 쓰는 입구 상태들(기준 단위 values → 상태 객체)
function psyInputs(v) {
  const s1 = psyFromRH(v.T, v.RH, v.P);
  const s2 = v.mode === "mix" ? psyFromRH(v.T2, v.RH2, v.P) : null;
  return { s1, s2 };
}

const CALC_DEF_PSYCHRO = {
  key: "psychro",
  group: "heat",
  title: tr("습공기 선도 · 성질 (절대 습도 · 이슬점 · 가열·냉각 · 혼합)", "Psychrometric chart & properties (humidity ratio · dew point · heating/cooling · mixing)"),
  summary: tr("공기의 온도와 상대 습도로 절대 습도(수분량), 이슬점, 엔탈피, 비체적을 구하고 습공기 선도에 그립니다. 가열·냉각 코일(제습 포함)과 두 공기의 혼합도 계산합니다. 공조·건조·결로 검토에 씁니다.",
    "Computes humidity ratio (moisture content), dew point, enthalpy and specific volume from air temperature and relative humidity, and plots them on a psychrometric chart. Also handles a heating/cooling coil (with dehumidification) and the mixing of two air streams. Used for HVAC, drying and condensation checks."),
  inputs: [
    { key: "mode", type: "choice", label: tr("계산", "Calculation"), term: "psy_process", default: "state",
      options: [
        { v: "state", label: tr("공기 상태", "Air state") },
        { v: "coil", label: tr("가열·냉각 (코일)", "Heating/cooling (coil)") },
        { v: "mix", label: tr("두 공기 혼합", "Mixing two streams") },
      ] },
    { key: "T", label: tr("건구 온도 (공기 1)", "Dry-bulb temperature (air 1)"), term: "dry_bulb", dim: "temperature", unit: "K", show: "C", default: 20, min: 273.15, max: 373.15 },
    { key: "RH", label: tr("상대 습도 (공기 1)", "Relative humidity (air 1)"), term: "relative_humidity", unit: "%", default: 50, min: 0, max: 100 },
    { key: "P", label: tr("대기압", "Barometric pressure"), term: "absolute_pressure", dim: "pressure", unit: "Pa", show: "kPa", default: 101.325, positive: true },
    { key: "Q1", label: tr("풍량 (공기 1)", "Airflow (air 1)"), term: "air_volume_flow", dim: "flow", unit: "m3s", show: "m3min", default: 10, positive: true, when: PSY_FLOW },
    { key: "Tout", label: tr("코일 출구 건구 온도", "Coil leaving dry-bulb temperature"), term: "dry_bulb", dim: "temperature", unit: "K", show: "C", default: 14, min: 273.15, max: 373.15, when: PSY_MODE("coil") },
    { key: "T2", label: tr("건구 온도 (공기 2)", "Dry-bulb temperature (air 2)"), term: "dry_bulb", dim: "temperature", unit: "K", show: "C", default: 32, min: 273.15, max: 373.15, when: PSY_MODE("mix") },
    { key: "RH2", label: tr("상대 습도 (공기 2)", "Relative humidity (air 2)"), term: "relative_humidity", unit: "%", default: 60, min: 0, max: 100, when: PSY_MODE("mix") },
    { key: "Q2", label: tr("풍량 (공기 2)", "Airflow (air 2)"), term: "air_volume_flow", dim: "flow", unit: "m3s", show: "m3min", default: 5, positive: true, when: PSY_MODE("mix") },
  ],
  outputs: [
    { key: "W", label: tr("절대 습도 W", "Humidity ratio W"), term: "humidity_ratio", unit: tr("g/kg 건조 공기", "g/kg dry air"), digits: 4 },
    { key: "Td", label: tr("이슬점", "Dew point"), term: "dew_point", dim: "temperature", unit: "K", show: "C", digits: 4 },
    { key: "h", label: tr("엔탈피 h", "Enthalpy h"), term: "moist_enthalpy", unit: tr("kJ/kg 건조 공기", "kJ/kg dry air"), digits: 4 },
    { key: "v", label: tr("비체적 v", "Specific volume v"), term: "specific_volume", unit: tr("m³/kg 건조 공기", "m³/kg dry air"), digits: 4 },
    { key: "pw", label: tr("수증기 분압 p_w", "Water vapor partial pressure p_w"), term: "vapor_partial_pressure", dim: "pressure", unit: "Pa", show: "kPa", digits: 4 },
    { key: "pws", label: tr("포화 수증기압 p_ws", "Saturation vapor pressure p_ws"), term: "saturation", dim: "pressure", unit: "Pa", show: "kPa", digits: 5 },
    { key: "To", label: tr("나오는 공기 — 건구 온도", "Leaving air — dry-bulb temperature"), term: "dry_bulb", dim: "temperature", unit: "K", show: "C", digits: 4 },
    { key: "RHo", label: tr("나오는 공기 — 상대 습도", "Leaving air — relative humidity"), term: "relative_humidity", unit: "%", digits: 4 },
    { key: "Wo", label: tr("나오는 공기 — 절대 습도", "Leaving air — humidity ratio"), term: "humidity_ratio", unit: tr("g/kg 건조 공기", "g/kg dry air"), digits: 4 },
    { key: "ho", label: tr("나오는 공기 — 엔탈피", "Leaving air — enthalpy"), term: "moist_enthalpy", unit: tr("kJ/kg 건조 공기", "kJ/kg dry air"), digits: 4 },
    { key: "Tdo", label: tr("나오는 공기 — 이슬점", "Leaving air — dew point"), term: "dew_point", dim: "temperature", unit: "K", show: "C", digits: 4 },
    { key: "q", label: tr("코일 열량 (+ 가열, − 냉각)", "Coil heat rate (+ heating, − cooling)"), term: "coil_load", dim: "power", unit: "W", show: "kW", digits: 4 },
    { key: "cond", label: tr("응축수량", "Condensate rate"), term: "condensate", dim: "massflow", unit: "kgs", show: "kgh", digits: 4 },
    { key: "mda", label: tr("건조 공기 질량 유량", "Dry-air mass flow"), term: "dry_air_flow", dim: "massflow", unit: "kgs", show: "kgh", digits: 4 },
    { key: "Qo", label: tr("나오는 공기 풍량", "Leaving airflow"), term: "air_volume_flow", dim: "flow", unit: "m3s", show: "m3min", digits: 4 },
  ],
  compute(v) {
    const { s1, s2 } = psyInputs(v);
    if (!s1 || (v.mode === "mix" && !s2)) return { error: tr("수증기 분압이 대기압 이상입니다. 온도·압력을 확인하십시오.",
      "Water vapor partial pressure is at or above the barometric pressure. Check the temperature and pressure.") };
    const warnings = [];
    if (s1.Td == null && s1.pw > 0) warnings.push(tr("이슬점이 0 °C 아래(서리점)입니다. 얼음 위 포화식이 필요해 구하지 않았습니다.",
      "The dew point is below 0 °C (frost point). It needs a saturation equation over ice, so it was not computed."));
    const out = { W: s1.W * 1000, Td: s1.Td ?? undefined, h: s1.h, v: s1.v, pw: s1.pw, pws: s1.pws, warnings };
    if (v.mode === "state") return out;
    let so, m;
    if (v.mode === "coil") {
      const c = psyCoil(s1, v.Tout);
      m = v.Q1 / s1.v;
      so = c.s2;
      Object.assign(out, { q: m * c.q * 1000, cond: m * c.cond });
      if (c.dehumid) warnings.push(tr("출구 온도가 이슬점보다 낮아 물이 맺힙니다. 공기는 포화(RH 100 %) 상태로 나간다고 보았습니다(바이패스 계수 0).",
        "The leaving temperature is below the dew point, so moisture condenses. The air is assumed to leave saturated (RH 100 %, zero bypass factor)."));
    } else {
      const m1 = v.Q1 / s1.v, m2 = v.Q2 / s2.v;
      const x = psyMix(s1, m1, s2, m2);
      m = x.m;
      so = x.s3;
      if (x.fog) warnings.push(tr("혼합 공기가 과포화(RH > 100 %)입니다. 실제로는 안개(물방울)가 생깁니다.",
        "The mixed air is supersaturated (RH > 100 %); in practice fog (water droplets) forms."));
    }
    return Object.assign(out, {
      To: so.T, RHo: so.RH, Wo: so.W * 1000, ho: so.h, Tdo: so.Td ?? undefined, mda: m, Qo: m * so.v,
    });
  },
  chart(values, outputs) {
    const { s1, s2 } = psyInputs(values);
    if (!s1) return null;
    const P = values.P;
    if (values.mode === "state") return psyChartProps(P, [{ s: s1, label: "1" }], null, "");
    const so = psyState(outputs.To, outputs.Wo / 1000, P);
    if (values.mode === "coil") {
      return psyChartProps(P, [{ s: s1, label: "1" }, { s: so, label: "2" }], psyCoilPath(s1, so, P), tr("코일 과정", "Coil process"));
    }
    return psyChartProps(P, [{ s: s1, label: "1" }, { s: s2, label: "2" }, { s: so, label: tr("혼합", "Mix") }], [psyPt(s1), psyPt(s2)], tr("혼합선", "Mixing line"));
  },
  formula: [
    "p_w = φ · p_ws(T),   W = 0.621945 · p_w / (p − p_w)",
    "h = 1.006 t + W (2501 + 1.86 t)  [kJ/kg, t °C]",
    "v = 0.287042 · T · (1 + 1.607858 W) / p  [m³/kg, T K, p kPa]",
    tr("이슬점 T_d: p_ws(T_d) = p_w", "Dew point T_d: p_ws(T_d) = p_w"),
    tr("코일: q = ṁ_da [(h₂ − h₁) + (W₁ − W₂) h_w],  h_w = 4.186 t₂,  응축수 = ṁ_da (W₁ − W₂)", "Coil: q = ṁ_da [(h₂ − h₁) + (W₁ − W₂) h_w],  h_w = 4.186 t₂,  condensate = ṁ_da (W₁ − W₂)"),
    tr("혼합: W₃ = (ṁ₁W₁ + ṁ₂W₂)/(ṁ₁ + ṁ₂),  h₃ 도 같은 가중 평균,  ṁ = 풍량 / v", "Mixing: W₃ = (ṁ₁W₁ + ṁ₂W₂)/(ṁ₁ + ṁ₂), same weighting for h₃,  ṁ = airflow / v"),
  ],
  notes: [
    tr("이상기체 혼합물 가정입니다. 증가 계수(enhancement factor)를 넣지 않아 포화 근처 절대 습도가 ASHRAE 표보다 약 0.4 % 작습니다. 포화 수증기압은 IAPWS-IF97 식으로, ASHRAE 의 Hyland–Wexler 식과 0–100 °C 에서 0.02 % 안팎으로 같습니다.",
      "Assumes an ideal-gas mixture. The enhancement factor is not included, so near saturation the humidity ratio is about 0.4 % lower than the ASHRAE tables. Saturation vapor pressure uses IAPWS-IF97, which agrees with the ASHRAE Hyland–Wexler equation to about 0.02 % over 0–100 °C."),
    tr("높은 곳은 대기압이 낮습니다(해발 1000 m 약 89.9 kPa). 대기압을 고치면 절대 습도·비체적이 바뀝니다.",
      "Barometric pressure is lower at altitude (about 89.9 kPa at 1000 m). Changing it changes the humidity ratio and specific volume."),
    tr("풍량은 그 공기 상태의 부피 유량입니다. 건조 공기 질량 유량 = 풍량 ÷ 비체적 으로 바꿔 혼합·열량을 계산합니다. 냉각 코일은 출구에서 포화(바이패스 없음)로 보는 단순 모형입니다.",
      "Airflow is the volumetric flow at that stream's state; it is converted to dry-air mass flow as airflow ÷ specific volume for mixing and heat rate. The cooling coil is a simple model that assumes saturated leaving air (no bypass)."),
  ],
  reference: [
    tr("ASHRAE Handbook — Fundamentals (2017), 1장 Psychrometrics — 식 20(W), 식 26(v), 식 32(h), 가열·냉각·혼합 과정", "ASHRAE Handbook — Fundamentals (2017), Ch. 1 Psychrometrics — Eq. 20 (W), Eq. 26 (v), Eq. 32 (h), heating, cooling and mixing processes"),
    tr("IAPWS R7-97(2012) — 물의 포화 압력(4영역)", "IAPWS R7-97(2012) — saturation pressure of water (Region 4)"),
    tr("Çengel, Y. A. & Boles, M. A., Thermodynamics: An Engineering Approach — 14장 습공기 예제(냉각·제습, 단열 혼합)로 검증", "Çengel, Y. A. & Boles, M. A., Thermodynamics: An Engineering Approach — Ch. 14 psychrometric examples (cooling with dehumidification, adiabatic mixing) used for validation"),
  ],
};

Object.assign(window, { CALC_DEF_PSYCHRO, psyInputs });

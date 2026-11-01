// 계산기: 피해 probit — 과압(폐출혈 사망·고막 파열·구조물 손상·유리 파손), 열복사(화상 사망·2도·1도 화상), probit → 확률.
// 상수·환산은 calc_fire_harm.jsx(Eisenberg 1975 USCG). 그래프는 효과별 확률 곡선과 입력점.

function calcProbitHarmChart(v, out) {
  if (v.kind === "y") return null;
  const blast = v.kind === "blast";
  const xs = blast ? calcChartRange(1e3, 1e6, 90, true) : calcChartRange(500, 2e5, 90, true);
  const table = blast ? CALC_PROBIT_BLAST : CALC_PROBIT_THERMAL;
  const P = (k, x) => calcProbitToPercent(blast ? calcBlastProbit(k, x) : calcThermalProbit(k, x, v.t));
  const series = Object.entries(table).map(([k, c]) => ({ key: k, label: c.label, points: xs.map(x => [x / 1000, P(k, x)]) }));
  const x0 = (blast ? v.p : v.I) / 1000;
  return {
    x: blast ? { label: tr("최고 측면 과압", "Peak side-on overpressure"), unit: "kPa", log: true }
      : { label: tr(`복사열 (노출 ${calcFormatNumber(v.t, 3)} s)`, `Heat flux (${calcFormatNumber(v.t, 3)} s exposure)`), unit: "kW/m²", log: true },
    y: { label: tr("영향 확률", "Probability of effect"), unit: "%", min: 0, max: 100 },
    series,
    vlines: [{ x: x0, label: tr("입력값", "Input") }],
    ariaLabel: tr("probit 확률 곡선", "Probit probability curves"),
  };
}

const CALC_DEF_PROBIT_HARM = {
  key: "probit_harm",
  group: "fire",
  title: tr("피해 probit (과압·열복사)", "Harm probits (overpressure · thermal)"),
  summary: tr("폭발 과압이나 열복사·노출 시간으로 사망·부상·손상 probit 과 확률(%)을 구합니다. probit 값을 바로 확률로 바꿀 수도 있습니다. 참고용 스크리닝입니다.",
    "From blast overpressure, or heat flux and exposure time, calculates probits and probabilities (%) of fatality, injury and damage. A probit value can also be converted directly to a probability. Screening only."),
  inputs: [
    { key: "kind", type: "choice", label: tr("구할 것", "Calculate"), term: "probit", default: "blast",
      options: [{ v: "blast", label: tr("과압 피해", "Overpressure harm") }, { v: "thermal", label: tr("열복사 피해", "Thermal harm") }, { v: "y", label: tr("probit → 확률", "Probit → probability") }] },
    { key: "p", label: tr("최고 측면 과압", "Peak side-on overpressure"), term: "side_on_overpressure", dim: "pressure", unit: "Pa", show: "kPa", default: 20, positive: true, when: c => c.kind === "blast" },
    { key: "I", label: tr("복사열", "Heat flux"), term: "heat_flux", dim: "heatflux", unit: "Wm2", show: "kWm2", default: 10, positive: true, when: c => c.kind === "thermal" },
    { key: "t", label: tr("노출 시간", "Exposure time"), term: "exposure_time", dim: "time", unit: "s", show: "s", default: 40, positive: true, when: c => c.kind === "thermal",
      hint: tr("화구는 화구 지속시간, 풀 화재는 대피에 걸리는 시간(보통 20–60 s)", "Fireball duration for a fireball; time to escape for a pool fire (often 20–60 s)") },
    { key: "Y", label: "probit Y", term: "probit", unit: "—", default: 5, min: -5, max: 15, when: c => c.kind === "y" },
  ],
  outputs: [
    ...Object.entries(CALC_PROBIT_BLAST).flatMap(([k, c]) => [
      { key: `Y_${k}`, label: `${c.label} · Y`, term: "overpressure_probit", unit: "—", digits: 3 },
      { key: `P_${k}`, label: tr(`${c.label} · 확률`, `${c.label} · probability`), term: "probit_percent", unit: "%", digits: 3 },
    ]),
    { key: "dose", label: tr("열량 t·I^(4/3)", "Dose t·I^(4/3)"), term: "thermal_dose", unit: "(W/m²)^(4/3)·s", digits: 3 },
    ...Object.entries(CALC_PROBIT_THERMAL).flatMap(([k, c]) => [
      { key: `Y_${k}`, label: `${c.label} · Y`, term: "thermal_probit", unit: "—", digits: 3 },
      { key: `P_${k}`, label: tr(`${c.label} · 확률`, `${c.label} · probability`), term: "probit_percent", unit: "%", digits: 3 },
    ]),
    { key: "P_y", label: tr("확률", "Probability"), term: "probit_percent", unit: "%", digits: 4 },
  ],
  compute(v) {
    const out = {};
    if (v.kind === "y") return { P_y: calcProbitToPercent(v.Y) };
    if (v.kind === "blast") {
      Object.keys(CALC_PROBIT_BLAST).forEach(k => {
        const Y = calcBlastProbit(k, v.p);
        out[`Y_${k}`] = Y; out[`P_${k}`] = calcProbitToPercent(Y);
      });
      return out;
    }
    out.dose = calcThermalDose(v.I, v.t);
    Object.keys(CALC_PROBIT_THERMAL).forEach(k => {
      const Y = calcThermalProbit(k, v.I, v.t);
      out[`Y_${k}`] = Y; out[`P_${k}`] = calcProbitToPercent(Y);
    });
    const warnings = v.I < 1700 ? [tr("1.7 kW/m² 아래에서는 오래 노출되어도 통증이 없다고 보고됩니다(Mudan). probit 식이 그 아래에서 맞지 않습니다.",
      "Below about 1.7 kW/m², no pain is reported even for long exposures (Mudan); the probit equations are not valid there.")] : [];
    return { ...out, warnings };
  },
  chart: calcProbitHarmChart,
  formula: [
    "Y = a + b · ln V,  P [%] = 50 · [1 + erf((Y − 5) / √2)]",
    tr("과압 V = p [Pa]: 폐출혈 사망 −77.1 + 6.91 ln p · 고막 파열 −15.6 + 1.93 ln p · 구조물 손상 −23.8 + 2.92 ln p · 유리 파손 −18.1 + 2.79 ln p",
      "Overpressure V = p [Pa]: lung haemorrhage deaths −77.1 + 6.91 ln p · eardrum rupture −15.6 + 1.93 ln p · structural damage −23.8 + 2.92 ln p · glass breakage −18.1 + 2.79 ln p"),
    tr("열복사 (I [W/m²], t [s]): 화상 사망 −14.9 + 2.56 ln(t I^(4/3) / 10⁴) · 2도 화상 −43.14 + 3.0188 ln(t I^(4/3)) · 1도 화상 −39.83 + 3.0186 ln(t I^(4/3))",
      "Thermal (I [W/m²], t [s]): burn deaths −14.9 + 2.56 ln(t I^(4/3) / 10⁴) · second-degree burns −43.14 + 3.0188 ln(t I^(4/3)) · first-degree burns −39.83 + 3.0186 ln(t I^(4/3))"),
  ],
  notes: [
    CALC_FIRE_NOTES.screening,
    tr("probit 상수는 제2차 세계대전 폭격·핵실험 자료에서 나온 집단 평균값입니다. 개인의 피해를 예측하지 않고, 보호복·건물 안 대피 효과도 넣지 않습니다.",
      "The probit constants are population averages derived from wartime bombing and nuclear-test data. They do not predict individual harm and do not account for protective clothing or sheltering indoors."),
    tr("과압 probit 은 최고 측면 과압만 씁니다. 충격량·반사 압력·비산물에 의한 피해는 포함하지 않습니다.",
      "The overpressure probits use the peak side-on overpressure only. Harm from impulse, reflected pressure or flying debris is not included."),
    CALC_FIRE_NOTES.endpoint,
  ],
  reference: [
    tr("Eisenberg, N.A., Lynch, C.J., Breeding, R.J. (1975). Vulnerability Model: A Simulation System for Assessing Damage Resulting from Marine Spills. U.S. Coast Guard CG-D-136-75 (미국 정부 공개 보고서)",
      "Eisenberg, N.A., Lynch, C.J., Breeding, R.J. (1975). Vulnerability Model: A Simulation System for Assessing Damage Resulting from Marine Spills. U.S. Coast Guard CG-D-136-75 (U.S. government report)"),
    tr("Crowl & Louvar, Chemical Process Safety 3판(2011), 2장 독성학 — probit 상수 표·probit → 확률 환산식", "Crowl & Louvar, Chemical Process Safety, 3rd ed. (2011), Ch. 2 Toxicology — probit constant table and probit-to-percentage conversion"),
    "Finney, D.J. (1971). Probit Analysis, 3rd ed. Cambridge University Press.",
    tr("Jones, R. et al. (2013). ALOHA 5.4.4 Technical Documentation, NOAA NOS OR&R 43 — 6.2절 열복사 관심 수준(Mudan 1.7 kW/m²)",
      "Jones, R. et al. (2013). ALOHA 5.4.4 Technical Documentation, NOAA NOS OR&R 43 — §6.2 thermal levels of concern (Mudan, 1.7 kW/m²)"),
  ],
};

Object.assign(window, { CALC_DEF_PROBIT_HARM, calcProbitHarmChart });

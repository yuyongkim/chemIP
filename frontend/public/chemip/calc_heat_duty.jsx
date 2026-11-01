// 계산기: 현열 열량 Q = ṁ · cp · ΔT (상변화 없음).

const CALC_DEF_HEAT_DUTY = {
  key: "heat_duty",
  group: "heat",
  title: tr("현열 열량 (Q = ṁ·cp·ΔT)", "Sensible heat duty (Q = ṁ·cp·ΔT)"),
  summary: tr("흐르는 유체를 데우거나 식히는 데 드는 열량(열 부하)을 구합니다.", "Computes the heat duty needed to heat or cool a flowing fluid."),
  inputs: [
    { key: "m", term: "mass_flow", label: tr("질량 유량 ṁ", "Mass flow rate ṁ"), dim: "massflow", unit: "kgs", show: "kgh", default: 1000, positive: true },
    { key: "cp", term: "cp", label: tr("평균 비열 cp", "Mean specific heat cp"), unit: "kJ/(kg·K)", default: 4.18, positive: true, hint: tr("기본값은 물(약 4.18)", "Default is water (about 4.18)") },
    { key: "Tin", label: tr("입구 온도", "Inlet temperature"), dim: "temperature", unit: "K", show: "C", default: 20, positive: true },
    { key: "Tout", label: tr("출구 온도", "Outlet temperature"), dim: "temperature", unit: "K", show: "C", default: 80, positive: true },
  ],
  outputs: [
    { key: "Q", term: "sensible_heat", label: tr("열량 Q", "Heat duty Q"), dim: "power", unit: "W", show: "kW" },
    { key: "dT", label: tr("온도 변화 ΔT", "Temperature change ΔT"), unit: tr("K (= °C 차)", "K (= °C difference)") },
    { key: "dir", label: tr("방향", "Direction"), type: "text" },
  ],
  compute(v) {
    const dT = v.Tout - v.Tin;
    const Q = v.m * v.cp * 1000 * dT;
    return { Q: Math.abs(Q), dT, dir: dT > 0 ? tr("가열 (유체가 열을 받음)", "Heating (fluid gains heat)") : dT < 0 ? tr("냉각 (유체가 열을 잃음)", "Cooling (fluid loses heat)") : tr("변화 없음", "No change") };
  },
  formula: ["Q = ṁ · cp · (T_out − T_in)"],
  notes: [
    tr("상변화(증발·응축)가 없을 때만 씁니다. 상변화가 있으면 잠열 ṁ·λ 를 더합니다.",
      "Use only when there is no phase change (evaporation or condensation). With a phase change, add the latent heat ṁ·λ."),
    tr("온도 폭이 크면 cp 가 바뀌므로 그 구간의 평균 비열을 넣습니다.",
      "cp varies over a wide temperature range, so enter the mean specific heat over that range."),
  ],
  reference: [
    tr("Incropera, F.P., DeWitt, D.P., Bergman, T.L. & Lavine, A.S., Fundamentals of Heat and Mass Transfer, 7판(2011), 1장 에너지 보존 · 11장 열교환기",
      "Incropera, F.P., DeWitt, D.P., Bergman, T.L. & Lavine, A.S., Fundamentals of Heat and Mass Transfer, 7th ed. (2011), Ch. 1 Conservation of Energy · Ch. 11 Heat Exchangers"),
  ],
};

Object.assign(window, { CALC_DEF_HEAT_DUTY });

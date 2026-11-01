// 계산기: 펌프 수동력·축동력 P = ρ g Q H / η.

const CALC_DEF_PUMP_POWER = {
  key: "pump_power",
  group: "fluid",
  title: tr("펌프 동력", "Pump power"),
  summary: tr("유량·양정·효율로 펌프의 수동력(유체가 받는 동력)과 축동력(모터가 내야 하는 동력)을 구합니다.", "Computes pump hydraulic power (power delivered to the fluid) and shaft power (power the driver must supply) from flow rate, head and efficiency."),
  inputs: [
    { key: "Q", label: tr("부피 유량 Q", "Volumetric flow Q"), dim: "flow", unit: "m3s", show: "m3h", default: 36, positive: true },
    { key: "H", term: "total_head", label: tr("전양정 H", "Total head H"), dim: "length", unit: "m", show: "m", default: 30, positive: true },
    { key: "rho", term: "density", label: tr("밀도 ρ", "Density ρ"), dim: "density", unit: "kgm3", show: "kgm3", default: 1000, positive: true },
    { key: "eta", term: "pump_efficiency", label: tr("펌프 효율 η", "Pump efficiency η"), unit: "%", default: 70, positive: true, max: 100 },
  ],
  outputs: [
    { key: "Ph", term: "hydraulic_power", label: tr("수동력", "Hydraulic power"), dim: "power", unit: "W", show: "kW" },
    { key: "Ps", term: "shaft_power", label: tr("축동력", "Shaft power"), dim: "power", unit: "W", show: "kW" },
    { key: "dp", label: tr("양정에 해당하는 압력 ρgH", "Pressure equivalent of head ρgH"), dim: "pressure", unit: "Pa", show: "kPa" },
  ],
  compute(v) {
    const dp = v.rho * CALC_CONST.g * v.H;
    const Ph = v.Q * dp;
    return { Ph, Ps: Ph / (v.eta / 100), dp };
  },
  formula: [tr("수동력 P_h = ρ · g · Q · H", "Hydraulic power P_h = ρ · g · Q · H"), tr("축동력 P_s = P_h / η", "Shaft power P_s = P_h / η"), "g = 9.80665 m/s²"],
  notes: [tr("모터 정격은 축동력에 모터 효율과 여유율을 더해 고릅니다. 이 값은 펌프 축에서의 동력입니다.", "Select the motor rating from the shaft power with motor efficiency and a service margin added. This value is the power at the pump shaft.")],
  reference: [
    tr("McCabe, Smith & Harriott, Unit Operations of Chemical Engineering 7판(2005) — 펌프 동력 P_B = ṁ·W_p / η", "McCabe, Smith & Harriott, Unit Operations of Chemical Engineering, 7th ed. (2005) — pump power P_B = ṁ·W_p / η"),
    tr("Perry's Chemical Engineers' Handbook, 8판(2008), 10절 유체 수송·저장 — 펌프 수동력과 효율", "Perry's Chemical Engineers' Handbook, 8th ed. (2008), Sec. 10 Transport and Storage of Fluids — pump hydraulic power and efficiency"),
  ],
};

Object.assign(window, { CALC_DEF_PUMP_POWER });

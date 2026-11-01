// 계산기: 불활성화 퍼지 — 진공 퍼지·압력 퍼지(감압·가압 되풀이)와 스위프 퍼지(흘려 보내기). 목표 O₂ 까지 횟수·질소 사용량.
// 진공·압력: y_j = y_N + (y₀ − y_N)(P_L/P_H)^j, 한 번에 Δn = (P_H − P_L)V/(RT). 스위프: Q·t = (V/K) ln[(y₀ − y_N)/(y₂ − y_N)].
// 순수 질소(y_N = 0)면 Crowl & Louvar 7장 식 그대로이고, 산소가 섞인 질소는 같은 물질 수지에서 나온 꼴이다.

const CALC_PURGE_N2_KG_PER_MOL = 0.0280134;   // N₂ 몰질량 kg/mol (IUPAC 2021 원자량 14.0067 × 2)
const CALC_PURGE_T_NORMAL = 273.15;           // Nm³ 기준 0 °C, 1 atm

// 진공·압력 퍼지 → { jExact, cycles, yFinal, nCycle } (y: 몰분율 %, P: Pa, V: m³, T: K)
function calcPurgeCycles({ y0, yN, target, PL, PH, V, T }) {
  const r = PL / PH;
  const jExact = target >= y0 ? 0 : Math.log((target - yN) / (y0 - yN)) / Math.log(r);
  const cycles = Math.max(0, Math.ceil(jExact - 1e-9));
  return { jExact, cycles, yFinal: yN + (y0 - yN) * Math.pow(r, cycles), nCycle: (PH - PL) * V / (CALC_CONST.R * T) };
}

// 스위프 퍼지 → 흘려 보낼 부피(용기 온도·1 atm 기준 m³)
function calcPurgeSweep({ y0, yN, target, V, K }) {
  return target >= y0 ? 0 : (V / K) * Math.log((y0 - yN) / (target - yN));
}

function calcPurgePressures(v) {
  return v.mode === "vacuum" ? { PL: v.vPL, PH: v.vPH } : { PL: v.pPL, PH: v.pPH };
}

function calcPurgeChart(v, out) {
  const pct = "O₂";
  if (v.mode === "sweep") {
    const end = Math.max(out.volumes * 1.2, 0.5);
    const pts = calcChartRange(0, end, 40).map(n => [n, v.yN + (v.y0 - v.yN) * Math.exp(-v.K * n)]);
    return {
      x: { label: tr("흘려 보낸 질소 (용기 부피 배수)", "Nitrogen swept through (vessel volumes)"), unit: "V", min: 0 },
      y: { label: pct, unit: "vol%", log: true },
      series: [{ key: "o2", label: tr("용기 O₂ (완전 혼합 × K)", "Vessel O₂ (perfect mixing × K)"), points: pts }],
      hlines: [{ y: v.target, label: tr("목표", "Target") }],
      markers: [{ x: out.volumes, y: v.target, label: tr("필요량", "Required") }],
      ariaLabel: tr("스위프 퍼지 산소 농도 감소", "Sweep purge oxygen decay"),
    };
  }
  const { PL, PH } = calcPurgePressures(v);
  const n = Math.max(out.cycles, 1);
  const pts = Array.from({ length: n + 1 }, (_, j) => [j, v.yN + (v.y0 - v.yN) * Math.pow(PL / PH, j)]).filter(([, y]) => y > 0);
  return {
    x: { label: tr("퍼지 횟수", "Purge cycles"), unit: tr("회", "cycles"), min: 0 },
    y: { label: pct, unit: "vol%", log: true },
    series: [{ key: "o2", label: tr("각 회 뒤 O₂", "O₂ after each cycle"), kind: "step", points: pts }],
    hlines: [{ y: v.target, label: tr("목표", "Target") }],
    ariaLabel: tr("퍼지 횟수에 따른 산소 농도", "Oxygen concentration against purge cycles"),
  };
}

const CALC_DEF_PURGE = {
  key: "purge",
  group: "flammability",
  title: tr("불활성화 퍼지 (진공·압력·스위프)", "Inerting purge (vacuum · pressure · sweep)"),
  summary: tr("질소로 용기 산소 농도를 목표(예: LOC − 여유)까지 낮추는 데 필요한 퍼지 횟수, 마지막 O₂, 질소 사용량(mol·kg·Nm³)을 구합니다.",
    "Calculates the purge cycles, final O₂ and nitrogen use (mol, kg, Nm³) needed to bring a vessel's oxygen down to a target such as LOC minus a margin."),
  inputs: [
    { key: "mode", type: "choice", term: "purge_method", label: tr("퍼지 방법", "Purge method"), default: "vacuum",
      options: [{ v: "vacuum", label: tr("진공 퍼지", "Vacuum purge") }, { v: "pressure", label: tr("압력 퍼지", "Pressure purge") }, { v: "sweep", label: tr("스위프 퍼지", "Sweep-through purge") }] },
    { key: "V", term: "purge_volume", label: tr("용기 기상 부피", "Vessel vapor-space volume"), dim: "volume", unit: "m3", show: "m3", default: 10, positive: true },
    { key: "T", term: "absolute_temperature", label: tr("온도", "Temperature"), dim: "temperature", unit: "K", show: "C", default: 25, positive: true },
    { key: "vPL", term: "absolute_pressure", label: tr("진공 도달 압력 P_L (절대)", "Vacuum pressure P_L (absolute)"), dim: "pressure", unit: "Pa", show: "mmHg", default: 20, positive: true, when: c => c.mode === "vacuum" },
    { key: "vPH", term: "absolute_pressure", label: tr("질소로 되돌릴 압력 P_H (절대)", "Repressurize to P_H (absolute)"), dim: "pressure", unit: "Pa", show: "mmHg", default: 760, positive: true, when: c => c.mode === "vacuum" },
    { key: "pPH", term: "absolute_pressure", label: tr("질소 가압 P_H (절대)", "N₂ pressurize to P_H (absolute)"), dim: "pressure", unit: "Pa", show: "kPa", default: 600, positive: true, when: c => c.mode === "pressure",
      hint: tr("절대압력입니다(게이지 + 대기압).", "Absolute pressure (gauge + atmospheric).") },
    { key: "pPL", term: "absolute_pressure", label: tr("배출해 낮출 압력 P_L (절대)", "Vent down to P_L (absolute)"), dim: "pressure", unit: "Pa", show: "kPa", default: 101.325, positive: true, when: c => c.mode === "pressure" },
    { key: "y0", term: "o2_concentration", label: tr("처음 O₂", "Initial O₂"), unit: "vol%", default: 20.95, positive: true, max: 100 },
    { key: "yN", term: "o2_concentration", label: tr("퍼지 질소 속 O₂", "O₂ in the purge nitrogen"), unit: "vol%", default: 0, min: 0, max: 100 },
    { key: "target", term: "o2_setpoint", label: tr("목표 O₂", "Target O₂"), unit: "vol%", default: 1, positive: true, max: 100,
      hint: tr("LOC 계산기의 '관리 목표 O₂' 를 넣을 수 있습니다. 1 ppm = 0.0001 %", "You can enter the 'O₂ control target' from the LOC calculator. 1 ppm = 0.0001 %") },
    { key: "K", term: "sweep_mixing_k", label: tr("혼합 효율 K", "Mixing efficiency K"), unit: "—", default: 1, positive: true, max: 1, when: c => c.mode === "sweep",
      hint: tr("1 = 완전 혼합. 혼합이 불확실하면 0.25 이하(Kinsley 2001)", "1 = perfect mixing. Use 0.25 or less when mixing is uncertain (Kinsley 2001)") },
    { key: "Q", term: "purge_flow", label: tr("질소 유량 (선택)", "Nitrogen flow (optional)"), dim: "flow", unit: "m3s", show: "m3h", default: "", optional: true, positive: true, when: c => c.mode === "sweep" },
  ],
  outputs: [
    { key: "jExact", term: "purge_cycles", label: tr("필요 횟수 (계산값)", "Cycles required (exact)"), unit: tr("회", "cycles"), digits: 4 },
    { key: "cycles", term: "purge_cycles", label: tr("퍼지 횟수 (올림)", "Purge cycles (rounded up)"), unit: tr("회", "cycles"), digits: 3 },
    { key: "yFinal", term: "o2_concentration", label: tr("마지막 O₂", "Final O₂"), unit: "vol%", digits: 4 },
    { key: "nCycle", term: "n2_consumption", label: tr("한 번에 드는 N₂", "N₂ per cycle"), unit: "mol", digits: 4 },
    { key: "volumes", term: "n2_consumption", label: tr("흘려 보낼 N₂ (용기 부피 배수)", "N₂ to sweep (vessel volumes)"), unit: "V", digits: 4 },
    { key: "sweepVol", term: "n2_consumption", label: tr("흘려 보낼 N₂ (용기 온도·1 atm)", "N₂ to sweep (vessel T, 1 atm)"), dim: "volume", unit: "m3", show: "m3", digits: 4 },
    { key: "nTotal", term: "n2_consumption", label: tr("총 N₂", "Total N₂"), unit: "mol", digits: 4 },
    { key: "mass", term: "n2_consumption", label: tr("총 N₂ 질량", "Total N₂ mass"), unit: "kg", digits: 4 },
    { key: "nm3", term: "normal_volume", label: tr("총 N₂ (0 °C·1 atm)", "Total N₂ (0 °C, 1 atm)"), unit: "Nm³", digits: 4 },
    { key: "time", term: "purge_flow", label: tr("스위프 시간", "Sweep time"), dim: "time", unit: "s", show: "min", digits: 4 },
  ],
  compute(v) {
    if (v.yN >= v.target) return { error: tr("목표 O₂ 가 퍼지 질소 속 O₂ 보다 커야 합니다.", "The target O₂ must be above the O₂ in the purge nitrogen.") };
    if (v.yN >= v.y0) return { error: tr("처음 O₂ 가 퍼지 질소 속 O₂ 보다 커야 합니다.", "The initial O₂ must be above the O₂ in the purge nitrogen.") };
    const warnings = [];
    if (v.target >= v.y0) warnings.push(tr("목표가 처음 농도 이상이라 퍼지가 필요 없습니다.", "The target is at or above the initial concentration, so no purge is needed."));
    const Patm = CALC_CONST.atm;
    if (v.mode === "sweep") {
      const sweepVol = calcPurgeSweep(v);
      const nTotal = Patm * sweepVol / (CALC_CONST.R * v.T);
      return {
        volumes: sweepVol / v.V, sweepVol, nTotal, mass: nTotal * CALC_PURGE_N2_KG_PER_MOL,
        nm3: nTotal * CALC_CONST.R * CALC_PURGE_T_NORMAL / Patm, time: v.Q ? sweepVol / v.Q : undefined, warnings,
      };
    }
    const { PL, PH } = calcPurgePressures(v);
    if (PL >= PH) return { error: tr("P_H 가 P_L 보다 커야 합니다.", "P_H must be greater than P_L.") };
    const res = calcPurgeCycles({ ...v, PL, PH });
    const nTotal = res.cycles * res.nCycle;
    if (res.cycles > 20) warnings.push(tr("퍼지 횟수가 많습니다. 압력 차를 키우거나 방법을 바꾸는 것을 검토하십시오.", "Many cycles are needed. Consider a larger pressure ratio or another method."));
    if (v.mode === "pressure" && PL > Patm * 1.05) warnings.push(tr("P_L 이 대기압보다 높습니다. 배출을 대기압까지 낮추지 않는 경우에만 맞습니다.", "P_L is above atmospheric. This is valid only if venting stops above atmospheric pressure."));
    return { ...res, nTotal, mass: nTotal * CALC_PURGE_N2_KG_PER_MOL, nm3: nTotal * CALC_CONST.R * CALC_PURGE_T_NORMAL / Patm, warnings };
  },
  chart: calcPurgeChart,
  formula: [
    tr("진공·압력 퍼지: y_j = y_N + (y₀ − y_N)(P_L/P_H)^j,  j = ln[(y_목표 − y_N)/(y₀ − y_N)] / ln(P_L/P_H)", "Vacuum/pressure purge: y_j = y_N + (y₀ − y_N)(P_L/P_H)^j,  j = ln[(y_target − y_N)/(y₀ − y_N)] / ln(P_L/P_H)"),
    tr("질소: 한 번에 Δn = (P_H − P_L)·V / (R·T),  총량 = 횟수 × Δn", "Nitrogen: Δn per cycle = (P_H − P_L)·V / (R·T),  total = cycles × Δn"),
    tr("스위프 퍼지: Q·t = (V/K)·ln[(y₀ − y_N)/(y_목표 − y_N)]", "Sweep purge: Q·t = (V/K)·ln[(y₀ − y_N)/(y_target − y_N)]"),
  ],
  notes: [
    tr("참고용 스크리닝입니다. 이상 기체, 매 회 고르게 섞임, 온도 일정을 가정합니다. 용기 설계 압력·진공 정격 안에서만 씁니다. 실제 작업은 산소 측정으로 확인합니다.",
      "Screening estimate only. It assumes ideal gas, complete mixing in every cycle and constant temperature. Stay within the vessel's design pressure and vacuum rating. Confirm the result by measuring oxygen."),
    tr("진공 퍼지에서는 진공을 거는 동안 질소가 들지 않아 같은 목표에 압력 퍼지보다 질소가 적게 듭니다. 압력 퍼지는 빠르지만 질소가 더 듭니다.",
      "A vacuum purge uses no nitrogen while evacuating, so it needs less nitrogen than a pressure purge for the same target. A pressure purge is faster but uses more nitrogen."),
    tr("스위프 퍼지 부피는 용기 온도·대기압 기준입니다. K 는 혼합 불완전을 보정하는 계수로, 1 은 완전 혼합입니다.",
      "The sweep volume is at vessel temperature and atmospheric pressure. K corrects for incomplete mixing; 1 is perfect mixing."),
  ],
  reference: [
    tr("Crowl & Louvar, Chemical Process Safety 3판(2011), 7장 불활성화 — 진공·압력·스위프 퍼지 식, 예제 7-1(진공)·7-2(압력)의 문제 조건", "Crowl & Louvar, Chemical Process Safety, 3rd ed. (2011), Ch. 7 Inerting — vacuum, pressure and sweep purge equations; problem set-up of Examples 7-1 (vacuum) and 7-2 (pressure)"),
    tr("Kinsley, G.R. (2001). Properly purge and inert storage vessels. Chem. Eng. Prog. 97(2), 57–61 — 예제 1(진공 퍼지 5,000 gal)·예제 3(스위프 20,000 gal, K = 0.25 → 25,148 ft³)",
      "Kinsley, G.R. (2001). Properly purge and inert storage vessels. Chem. Eng. Prog. 97(2), 57–61 — Example 1 (vacuum purge, 5,000 gal) and Example 3 (sweep, 20,000 gal, K = 0.25 → 25,148 ft³)"),
  ],
};

Object.assign(window, { CALC_DEF_PURGE, calcPurgeCycles, calcPurgeSweep });

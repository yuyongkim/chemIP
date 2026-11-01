// 계산기: 누출량(source term) — 구멍으로 새는 액체·기체의 질량 유량, 탱크가 비는 시간, 용기 감압 곡선.
// 식은 calc_source_term.jsx(순수 함수). 결과는 가우스 플룸·웅덩이 증발·장외 영향 계산기로 넘길 수 있다(release_links.jsx).

const calcReleaseIsLiquid = c => c.phase !== "gas";

function calcReleaseRun(v) {
  const holeM2 = Math.PI * v.dh * v.dh / 4;
  if (v.phase === "gas") {
    const p0 = v.Pv + v.Pa;
    const g = calcSrcGasRate(v.Cd, holeM2, p0, v.T0, v.k, v.mw / 1000, v.Pa);
    const out = { phase: "gas", rate: g.rate, choked: g.choked, ratio: g.ratio, crit: calcSrcCriticalRatio(v.k), p0 };
    if (v.V) out.blow = calcSrcBlowdown(v.Cd, holeM2, p0, v.T0, v.k, v.mw / 1000, v.Pa, v.V);
    return out;
  }
  const rate = calcSrcLiquidRate(v.Cd, holeM2, v.rho, v.Pg, v.h0);
  const out = { phase: "liquid", rate, vel: rate / (v.rho * holeM2) };
  if (v.Dt) out.drain = calcSrcDrain(v.Cd, holeM2, Math.PI * v.Dt * v.Dt / 4, v.rho, v.Pg, v.h0);
  return out;
}

// 10분 동안 새는 양(지침의 최악 시나리오 기준 시간과 맞춘 참고값)
function calcReleaseMass10(run) {
  const t = 600;
  if (run.drain) {
    const n = 200, dt = Math.min(t, run.drain.tEmpty) / n;
    let m = 0;
    for (let i = 0; i < n; i++) m += run.drain.rate((i + 0.5) * dt) * dt;
    return m;
  }
  if (run.blow) {
    const pts = run.blow.points;
    let m = 0;
    for (let i = 1; i < pts.length && pts[i - 1][0] < t; i++) {
      const t1 = Math.min(pts[i][0], t);
      m += (pts[i - 1][1] + pts[i][1]) / 2 * (t1 - pts[i - 1][0]);
    }
    return m;
  }
  return run.rate * t;
}

const CALC_DEF_RELEASE = {
  key: "release",
  group: "release",
  title: tr("누출량 (구멍 누출 · 탱크 배출 시간)", "Release rate (hole release · tank draining time)"),
  summary: tr("탱크·배관 구멍으로 새는 액체(Bernoulli)와 기체(막힘·아음속)의 누출률을 구하고, 탱크 크기를 넣으면 비는 시간과 시간에 따른 누출률을 그립니다. 결과는 확산·증발·장외 영향 계산기로 넘깁니다.",
    "Calculates the release rate through a hole for a liquid (Bernoulli) or a gas (choked or subsonic). With the tank size it also gives the draining time and plots the rate over time. The result can be passed to the dispersion, evaporation and off-site screening calculators."),
  inputs: [
    { key: "phase", type: "choice", label: tr("누출 상", "Phase"), term: "release_rate", default: "liquid",
      options: [{ v: "liquid", label: tr("액체", "Liquid") }, { v: "gas", label: tr("기체", "Gas") }] },
    { key: "dh", label: tr("구멍 지름", "Hole diameter"), term: "hole_size", dim: "length", unit: "m", show: "mm", default: 25, positive: true },
    { key: "Cd", label: tr("유출 계수 C_d", "Discharge coefficient C_d"), term: "discharge_coefficient", unit: "—", default: 0.61, positive: true, max: 1,
      hint: tr("날카로운 구멍 0.61, 보수적으로 1.0", "Sharp-edged hole 0.61; 1.0 is conservative") },
    { key: "rho", label: tr("액체 밀도", "Liquid density"), term: "density", dim: "density", unit: "kgm3", show: "kgm3", default: 1000, positive: true, when: calcReleaseIsLiquid },
    { key: "h0", label: tr("구멍 위 액위", "Liquid height above hole"), term: "liquid_level", dim: "length", unit: "m", show: "m", default: 5, min: 0, when: calcReleaseIsLiquid },
    { key: "Pg", label: tr("덮개 압력 (게이지)", "Pad pressure (gauge)"), term: "gauge_pressure", dim: "pressure", unit: "Pa", show: "kPa", default: 0, min: 0,
      hint: tr("액면 위 기체 압력. 대기압 탱크는 0", "Gas pressure above the liquid; 0 for an atmospheric tank"), when: calcReleaseIsLiquid },
    { key: "Pv", label: tr("용기 압력 (게이지)", "Vessel pressure (gauge)"), term: "gauge_pressure", dim: "pressure", unit: "Pa", show: "bar", default: 10, positive: true, when: c => c.phase === "gas" },
    { key: "Dt", label: tr("탱크 지름 (선택, 세운 원통)", "Tank diameter (optional, vertical cylinder)"), dim: "length", unit: "m", show: "m", default: 3, optional: true, positive: true,
      hint: tr("넣으면 비는 시간·누출 곡선", "Gives the draining time and the rate curve"), when: calcReleaseIsLiquid },
    { key: "mw", label: tr("분자량", "Molecular weight"), term: "molar_mass", unit: "g/mol", default: 16.04, positive: true,
      hint: tr("기체는 필수, 액체는 증발·확산 링크용", "Required for a gas; for a liquid only used in the links"), when: c => c.phase === "gas" },
    { key: "mwl", label: tr("분자량 (선택)", "Molecular weight (optional)"), term: "molar_mass", unit: "g/mol", default: "", optional: true, positive: true,
      hint: tr("증발·확산 계산기로 넘길 때 씁니다", "Passed on to the evaporation and dispersion calculators"), when: calcReleaseIsLiquid },
    { key: "k", label: tr("비열비 k", "Heat capacity ratio k"), term: "heat_capacity_ratio", unit: "—", default: 1.31, min: 1.0001, max: 1.7, when: c => c.phase === "gas" },
    { key: "T0", label: tr("용기 안 온도", "Temperature in the vessel"), dim: "temperature", unit: "K", show: "C", default: 20, positive: true, when: c => c.phase === "gas" },
    { key: "Pa", label: tr("바깥 압력", "Ambient pressure"), term: "absolute_pressure", dim: "pressure", unit: "Pa", show: "kPa", default: 101.325, positive: true },
    { key: "V", label: tr("용기 부피 (선택)", "Vessel volume (optional)"), dim: "volume", unit: "m3", show: "m3", default: "", optional: true, positive: true,
      hint: tr("넣으면 감압(등온) 곡선", "Gives the (isothermal) blowdown curve"), when: c => c.phase === "gas" },
  ],
  outputs: [
    { key: "rate", label: tr("처음 누출률", "Initial release rate"), term: "release_rate", dim: "massflow", unit: "kgs", show: "kgs" },
    { key: "flow", label: tr("흐름 상태", "Flow regime"), term: "critical_flow", type: "text" },
    { key: "crit", label: tr("임계 압력비 P*/P₀", "Critical pressure ratio P*/P₀"), term: "critical_flow", unit: "—", digits: 3 },
    { key: "vel", label: tr("구멍 유속", "Velocity in the hole"), term: "mean_velocity", dim: "velocity", unit: "ms", show: "ms" },
    { key: "tEmpty", label: tr("구멍 높이까지 비는 시간", "Time to drain to the hole"), term: "drain_time", dim: "time", unit: "s", show: "min" },
    { key: "t10", label: tr("누출률이 처음의 10 % 가 되는 시간", "Time until the rate falls to 10 %"), term: "release_duration", dim: "time", unit: "s", show: "min" },
    { key: "mass", label: tr("새어 나갈 수 있는 양", "Releasable quantity"), term: "quantity_released", dim: "mass", unit: "kg", show: "kg" },
    { key: "m10", label: tr("처음 10분 동안 누출량", "Quantity released in the first 10 min"), term: "quantity_released", dim: "mass", unit: "kg", show: "kg" },
    { key: "avg", label: tr("평균 누출률 (비는 동안)", "Average rate while draining"), term: "release_rate", dim: "massflow", unit: "kgs", show: "kgs" },
  ],
  compute(v) {
    const run = calcReleaseRun(v);
    const warnings = [];
    if (v.Cd < 0.5) warnings.push(tr("유출 계수가 0.5 보다 작습니다. 날카로운 구멍은 약 0.61 입니다.", "The discharge coefficient is below 0.5; a sharp-edged hole is about 0.61."));
    if (run.phase === "gas") {
      if (run.blow) warnings.push(tr("감압 곡선은 용기 안 온도를 일정하게 둔 등온 근사입니다. 실제(단열)에서는 온도가 떨어져 처음 몇 분은 누출률이 조금 더 빨리 줍니다.",
        "The blowdown curve assumes a constant gas temperature (isothermal). In a real (adiabatic) blowdown the gas cools and the rate falls somewhat faster at first."));
      if (run.p0 > 50e5) warnings.push(tr("50 bar 를 넘으면 이상기체 가정의 오차가 커집니다(압축인자 계산기 참고).", "Above about 50 bar the ideal-gas assumption becomes poor (see the compressibility calculator)."));
      return {
        rate: run.rate, crit: run.crit,
        flow: run.choked ? tr(`막힘(임계) 흐름 — P_a/P₀ = ${calcFormatNumber(run.ratio, 3)} ≤ ${calcFormatNumber(run.crit, 3)}`, `Choked — P_a/P₀ = ${calcFormatNumber(run.ratio, 3)} ≤ ${calcFormatNumber(run.crit, 3)}`)
          : tr(`아음속 흐름 — P_a/P₀ = ${calcFormatNumber(run.ratio, 3)} > ${calcFormatNumber(run.crit, 3)}`, `Subsonic — P_a/P₀ = ${calcFormatNumber(run.ratio, 3)} > ${calcFormatNumber(run.crit, 3)}`),
        t10: run.blow?.t10 ?? undefined,
        mass: run.blow?.mass,
        m10: run.blow ? calcReleaseMass10(run) : undefined,
        warnings,
      };
    }
    if (v.h0 <= 0 && v.Pg <= 0) return { error: tr("구멍 위 액위나 덮개 압력 가운데 하나는 0 보다 커야 합니다.", "Either the liquid height above the hole or the pad pressure must be above 0.") };
    if (!run.drain) warnings.push(tr("탱크 지름을 넣으면 비는 시간과 시간에 따른 누출률을 구합니다.", "Enter the tank diameter to get the draining time and the rate over time."));
    return {
      rate: run.rate, vel: run.vel,
      tEmpty: run.drain?.tEmpty,
      mass: run.drain?.mass,
      m10: run.drain ? calcReleaseMass10(run) : undefined,
      avg: run.drain && run.drain.tEmpty > 0 ? run.drain.mass / run.drain.tEmpty : undefined,
      warnings,
    };
  },
  chart(v) {
    const run = calcReleaseRun(v);
    let pts = null;
    if (run.drain && run.drain.tEmpty > 0) {
      const n = 60;
      pts = Array.from({ length: n + 1 }, (_, i) => { const t = run.drain.tEmpty * i / n; return [t / 60, run.drain.rate(t)]; });
    } else if (run.blow && run.blow.points.length > 2) {
      pts = run.blow.points.map(([t, m]) => [t / 60, m]);
    }
    if (!pts) return null;
    return {
      x: { label: tr("시간", "Time"), unit: "min", min: 0 },
      y: { label: tr("누출률", "Release rate"), unit: "kg/s", min: 0 },
      series: [{ key: "rate", label: run.drain ? tr("탱크 배출 중 누출률", "Rate while the tank drains") : tr("용기 감압 중 누출률 (등온)", "Rate during blowdown (isothermal)"), kind: "area", points: pts }],
      vlines: [{ x: 10, label: tr("10분", "10 min") }],
      height: 240,
      ariaLabel: tr("시간에 따른 누출률", "Release rate over time"),
    };
  },
  links: (v, o) => {
    const mw = v.phase === "gas" ? v.mw : v.mwl;
    const out = [{ calc: "gaussian_plume", values: { Q: o.rate * 1000, mw: mw || "" }, label: tr("이 누출률로 가우스 플룸 농도", "Gaussian plume concentration at this rate") }];
    const mass = o.mass != null ? o.mass : o.m10;
    if (v.phase !== "gas" && mass != null) {   // RMP 지침처럼 깊이 1 cm 로 퍼진 웅덩이
      out.push({ calc: "evaporation", values: { A: mass / (v.rho * 0.01), ...(mw ? { mw } : {}) }, label: tr("이 양이 1 cm 웅덩이로 퍼질 때 증발량", "Evaporation if this quantity spreads to a 1 cm pool") });
    }
    const minutes = o.tEmpty != null ? o.tEmpty / 60 : o.t10 != null ? o.t10 / 60 : 10;
    out.push({ calc: "offsite", values: { scn: "alt", alt: "rate", Qd: o.rate, dur: Math.max(1, Math.min(minutes, 60)) }, label: tr("이 누출률로 장외 영향 사전 검토(참고용)", "Off-site screening at this rate (reference only)") });
    if (mass != null && typeof calcFireMassLinks === "function") out.push(...calcFireMassLinks(mass));   // 인화성이면 BLEVE·증기운 폭발로
    return out;
  },
  formula: [
    tr("액체: ṁ = C_d · A · √(2ρ(P_g + ρ g h))  (Crowl & Louvar 4-3절, EPA OCA 부록 D 식 D-13)", "Liquid: ṁ = C_d · A · √(2ρ(P_g + ρ g h))  (Crowl & Louvar §4-3; EPA OCA Appendix D Eq. D-13)"),
    tr("탱크 배출 시간: t_e = (A_t / (C_d A)) · √2 · (√(P_g/ρ + g h₀) − √(P_g/ρ)) / g  (덮개 압력 일정, 세운 원통)", "Draining time: t_e = (A_t / (C_d A)) · √2 · (√(P_g/ρ + g h₀) − √(P_g/ρ)) / g  (constant pad pressure, vertical cylinder)"),
    tr("기체 막힘 조건: P_a/P₀ ≤ (2/(k+1))^(k/(k−1))", "Choked when P_a/P₀ ≤ (2/(k+1))^(k/(k−1))"),
    tr("막힘: ṁ = C_d A P₀ √( (k M/(R T₀)) (2/(k+1))^((k+1)/(k−1)) )  (C&L 4-6절, 부록 D 식 D-8)", "Choked: ṁ = C_d A P₀ √( (k M/(R T₀)) (2/(k+1))^((k+1)/(k−1)) )  (C&L §4-6; Appendix D Eq. D-8)"),
    tr("아음속: ṁ = C_d A P₀ √( (2M/(R T₀)) (k/(k−1)) [ r^(2/k) − r^((k+1)/k) ] ), r = P_a/P₀  (부록 D 식 D-7)", "Subsonic: ṁ = C_d A P₀ √( (2M/(R T₀)) (k/(k−1)) [ r^(2/k) − r^((k+1)/k) ] ), r = P_a/P₀  (Appendix D Eq. D-7)"),
    tr("감압(등온): dP/dt = −ṁ(P) · R T₀ / (M V)", "Blowdown (isothermal): dP/dt = −ṁ(P) · R T₀ / (M V)"),
  ],
  notes: [
    tr("한 상(액체만 또는 기체만) 흐름입니다. 가압 액화가스(LPG·염소·암모니아 등)가 구멍에서 끓으며 나오는 2상 흐름은 이 식보다 누출률이 작고 다른 모델(예: Leung 오메가법)이 필요합니다.",
      "Single-phase flow only. Liquefied gases under pressure (LPG, chlorine, ammonia, …) that flash in the hole give two-phase flow, a lower rate than these equations and a different model (e.g. Leung's omega method)."),
    tr("배관이 길면 마찰 때문에 누출률이 줄어듭니다. 구멍 식은 보수적(크게)입니다.", "For long pipes, friction lowers the rate; the hole equations are conservative (high)."),
    tr("구멍 누출 결과를 장외 영향 사전 검토(참고용)·가우스 플룸·웅덩이 증발 계산기에 넣을 수 있습니다. 법정 장외영향평가는 화학물질안전원 KORA 로 산정합니다.",
      "The release rate can be fed to the off-site screening (reference only), Gaussian plume and pool evaporation calculators. A legal Korean off-site impact assessment must use the NICS tool KORA."),
  ],
  reference: [
    tr("Crowl & Louvar, Chemical Process Safety 3판(2011), 4장 Source Models — 4-3절 탱크 구멍 액체 누출과 배출 시간, 4-6절 구멍 기체 누출(막힘·아음속)",
      "Crowl & Louvar, Chemical Process Safety, 3rd ed. (2011), Ch. 4 Source Models — §4-3 liquid through a hole in a tank and draining time, §4-6 gases through holes (choked and subsonic)"),
    "U.S. EPA (1999). RMP Offsite Consequence Analysis Guidance, Appendix D — Eqs. D-7, D-8 (gas through a hole), D-13 (liquid from a hole in a tank).",
    "CCPS (1999). Guidelines for Consequence Analysis of Chemical Releases. AIChE — Ch. 2 discharge rate models.",
  ],
};

Object.assign(window, { CALC_DEF_RELEASE, calcReleaseRun, calcReleaseMass10 });

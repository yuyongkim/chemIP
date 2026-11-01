// 계산기: 보온 배관 열손실 — 원통 전도 + 바깥 표면 대류(직렬 열저항), 표면 온도, 임계 보온 반지름.

// 단위 길이당 열손실 [W/m]. r1 관 바깥 반지름, r2 보온 바깥 반지름 [m], k [W/(m·K)], h [W/(m²·K)]
function calcCylLoss(Ti, Ta, r1, r2, k, h) {
  const Rcond = r2 > r1 ? Math.log(r2 / r1) / (2 * Math.PI * k) : 0;
  const Rconv = 1 / (2 * Math.PI * r2 * h);
  return { q: (Ti - Ta) / (Rcond + Rconv), Rcond, Rconv };
}

const CALC_DEF_INSULATION_LOSS = {
  key: "insulation_loss",
  group: "heat",
  title: tr("보온 배관 열손실", "Insulated pipe heat loss"),
  summary: tr("보온재를 감은 배관에서 바깥으로 새는 열(단위 길이당)과 보온재 겉면 온도를 구하고, 보온하지 않았을 때와 비교합니다.",
    "Computes the heat loss per unit length from an insulated pipe and the insulation surface temperature, and compares them with a bare pipe."),
  inputs: [
    { key: "Ti", label: tr("관 바깥면 온도", "Pipe outer surface temperature"), dim: "temperature", unit: "K", show: "C", default: 150, positive: true, hint: tr("얇은 금속관은 유체 온도와 거의 같음", "Nearly equal to the fluid temperature for a thin metal pipe") },
    { key: "Ta", label: tr("주변 공기 온도", "Ambient air temperature"), dim: "temperature", unit: "K", show: "C", default: 20, positive: true },
    { key: "Do", label: tr("관 바깥지름", "Pipe outside diameter"), dim: "length", unit: "m", show: "mm", default: 114.3, positive: true, hint: tr("4인치 관 114.3 mm", "4-inch pipe: 114.3 mm") },
    { key: "t", label: tr("보온 두께", "Insulation thickness"), dim: "length", unit: "m", show: "mm", default: 50, min: 0 },
    { key: "k", label: tr("보온재 열전도도 k", "Insulation thermal conductivity k"), term: "thermal_conductivity", unit: "W/(m·K)", default: 0.045, positive: true, hint: tr("미네랄울 약 0.04–0.05 (평균 온도 기준)", "Mineral wool about 0.04–0.05 (at mean temperature)") },
    { key: "h", label: tr("겉면 열전달계수 h", "Outer surface heat transfer coefficient h"), term: "convection_coeff", unit: "W/(m²·K)", default: 10, positive: true, hint: tr("실내 자연대류 + 복사 약 8–12", "Indoor natural convection + radiation about 8–12") },
    { key: "L", label: tr("배관 길이 (선택)", "Pipe length (optional)"), dim: "length", unit: "m", show: "m", default: 100, optional: true, positive: true },
  ],
  outputs: [
    { key: "q", label: tr("열손실 (단위 길이)", "Heat loss (per unit length)"), unit: "W/m" },
    { key: "Q", label: tr("열손실 (전체 길이)", "Heat loss (total length)"), dim: "power", unit: "W", show: "kW" },
    { key: "Ts", label: tr("보온재 겉면 온도", "Insulation surface temperature"), dim: "temperature", unit: "K", show: "C" },
    { key: "qBare", label: tr("보온 없을 때 열손실", "Bare pipe heat loss"), unit: "W/m" },
    { key: "saving", label: tr("열손실 감소율", "Heat loss reduction"), unit: "%", digits: 3 },
    { key: "rcr", label: tr("임계 보온 반지름 k/h", "Critical insulation radius k/h"), term: "critical_radius", dim: "length", unit: "m", show: "mm" },
  ],
  compute(v) {
    if (v.Ti === v.Ta) return { error: tr("관 온도와 주변 온도가 같아 열 흐름이 없습니다.", "Pipe and ambient temperatures are equal, so there is no heat flow.") };
    const r1 = v.Do / 2, r2 = r1 + v.t;
    const ins = calcCylLoss(v.Ti, v.Ta, r1, r2, v.k, v.h);
    const bare = calcCylLoss(v.Ti, v.Ta, r1, r1, v.k, v.h);
    const rcr = v.k / v.h;
    const warnings = [];
    if (r1 < rcr && v.t > 0) warnings.push(tr("관 반지름이 임계 반지름보다 작습니다. 얇은 보온은 겉넓이가 늘어 오히려 열손실을 늘릴 수 있습니다.",
      "The pipe radius is smaller than the critical radius. Thin insulation adds surface area and can actually increase heat loss."));
    if (v.Ti < v.Ta) warnings.push(tr("관이 주변보다 차갑습니다(보냉). 값은 들어오는 열이며, 겉면이 이슬점 아래면 결로가 생깁니다(습공기 계산기).",
      "The pipe is colder than ambient (cold insulation). Values are heat gain; condensation forms if the surface is below the dew point (see the psychrometric calculator)."));
    return {
      q: Math.abs(ins.q), Q: v.L ? Math.abs(ins.q) * v.L : undefined,
      Ts: v.Ta + ins.q * ins.Rconv, qBare: Math.abs(bare.q),
      saving: 100 * (1 - ins.q / bare.q), rcr, warnings,
    };
  },
  formula: [
    "q' = (T_i − T_∞) / [ ln(r₂/r₁) / (2π k) + 1 / (2π r₂ h) ]   [W/m]",
    tr("겉면 온도 T_s = T_∞ + q' / (2π r₂ h)", "Surface temperature T_s = T_∞ + q' / (2π r₂ h)"),
    tr("보온 없음: q'_bare = 2π r₁ h (T_i − T_∞),  임계 반지름 r_cr = k / h", "Bare pipe: q'_bare = 2π r₁ h (T_i − T_∞),  critical radius r_cr = k / h"),
  ],
  notes: [
    tr("관벽 저항과 관 안쪽 대류 저항은 무시합니다(금속관에서 보통 작음). 관 바깥면 온도를 넣습니다.",
      "Pipe wall and inside convection resistances are neglected (usually small for metal pipe). Enter the pipe outer surface temperature."),
    tr("h 는 대류와 복사를 합친 값입니다. 바람이 있는 실외는 20–30 W/(m²·K) 이상으로 커집니다. 보온재 k 는 평균 온도의 값을 씁니다.",
      "h combines convection and radiation. Outdoors with wind it rises to 20–30 W/(m²·K) or more. Use the insulation k at the mean temperature."),
  ],
  reference: [
    tr("Incropera, DeWitt, Bergman & Lavine, Fundamentals of Heat and Mass Transfer 7판(2011), 3.3절 원통 전도·열저항, 예제 3.5 임계 보온 반지름 r_cr = k/h",
      "Incropera, DeWitt, Bergman & Lavine, Fundamentals of Heat and Mass Transfer, 7th ed. (2011), Sec. 3.3 radial conduction in cylinders and thermal resistance, Example 3.5 critical insulation radius r_cr = k/h"),
    "ASTM C680, Standard Practice for Estimate of the Heat Gain or Loss and the Surface Temperatures of Insulated Flat, Cylindrical, and Spherical Systems",
  ],
};

Object.assign(window, { CALC_DEF_INSULATION_LOSS, calcCylLoss });

// 계산기: 연속 점오염원 가우스 플룸(지면 반사 포함) + Pasquill–Gifford 대기 안정도별 Briggs(1973) 개활지 확산 계수.

// 개활지(rural) σy, σz [m], x [m]. Crowl & Louvar 표 5-2 / Briggs (1973).
const CALC_BRIGGS_RURAL = {
  A: { y: x => 0.22 * x / Math.sqrt(1 + 1e-4 * x), z: x => 0.20 * x },
  B: { y: x => 0.16 * x / Math.sqrt(1 + 1e-4 * x), z: x => 0.12 * x },
  C: { y: x => 0.11 * x / Math.sqrt(1 + 1e-4 * x), z: x => 0.08 * x / Math.sqrt(1 + 2e-4 * x) },
  D: { y: x => 0.08 * x / Math.sqrt(1 + 1e-4 * x), z: x => 0.06 * x / Math.sqrt(1 + 1.5e-3 * x) },
  E: { y: x => 0.06 * x / Math.sqrt(1 + 1e-4 * x), z: x => 0.03 * x / (1 + 3e-4 * x) },
  F: { y: x => 0.04 * x / Math.sqrt(1 + 1e-4 * x), z: x => 0.016 * x / (1 + 3e-4 * x) },
};

// 연속 점오염원, 지면 반사. Q [kg/s], u [m/s], 위치 [m] → C [kg/m³]
function calcPlume(Q, u, sy, sz, y, z, H) {
  return Q / (2 * Math.PI * sy * sz * u) * Math.exp(-(y * y) / (2 * sy * sy))
    * (Math.exp(-((z - H) ** 2) / (2 * sz * sz)) + Math.exp(-((z + H) ** 2) / (2 * sz * sz)));
}

const CALC_DEF_GAUSSIAN_PLUME = {
  key: "gaussian_plume",
  group: "release",
  title: tr("가우스 플룸 확산 (Pasquill–Gifford)", "Gaussian plume dispersion (Pasquill–Gifford)"),
  summary: tr("계속 새어 나오는 기체가 바람을 타고 퍼질 때, 바람 아래쪽 한 지점의 평균 농도를 어림합니다. 대기 안정도는 풍속·일사·구름으로 고릅니다.",
    "For a continuous gas release carried by the wind, estimates the average concentration at a downwind point. Choose the atmospheric stability class from wind speed, insolation and cloud cover."),
  inputs: [
    { key: "Q", label: tr("누출률", "Release rate"), term: "emission_rate", dim: "massflow", unit: "kgs", show: "gs", default: 3, positive: true },
    { key: "u", label: tr("풍속", "Wind speed"), term: "wind_speed", dim: "velocity", unit: "ms", show: "ms", default: 7, positive: true, hint: tr("누출 높이(보통 지상 10 m)의 평균 풍속", "Mean wind speed at release height (usually 10 m above ground)") },
    { key: "cls", type: "choice", label: tr("대기 안정도", "Stability class"), term: "stability_class", default: "D",
      options: ["A", "B", "C", "D", "E", "F"].map(k => ({ v: k, label: k })) },
    { key: "x", label: tr("바람 아래 거리 x", "Downwind distance x"), dim: "length", unit: "m", show: "m", default: 3000, positive: true },
    { key: "y", label: tr("바람 옆 거리 y", "Crosswind distance y"), dim: "length", unit: "m", show: "m", default: 0, min: 0 },
    { key: "z", label: tr("수용점 높이 z", "Receptor height z"), dim: "length", unit: "m", show: "m", default: 0, min: 0 },
    { key: "H", label: tr("유효 누출 높이 H", "Effective release height H"), term: "effective_height", dim: "length", unit: "m", show: "m", default: 0, min: 0 },
    { key: "mw", label: tr("분자량 (선택)", "Molecular weight (optional)"), term: "molar_mass", unit: "g/mol", default: "", optional: true, positive: true, hint: tr("넣으면 ppm 도 구합니다(25 °C, 1 atm)", "If entered, ppm is also calculated (25 °C, 1 atm)") },
  ],
  outputs: [
    { key: "C", label: tr("평균 농도", "Average concentration"), unit: "mg/m³", digits: 4 },
    { key: "ppm", label: tr("평균 농도 (부피)", "Average concentration (volume)"), term: "ppm", unit: "ppm", digits: 4 },
    { key: "sy", label: tr("수평 확산 계수 σy", "Horizontal dispersion coefficient σy"), term: "dispersion_sigma", dim: "length", unit: "m", show: "m" },
    { key: "sz", label: tr("수직 확산 계수 σz", "Vertical dispersion coefficient σz"), term: "dispersion_sigma", dim: "length", unit: "m", show: "m" },
  ],
  compute(v) {
    const s = CALC_BRIGGS_RURAL[v.cls];
    const sy = s.y(v.x);
    const sz = s.z(v.x);
    const C = calcPlume(v.Q, v.u, sy, sz, v.y, v.z, v.H) * 1e6;   // mg/m³
    const warnings = [];
    if (v.x < 100 || v.x > 10000) warnings.push(tr("Briggs 확산 계수는 100 m – 10 km 범위에서 맞춘 식입니다. 범위 밖은 외삽입니다.",
      "The Briggs dispersion coefficients were fitted for 100 m – 10 km. Values outside this range are extrapolated."));
    if (v.u < 1) warnings.push(tr("풍속 1 m/s 미만에서는 가우스 플룸 식이 맞지 않습니다(정체 조건).",
      "The Gaussian plume model is not valid below 1 m/s wind speed (calm conditions)."));
    return { C, ppm: v.mw ? calcMgm3ToPpm(C, v.mw, CALC_CONST.vm25) : undefined, sy, sz, warnings };
  },
  formula: [
    "C(x,y,z) = Q / (2π σy σz u) · exp(−y² / 2σy²) · [ exp(−(z−H)² / 2σz²) + exp(−(z+H)² / 2σz²) ]",
    tr("지면·바람 축(y = z = 0), 지상 누출(H = 0): C = Q / (π σy σz u)", "Ground level on the plume centreline (y = z = 0), ground-level release (H = 0): C = Q / (π σy σz u)"),
    tr("개활지 σy = a·x·(1 + 0.0001x)^−½ (A 0.22 · B 0.16 · C 0.11 · D 0.08 · E 0.06 · F 0.04)", "Rural σy = a·x·(1 + 0.0001x)^−½ (A 0.22 · B 0.16 · C 0.11 · D 0.08 · E 0.06 · F 0.04)"),
    "σz: A 0.20x · B 0.12x · C 0.08x(1+0.0002x)^−½ · D 0.06x(1+0.0015x)^−½ · E 0.03x(1+0.0003x)^−1 · F 0.016x(1+0.0003x)^−1",
  ],
  notes: [
    tr("안정도 고르기(지상 10 m 풍속, 낮 일사 강/중/약 · 밤 구름 ≥ 4/8 / ≤ 3/8): < 2 m/s A, A–B, B / F, F · 2–3 m/s A–B, B, C / E, F · 3–5 m/s B, B–C, C / D, E · 5–6 m/s C, C–D, D / D, D · > 6 m/s C, D, D / D, D. 흐린 날·해 질 녘은 D 입니다. 둘 사이(A–B 등)면 더 안정한 쪽(뒤 글자)이 보수적입니다.",
      "Choosing the class (10 m wind speed; day insolation strong/moderate/slight · night cloud ≥ 4/8 / ≤ 3/8): < 2 m/s A, A–B, B / F, F · 2–3 m/s A–B, B, C / E, F · 3–5 m/s B, B–C, C / D, E · 5–6 m/s C, C–D, D / D, D · > 6 m/s C, D, D / D, D. Overcast conditions and dusk are D. For an in-between class (A–B etc.), the more stable one (second letter) is conservative."),
    tr("중립 부력 기체, 평탄한 개활지, 10분 정도 평균 농도 기준입니다. 공기보다 무거운 기체(염소·LPG 등)·순간 누출(퍼프)·도시·건물 주변은 맞지 않습니다.",
      "Assumes a neutrally buoyant gas, flat open terrain and roughly 10-minute average concentrations. Not valid for dense gases (chlorine, LPG, etc.), instantaneous releases (puffs), urban areas or near buildings."),
    tr("비상 대응·안전거리 판단에는 EPA ALOHA 같은 검증된 모델과 현장 기상을 씁니다.",
      "For emergency response and safe-distance decisions, use a validated model such as EPA ALOHA with on-site weather data."),
  ],
  reference: [
    tr("Crowl & Louvar, Chemical Process Safety 3판(2011), 5장 독성 물질 확산 — 연속 점오염원 플룸 식, 표 5-1 안정도, 표 5-2 개활지 σy·σz",
      "Crowl & Louvar, Chemical Process Safety, 3rd ed. (2011), Ch. 5 Toxic Release and Dispersion Models — continuous point-source plume equation, Table 5-1 stability classes, Table 5-2 rural σy and σz"),
    "Briggs, G.A. (1973). Diffusion estimation for small emissions. ATDL Contribution File No. 79, NOAA Atmospheric Turbulence and Diffusion Laboratory.",
    "Turner, D.B. (1970). Workbook of Atmospheric Dispersion Estimates. U.S. EPA Pub. AP-26.",
    "Pasquill, F. (1961). The estimation of the dispersion of windborne material. Meteorological Magazine 90, 33–49.",
  ],
};

Object.assign(window, { CALC_DEF_GAUSSIAN_PLUME, CALC_BRIGGS_RURAL, calcPlume });

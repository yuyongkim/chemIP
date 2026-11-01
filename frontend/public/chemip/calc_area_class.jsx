// 계산기: 폭발위험장소 구분 도우미(참고용) — 누출 등급 + 환기로 구역 종류 안내, 누출량 → 누출 특성값 → 가상 체적 V_z 어림.
// 식: 구멍 누출(Crowl & Louvar 4장, 기체 임계·아임계 / 액체 Bernoulli), 누출 특성값 W/(ρ_g·k·LFL)(Webber et al. 2011),
//     가상 체적 V_z = f·(dV/dt)_min / C(구판 IEC 60079-10 부속서 B 방식, Ivings et al. 2008 RR630 이 정리), 완전 혼합 실내 배경 농도.
// KS C IEC 60079-10-1 의 표·그림(희석도 선도·구역 표)은 싣지 않는다. 결과는 "추정"이며 구역 확정은 표준과 자격자 검토로.

const AREA_NE_VOLUME = 0.1; // m³ — 가상 체적이 이보다 작으면 "무시할 범위(NE)" 후보(구판 IEC 60079-10:2002 부속서 B, RR630 인용)

// 기체 구멍 누출 [kg/s]. p·pa 절대압 Pa, T K, M kg/mol. { W, choked }
function areaGasRelease(Cd, A, p, pa, T, M, g, Z = 1) {
  const r = pa / p;
  const rc = Math.pow(2 / (g + 1), g / (g - 1));
  const rho0 = (p * M) / (Z * CALC_CONST.R * T);   // 저장 상태 기체 밀도
  if (r <= rc) {
    return { W: Cd * A * Math.sqrt(g * rho0 * p * Math.pow(2 / (g + 1), (g + 1) / (g - 1))), choked: true };
  }
  const term = (2 * g / (g - 1)) * (Math.pow(r, 2 / g) - Math.pow(r, (g + 1) / g));
  return { W: Cd * A * Math.sqrt(rho0 * p * term), choked: false };
}

// 액체 구멍 누출 [kg/s] — W = Cd·A·√(2ρΔp)
function areaLiquidRelease(Cd, A, rho, dp) {
  return Cd * A * Math.sqrt(2 * rho * dp);
}

// 주변 상태의 누출 기체 밀도 [kg/m³]
function areaGasDensity(pa, Ta, M) {
  return (pa * M) / (CALC_CONST.R * Ta);
}

// 구역 종류 안내 글(추정) — 누출 등급의 기본 구역 + 가상 체적·배경 농도로 본 범위 경향
function areaZoneText(grade, vz, xbRatio, hasRoom) {
  const base = {
    continuous: tr("기본: 0종 장소(누출원 둘레), 바깥으로 1·2종이 이어질 수 있음", "Baseline: Zone 0 around the source, possibly surrounded by Zone 1 and 2"),
    primary: tr("기본: 1종 장소, 바깥으로 2종이 이어질 수 있음", "Baseline: Zone 1, possibly surrounded by Zone 2"),
    secondary: tr("기본: 2종 장소", "Baseline: Zone 2"),
  }[grade];
  if (!hasRoom) return `${base} — ${tr("실내 부피·환기를 넣으면 범위 경향을 함께 봅니다.", "enter a room volume and ventilation to see the extent tendency.")}`;
  if (xbRatio != null && xbRatio >= 1) {
    return `${base} — ${tr("배경 농도가 k·LFL 이상: 희석 부족 가능성. 실 전체가 구역이 되거나 더 엄한 구역이 될 수 있습니다.", "background concentration at or above k·LFL: dilution may be inadequate. The whole room may be classified, possibly as a more severe zone.")}`;
  }
  if (vz < AREA_NE_VOLUME) {
    return `${base} — ${tr("V_z < 0.1 m³: 무시할 범위(NE) 후보. 환기 가용성이 '양호'일 때만 적용을 검토합니다.", "V_z < 0.1 m³: candidate for negligible extent (NE). Consider it only when ventilation availability is good.")}`;
  }
  return `${base} — ${tr("범위는 가상 체적 V_z 를 참고해 표준의 방법으로 정합니다.", "set the extent by the standard's method, using V_z as a guide.")}`;
}

function calcAreaClass(v) {
  const warnings = [];
  const M = v.M / 1000;
  const A = (Math.PI / 4) * v.d * v.d;
  let W, choked = null;
  if (v.src === "gas") {
    if (!(v.p > v.pa)) return { error: tr("저장 압력(절대)이 대기압보다 커야 합니다.", "The storage pressure (absolute) must exceed atmospheric pressure.") };
    const r = areaGasRelease(v.Cd, A, v.p, v.pa, v.T, M, v.g, v.Z);
    W = r.W; choked = r.choked;
  } else if (v.src === "liquid") {
    W = areaLiquidRelease(v.Cd, A, v.rho, v.dp);
    warnings.push(tr("액체 누출량을 그대로 증기 누출로 보았습니다(보수적). 실제 증기 발생량은 증발·플래시 비율로 줄어듭니다 — 웅덩이 증발 계산기를 함께 보십시오.", "The liquid release rate is taken as the vapor release (conservative). The actual vapor rate is smaller by the evaporating or flashing fraction — see the pool evaporation calculator."));
  } else {
    W = v.W;
  }
  const rhoG = areaGasDensity(v.pa, v.Ta, M);
  const lfl = v.LFL / 100;
  const Qg = W / rhoG;                          // 주변 상태 누출 기체 부피 유량 m³/s
  const Qc = W / (rhoG * v.k * lfl);            // 누출 특성값 m³/s (= 구판의 (dV/dt)_min, 주변 온도 기준)
  const out = { W, regime: choked == null ? null : (choked ? tr("임계(초크) 흐름", "Choked flow") : tr("아임계 흐름", "Subsonic flow")), Qg, Qc, warnings };
  const hasRoom = v.V0 != null && v.ach != null;
  if (hasRoom) {
    const C = v.ach / 3600;                     // 1/s
    const Qv = v.ach * v.V0 / 3600;             // m³/s
    out.Vz = (v.f * Qc) / C;
    out.Xb = (100 * v.f * Qg) / Qv / lfl;       // 배경 농도, LFL 의 %
    if (out.Vz > v.V0) warnings.push(tr("가상 체적이 실 부피보다 큽니다. 실 전체를 구역으로 보는 쪽을 검토하십시오.", "The hypothetical volume exceeds the room volume. Consider classifying the whole room."));
  } else if (v.V0 != null || v.ach != null) {
    warnings.push(tr("가상 체적은 실 부피와 환기 횟수를 모두 넣어야 계산합니다.", "The hypothetical volume needs both the room volume and the air change rate."));
  }
  out.zone = areaZoneText(v.grade, out.Vz, out.Xb != null ? out.Xb / (100 * v.k) : null, hasRoom);
  if (v.d > 0.025) warnings.push(tr("구멍 지름이 25 mm 를 넘습니다. 2차 누출원의 구멍 크기는 보통 훨씬 작게 잡습니다(표준·기업 기준 확인).", "The hole is larger than 25 mm. Secondary release hole sizes are normally much smaller (check the standard and company practice)."));
  return out;
}

// 그래프: 환기 횟수(log)에 따른 가상 체적 V_z(log), 지금 값 표시와 0.1 m³ 기준선
function calcAreaClassChart(v, out) {
  if (out.Vz == null) return null;
  const pts = calcChartRange(0.1, 100, 40, true).map(n => [n, (v.f * out.Qc) / (n / 3600)]);
  return {
    x: { label: tr("환기 횟수", "Air changes"), unit: tr("회/h", "1/h"), log: true },
    y: { label: tr("가상 체적 V_z", "Hypothetical volume V_z"), unit: "m³", log: true },
    series: [{ key: "vz", label: "V_z", points: pts }],
    markers: [{ x: v.ach, y: out.Vz, label: tr("지금 값", "Current") }],
    hlines: [{ y: AREA_NE_VOLUME, label: "0.1 m³ (NE)" }],
    ariaLabel: tr("환기 횟수에 따른 가상 체적", "Hypothetical volume against air changes"),
  };
}

const CALC_DEF_AREA_CLASS = {
  key: "area_class",
  group: "release",
  title: tr("폭발위험장소 구분 도우미 (참고용)", "Hazardous area classification helper (reference)"),
  summary: tr("누출 등급과 환기로 구역 종류(0·1·2종)를 안내하고, 누출량으로 누출 특성값과 가상 체적 V_z 를 어림합니다. 구역 구분은 KS C IEC 60079-10-1 을 따르며 이 결과는 사전 검토용 추정입니다.",
    "Gives zone-type guidance (Zone 0/1/2) from the release grade and ventilation, and estimates the release characteristic and the hypothetical volume V_z from the release rate. Classification follows KS C IEC 60079-10-1; these results are pre-review estimates only."),
  inputs: [
    { key: "grade", type: "choice", term: "release_grade", label: tr("누출 등급", "Grade of release"), default: "secondary",
      options: [{ v: "continuous", label: tr("연속", "Continuous") }, { v: "primary", label: tr("1차", "Primary") }, { v: "secondary", label: tr("2차", "Secondary") }] },
    { key: "src", type: "choice", label: tr("누출량", "Release rate"), default: "gas",
      options: [{ v: "gas", label: tr("기체 구멍 누출", "Gas through a hole") }, { v: "liquid", label: tr("액체 구멍 누출", "Liquid through a hole") }, { v: "direct", label: tr("직접 입력", "Enter directly") }] },
    { key: "W", label: tr("누출량", "Release rate"), dim: "massflow", unit: "kgs", show: "gs", default: 0.1, positive: true, when: v => v.src === "direct" },
    { key: "d", label: tr("구멍 지름", "Hole diameter"), dim: "length", unit: "m", show: "mm", default: 1, positive: true, when: v => v.src !== "direct",
      hint: tr("2차 누출원(플랜지·밀봉부)은 보통 수 mm² 이하의 구멍을 가정합니다", "Secondary sources (flanges, seals) usually assume holes of a few mm² or less") },
    { key: "Cd", label: tr("유출 계수 C_d", "Discharge coefficient C_d"), unit: "—", default: 0.75, min: 0.1, max: 1, when: v => v.src !== "direct",
      hint: tr("날카로운 구멍 0.6 안팎, 둥근 노즐 0.95 이상", "About 0.6 for sharp-edged holes, 0.95+ for rounded nozzles") },
    { key: "p", label: tr("저장 압력(절대)", "Storage pressure (absolute)"), dim: "pressure", unit: "Pa", show: "bar", default: 5, positive: true, when: v => v.src === "gas" },
    { key: "T", label: tr("저장 온도", "Storage temperature"), dim: "temperature", unit: "K", show: "C", default: 20, positive: true, when: v => v.src === "gas" },
    { key: "g", term: "heat_capacity_ratio", label: tr("비열비 γ", "Heat capacity ratio γ"), unit: "—", default: 1.31, min: 1.01, max: 1.7, when: v => v.src === "gas" },
    { key: "Z", label: tr("압축 인자 Z", "Compressibility factor Z"), unit: "—", default: 1, positive: true, when: v => v.src === "gas" },
    { key: "dp", label: tr("구멍 앞뒤 압력차", "Pressure difference across the hole"), dim: "pressure", unit: "Pa", show: "kPa", default: 300, positive: true, when: v => v.src === "liquid" },
    { key: "rho", label: tr("액체 밀도", "Liquid density"), dim: "density", unit: "kgm3", show: "kgm3", default: 870, positive: true, when: v => v.src === "liquid" },
    { key: "M", term: "molar_mass", label: tr("분자량", "Molar mass"), unit: "g/mol", default: 16.04, positive: true, hint: tr("기본값은 메테인 예시", "Default is methane as an example") },
    { key: "LFL", term: "lfl", label: "LFL", unit: "vol%", default: 4.4, positive: true, max: 100 },
    { key: "k", term: "lfl_safety_factor", label: tr("LFL 안전 계수 k", "LFL safety factor k"), unit: "—", default: 0.5, min: 0.1, max: 1, hint: tr("보통 0.5–1.0, 작을수록 보수적", "Usually 0.5–1.0; smaller is more conservative") },
    { key: "Ta", label: tr("주변 온도", "Ambient temperature"), dim: "temperature", unit: "K", show: "C", default: 20, positive: true },
    { key: "pa", label: tr("대기압", "Atmospheric pressure"), dim: "pressure", unit: "Pa", show: "kPa", default: 101.325, positive: true },
    { key: "V0", label: tr("실 부피(실내일 때)", "Room volume (indoors)"), dim: "volume", unit: "m3", show: "m3", default: 200, optional: true, positive: true },
    { key: "ach", term: "ach", label: tr("환기 횟수", "Air change rate"), unit: tr("회/h", "1/h"), default: 6, optional: true, positive: true },
    { key: "f", term: "ventilation_efficiency_factor", label: tr("환기 효율 계수 f", "Ventilation efficiency factor f"), unit: "—", default: 2, min: 1, max: 5,
      hint: tr("1 = 이상적 혼합, 5 = 흐름이 막힌 곳", "1 = ideal mixing, 5 = impeded air flow") },
  ],
  outputs: [
    { key: "zone", type: "text", label: tr("구역 종류 안내(추정)", "Zone-type guidance (estimate)") },
    { key: "W", label: tr("누출량 W", "Release rate W"), dim: "massflow", unit: "kgs", show: "gs", digits: 4 },
    { key: "regime", type: "text", label: tr("흐름 상태", "Flow regime") },
    { key: "Qg", label: tr("누출 기체 부피 유량(주변 상태)", "Released gas volume flow (ambient)"), dim: "flow", unit: "m3s", show: "m3h", digits: 4 },
    { key: "Qc", term: "release_characteristic", label: tr("누출 특성값 W/(ρ_g·k·LFL)", "Release characteristic W/(ρ_g·k·LFL)"), dim: "flow", unit: "m3s", show: "m3s", digits: 4 },
    { key: "Vz", term: "hypothetical_volume", label: tr("가상 체적 V_z", "Hypothetical volume V_z"), dim: "volume", unit: "m3", show: "m3", digits: 4 },
    { key: "Xb", label: tr("실내 배경 농도(LFL 대비)", "Room background concentration (of LFL)"), unit: "%", digits: 3 },
  ],
  compute: calcAreaClass,
  chart: calcAreaClassChart,
  formula: [
    tr("기체(임계): W = C_d·A·√(γ·ρ₀·p·(2/(γ+1))^((γ+1)/(γ−1))),  ρ₀ = p·M/(Z·R·T)", "Gas (choked): W = C_d·A·√(γ·ρ₀·p·(2/(γ+1))^((γ+1)/(γ−1))),  ρ₀ = p·M/(Z·R·T)"),
    tr("기체(아임계, p_a/p > (2/(γ+1))^(γ/(γ−1))): W = C_d·A·√(ρ₀·p·(2γ/(γ−1))·[(p_a/p)^(2/γ) − (p_a/p)^((γ+1)/γ)])", "Gas (subsonic, p_a/p > (2/(γ+1))^(γ/(γ−1))): W = C_d·A·√(ρ₀·p·(2γ/(γ−1))·[(p_a/p)^(2/γ) − (p_a/p)^((γ+1)/γ)])"),
    tr("액체: W = C_d·A·√(2·ρ·Δp)", "Liquid: W = C_d·A·√(2·ρ·Δp)"),
    "Q_c = W / (ρ_g · k · LFL),  ρ_g = p_a·M/(R·T_a)",
    "V_z = f · Q_c / C,  C = (air changes per hour)/3600",
    "X_b = f · (W/ρ_g) / Q_vent",
  ],
  notes: [
    tr("폭발위험장소 구분은 KS C IEC 60079-10-1(IEC 60079-10-1)을 따릅니다. 이 표준에는 범위(거리)를 바로 주는 식이 없고, 희석도와 범위는 표준의 그림·표로 정합니다. 이 계산기는 그 그림·표를 싣지 않았으며 결과는 사전 검토용 추정입니다.",
      "Hazardous area classification follows KS C IEC 60079-10-1 (IEC 60079-10-1). The standard gives no explicit formula for the extent (distance); the dilution degree and extent are read from its figures and tables. This calculator does not reproduce them, and its results are pre-review estimates only."),
    tr("구역 설정은 법정 설계 의무입니다(산업안전보건기준에 관한 규칙). 확정은 표준의 절차에 따라 자격 있는 사람이 검토하십시오. 이 결과를 방폭 기기 선정의 근거로 쓰지 마십시오.",
      "Area classification is a statutory design duty in Korea. Final classification must follow the standard's procedure and be reviewed by a qualified person. Do not use these results to select explosion-protected equipment."),
    tr("가상 체적 V_z 는 구판 IEC 60079-10(2002) 방식의 지표로, 현행 판은 누출 특성값과 환기 속도로 희석도를 판단합니다. 두 방식 모두 누출 구멍 크기 가정에 크게 좌우됩니다.",
      "The hypothetical volume V_z is an indicator from the older IEC 60079-10 (2002) method; the current edition judges dilution from the release characteristic and ventilation velocity. Both depend strongly on the assumed hole size."),
    tr("액체 누출은 누출량 전체를 증기로 본 보수적 값입니다. 증발량은 웅덩이 증발 계산기로 따로 구하십시오. 무거운 증기·안개(mist)·제트 운동량 효과는 다루지 않습니다.",
      "For liquid releases the whole release is treated as vapor (conservative). Compute the evaporation rate separately with the pool evaporation calculator. Dense vapor, mist and jet momentum effects are not covered."),
  ],
  reference: [
    tr("KS C IEC 60079-10-1 폭발성 분위기 — 제10-1부: 장소 구분 — 폭발성 가스 분위기(구역 구분의 근거 표준, 본문·그림·표는 싣지 않음)", "KS C IEC 60079-10-1 / IEC 60079-10-1, Explosive atmospheres — Part 10-1: Classification of areas — Explosive gas atmospheres (the governing standard; text, figures and tables not reproduced)"),
    tr("Crowl, D.A. & Louvar, J.F., Chemical Process Safety, 3판(2011), 4장 Source Models — 구멍 기체·액체 누출식", "Crowl, D.A. & Louvar, J.F., Chemical Process Safety, 3rd ed. (2011), Ch. 4 Source Models — gas and liquid hole release"),
    "Webber, D.M., Ivings, M.J. & Santon, R.C. (2011). Ventilation theory and dispersion modelling applied to hazardous area classification. Journal of Loss Prevention in the Process Industries, 24(5), 612–621.",
    "Ivings, M.J. et al. (2008). Area classification for secondary releases from low pressure natural gas systems. HSE Research Report RR630.",
  ],
};

Object.assign(window, { CALC_DEF_AREA_CLASS, calcAreaClass, areaGasRelease, areaLiquidRelease, areaGasDensity, AREA_NE_VOLUME });

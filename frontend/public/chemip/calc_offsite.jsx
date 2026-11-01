// 계산기: 장외 영향 사전 검토(참고용 스크리닝) — EPA RMP 장외 영향 분석 지침(OCA Guidance)의 최악·대안 시나리오 누출률과
// 참조표 끝점 거리. 한국/미국 끝점 기준 전환(한국: ERPG-2 → AEGL-2 → PAC-2, 1 psi, 5 kW/m²·40 s). 풀이는 calc_offsite_run.jsx,
// 식·표 읽기는 calc_rmp_core.jsx, 자료는 calc_rmp_data.jsx(생성 파일), 그래프는 calc_offsite_chart.jsx. 법정 장외영향평가 아님.

const CALC_OFFSITE_OPTS = {
  toxic: [...CALC_RMP_DATA.toxic].sort((a, b) => a.name.localeCompare(b.name)).map(s => ({ v: s.cas, label: `${s.name} (${s.cas})` })),
  flam: [...CALC_RMP_DATA.flammable].sort((a, b) => a.name.localeCompare(b.name)).map(s => ({ v: s.cas, label: `${s.name} (${s.cas})` })),
};
const calcOffsiteIsToxic = c => c.cat !== "flam";
const calcOffsiteState = c => (calcOffsiteIsToxic(c) ? calcRmpToxic(c.sub_t) : calcRmpFlammable(c.sub_f))?.state;
const calcOffsiteNeedsRelease = c => calcOffsiteIsToxic(c) || (c.scn === "alt" && c.event === "vcf");
const calcOffsiteAltMode = (c, m) => c.scn === "alt" && calcOffsiteNeedsRelease(c) && c.alt === m;
const calcOffsitePool = c => (calcOffsiteNeedsRelease(c) && calcOffsiteState(c) === "liquid" && !(c.scn === "alt" && c.alt === "rate"))
  || (!calcOffsiteIsToxic(c) && c.scn === "alt" && c.event === "pool");

function calcOffsiteEndpointText(run) {
  if (run.kind !== "toxic") {
    return { vce: tr("과압 1 psi (6.9 kPa)", "Overpressure 1 psi (6.9 kPa)"), pool: tr("복사열 5 kW/m² · 40 s", "Radiant heat 5 kW/m² for 40 s"),
      bleve: tr("복사열 5 kW/m² · 40 s 상당(화구 지속 시간 동안의 2도 화상 선량)", "Radiant heat equivalent to 5 kW/m² for 40 s (second-degree burn dose over the fireball duration)"),
      vcf: tr(`연소 하한 LFL ${run.sub.lfl_mgL} mg/L`, `Lower flammability limit ${run.sub.lfl_mgL} mg/L`) }[run.kind];
  }
  const e = run.ep;
  const src = {
    rmp: tr("40 CFR 68 부록 A", "40 CFR 68 Appendix A"),
    erpg2: tr("AIHA ERPG-2 (DOE PAC Rev. 29 경유)", "AIHA ERPG-2 (via DOE PAC Rev. 29)"),
    aegl2: tr(`EPA AEGL-2 ${["10분", "30분", "1시간"][e.window ?? 2]} 값 (${run.sub.kr?.aegl2?.status || ""})`, `EPA AEGL-2 ${["10-min", "30-min", "1-h"][e.window ?? 2]} value (${run.sub.kr?.aegl2?.status || ""})`),
    pac2: tr(`DOE PAC-2 Rev. 29 (${run.sub.kr?.pac2?.tier || ""} 기반)`, `DOE PAC-2 Rev. 29 (${run.sub.kr?.pac2?.tier || ""}-based)`),
    user: tr("사용자 입력", "user entry"),
  }[e.kind];
  return `${e.label} · ${calcFormatNumber(e.ppm, 3)} ppm (${calcFormatNumber(e.mgL, 3)} mg/L) — ${src}`;
}

// 끝점 농도 줄 하나(쓴 기준의 줄에만 값 — 줄마다 용어 설명이 다르다)
function calcOffsiteEndpointValue(run) {
  if (run.kind !== "toxic") return {};
  const key = { erpg2: "epErpg", aegl2: "epAegl", pac2: "epPac" }[run.ep.kind] || "epOther";
  return { [key]: run.ep.ppm };
}

function calcOffsiteTableText(run) {
  if (run.dist.eq) return run.kind === "vce" ? tr("식 C-2 (TNT 당량)", "Equation C-2 (TNT equivalence)") : tr("식 10-1 (웅덩이 화재 계수)", "Equation 10-1 (pool fire factor)");
  return calcRmpTableLabel(run.dist.table);
}

const CALC_DEF_OFFSITE = {
  key: "offsite",
  group: "release",
  title: tr("장외 영향 사전 검토 (RMP 끝점 거리, 참고용)", "Off-site consequence screening (RMP endpoint distance, reference only)"),
  summary: tr("미국 EPA RMP 장외 영향 분석 지침의 간이 방법으로 최악·대안 시나리오의 누출률과 끝점(독성·1 psi·5 kW/m²)까지 거리를 어림합니다. 참고용 스크리닝이며 법정 장외영향평가(화학사고예방관리계획서)는 화학물질안전원 KORA 로 산정합니다.",
    "Estimates worst-case and alternative-scenario release rates and the distance to the endpoint (toxic, 1 psi, 5 kW/m²) with the simplified methods of the US EPA RMP Offsite Consequence Analysis Guidance. A screening reference only: a legal Korean off-site impact assessment must be computed with the NICS tool KORA."),
  inputs: [
    { key: "basis", type: "choice", label: tr("끝점 기준", "Endpoint basis"), term: "offsite_assessment", default: "kr",
      options: [{ v: "kr", label: tr("한국 (ERPG-2 → AEGL-2 → PAC-2)", "Korea (ERPG-2 → AEGL-2 → PAC-2)") }, { v: "us", label: tr("미국 RMP (40 CFR 68 부록 A)", "US RMP (40 CFR 68 App. A)") }] },
    { key: "scn", type: "choice", label: tr("시나리오", "Scenario"), term: "worst_case", default: "worst",
      options: [{ v: "worst", label: tr("최악 (F, 1.5 m/s)", "Worst case (F, 1.5 m/s)") }, { v: "alt", label: tr("대안 (D, 3.0 m/s)", "Alternative (D, 3.0 m/s)") }] },
    { key: "cat", type: "choice", label: tr("물질 종류", "Hazard"), default: "toxic", term: "rmp",
      options: [{ v: "toxic", label: tr("독성", "Toxic") }, { v: "flam", label: tr("인화성", "Flammable") }] },
    { key: "sub_t", type: "choice", select: true, label: tr("독성 물질 (RMP 목록)", "Toxic substance (RMP list)"), default: CALC_OFFSITE_DEFAULTS.toxic,
      options: CALC_OFFSITE_OPTS.toxic, when: calcOffsiteIsToxic },
    { key: "sub_f", type: "choice", select: true, label: tr("인화성 물질 (RMP 목록)", "Flammable substance (RMP list)"), default: CALC_OFFSITE_DEFAULTS.flam,
      options: CALC_OFFSITE_OPTS.flam, when: c => !calcOffsiteIsToxic(c) },
    { key: "nh3", type: "choice", label: tr("암모니아 저장 상태", "Ammonia storage"), default: "pressure",
      options: [{ v: "pressure", label: tr("가압 액화", "Liquefied under pressure") }, { v: "refrig", label: tr("냉동 액화·기체·수용액", "Refrigerated, gas or aqueous") }],
      when: c => calcOffsiteIsToxic(c) && c.sub_t === "7664-41-7" },
    { key: "event", type: "choice", label: tr("사고 형태", "Event"), term: "alternative_case", default: "vce",
      options: [{ v: "vce", label: tr("증기운 폭발", "Vapour cloud explosion") }, { v: "pool", label: tr("웅덩이 화재", "Pool fire") },
        { v: "bleve", label: tr("화구 (BLEVE)", "Fireball (BLEVE)") }, { v: "vcf", label: tr("증기운 화재 (LFL)", "Vapour cloud fire (LFL)") }],
      when: c => !calcOffsiteIsToxic(c) && c.scn === "alt" },
    { key: "alt", type: "choice", label: tr("대안 누출 방식", "Alternative release"), term: "release_rate", default: "hole",
      options: [{ v: "hole", label: tr("구멍 누출", "Hole") }, { v: "total", label: tr("전량 누출", "Whole quantity") }, { v: "rate", label: tr("누출률 직접 입력", "Rate entered") }],
      when: c => c.scn === "alt" && calcOffsiteNeedsRelease(c) },
    { key: "topo", type: "choice", label: tr("지형", "Topography"), term: "topography", default: "rural",
      options: [{ v: "rural", label: tr("개활지 (장애물 적음)", "Rural (few obstructions)") }, { v: "urban", label: tr("도시·장애물 많음", "Urban or obstructed") }],
      when: calcOffsiteNeedsRelease },
    { key: "mit", type: "choice", label: tr("수동 완화", "Passive mitigation"), term: "passive_mitigation", default: "none",
      options: [{ v: "none", label: tr("없음", "None") }, { v: "dike", label: tr("방류벽", "Dike") }, { v: "building", label: tr("건물 안", "Inside a building") }],
      when: c => calcOffsitePool(c) || (calcOffsiteIsToxic(c) && calcOffsiteState(c) === "gas" && !calcOffsiteAltMode(c, "rate")) },
    { key: "QS", label: tr("누출량 (취급량)", "Quantity released"), term: "quantity_released", dim: "mass", unit: "kg", show: "kg", default: 1000, positive: true,
      hint: tr("최악 시나리오는 가장 큰 용기·배관의 전량", "Worst case: the whole contents of the largest vessel or pipe") },
    { key: "Qd", label: tr("대기 누출률", "Release rate to air"), term: "release_rate", dim: "massflow", unit: "kgs", show: "kgs", default: 1, positive: true,
      hint: tr("누출량 계산기(release) 결과를 넣을 수 있습니다", "You can use the result of the source-term calculator (release)"), when: c => calcOffsiteAltMode(c, "rate") },
    { key: "dur", label: tr("누출 지속 시간", "Release duration"), term: "release_duration", dim: "time", unit: "s", show: "min", default: 10, positive: true,
      when: c => calcOffsiteAltMode(c, "rate") },
    { key: "dh", label: tr("구멍 지름", "Hole diameter"), term: "hole_size", dim: "length", unit: "m", show: "mm", default: 25, positive: true,
      when: c => calcOffsiteAltMode(c, "hole") },
    { key: "Pt", label: tr("탱크 압력 (절대, 기체)", "Tank pressure (absolute, gas)"), term: "absolute_pressure", dim: "pressure", unit: "Pa", show: "kPa", default: "", optional: true, positive: true,
      hint: tr("비우면 지침의 25 °C 증기압(액화 기체)", "Blank: the guidance's 25 °C vapour pressure (liquefied gas)"), when: c => calcOffsiteAltMode(c, "hole") && calcOffsiteState(c) === "gas" },
    { key: "Tt", label: tr("탱크 온도 (기체)", "Tank temperature (gas)"), dim: "temperature", unit: "K", show: "C", default: 25, positive: true,
      when: c => calcOffsiteAltMode(c, "hole") && calcOffsiteState(c) === "gas" },
    { key: "LH", label: tr("구멍 위 액위", "Liquid height above hole"), term: "liquid_level", dim: "length", unit: "m", show: "m", default: 1, positive: true,
      hint: tr("대기압 탱크(식 7-4)", "Atmospheric tank (Eq. 7-4)"), when: c => calcOffsiteAltMode(c, "hole") && calcOffsiteState(c) === "liquid" },
    { key: "tstop", label: tr("차단까지 걸리는 시간 (선택)", "Time to stop the release (optional)"), term: "release_duration", dim: "time", unit: "s", show: "min", default: "", optional: true, positive: true,
      when: c => calcOffsiteAltMode(c, "hole") },
    { key: "T", label: tr("액체 온도", "Liquid temperature"), dim: "temperature", unit: "K", show: "C", default: 25, positive: true,
      hint: tr("25–50 °C 는 온도 보정 계수(Exhibit B-4)", "25–50 °C uses the temperature correction factor (Exhibit B-4)"),
      when: c => calcOffsitePool(c) && !(c.cat === "flam" && c.event === "pool") },
    { key: "dikeA", label: tr("방류벽 안·건물 바닥 면적", "Diked or building floor area"), term: "dike_area", dim: "area", unit: "m2", show: "m2", default: 50, positive: true,
      hint: tr("1 cm 깊이 웅덩이보다 좁을 때만 증발 면적을 줄입니다", "Limits the evaporating area only when smaller than a 1 cm deep pool"),
      when: c => calcOffsitePool(c) && (c.mit === "dike" || (c.mit === "building" && c.cat !== "flam")) },
    { key: "Qcloud", label: tr("증기운 속 양 (선택)", "Quantity in the cloud (optional)"), term: "quantity_released", dim: "mass", unit: "kg", show: "kg", default: "", optional: true, positive: true,
      hint: tr("비우면 가압 액화 기체는 2 × 순간 기화율(FFF) × 누출량", "Blank: 2 × flash fraction factor (FFF) × quantity for a gas liquefied under pressure"),
      when: c => !calcOffsiteIsToxic(c) && c.scn === "alt" && c.event === "vce" },
    { key: "epUser", label: tr("끝점 직접 입력 (선택)", "Endpoint (optional)"), term: "endpoint_pac", unit: "ppm", default: "", optional: true, positive: true,
      hint: tr("PAC-2 등. 넣으면 목록 값 대신 씁니다", "e.g. PAC-2. Overrides the listed value"), when: calcOffsiteIsToxic },
  ],
  outputs: [
    { key: "dist", label: tr("끝점까지 거리 (피해범위)", "Distance to endpoint"), term: "impact_distance", dim: "length", unit: "m", show: "km", digits: 3 },
    { key: "distMi", label: tr("지침 표기", "As in the guidance"), unit: "mi", digits: 2 },
    { key: "endpoint", label: tr("끝점", "Endpoint"), term: "endpoint", type: "text" },
    { key: "epErpg", label: tr("끝점 농도 (ERPG-2)", "Endpoint concentration (ERPG-2)"), term: "endpoint_erpg", unit: "ppm", digits: 3 },
    { key: "epAegl", label: tr("끝점 농도 (AEGL-2)", "Endpoint concentration (AEGL-2)"), term: "endpoint_aegl", unit: "ppm", digits: 3 },
    { key: "epPac", label: tr("끝점 농도 (PAC-2)", "Endpoint concentration (PAC-2)"), term: "endpoint_pac", unit: "ppm", digits: 3 },
    { key: "epOther", label: tr("끝점 농도", "Endpoint concentration"), term: "endpoint", unit: "ppm", digits: 3 },
    { key: "rate", label: tr("대기 누출률", "Release rate to air"), term: "release_rate", dim: "massflow", unit: "kgs", show: "kgmin" },
    { key: "liq", label: tr("구멍 액체 누출률 (식 7-4)", "Liquid release rate from the hole (Eq. 7-4)"), term: "release_rate", dim: "massflow", unit: "kgs", show: "kgmin" },
    { key: "minutes", label: tr("지속 시간 (누출·화구)", "Duration (release or fireball)"), term: "release_duration", dim: "time", unit: "s", show: "min" },
    { key: "area", label: tr("웅덩이 면적", "Pool area"), term: "pool_area", dim: "area", unit: "m2", show: "m2" },
    { key: "cloud", label: tr("증기운 속 양", "Quantity in the cloud"), term: "quantity_released", dim: "mass", unit: "kg", show: "kg" },
    { key: "tnt", label: tr("TNT 당량", "TNT equivalent"), term: "tnt_equivalent", dim: "mass", unit: "kg", show: "kg" },
    { key: "table", label: tr("쓴 표·식", "Table or equation used"), type: "text" },
    { key: "method", label: tr("누출률 식 (지침 번호)", "Release equations (guidance numbers)"), type: "text" },
  ],
  compute(v) {
    const run = calcOffsiteRun(v);
    if (run.error) return { error: run.error };
    const warnings = [tr("참고용 스크리닝 — 법정 장외영향평가·화학사고예방관리계획서의 영향범위는 화학물질안전원 KORA 로 산정합니다.",
      "Screening reference only — the impact range for a Korean off-site impact assessment or accident prevention plan must be computed with the NICS tool KORA."), ...run.warn];
    if (run.dist.beyond) warnings.push(tr("값이 표의 끝을 넘습니다. 지침은 표의 마지막 거리로 보고합니다(25 mi 등).", "The value is past the end of the table; the guidance reports the last tabulated distance (e.g. 25 mi)."));
    if (run.dist.miles >= 6) warnings.push(tr("지침은 6–10 mi 를 넘는 거리는 매우 불확실하다고 적습니다.", "The guidance notes that distances beyond about 6–10 miles are very uncertain."));
    const mi = run.dist.miles;
    return {
      dist: mi * CALC_RMP_SI.mi,
      distMi: mi,
      endpoint: calcOffsiteEndpointText(run),
      ...calcOffsiteEndpointValue(run),
      rate: run.rateLb != null ? run.rateLb * CALC_RMP_SI.lb / 60 : undefined,
      liq: run.liquidLb != null ? run.liquidLb * CALC_RMP_SI.lb / 60 : undefined,
      minutes: run.minutes != null ? run.minutes * 60 : run.durationS,
      area: run.areaFt2 != null ? run.areaFt2 * CALC_RMP_SI.ft ** 2 : undefined,
      cloud: run.cloudLb != null ? run.cloudLb * CALC_RMP_SI.lb : undefined,
      tnt: run.tntKg,
      table: calcOffsiteTableText(run),
      method: run.method?.length ? run.method.join(", ") : undefined,
      warnings,
    };
  },
  chart(values) {
    return calcOffsiteChart(calcOffsiteRun(values), values.topo);
  },
  links: (v, o) => {
    const sub = v.cat === "flam" ? calcRmpFlammable(v.sub_f) : calcRmpToxic(v.sub_t);
    const out = [];
    if (o.rate != null) out.push({ calc: "gaussian_plume", values: { Q: o.rate * 1000, mw: sub ? sub.mw : "" }, label: tr("이 누출률로 가우스 플룸 농도", "Gaussian plume concentration at this rate") });
    if (o.rate != null && sub && sub.state === "liquid" && o.area != null) out.push({ calc: "evaporation", values: { mw: sub.mw, A: o.area, T: v.T != null ? v.T - 273.15 : 25 }, label: tr("이 웅덩이로 증발량(실내·정체 공기)", "Evaporation from this pool (still indoor air)") });
    out.push({ calc: "release", values: { phase: sub && sub.state === "gas" ? "gas" : "liquid" }, label: tr("구멍 누출률을 자세히(누출량 계산기)", "Detailed hole release rate (source-term calculator)") });
    return out;
  },
  panel: "KoraSheetPanel",
  formula: [
    tr("최악 · 기체: QR = QS / 10 (식 3-1), 건물 안 × 0.55 (식 3-2)", "Worst case, gas: QR = QS / 10 (Eq. 3-1), inside a building × 0.55 (Eq. 3-2)"),
    tr("액체 웅덩이(깊이 1 cm): A = QS · DF (식 3-6), QR = 1.4 · LFA(또는 LFB) · A (식 3-3·3-4·3-7·3-8) · TCF (식 3-11), 대안은 2.4 (식 7-8~7-11)",
      "Liquid pool (1 cm deep): A = QS · DF (Eq. 3-6), QR = 1.4 · LFA (or LFB) · A (Eqs. 3-3, 3-4, 3-7, 3-8) · TCF (Eq. 3-11); alternative uses 2.4 (Eqs. 7-8 to 7-11)"),
    tr("대안 · 기체 구멍: QR = HA · P_t · GF / √T_t (식 7-1),  액체 구멍: QR = HA · √LH · LLF (식 7-4)", "Alternative, gas hole: QR = HA · P_t · GF / √T_t (Eq. 7-1);  liquid hole: QR = HA · √LH · LLF (Eq. 7-4)"),
    tr("독성 거리: 참조표 1–12(최악)·14–25(대안) — 중립 부력은 QR ÷ 끝점, 고밀도는 가장 가까운 끝점·누출률 칸", "Toxic distance: Reference Tables 1–12 (worst) and 14–25 (alternative) — neutrally buoyant by QR ÷ endpoint, dense by the nearest endpoint and rate cell"),
    tr("증기운 폭발 1 psi: D[mi] = 0.0081 · (수율 · W[lb] · ΔHc / 4680)^(1/3), 수율 최악 0.1 (식 C-2) · 대안 0.03, W = 2 · FFF · QS (식 10-2)",
      "VCE to 1 psi: D[mi] = 0.0081 · (yield · W[lb] · ΔHc / 4680)^(1/3), yield 0.1 worst (Eq. C-2) or 0.03 alternative, W = 2 · FFF · QS (Eq. 10-2)"),
    tr("웅덩이 화재 5 kW/m²: d[ft] = PFF · √A[ft²] (식 10-1),  화구: 참조표 30,  증기운 화재: 참조표 26–29 (LFL)", "Pool fire to 5 kW/m²: d[ft] = PFF · √A[ft²] (Eq. 10-1);  fireball: Reference Table 30;  vapour cloud fire: Reference Tables 26–29 (LFL)"),
    tr("한국 끝점: ERPG-2 → AEGL-2(누출 7분 미만 10분 값, 7–25분 30분 값, 그 밖 1시간 값) → PAC-2, 과압 1 psi, 복사열 5 kW/m²·40 s",
      "Korean endpoints: ERPG-2 → AEGL-2 (10-min value for releases under 7 min, 30-min for 7–25 min, otherwise 1 h) → PAC-2; 1 psi; 5 kW/m² for 40 s"),
  ],
  notes: [
    tr("「화학사고예방관리계획서 작성 등에 관한 규정」(화학물질안전원 고시)은 장외영향 범위를 화학물질안전원이 보급하는 프로그램(KORA)으로 산정하도록 하고, 다른 프로그램은 동등성을 입증해야 합니다. 이 결과는 그 산정을 대신하지 않는 참고용 스크리닝입니다.",
      "The NICS notice on chemical accident prevention plans requires the off-site impact range to be computed with the NICS program (KORA); any other program must demonstrate equivalence. These results are a screening reference and do not replace that calculation."),
    tr("미국 지침의 표는 개활지·도시 두 지형, 지면 누출, 25 °C, 습도 50 % 를 가정한 간이 결과입니다. 지침 스스로 큰 거리(6–10 mi 이상)는 매우 불확실하다고 적고, ALOHA·WHAZAN 결과와 몇 배 차이 나는 예제도 싣고 있습니다.",
      "The guidance tables are simplified results for two terrain types, ground-level releases, 25 °C and 50 % humidity. The guidance itself calls large distances (beyond 6–10 mi) very uncertain and includes examples that differ from ALOHA and WHAZAN by several times."),
    tr("ERPG 수치는 AIHA 의 것으로, 한국 기준에서는 DOE PAC Rev. 29 가 ERPG 에서 가져온 값만 'DOE PAC 경유'로 보입니다. DOE 는 AEGL 이 있으면 AEGL 을 먼저 쓰므로 ERPG-2 가 따로 있어도 여기서는 AEGL-2 로 넘어갈 수 있습니다. 현장에서 쓰는 끝점 값이 다르면 '끝점 직접 입력'에 넣으십시오.",
      "ERPG values belong to AIHA; under the Korean basis only the ERPG values that DOE PAC Rev. 29 adopted are shown, marked 'via DOE PAC'. DOE prefers AEGL when one exists, so this tool may fall through to AEGL-2 even where an ERPG-2 exists. If your site uses a different endpoint, enter it under 'Endpoint (optional)'."),
    tr("수용액(암모니아수·염산 등)과 올레움은 지침 Exhibit B-3 의 별도 계수를 써야 하지만 여기서는 순물질 계수만 씁니다.",
      "Water solutions (aqueous ammonia, hydrochloric acid, etc.) and oleum need the separate factors of Exhibit B-3; this tool uses pure-substance factors only."),
  ],
  reference: [
    "U.S. EPA (2009). Risk Management Program Guidance for Offsite Consequence Analysis. EPA 550-B-99-009 — Chapters 3–10, Reference Tables 1–30, Appendix B Exhibits B-1/B-2/B-4, Appendix C Exhibits C-1–C-3, Appendix D.",
    tr("40 CFR Part 68 부록 A — 독성 끝점 표", "40 CFR Part 68 Appendix A — Table of toxic endpoints"),
    "U.S. EPA, Acute Exposure Guideline Levels (AEGLs) — values pages, https://www.epa.gov/aegl",
    "U.S. DOE (2016). Protective Action Criteria (PAC) with AEGLs, ERPGs, & TEELs, Rev. 29 (DOE-HDBK-1046-2016) — ERPG values shown via DOE PAC.",
    tr("화학물질안전원, 「화학사고예방관리계획서 작성 등에 관한 규정」과 사고시나리오 선정에 관한 기술지침 — 영향범위 산정 프로그램(KORA)과 끝점",
      "National Institute of Chemical Safety (Korea), notice on preparing chemical accident prevention plans and technical guideline on accident scenario selection — impact-range program (KORA) and endpoints"),
  ],
};

Object.assign(window, { CALC_DEF_OFFSITE });

// 계산기: 독성 probit — Pr = a + b·ln(Cⁿ·t) 로 일정 농도 노출의 치사 비율, 그 시간의 LC1·LC50, 그 농도에서 1 %·50 % 까지 걸리는 시간.
// 상수: RIVM Probitrelaties(calc_toxic_probit_data.jsx, 물질마다 출처 페이지·근거 문서) 또는 직접 입력(문헌 상수, 단위 ppm|mg/m³, t = min).
// 참고용 스크리닝(사전 검토용) — 법정 장외영향평가는 화학물질안전원 KORA 로 한다.

// 표준 정규 누적분포 Φ(z) — erf 는 Abramowitz & Stegun 7.1.26 보다 정밀한 급수·연분수.
// (calc_fire_harm.jsx 의 calcHarmErf 와 같은 식의 두 번째 사본 — 두 파일이 늘 함께 실리면 하나로 합친다.)
function calcToxErf(x) {
  const s = Math.sign(x), a = Math.abs(x);
  if (a < 3) {
    let term = a, sum = a;
    for (let n = 1; n < 200; n++) {
      term *= -a * a / n;
      const add = term / (2 * n + 1);
      sum += add;
      if (Math.abs(add) < 1e-17) break;
    }
    return s * 2 / Math.sqrt(Math.PI) * sum;
  }
  let f = a, C = a, D = 0;
  for (let n = 1; n < 300; n++) {
    const an = n / 2;
    D = a + an * D; D = D === 0 ? 1e-300 : 1 / D;
    C = a + an / C; if (C === 0) C = 1e-300;
    const delta = C * D;
    f *= delta;
    if (Math.abs(delta - 1) < 1e-15) break;
  }
  return s * (1 - Math.exp(-a * a) / Math.sqrt(Math.PI) / f);
}

// probit Y → 영향 비율 [%] = 100·Φ(Y − 5)
function calcToxProbitPercent(Y) {
  return 50 * (1 + calcToxErf((Y - 5) / Math.SQRT2));
}

// 영향 비율 p (0 < p < 1) → probit Y = 5 + Φ⁻¹(p). Acklam 유리 근사 + Newton 한 번(erf 기준).
function calcToxProbitOf(p) {
  if (!(p > 0 && p < 1)) return NaN;
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const lo = 0.02425;
  let z;
  if (p < lo) {
    const q = Math.sqrt(-2 * Math.log(p));
    z = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= 1 - lo) {
    const q = p - 0.5, r = q * q;
    z = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    z = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  const e = 0.5 * (1 + calcToxErf(z / Math.SQRT2)) - p;
  z -= e * Math.sqrt(2 * Math.PI) * Math.exp(z * z / 2);
  return 5 + z;
}

// 일정 농도 C(상수 단위)·시간 t [min] → { load: Cⁿ·t, Y, P [%] }
function calcToxProbit(k, C, tMin) {
  const load = Math.pow(C, k.n) * tMin;
  const Y = k.a + k.b * Math.log(load);
  return { load, Y, P: calcToxProbitPercent(Y) };
}

// probit Y 가 되는 농도(상수 단위) — 시간 t [min] 고정
function calcToxConcAt(k, Y, tMin) {
  return Math.pow(Math.exp((Y - k.a) / k.b) / tMin, 1 / k.n);
}

// probit Y 가 되는 시간 [min] — 농도 C(상수 단위) 고정
function calcToxTimeAt(k, Y, C) {
  return Math.exp((Y - k.a) / k.b) / Math.pow(C, k.n);
}

function calcToxRivm(cas) {
  return (window.TOXIC_PROBIT_RIVM || []).find(r => r.cas === cas) || null;
}

// 화면 값 → 쓸 상수 { a, b, n, unit: "mgm3"|"ppm", mw, name } 또는 { error }
function calcToxConstants(v) {
  if (v.src === "custom") {
    if (!(v.b > 0) || !(v.n > 0)) return { error: tr("b·n 은 0 보다 커야 합니다.", "b and n must be greater than 0.") };
    return { a: v.a, b: v.b, n: v.n, unit: v.kunit, mw: v.mw || null, name: tr("직접 입력한 상수", "Entered constants") };
  }
  const r = calcToxRivm(v.sub);
  if (!r) return { error: tr("고른 물질의 RIVM 상수를 찾지 못했습니다.", "No RIVM constants were found for the chosen substance.") };
  return { a: r.a, b: r.b, n: r.n, unit: "mgm3", mw: r.mw || v.mw || null, name: r.name, rivm: r };
}

// 농도 단위 바꾸기(25 °C, 1 atm). 바꿀 수 없으면(분자량 없음) null.
function calcToxConvert(C, from, to, mw) {
  if (from === to) return C;
  if (!(mw > 0)) return null;
  return from === "ppm" ? calcPpmToMgm3(C, mw, CALC_CONST.vm25) : calcMgm3ToPpm(C, mw, CALC_CONST.vm25);
}

const CALC_TOX_UNIT_LABEL = { mgm3: "mg/m³", ppm: "ppm" };
const CALC_TOX_CHART_TIMES = [10, 30, 60];   // 그래프에 함께 그리는 노출 시간 [min]

function calcToxProbitChart(v) {
  const k = calcToxConstants(v);
  if (k.error) return null;
  const tMin = v.t / 60;
  const Cin = calcToxConvert(v.C, v.cunit, k.unit, k.mw);
  if (!(Cin > 0)) return null;
  // 가로축: 그 시간의 0.1 % ~ 99.9 % 농도 범위(입력 단위)
  const toIn = (c) => calcToxConvert(c, k.unit, v.cunit, k.mw);
  const times = [...new Set([...CALC_TOX_CHART_TIMES, tMin])].sort((x, y) => x - y);
  const lo = Math.min(...times.map(t => calcToxConcAt(k, calcToxProbitOf(0.001), t)), Cin);
  const hi = Math.max(...times.map(t => calcToxConcAt(k, calcToxProbitOf(0.999), t)), Cin);
  const N = 80;
  const xs = Array.from({ length: N + 1 }, (_, i) => lo * Math.pow(hi / lo, i / N));
  const series = times.map(t => ({
    key: `t${t}`,
    label: tr(`${calcFormatNumber(t, 3)}분 노출`, `${calcFormatNumber(t, 3)} min exposure`),
    dashed: t !== tMin,
    points: xs.map(c => [toIn(c), calcToxProbit(k, c, t).P]),
  }));
  const here = calcToxProbit(k, Cin, tMin);
  return {
    x: { label: tr("농도", "Concentration"), unit: CALC_TOX_UNIT_LABEL[v.cunit], log: true },
    y: { label: tr("영향 비율 (치사)", "Fraction affected (lethality)"), unit: "%", min: 0, max: 100 },
    series,
    markers: [{ x: v.C, y: here.P, label: tr("입력 노출", "Entered exposure") }],
    hlines: [{ y: 1, label: "1 %" }, { y: 50, label: "50 %" }],
    ariaLabel: tr("농도에 따른 치사 비율 곡선(노출 시간별)", "Lethality against concentration for several exposure times"),
  };
}

const CALC_DEF_TOXIC_PROBIT = {
  key: "toxic_probit",
  group: "release",
  title: tr("독성 probit (치사 비율)", "Toxic probit (lethality)"),
  summary: tr("독성 기체에 일정 농도로 노출됐을 때 probit 식 Pr = a + b·ln(Cⁿ·t) 으로 치사 비율을 어림하고, 그 시간의 LC1·LC50 과 1 %·50 % 에 이르는 시간을 구합니다. 참고용 스크리닝(사전 검토용)입니다.",
    "Estimates the lethal fraction for a constant exposure to a toxic gas with the probit Pr = a + b·ln(Cⁿ·t), plus LC1 and LC50 for that duration and the time to reach 1 % and 50 %. Screening estimate for preliminary review only."),
  inputs: [
    { key: "src", type: "choice", label: tr("probit 상수", "Probit constants"), term: "probit", default: "rivm",
      options: [{ v: "rivm", label: tr("RIVM 물질 목록", "RIVM substance list") }, { v: "custom", label: tr("직접 입력", "Enter constants") }] },
    { key: "sub", type: "choice", select: true, label: tr("물질 (RIVM)", "Substance (RIVM)"), default: "7782-50-5",
      when: c => c.src === "rivm",
      options: (window.TOXIC_PROBIT_RIVM || []).map(r => ({ v: r.cas, label: `${r.name} · ${r.cas}` })) },
    { key: "a", label: "a", unit: "—", default: -8.29, when: c => c.src === "custom", term: "probit" },
    { key: "b", label: "b", unit: "—", default: 0.92, positive: true, when: c => c.src === "custom" },
    { key: "n", label: "n", unit: "—", default: 2, positive: true, when: c => c.src === "custom", term: "toxic_load" },
    { key: "kunit", type: "choice", label: tr("상수의 농도 단위", "Concentration unit of the constants"), default: "ppm",
      when: c => c.src === "custom", options: [{ v: "ppm", label: "ppm" }, { v: "mgm3", label: "mg/m³" }] },
    { key: "cunit", type: "choice", label: tr("입력 농도 단위", "Input concentration unit"), default: "mgm3",
      options: [{ v: "mgm3", label: "mg/m³" }, { v: "ppm", label: "ppm" }] },
    { key: "C", label: tr("농도 (일정)", "Concentration (constant)"), unit: tr("위에서 고른 단위", "unit chosen above"), default: 400, positive: true,
      term: "probit" },
    { key: "t", label: tr("노출 시간", "Exposure time"), dim: "time", unit: "s", show: "min", default: 30, positive: true },
    { key: "mw", label: tr("분자량 (선택)", "Molecular weight (optional)"), term: "molar_mass", unit: "g/mol", default: "", optional: true, positive: true,
      hint: tr("ppm ↔ mg/m³ 환산용(25 °C, 1 atm). RIVM 물질은 DOE PAC 분자량을 먼저 씁니다.", "For ppm ↔ mg/m³ (25 °C, 1 atm). RIVM substances use the DOE PAC molar mass first.") },
  ],
  outputs: [
    { key: "P", label: tr("치사 비율", "Lethal fraction"), unit: "%", digits: 3, term: "probit" },
    { key: "Y", label: tr("probit 값 Pr", "Probit value Pr"), unit: "—", digits: 4, term: "probit" },
    { key: "load", label: tr("독성 부하 Cⁿ·t", "Toxic load Cⁿ·t"), unit: tr("(상수 단위)ⁿ·min", "(constant unit)ⁿ·min"), digits: 4, term: "toxic_load" },
    { key: "lc1_mg", label: tr("이 시간의 LC1", "LC1 for this duration"), unit: "mg/m³", digits: 3, term: "lc_probit" },
    { key: "lc50_mg", label: tr("이 시간의 LC50", "LC50 for this duration"), unit: "mg/m³", digits: 3, term: "lc_probit" },
    { key: "lc1_ppm", label: tr("이 시간의 LC1 (부피)", "LC1 for this duration (volume)"), unit: "ppm", digits: 3, term: "lc_probit" },
    { key: "lc50_ppm", label: tr("이 시간의 LC50 (부피)", "LC50 for this duration (volume)"), unit: "ppm", digits: 3, term: "lc_probit" },
    { key: "t1", label: tr("이 농도에서 1 % 까지 시간", "Time to 1 % at this concentration"), dim: "time", unit: "s", show: "min", digits: 3 },
    { key: "t50", label: tr("이 농도에서 50 % 까지 시간", "Time to 50 % at this concentration"), dim: "time", unit: "s", show: "min", digits: 3 },
    { key: "basis", label: tr("상수 출처", "Constants source"), type: "text" },
  ],
  compute(v) {
    const k = calcToxConstants(v);
    if (k.error) return { error: k.error };
    const tMin = v.t / 60;
    const Cin = calcToxConvert(v.C, v.cunit, k.unit, k.mw);
    if (Cin == null) return { error: tr("농도 단위가 상수 단위와 다릅니다. 분자량을 넣어 주세요.", "The concentration unit differs from the constants' unit. Enter the molecular weight.") };
    const r = calcToxProbit(k, Cin, tMin);
    const Y1 = calcToxProbitOf(0.01);
    const lc1 = calcToxConcAt(k, Y1, tMin), lc50 = calcToxConcAt(k, 5, tMin);
    const as = (c, unit) => calcToxConvert(c, k.unit, unit, k.mw);
    const warnings = [tr("참고용 스크리닝(사전 검토용)입니다. 법정 장외영향평가는 화학물질안전원 KORA 로 해야 합니다.",
      "Screening estimate for preliminary review only. The statutory off-site consequence assessment (Korea) requires NICS KORA.")];
    if (tMin < 1 || tMin > 480) warnings.push(tr("노출 시간이 1–480 분 밖입니다. probit 식은 근거 실험의 시간 범위 밖에서 외삽입니다.",
      "The exposure time is outside 1–480 min. The probit is extrapolated outside the time range of its underlying studies."));
    if (v.src === "custom") warnings.push(tr("직접 넣은 상수는 출처마다 단위·시간 단위가 다릅니다(문헌에 따라 몇 자릿수 차이). 상수의 원문 단위를 확인하세요.",
      "Published constant sets use different units and can differ by orders of magnitude. Check the units in the original source."));
    if (k.rivm && k.rivm.status && k.rivm.status !== "inhoudelijk vastgesteld") warnings.push(tr("이 RIVM 상수는 아직 제안 단계입니다.", "This RIVM relation is still at the proposal stage."));
    const basis = k.rivm
      ? `RIVM ${k.rivm.nl} (${k.rivm.date || k.rivm.status}): a ${k.a}, b ${k.b}, n ${k.n}; C mg/m³, t min`
      : `a ${k.a}, b ${k.b}, n ${k.n}; C ${CALC_TOX_UNIT_LABEL[k.unit]}, t min`;
    return {
      P: r.P, Y: r.Y, load: r.load,
      lc1_mg: as(lc1, "mgm3") ?? undefined, lc50_mg: as(lc50, "mgm3") ?? undefined,
      lc1_ppm: as(lc1, "ppm") ?? undefined, lc50_ppm: as(lc50, "ppm") ?? undefined,
      t1: calcToxTimeAt(k, Y1, Cin) * 60, t50: calcToxTimeAt(k, 5, Cin) * 60,
      basis, warnings,
    };
  },
  chart: calcToxProbitChart,
  formula: [
    "Pr = a + b · ln(Cⁿ · t)",
    tr("치사 비율 P = Φ(Pr − 5) = 50 · [1 + erf((Pr − 5)/√2)] %", "Lethal fraction P = Φ(Pr − 5) = 50 · [1 + erf((Pr − 5)/√2)] %"),
    tr("시간 t 의 LCp: C = [exp((Pr_p − a)/b) / t]^(1/n),  Pr₁% = 2.674, Pr₅₀% = 5", "LCp for duration t: C = [exp((Pr_p − a)/b) / t]^(1/n),  Pr₁% = 2.674, Pr₅₀% = 5"),
    tr("농도 C 에서 Pr_p 까지 시간: t = exp((Pr_p − a)/b) / Cⁿ", "Time to Pr_p at concentration C: t = exp((Pr_p − a)/b) / Cⁿ"),
  ],
  notes: [
    tr("RIVM 상수는 C = mg/m³, t = 분입니다(각 물질의 RIVM 기술 근거 문서). 인구 전체(취약 집단 포함)의 치사 기준으로 만든 식입니다.",
      "RIVM constants use C in mg/m³ and t in minutes (each substance's RIVM technical support document). They are derived for lethality in the general population."),
    tr("같은 물질도 문헌마다 상수가 크게 다릅니다. 예: 염소 RIVM a −13.7, b 1.93, n 1.04 (mg/m³·min) 대 Crowl & Louvar 표 2-5 a −8.29, b 0.92, n 2 (ppm·min, 직접 입력의 기본값). 비교할 때는 단위를 맞춥니다.",
      "Constants for the same substance differ widely between sources, e.g. chlorine RIVM a −13.7, b 1.93, n 1.04 (mg/m³, min) against Crowl & Louvar Table 2-5 a −8.29, b 0.92, n 2 (ppm, min; the default of \"Enter constants\"). Match the units when comparing."),
    tr("농도가 일정한 노출만 다룹니다. 시간에 따라 바뀌는 농도는 Σ Cᵢⁿ Δtᵢ 로 독성 부하를 더해야 합니다.",
      "Handles a constant concentration only. For a time-varying exposure the toxic load is Σ Cᵢⁿ Δtᵢ."),
    tr("비상대응 기준(AEGL·ERPG·PAC)은 물질 상세 화면의 \"비상대응 기준\" 패널에서 봅니다.", "Emergency exposure guidelines (AEGL, ERPG, PAC) are in the substance page panel \"Emergency exposure guidelines\"."),
  ],
  reference: [
    "RIVM, Probitrelaties — https://www.rivm.nl/probitrelaties (status overview and per-substance pages; C in mg/m³, t in min).",
    tr("RIVM 염소 기술 근거 문서: Ruijten, M. (2018) 20180315-chlorine-INTERIM — Pr = −13.7 + 1.93 ln(C^1.04 · t), 60분 LC0.1 47 mg/m³·LC1 68 mg/m³(7쪽)",
      "RIVM chlorine technical support document: Ruijten, M. (2018) 20180315-chlorine-INTERIM — Pr = −13.7 + 1.93 ln(C^1.04 · t); 60-min LC0.1 47 mg/m³ and LC1 68 mg/m³ (p. 7)"),
    "Finney, D.J. (1971). Probit Analysis, 3rd ed. Cambridge University Press.",
    tr("Crowl & Louvar, Chemical Process Safety 3판(2011) 2장 — probit 식·독성 부하, 표 2-5 probit 상수(직접 입력 기본값: 염소 사망)", "Crowl & Louvar, Chemical Process Safety, 3rd ed. (2011), Ch. 2 — probit equations and toxic load, Table 2-5 probit constants (default of Enter constants: chlorine deaths)"),
  ],
};

Object.assign(window, {
  CALC_DEF_TOXIC_PROBIT, calcToxErf, calcToxProbitPercent, calcToxProbitOf, calcToxProbit, calcToxConcAt, calcToxTimeAt,
  calcToxConstants, calcToxConvert,
});

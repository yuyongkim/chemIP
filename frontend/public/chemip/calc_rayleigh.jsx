// 계산기: Rayleigh 단증류(미분 증류) — 상대 휘발도 α 일정, 2성분. 잔액·유출액 양과 조성(화공기사 실기 작업형 단증류).

// ln(F/W) = 1/(α − 1) · ln[xF (1 − xW) / (xW (1 − xF))] + ln[(1 − xW)/(1 − xF)]  → W/F
function calcRayleighWF(xF, xW, alpha) {
  const lnFW = Math.log(xF * (1 - xW) / (xW * (1 - xF))) / (alpha - 1) + Math.log((1 - xW) / (1 - xF));
  return Math.exp(-lnFW);
}

// W/F → xW (0 < xW < xF, 이분법)
function calcRayleighXW(xF, WF, alpha) {
  return calcSepBisect(x => calcRayleighWF(xF, x, alpha) - WF, 1e-12, xF * (1 - 1e-12));
}

// 물질 수지: 유출액 평균 조성 = (F xF − W xW) / (F − W)
function calcRayleighXD(xF, xW, WF) {
  return (xF - WF * xW) / (1 - WF);
}

const CALC_DEF_RAYLEIGH = {
  key: "rayleigh",
  group: "separation",
  title: tr("Rayleigh 단증류", "Rayleigh (simple batch) distillation"),
  summary: tr("2성분 혼합액을 증류 솥에서 조금씩 증발시켜 증기를 바로 빼내는 단증류(미분 증류)에서, 남은 액(잔액)과 모은 유출액의 양·조성을 구합니다. 상대 휘발도 α 일정.",
    "For simple differential (batch) distillation of a binary liquid, where vapour is removed as it forms, finds the amount and composition of the residue and the collected distillate. Constant relative volatility α."),
  inputs: [
    { key: "F", term: "batch_charge", label: tr("처음 넣은 양 F", "Initial charge F"), unit: "mol", default: 100, positive: true },
    { key: "xF", term: "mole_fraction", label: tr("처음 조성 xF (경 성분)", "Initial composition xF (light)"), unit: tr("몰분율", "mol frac."), default: 0.5, min: 0.0001, max: 0.9999 },
    { key: "alpha", term: "relative_volatility", label: tr("상대 휘발도 α", "Relative volatility α"), unit: "—", default: 2.16, positive: true },
    { key: "mode", type: "choice", label: tr("주어진 값", "Given"), default: "frac",
      options: [{ v: "frac", label: tr("유출 비율 D/F", "Fraction distilled D/F") }, { v: "xW", label: tr("잔액 조성 xW", "Residue composition xW") }] },
    { key: "frac", term: "cut_fraction", label: tr("유출 비율 D/F", "Fraction distilled D/F"), unit: "—", default: 0.6, min: 0.0001, max: 0.9999, when: v => v.mode === "frac" },
    { key: "xW", term: "mole_fraction", label: tr("잔액 조성 xW", "Residue composition xW"), unit: tr("몰분율", "mol frac."), default: 0.33, min: 0.0001, max: 0.9999, when: v => v.mode === "xW" },
  ],
  outputs: [
    { key: "W", term: "batch_charge", label: tr("잔액 W", "Residue W"), unit: "mol", digits: 4 },
    { key: "D", term: "batch_charge", label: tr("유출액 D", "Distillate D"), unit: "mol", digits: 4 },
    { key: "xW", term: "mole_fraction", label: tr("잔액 조성 xW", "Residue composition xW"), unit: tr("몰분율", "mol frac."), digits: 4 },
    { key: "xD", term: "mole_fraction", label: tr("유출액 평균 조성 xD,avg", "Average distillate composition xD,avg"), unit: tr("몰분율", "mol frac."), digits: 4 },
    { key: "yW", term: "relative_volatility", label: tr("끝날 때 증기 조성 y(xW)", "Vapour composition at the end y(xW)"), unit: tr("몰분율", "mol frac."), digits: 4 },
    { key: "DF", term: "cut_fraction", label: tr("유출 비율 D/F", "Fraction distilled D/F"), unit: "—", digits: 4 },
  ],
  compute(v) {
    if (!(v.alpha > 1)) return { error: tr("상대 휘발도 α 는 1 보다 커야 합니다.", "Relative volatility α must be greater than 1.") };
    let xW, WF;
    if (v.mode === "frac") {
      WF = 1 - v.frac;
      xW = calcRayleighXW(v.xF, WF, v.alpha);
      if (!Number.isFinite(xW)) return { error: tr("잔액 조성을 풀지 못했습니다. 입력을 확인하십시오.", "Could not solve for the residue composition. Check the inputs.") };
    } else {
      if (!(v.xW < v.xF)) return { error: tr("잔액 조성 xW 는 처음 조성 xF 보다 작아야 합니다(경 성분이 먼저 날아갑니다).", "Residue composition xW must be below xF (the light component leaves first).") };
      xW = v.xW;
      WF = calcRayleighWF(v.xF, xW, v.alpha);
    }
    const W = v.F * WF;
    return {
      W, D: v.F - W, xW, xD: calcRayleighXD(v.xF, xW, WF), yW: v.alpha * xW / (1 + (v.alpha - 1) * xW), DF: 1 - WF,
      warnings: [tr("α 가 온도에 따라 크게 바뀌는 계는 평형 자료로 1/(y − x) 를 수치 적분해야 합니다.", "If α changes strongly with temperature, integrate 1/(y − x) numerically over equilibrium data instead.")],
    };
  },
  // 유출 비율에 따른 잔액·유출액 평균 조성
  chart(v, o) {
    if (!(v.alpha > 1)) return null;
    const res = [], dist = [];
    for (let i = 0; i <= 60; i++) {
      const xW = v.xF * (1 - i / 60) + 1e-4 * (i / 60);
      const WF = calcRayleighWF(v.xF, xW, v.alpha);
      if (!(WF > 0 && WF <= 1)) continue;
      res.push([1 - WF, xW]);
      if (WF < 1) dist.push([1 - WF, calcRayleighXD(v.xF, xW, WF)]);
    }
    return {
      x: { label: tr("유출 비율 D/F", "Fraction distilled D/F"), unit: "—", min: 0, max: 1 },
      y: { label: tr("경 성분 몰분율", "Light-component mole fraction"), unit: "—", min: 0, max: 1 },
      series: [
        { key: "res", label: tr("잔액 xW", "Residue xW"), points: res },
        { key: "dist", label: tr("유출액 평균 xD,avg", "Average distillate xD,avg"), points: dist },
      ],
      markers: [{ x: o.DF, y: o.xW, label: "xW" }, { x: o.DF, y: o.xD, label: "xD,avg" }],
      vlines: [{ x: o.DF, label: "D/F" }],
      ariaLabel: tr("단증류 유출 비율에 따른 조성", "Simple distillation compositions against fraction distilled"),
    };
  },
  formula: [
    tr("Rayleigh: ln(F/W) = ∫ dx / (y − x)  (xW → xF)", "Rayleigh: ln(F/W) = ∫ dx / (y − x)  (from xW to xF)"),
    tr("α 일정: ln(F/W) = 1/(α − 1) · ln[xF (1 − xW) / (xW (1 − xF))] + ln[(1 − xW)/(1 − xF)]", "Constant α: ln(F/W) = 1/(α − 1) · ln[xF (1 − xW) / (xW (1 − xF))] + ln[(1 − xW)/(1 − xF)]"),
    "D = F − W,   xD,avg = (F xF − W xW) / D",
  ],
  notes: [
    tr("기본값은 Treybal 예제 9.6(n-헵탄–n-옥탄 50 mol%, 60 mol% 유출, 1 atm)과 같은 조건입니다. 책은 평형 자료로 적분해 xW = 0.33, xD,avg = 0.614 를 얻었고, 여기서는 그 온도 범위(98–126 °C)의 Antoine 증기압 비로 어림한 α ≈ 2.16 을 넣어 xW = 0.328 이 나옵니다.",
      "The defaults match Treybal Illustration 9.6 (50 mol% n-heptane–n-octane, 60 mol% distilled, 1 atm). The book integrates equilibrium data and gets xW = 0.33, xD,avg = 0.614; here α ≈ 2.16, estimated from the Antoine vapour-pressure ratio over that range (98–126 °C), gives xW = 0.328."),
    tr("양의 단위는 mol·kmol·kg mol 어느 것이든 같은 단위로 넣고 읽습니다.", "Use any amount unit (mol, kmol, kg mol) consistently; results come out in the same unit."),
    tr("화공기사 실기 작업형 단증류는 같은 식으로 잔액·유출액을 계산합니다. 측정값과 비교할 때는 시험 기준의 허용 오차를 따르십시오.", "The practical (hands-on) part of the Korean chemical engineer licence exam uses the same equation for residue and distillate. Follow the exam's tolerance when comparing with measurements."),
  ],
  reference: [
    "Rayleigh, Lord (1902). On the distillation of binary mixtures. Philosophical Magazine, Series 6, 4(23), 521–537.",
    tr("Treybal, Mass-Transfer Operations 3판(1980), 9장 — 예제 9.6 미분 증류(시험 기준값)", "Treybal, Mass-Transfer Operations, 3rd ed. (1980), Ch. 9 — Illustration 9.6, differential distillation (test values)"),
    tr("Geankoplis, Transport Processes and Separation Process Principles 4판(2003), 11.3절 단증류", "Geankoplis, Transport Processes and Separation Process Principles, 4th ed. (2003), §11.3 simple distillation"),
  ],
};

Object.assign(window, { CALC_DEF_RAYLEIGH, calcRayleighWF, calcRayleighXW, calcRayleighXD });

// 계산기: 대수 평균 온도차(LMTD)와 Q = U·A·ΔT_lm (순수 향류·병류, F = 1).

// ΔT₁, ΔT₂ [K] → LMTD. 두 값이 거의 같으면(상대 차 1e-6 미만) 산술 평균 — 극한값이고 오차는 차의 제곱 수준.
function calcLmtd(d1, d2) {
  if (Math.abs(d1 - d2) < 1e-6 * Math.max(d1, d2)) return (d1 + d2) / 2;
  return (d1 - d2) / Math.log(d1 / d2);
}

const CALC_LMTD_DT_UNIT = tr("K (= °C 차)", "K (= °C difference)");

const CALC_DEF_LMTD = {
  key: "lmtd",
  group: "heat",
  title: tr("LMTD · 열교환기", "LMTD · heat exchanger"),
  summary: tr("고온·저온 유체의 입출구 온도로 대수 평균 온도차를 구하고, 총괄 전열계수 U 로 열량 또는 필요 전열 면적을 구합니다.",
    "Computes the log-mean temperature difference from the hot and cold fluid inlet and outlet temperatures, then the heat duty or required heat transfer area from the overall coefficient U."),
  inputs: [
    { key: "flow", term: "flow_arrangement", type: "choice", label: tr("흐름 배치", "Flow arrangement"), default: "counter",
      options: [{ v: "counter", label: tr("향류", "Counter-current") }, { v: "parallel", label: tr("병류", "Co-current") }] },
    { key: "Thi", label: tr("고온 유체 입구", "Hot fluid inlet"), dim: "temperature", unit: "K", show: "C", default: 150, positive: true },
    { key: "Tho", label: tr("고온 유체 출구", "Hot fluid outlet"), dim: "temperature", unit: "K", show: "C", default: 90, positive: true },
    { key: "Tci", label: tr("저온 유체 입구", "Cold fluid inlet"), dim: "temperature", unit: "K", show: "C", default: 30, positive: true },
    { key: "Tco", label: tr("저온 유체 출구", "Cold fluid outlet"), dim: "temperature", unit: "K", show: "C", default: 70, positive: true },
    { key: "mode", type: "choice", label: tr("더 구할 값", "Also solve for"), default: "lmtd",
      options: [{ v: "lmtd", label: tr("LMTD 만", "LMTD only") }, { v: "Q", label: tr("열량 Q (U, A)", "Heat duty Q (U, A)") }, { v: "A", label: tr("필요 면적 A (U, Q)", "Required area A (U, Q)") }] },
    { key: "U", term: "overall_u", label: tr("총괄 전열계수 U", "Overall heat transfer coefficient U"), unit: "W/(m²·K)", default: 500, positive: true, when: v => v.mode !== "lmtd" },
    { key: "A", term: "heat_transfer_area", label: tr("전열 면적 A", "Heat transfer area A"), dim: "area", unit: "m2", show: "m2", default: 10, positive: true, when: v => v.mode === "Q" },
    { key: "Qd", label: tr("열량 Q", "Heat duty Q"), dim: "power", unit: "W", show: "kW", default: 300, positive: true, when: v => v.mode === "A" },
  ],
  outputs: [
    { key: "lmtd", term: "lmtd", label: "LMTD ΔT_lm", unit: CALC_LMTD_DT_UNIT },
    { key: "d1", label: tr("한쪽 끝 온도차 ΔT₁", "Terminal temperature difference ΔT₁"), unit: CALC_LMTD_DT_UNIT },
    { key: "d2", label: tr("다른 쪽 끝 온도차 ΔT₂", "Other terminal temperature difference ΔT₂"), unit: CALC_LMTD_DT_UNIT },
    { key: "Q", label: tr("열량 Q", "Heat duty Q"), dim: "power", unit: "W", show: "kW" },
    { key: "A_out", label: tr("필요 전열 면적 A", "Required heat transfer area A"), dim: "area", unit: "m2", show: "m2" },
  ],
  compute(v) {
    if (v.Thi < v.Tho) return { error: tr("고온 유체는 입구 온도가 출구보다 높아야 합니다.", "The hot fluid inlet temperature must be higher than its outlet.") };
    if (v.Tco < v.Tci) return { error: tr("저온 유체는 출구 온도가 입구보다 높아야 합니다.", "The cold fluid outlet temperature must be higher than its inlet.") };
    const d1 = v.flow === "counter" ? v.Thi - v.Tco : v.Thi - v.Tci;
    const d2 = v.flow === "counter" ? v.Tho - v.Tci : v.Tho - v.Tco;
    if (d1 <= 0 || d2 <= 0) return { error: tr("양 끝 온도차가 0 이하입니다(온도 교차). 이 배치로는 그 출구 온도를 만들 수 없습니다.",
      "A terminal temperature difference is zero or negative (temperature cross). These outlet temperatures cannot be reached with this flow arrangement.") };
    const lmtd = calcLmtd(d1, d2);
    const out = { lmtd, d1, d2 };
    if (v.mode === "Q") out.Q = v.U * v.A * lmtd;
    if (v.mode === "A") out.A_out = v.Qd / (v.U * lmtd);
    return out;
  },
  formula: [
    tr("ΔT_lm = (ΔT₁ − ΔT₂) / ln(ΔT₁ / ΔT₂)   (ΔT₁ = ΔT₂ 이면 ΔT_lm = ΔT₁)", "ΔT_lm = (ΔT₁ − ΔT₂) / ln(ΔT₁ / ΔT₂)   (if ΔT₁ = ΔT₂, ΔT_lm = ΔT₁)"),
    tr("향류: ΔT₁ = T_h,in − T_c,out,  ΔT₂ = T_h,out − T_c,in", "Counter-current: ΔT₁ = T_h,in − T_c,out,  ΔT₂ = T_h,out − T_c,in"),
    tr("병류: ΔT₁ = T_h,in − T_c,in,  ΔT₂ = T_h,out − T_c,out", "Co-current: ΔT₁ = T_h,in − T_c,in,  ΔT₂ = T_h,out − T_c,out"),
    "Q = U · A · ΔT_lm",
  ],
  notes: [
    tr("순수 향류·병류(이중관) 기준, 보정계수 F = 1 입니다. 다관식(셸-튜브)·직교류는 F 보정 선도로 ΔT_lm 에 F 를 곱합니다.",
      "Assumes pure counter-current or co-current flow (double pipe), correction factor F = 1. For shell-and-tube or cross-flow exchangers, multiply ΔT_lm by F from the correction charts."),
    tr("U 는 오염 계수를 포함한 값을 넣습니다.", "Enter U including fouling factors."),
  ],
  reference: [
    tr("Incropera, DeWitt, Bergman & Lavine, Fundamentals of Heat and Mass Transfer, 7판(2011), 11장 열교환기 — LMTD 법",
      "Incropera, DeWitt, Bergman & Lavine, Fundamentals of Heat and Mass Transfer, 7th ed. (2011), Ch. 11 Heat Exchangers — LMTD method"),
    tr("Kern, D.Q., Process Heat Transfer (1950) — 이중관 열교환기의 대수 평균 온도차",
      "Kern, D.Q., Process Heat Transfer (1950) — log-mean temperature difference in double-pipe exchangers"),
  ],
};

Object.assign(window, { CALC_DEF_LMTD, calcLmtd });

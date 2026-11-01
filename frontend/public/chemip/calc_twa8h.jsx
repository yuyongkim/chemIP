// 계산기: 8시간 시간가중평균(TWA) 노출 E = Σ Cᵢ·Tᵢ / 8, 긴 근무의 Brief & Scala 보정(선택).

// Brief & Scala (1975) 감소 계수 RF = (8/h) × (24 − h)/16. h ≤ 8 이면 1.
function calcBriefScala(h) {
  return h > 8 ? (8 / h) * ((24 - h) / 16) : 1;
}

const CALC_DEF_TWA8H = {
  key: "twa8h",
  group: "safety",
  title: tr("8시간 시간가중평균 (TWA)", "8-hour time-weighted average (TWA)"),
  summary: tr("근무 중 농도가 바뀔 때, 구간별 농도 × 시간을 더해 8시간 시간가중평균 노출을 구하고 노출기준과 비교합니다.",
    "When the concentration changes during a shift, sums concentration × time for each period to get the 8-hour time-weighted average exposure and compares it with the exposure limit."),
  inputs: [
    { key: "rows", type: "table", label: tr("측정 구간", "Sampling periods"), term: "twa", minRows: 1, maxRows: 12,
      columns: [
        { key: "C", label: tr("농도", "Concentration"), unit: tr("ppm 또는 mg/m³", "ppm or mg/m³"), min: 0 },
        { key: "T", label: tr("시간", "Duration"), unit: "h", positive: true, max: 24 },
      ],
      rows: [{ C: 150, T: 2 }, { C: 75, T: 2 }, { C: 50, T: 4 }],
      hint: tr("기본 행은 OSHA 29 CFR 1910.1000(d)(1)(ii) 예시(150 ppm 2 h, 75 ppm 2 h, 50 ppm 4 h)입니다. 모든 행은 같은 단위로 넣습니다.",
        "Default rows are the OSHA 29 CFR 1910.1000(d)(1)(ii) example (150 ppm 2 h, 75 ppm 2 h, 50 ppm 4 h). Enter all rows in the same unit.") },
    { key: "oel", label: tr("8시간 노출기준 (선택)", "8-hour exposure limit (optional)"), term: "oel", unit: tr("행과 같은 단위", "same unit as rows"), default: 100, optional: true, positive: true },
    { key: "shift", label: tr("하루 근무 시간 (선택)", "Daily shift length (optional)"), term: "brief_scala", unit: "h", default: "", optional: true, positive: true, max: 24,
      hint: tr("8시간을 넘으면 Brief & Scala 보정 노출기준을 함께 봅니다", "Above 8 hours, the Brief & Scala adjusted exposure limit is also shown") },
  ],
  outputs: [
    { key: "E", label: tr("8시간 TWA", "8-hour TWA"), term: "twa", unit: tr("행과 같은 단위", "same unit as rows"), digits: 4 },
    { key: "Tsum", label: tr("측정 시간 합계", "Total sampled time"), unit: "h", digits: 3 },
    { key: "Eobs", label: tr("측정 시간 평균", "Average over sampled time"), unit: tr("행과 같은 단위", "same unit as rows"), digits: 4 },
    { key: "ratio", label: tr("TWA ÷ 노출기준", "TWA ÷ exposure limit"), term: "oel", unit: "—", digits: 3 },
    { key: "rf", label: tr("Brief & Scala 감소 계수 RF", "Brief & Scala reduction factor RF"), term: "brief_scala", unit: "—", digits: 3 },
    { key: "oelAdj", label: tr("보정 노출기준", "Adjusted exposure limit"), term: "brief_scala", unit: tr("행과 같은 단위", "same unit as rows"), digits: 4 },
    { key: "verdict", label: tr("판정", "Assessment"), type: "text" },
  ],
  compute(v) {
    const Tsum = v.rows.reduce((s, r) => s + r.T, 0);
    if (Tsum > 24) return { error: tr("시간 합계가 24 h 를 넘습니다.", "Total time exceeds 24 h.") };
    const dose = v.rows.reduce((s, r) => s + r.C * r.T, 0);
    const E = dose / 8;
    const warnings = [];
    if (Tsum < 8) warnings.push(tr("측정 시간이 8 h 보다 짧습니다. 측정하지 않은 시간을 농도 0 으로 보는 OSHA 식이므로, 그 시간에도 노출이 있으면 낮게 나옵니다.",
      "Sampled time is shorter than 8 h. The OSHA formula treats unsampled time as zero concentration, so the result is low if exposure also occurred then."));
    if (Tsum > 8) warnings.push(tr("측정 시간이 8 h 를 넘습니다. ΣC·T ÷ 8 은 8시간 근무 기준 식이라 노출을 크게 잡습니다. 긴 근무는 보정 노출기준과 함께 판단하십시오.",
      "Sampled time exceeds 8 h. ΣC·T ÷ 8 assumes an 8-hour shift and overstates exposure. Judge extended shifts together with the adjusted exposure limit."));
    const rf = v.shift ? calcBriefScala(v.shift) : undefined;
    const oelAdj = v.oel && rf != null ? v.oel * rf : undefined;
    let verdict;
    if (v.oel) {
      const limit = oelAdj ?? v.oel;
      const avg = Tsum > 8 ? dose / Tsum : E;
      verdict = avg > limit ? tr("노출기준 초과", "Exceeds exposure limit") : tr("노출기준 이내", "Within exposure limit");
      if (oelAdj != null) verdict += tr(" (측정 시간 평균 ÷ 보정 노출기준으로 판정)", " (judged as sampled-time average vs. adjusted limit)");
    }
    return { E, Tsum, Eobs: dose / Tsum, ratio: v.oel ? E / v.oel : undefined, rf, oelAdj, verdict, warnings };
  },
  formula: [
    "E = (C₁·T₁ + C₂·T₂ + … + Cₙ·Tₙ) / 8",
    tr("측정 시간 평균 = Σ Cᵢ·Tᵢ / Σ Tᵢ", "Sampled-time average = Σ Cᵢ·Tᵢ / Σ Tᵢ"),
    tr("Brief & Scala: RF = (8 / h) × (24 − h) / 16,  보정 노출기준 = 노출기준 × RF", "Brief & Scala: RF = (8 / h) × (24 − h) / 16,  adjusted limit = exposure limit × RF"),
  ],
  notes: [
    tr("농도가 일정했던 구간마다 한 행씩 넣습니다. 단기 노출(STEL·최고노출기준)은 따로 확인합니다.",
      "Enter one row per period of roughly constant concentration. Check short-term exposure (STEL, ceiling) separately."),
    tr("국내 법정 평가는 「작업환경측정 및 정도관리 등에 관한 고시」의 평가 방법과 보정노출기준을 따릅니다. 이 계산기의 Brief & Scala 보정은 참고값입니다.",
      "Statutory assessment in Korea follows the evaluation method and adjusted exposure limits of the MOEL Notice on Work Environment Measurement and Quality Control. The Brief & Scala adjustment here is for reference only."),
    tr("Brief & Scala 보정은 자극성·국소 작용 물질이나 반감기가 아주 짧거나 긴 물질에는 맞지 않을 수 있습니다.",
      "The Brief & Scala adjustment may not suit irritants, locally acting substances, or substances with very short or very long biological half-lives."),
  ],
  reference: [
    tr("OSHA 29 CFR 1910.1000(d)(1) — 8시간 누적 노출 E = (C_a·T_a + … + C_n·T_n) ÷ 8, 예시 (2×150 + 2×75 + 4×50) ÷ 8 = 81.25 ppm",
      "OSHA 29 CFR 1910.1000(d)(1) — 8-hour cumulative exposure E = (C_a·T_a + … + C_n·T_n) ÷ 8, example (2×150 + 2×75 + 4×50) ÷ 8 = 81.25 ppm"),
    "Brief, R.S. & Scala, R.A. (1975). Occupational exposure limits for novel work schedules. Am. Ind. Hyg. Assoc. J. 36(6), 467–469.",
    tr("고용노동부 고시 「작업환경측정 및 정도관리 등에 관한 고시」 — 시간가중평균 산출과 보정노출기준",
      "Ministry of Employment and Labor (Korea), Notice on Work Environment Measurement and Quality Control (in Korean) — TWA calculation and adjusted exposure limits"),
  ],
};

Object.assign(window, { CALC_DEF_TWA8H, calcBriefScala });

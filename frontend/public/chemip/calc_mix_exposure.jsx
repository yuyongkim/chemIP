// 계산기: 혼합물 노출지수 E = Σ Cᵢ / TLVᵢ (상가작용 가정).

const CALC_DEF_MIX_EXPOSURE = {
  key: "mix_exposure",
  group: "safety",
  title: tr("혼합물 노출지수", "Mixture exposure index"),
  summary: tr("같은 방식으로 작용하는 여러 물질에 함께 노출될 때, 성분별 '측정 농도 ÷ 노출기준'을 더해 1 을 넘는지 봅니다.",
    "For combined exposure to several substances that act the same way, sums 'measured concentration ÷ exposure limit' for each component and checks whether the total exceeds 1."),
  inputs: [
    { key: "rows", term: "additive_effect", type: "table", label: tr("성분", "Components"), minRows: 1, maxRows: 10,
      columns: [
        { key: "name", label: tr("물질", "Substance"), text: true },
        { key: "C", label: tr("측정 농도", "Measured concentration"), unit: "", min: 0 },
        { key: "TLV", term: "oel", label: tr("노출기준", "Exposure limit"), unit: "", positive: true },
      ],
      rows: [{ name: tr("성분 1", "Component 1"), C: 500, TLV: 1000 }, { name: tr("성분 2", "Component 2"), C: 45, TLV: 200 }, { name: tr("성분 3", "Component 3"), C: 40, TLV: 200 }],
      hint: tr("한 행 안의 측정 농도와 노출기준은 같은 단위(ppm 끼리 또는 mg/m³ 끼리), 같은 평균 시간(TWA 끼리)으로 넣습니다.",
        "Within a row, enter the measured concentration and the exposure limit in the same unit (ppm with ppm, or mg/m³ with mg/m³) and the same averaging time (TWA with TWA).") },
  ],
  outputs: [
    { key: "E", term: "exposure_index", label: tr("노출지수 E", "Exposure index E"), unit: "—", digits: 3 },
    { key: "verdict", label: tr("판정", "Assessment"), type: "text" },
    { key: "top", label: tr("가장 큰 기여 성분", "Largest contributor"), type: "text" },
  ],
  compute(v) {
    const parts = v.rows.map((r, i) => ({ name: r.name || tr(`${i + 1}행`, `Row ${i + 1}`), ratio: r.C / r.TLV }));
    const E = parts.reduce((s, p) => s + p.ratio, 0);
    const top = parts.reduce((a, b) => (b.ratio > a.ratio ? b : a));
    return {
      E,
      verdict: E > 1 ? tr("노출기준 초과 (E > 1)", "Exceeds exposure limit (E > 1)") : tr("노출기준 이내 (E ≤ 1)", "Within exposure limit (E ≤ 1)"),
      top: E > 0 ? `${top.name} (${Math.round(top.ratio / E * 100)} %)` : "—",
    };
  },
  formula: ["E = C₁/T₁ + C₂/T₂ + … + Cₙ/Tₙ", tr("E > 1 이면 혼합물 노출기준 초과", "E > 1 means the mixture exposure limit is exceeded")],
  notes: [
    tr("상가작용(같은 표적 장기에 같은 방식으로 작용)일 때만 더합니다. 작용이 서로 독립이면 성분마다 따로 판정합니다(ACGIH).",
      "Add only for additive effects (same target organ, same mode of action). If the effects are independent, assess each component separately (ACGIH)."),
    tr("법정 판정에는 그 나라 노출기준 값을 씁니다. 한국은 고용노동부 고시 노출기준을 넣습니다.",
      "For statutory assessment use that country's exposure limits. In Korea, use the Ministry of Employment and Labor exposure limits."),
  ],
  reference: [
    tr("ACGIH, TLVs and BEIs — 부록 'Threshold Limit Values for Mixtures'(상가작용 Σ Cᵢ/Tᵢ ≤ 1)",
      "ACGIH, TLVs and BEIs — Appendix 'Threshold Limit Values for Mixtures' (additive effects Σ Cᵢ/Tᵢ ≤ 1)"),
    tr("OSHA 29 CFR 1910.1000(d)(2)(i) — 혼합물 등가 노출 E_m = Σ Cₙ/Lₙ, E_m ≤ 1",
      "OSHA 29 CFR 1910.1000(d)(2)(i) — equivalent exposure for mixtures E_m = Σ Cₙ/Lₙ, E_m ≤ 1"),
    tr("고용노동부 고시 「화학물질 및 물리적 인자의 노출기준」 — 혼합물 노출지수 산출식",
      "Ministry of Employment and Labor (Korea), Exposure Limits for Chemical Substances and Physical Agents (in Korean) — mixture exposure index formula"),
  ],
};

Object.assign(window, { CALC_DEF_MIX_EXPOSURE });

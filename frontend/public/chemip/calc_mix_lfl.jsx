// 계산기: 가연성 혼합 기체의 연소 하한·상한 — Le Chatelier 식.

// 행 → 가연성 성분만의 몰분율로 나눈 혼합 한계. key 는 "LFL" 또는 "UFL". 값이 빠진 행이 있으면 null.
function calcLeChatelier(rows, key) {
  if (rows.some(r => r[key] == null)) return null;
  const total = rows.reduce((s, r) => s + r.y, 0);
  return 1 / rows.reduce((s, r) => s + (r.y / total) / r[key], 0);
}

const CALC_DEF_MIX_LFL = {
  key: "mix_lfl",
  group: "flammability",
  title: tr("혼합 기체 연소 범위 (Le Chatelier)", "Mixture flammability limits (Le Chatelier)"),
  summary: tr("여러 가연성 기체·증기가 공기와 섞였을 때 혼합물의 연소 하한(LFL)·상한(UFL)을 구하고, 지금 농도가 그 범위 안인지 봅니다.",
    "For several flammable gases or vapours mixed with air, estimates the mixture's lower (LFL) and upper (UFL) flammable limits and checks whether the current concentration lies within that range."),
  inputs: [
    { key: "rows", term: "le_chatelier", type: "table", label: tr("가연성 성분", "Flammable components"), minRows: 1, maxRows: 10,
      columns: [
        { key: "name", label: tr("물질 (이름 또는 CAS)", "Substance (name or CAS)"), text: true },
        { key: "y", label: tr("공기 중 농도", "Concentration in air"), unit: "vol%", positive: true },
        { key: "LFL", term: "lfl", label: "LFL", unit: "vol%", positive: true, max: 100 },
        { key: "UFL", term: "ufl", label: tr("UFL (선택)", "UFL (optional)"), unit: "vol%", positive: true, max: 100, optional: true },
      ],
      rowFill: "flam_limits",   // 행마다 ChemIP 물성(MSDS 9항 LFL·UFL)으로 채우기 — api_calc_fill_flam.jsx
      rows: [{ name: tr("성분 1", "Component 1"), y: 1.0, LFL: 5.0, UFL: 15.0 }, { name: tr("성분 2", "Component 2"), y: 0.5, LFL: 3.0, UFL: 12.4 }, { name: tr("성분 3", "Component 3"), y: 0.5, LFL: 2.1, UFL: 9.5 }],
      hint: tr("기본 행은 계산 예시입니다. 실제 계산에는 MSDS 9항 등 출처가 있는 연소 한계를 넣습니다.",
        "Default rows are a worked example. For real use, enter flammable limits from a cited source such as SDS Section 9.") },
  ],
  outputs: [
    { key: "lfl", term: "lfl", label: tr("혼합물 LFL", "Mixture LFL"), unit: "vol%", digits: 3 },
    { key: "ufl", term: "ufl", label: tr("혼합물 UFL", "Mixture UFL"), unit: "vol%", digits: 3 },
    { key: "total", label: tr("가연성 성분 합계 농도", "Total flammable concentration"), unit: "vol%", digits: 3 },
    { key: "verdict", label: tr("판정", "Assessment"), type: "text" },
  ],
  compute(v) {
    const lfl = calcLeChatelier(v.rows, "LFL");
    const ufl = calcLeChatelier(v.rows, "UFL");
    const total = v.rows.reduce((s, r) => s + r.y, 0);
    if (total > 100) return { error: tr("공기 중 농도 합계가 100 vol% 를 넘습니다.", "Total concentration in air exceeds 100 vol%.") };
    if (ufl != null && ufl <= lfl) return { error: tr("UFL 이 LFL 보다 커야 합니다. 입력을 확인하십시오.", "UFL must be greater than LFL. Check the inputs.") };
    let verdict = total < lfl ? tr("연소 하한 미만", "Below LFL") : tr("연소 하한 이상", "At or above LFL");
    if (ufl != null && total >= lfl) verdict = total > ufl ? tr("연소 상한 초과 — 공기가 더 섞이면 연소 범위에 들어갈 수 있음", "Above UFL — may enter the flammable range if diluted with more air") : tr("연소 범위 안", "Within flammable range");
    return { lfl, ufl: ufl == null ? undefined : ufl, total, verdict };
  },
  formula: ["LFL_mix = 1 / Σ (yᵢ / LFLᵢ)", "UFL_mix = 1 / Σ (yᵢ / UFLᵢ)", tr("yᵢ = 성분 i 농도 ÷ 가연성 성분 합계 (가연성 기준 몰분율)", "yᵢ = concentration of component i ÷ total flammable concentration (mole fraction on a flammables-only basis)")],
  notes: [
    tr("공기 중, 상온·상압 기준입니다. 불활성 기체가 많거나 수소처럼 성질이 크게 다른 성분이 섞이면 오차가 커집니다.",
      "Valid in air at ambient temperature and pressure. Errors grow with large amounts of inert gas or components with very different behaviour, such as hydrogen."),
    tr("UFL 쪽 식은 LFL 쪽보다 오차가 큽니다(Crowl & Louvar). UFL 이 하나라도 비면 UFL 은 구하지 않습니다.",
      "The UFL estimate is less accurate than the LFL estimate (Crowl & Louvar). If any UFL is blank, the mixture UFL is not calculated."),
  ],
  reference: [
    "Le Chatelier, H. (1891). Estimation of firedamp by flammability limits. Annales des Mines, 19, 388–395.",
    "Coward, H.F. & Jones, G.W. (1952). Limits of Flammability of Gases and Vapors. U.S. Bureau of Mines Bulletin 503.",
    tr("Crowl & Louvar, Chemical Process Safety 3판(2011), 6장 화재와 폭발 — 혼합물의 연소 한계",
      "Crowl & Louvar, Chemical Process Safety, 3rd ed. (2011), Ch. 6 Fires and Explosions — flammability limits of mixtures"),
  ],
};

Object.assign(window, { CALC_DEF_MIX_LFL, calcLeChatelier });
